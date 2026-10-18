import { describe, expect, it } from "vitest";
import { planSession } from "./cooking";
import { boxContents, destinationOf } from "./cook-guide";
import type { Meal } from "./plan";
import type { Ingredient, Recipe, RecipeStep } from "./types";
import { ACTIONS, EQUIPMENT } from "@/server/seed/kitchen";

const actions = new Map(ACTIONS.map((a) => [a.id, a]));
const ing = (id: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id, name: id, brand: null, per100: { kcal: 100, protein: 10, carbs: 10, fat: 2, fiber: 1 }, density: 1, portions: [],
  packGrams: null, packLabel: null, aisle: "altele", staple: false, lidl: false, source: "manual", barcode: null, ...over,
});
const db = new Map(
  [ing("Cartofi"), ing("Vită tocată"), ing("Orez"), ing("Pui"), ing("Brânză"), ing("Sare", { toTaste: "condiment" }), ing("Ulei", { toTaste: "ulei" })].map((i) => [i.id, i]),
);
let n = 0;
const step = (actionId: string, lines: [string, number][], text = ""): RecipeStep => ({
  id: `s${++n}`, text, actionId, minutes: null, activeMinutes: null, tempC: null,
  lines: lines.map(([ingredientId, amount], i) => ({ id: `l${n}-${i}`, ingredientId, amount, unit: "g", flex: null })),
});
const recipe = (id: string, steps: RecipeStep[], category: Recipe["category"] = "cina"): Recipe => ({
  id, name: id, category, servings: 1, freezes: false, keepsDays: 4, notes: "", steps,
});
const burger = recipe("burger", [
  step("curata-cartofi", [["Cartofi", 400]]),
  step("af-cartofi", [["Ulei", 5], ["Sare", 1]]),
  step("rumeneste-tocata", [["Vită tocată", 200]]),
  step("asambleaza", [["Brânză", 20]], "Pune brânza peste carnea caldă."),
]);
const bowl = recipe("bowl", [step("fierbe-orez", [["Orez", 80]]), step("taie-carne", [["Pui", 200]]), step("tigaie-pui", [["Ulei", 5]])], "pranz");
const recipes = new Map([burger, bowl].map((r) => [r.id, r]));
const meal = (date: string, slot: Meal["slot"], recipeId: string): Meal => ({
  id: `${date}-${slot}`, date, slot, recipeId, ingredientId: null, grams: null, servings: 1, pinned: {}, solved: {}, status: "planned", sort: 0,
});
const days = ["2026-10-19", "2026-10-20", "2026-10-21"];
const plan = planSession({
  meals: days.flatMap((d) => [meal(d, "cina", "burger"), meal(d, "pranz", "bowl")]),
  recipes: (id) => recipes.get(id), lookup: (id) => db.get(id), actions, equipment: EQUIPMENT, sessionDate: "2026-10-18",
});
// Sesiunea poate schimba metoda (airfryer ↔ cuptor), deci căutăm după ce e în pas.
const job = (pred: (t: string) => boolean) => plan.timeline.find((j) => pred(j.task.switchedFrom ?? j.task.actionId ?? j.task.id))!;

describe("where the food goes after a step", () => {
  it("cut potatoes go into the airfryer step", () => {
    const d = destinationOf(job((a) => a === "curata-cartofi"), plan);
    expect(d?.kind).toBe("into");
  });

  it("finished components go straight into that recipe's boxes", () => {
    const fries = destinationOf(job((a) => a === "af-cartofi"), plan);
    expect(fries).toMatchObject({ kind: "boxes", parts: [{ recipeId: "burger", boxes: 3 }] });
    const rice = destinationOf(job((a) => a === "fierbe-orez"), plan);
    expect(rice).toMatchObject({ kind: "boxes", parts: [{ recipeId: "bowl", boxes: 3 }] });
  });

  it("the box checklist lists every component and the finishing touch, not the spices", () => {
    expect(boxContents("burger", plan)).toEqual({ components: expect.arrayContaining(["vită tocată"]), finishing: ["Pune brânza peste carnea caldă."] });
    expect(boxContents("bowl", plan).components.sort()).toEqual(["orez", "pui"]);
    expect(boxContents("burger", plan).components.join()).not.toMatch(/sare|ulei/);
  });
});
