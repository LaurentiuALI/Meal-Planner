import { describe, expect, it } from "vitest";
import { planSession, mergeTasks } from "./cooking";
import type { Meal } from "./plan";
import type { Ingredient, Recipe, RecipeStep } from "./types";
import { ACTIONS, EQUIPMENT } from "@/server/seed/kitchen";

const actions = new Map(ACTIONS.map((a) => [a.id, a]));

const ing = (id: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id, name: id, brand: null, per100: { kcal: 100, protein: 10, carbs: 10, fat: 2, fiber: 1 }, density: 1, portions: [],
  packGrams: null, packLabel: null, aisle: "altele", staple: false, lidl: false, source: "manual", barcode: null, ...over,
});
const db = new Map(["cartofi", "pui", "vita", "orez", "ceapa", "broccoli", "ulei", "rosii"].map((id) => [id, ing(id)]));
const lookup = (id: string) => db.get(id);

let n = 0;
const step = (actionId: string | null, lines: [string, number][], text = ""): RecipeStep => ({
  id: `s${++n}`, text, actionId, minutes: null, activeMinutes: null, tempC: null,
  lines: lines.map(([ingredientId, amount], i) => ({ id: `l${n}-${i}`, ingredientId, amount, unit: "g", flex: null })),
});
const recipe = (id: string, steps: RecipeStep[], over: Partial<Recipe> = {}): Recipe => ({
  id, name: id, category: "cina", servings: 1, freezes: false, keepsDays: 4, notes: "", steps, ...over,
});

// Două rețete care folosesc cartofi la airfryer: exemplul din discuție.
const burger = recipe("burger", [
  step("curata-cartofi", [["cartofi", 400]]),
  step("af-cartofi", [["ulei", 5]]),
  step("rumeneste-tocata", [["vita", 200]]),
]);
const tava = recipe("pui-cartofi", [
  step("curata-cartofi", [["cartofi", 250]]),
  step("af-cartofi", []),
  step("taie-carne", [["pui", 180]]),
  step("tigaie-pui", [["ulei", 5]]),
]);
const bowl = recipe("bowl", [step("fierbe-orez", [["orez", 90]]), step("af-congelate", [["broccoli", 200]])], { category: "pranz" });
const recipes = new Map([burger, tava, bowl].map((r) => [r.id, r]));

const meal = (date: string, slot: Meal["slot"], recipeId: string, servings = 1): Meal => ({
  id: `${date}-${slot}-${recipeId}`, date, slot, recipeId, ingredientId: null, grams: null, servings, pinned: {}, solved: {}, status: "planned", sort: 0,
});

const plan = (meals: Meal[], sessionDate = "2026-10-11") =>
  planSession({ meals, recipes: (id) => recipes.get(id), lookup, actions, equipment: EQUIPMENT, sessionDate });

describe("cooking session", () => {
  it("merges the airfryer potatoes of two recipes into one task and sums the grams", () => {
    const p = plan([meal("2026-10-12", "cina", "burger"), meal("2026-10-12", "pranz", "pui-cartofi")]);
    const potatoes = p.timeline.filter((s) => s.task.actionId === "af-cartofi");
    expect(potatoes).toHaveLength(1);
    expect(potatoes[0].task.recipeIds.sort()).toEqual(["burger", "pui-cartofi"]);
    expect(Math.round(potatoes[0].task.loadG)).toBe(400 + 5 + 250);
    // Curățatul cartofilor se face o singură dată, pentru ambele.
    expect(p.timeline.filter((s) => s.task.actionId === "curata-cartofi")).toHaveLength(1);
  });

  it("splits into airfryer batches when the basket is full (700 g)", () => {
    const meals = ["2026-10-12", "2026-10-13", "2026-10-14"].map((d) => meal(d, "cina", "burger"));
    const p = plan(meals);
    const batches = p.timeline.filter((s) => s.task.actionId === "af-cartofi");
    expect(batches).toHaveLength(2); // 3 × 405 g = 1215 g
    expect(batches[1].start).toBeGreaterThanOrEqual(batches[0].end);
  });

  it("runs passive work in parallel and beats cooking recipe by recipe", () => {
    const meals = ["2026-10-12", "2026-10-13", "2026-10-14"].flatMap((d) => [meal(d, "pranz", "bowl"), meal(d, "cina", "burger")]);
    const p = plan(meals);
    expect(p.totalMinutes).toBeLessThan(p.serialMinutes);
    const rice = p.timeline.find((s) => s.task.actionId === "fierbe-orez")!;
    const overlapping = p.timeline.filter((s) => s !== rice && s.start < rice.end && s.end > rice.start);
    expect(overlapping.length).toBeGreaterThan(0);
  });

  it("never has you doing two active things at once", () => {
    const meals = ["2026-10-12", "2026-10-13", "2026-10-14"].flatMap((d) => [meal(d, "pranz", "bowl"), meal(d, "cina", "burger"), meal(d, "gustare", "pui-cartofi")]);
    const active = plan(meals).timeline.filter((s) => s.activeEnd > s.start).sort((a, b) => a.start - b.start);
    for (let i = 1; i < active.length; i++) expect(active[i].start).toBeGreaterThanOrEqual(active[i - 1].activeEnd - 1e-9);
  });

  it("respects step order within a recipe and adds portioning at the end", () => {
    const p = plan(["2026-10-12", "2026-10-13"].map((d) => meal(d, "cina", "burger")));
    const of = (a: string) => p.timeline.find((s) => s.task.actionId === a)!;
    expect(of("af-cartofi").start).toBeGreaterThanOrEqual(of("curata-cartofi").end);
    const portion = p.timeline.find((s) => s.task.kind === "portion")!;
    expect(portion.task.title).toContain("2 caserole");
    expect(portion.start).toBeGreaterThanOrEqual(Math.max(...p.timeline.filter((s) => s.task.kind !== "portion").map((s) => s.end)) - 30);
  });

  it("warns when the last portion is older than the recipe keeps", () => {
    recipes.set("somon", recipe("somon", [step("af-peste", [["pui", 170]])], { keepsDays: 2 }));
    const p = plan(["2026-10-12", "2026-10-13", "2026-10-14"].map((d) => meal(d, "cina", "somon")));
    expect(p.portions[0].warnings[0]).toMatch(/2 zile/);
  });

  it("does not merge steps when it would create a cycle", () => {
    const a = recipe("a", [step("taie-legume", [["ceapa", 100]]), step("soteaza-legume", [["rosii", 100]])]);
    const b = recipe("b", [step("soteaza-legume", [["rosii", 100]]), step("taie-legume", [["ceapa", 100]])]);
    recipes.set("a", a);
    recipes.set("b", b);
    const p = plan([meal("2026-10-12", "cina", "a"), meal("2026-10-12", "pranz", "b")]);
    expect(p.timeline.length).toBeGreaterThan(0);
    expect(p.warnings.filter((w) => w.startsWith("Nu am putut"))).toHaveLength(0);
    expect(mergeTasks).toBeTypeOf("function");
  });

  it("moves work off the airfryer when it is the bottleneck", () => {
    const big = recipe("mult", [step("curata-cartofi", [["cartofi", 700]]), step("af-cartofi", []), step("taie-carne", [["pui", 250]]), step("af-pui", [])]);
    recipes.set("mult", big);
    const p = plan(["2026-10-12", "2026-10-13", "2026-10-14"].map((d) => meal(d, "cina", "mult")));
    const airfryerMinutes = p.timeline.filter((s) => s.units.some((u) => u.startsWith("airfryer"))).reduce((a, s) => a + s.end - s.start, 0);
    expect(airfryerMinutes).toBeLessThan(3 * 20 + 2 * 16);
    expect(p.switches.length).toBeGreaterThan(0);
  });

  it("starts hands-off work (rice, oven) before long prep", () => {
    const p = plan(["2026-10-12", "2026-10-13", "2026-10-14"].flatMap((d) => [meal(d, "pranz", "bowl"), meal(d, "cina", "burger")]));
    const rice = p.timeline.find((s) => s.task.actionId === "fierbe-orez")!;
    const peel = p.timeline.find((s) => s.task.actionId === "curata-cartofi")!;
    expect(rice.start).toBeLessThanOrEqual(peel.start);
  });

  it("leaves no-cook recipes out of the session", () => {
    recipes.set("iaurt", recipe("iaurt", [step("asambleaza", [["orez", 50]])], { category: "gustare" }));
    const p = plan([meal("2026-10-12", "gustare", "iaurt"), meal("2026-10-12", "cina", "burger")]);
    expect(p.noCook.map((x) => x.recipeId)).toEqual(["iaurt"]);
    expect(p.timeline.some((s) => s.task.recipeIds.includes("iaurt"))).toBe(false);
  });

  it("does not portion what you eat on the cooking day", () => {
    const p = plan([meal("2026-10-11", "cina", "burger"), meal("2026-10-12", "cina", "bowl")], "2026-10-11");
    const portions = p.timeline.filter((s) => s.task.kind === "portion");
    expect(portions.map((s) => s.task.recipeIds[0])).toEqual(["bowl"]);
  });

  it("keeps each recipe in its own batch when they do not fit together", () => {
    const a = recipe("pui-a", [step("taie-carne", [["pui", 450]]), step("condimenteaza", [["ulei", 5]]), step("tigaie-pui", [])]);
    const b = recipe("pui-b", [step("taie-carne", [["pui", 400]]), step("condimenteaza", [["ulei", 5]]), step("tigaie-pui", [])]);
    recipes.set(a.id, a);
    recipes.set(b.id, b);
    const p = plan([meal("2026-10-12", "pranz", "pui-a"), meal("2026-10-12", "cina", "pui-b")]);
    const cooks = p.timeline.filter((s) => s.task.kind === "cook" && s.inputs.some((l) => l.ingredientId === "pui"));
    // Fiecare tură are o singură rețetă (împreună n-ar încăpea în tigaie / coș).
    for (const c of cooks) expect(c.recipeIds).toHaveLength(1);
    expect(p.timeline.filter((s) => s.task.actionId === "condimenteaza")).toHaveLength(2);
    const chicken = cooks.flatMap((c) => c.inputs).filter((l) => l.ingredientId === "pui").reduce((x, l) => x + l.grams, 0);
    expect(Math.round(chicken)).toBe(850);
  });

  it("never overfills the oven dishes", () => {
    const tava = recipe("tava", [step("cuptor-pui", [["pui", 450]]), step("cuptor-legume", [["broccoli", 300]])]);
    recipes.set(tava.id, tava);
    const p = plan(["2026-10-12", "2026-10-13", "2026-10-14"].map((d) => meal(d, "cina", "tava")));
    const cap = new Map(EQUIPMENT.map((e) => [e.id, e.capacityG ?? 0]));
    for (const s of p.timeline.filter((x) => x.units.some((u) => u.startsWith("jena") || u.startsWith("vas-ceramic")))) {
      const room = s.units.reduce((a, u) => a + (cap.get(u.split("#")[0]) ?? 0), 0);
      expect(s.loadG * s.task.loadFactor).toBeLessThanOrEqual(room);
    }
  });
});
