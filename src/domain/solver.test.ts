import { describe, expect, it } from "vitest";
import { solve, dayTarget } from "./solver";
import { dayMacros, type Meal } from "./plan";
import { DEFAULT_SETTINGS, type Ingredient, type Recipe } from "./types";

const ing = (id: string, per100: Ingredient["per100"], packGrams: number | null = null): Ingredient => ({
  id, name: id, brand: null, per100, density: 1, portions: [], packGrams, packLabel: null,
  aisle: "altele", staple: false, lidl: false, source: "manual", barcode: null,
});

const db = new Map(
  [
    ing("pui", { kcal: 114, protein: 22.5, carbs: 0, fat: 2.6, fiber: 0 }, 500),
    ing("orez", { kcal: 352, protein: 7.1, carbs: 78.7, fat: 0.7, fiber: 1.3 }),
    ing("broccoli", { kcal: 36, protein: 2.8, carbs: 4, fat: 0.4, fiber: 2.6 }),
    ing("ulei", { kcal: 900, protein: 0, carbs: 0, fat: 100, fiber: 0 }),
    ing("iaurt", { kcal: 59, protein: 10.2, carbs: 3.6, fat: 0.4, fiber: 0 }),
    ing("ovaz", { kcal: 374, protein: 16.9, carbs: 55.7, fat: 6.9, fiber: 10.6 }),
    ing("cartofi", { kcal: 66, protein: 1.7, carbs: 13.3, fat: 0.1, fiber: 2.4 }),
    ing("vita", { kcal: 176, protein: 20, carbs: 0, fat: 10, fiber: 0 }),
  ].map((i) => [i.id, i]),
);
const lookup = (id: string) => db.get(id);

const line = (id: string, ingredientId: string, amount: number, flex?: [number, number]) => ({
  id, ingredientId, amount, unit: "g", flex: flex ? { min: flex[0], max: flex[1] } : null,
});
const recipe = (id: string, category: Recipe["category"], lines: ReturnType<typeof line>[]): Recipe => ({
  id, name: id, category, servings: 1, freezes: false, keepsDays: 3, notes: "",
  steps: [{ id: "s1", text: "", actionId: null, minutes: null, activeMinutes: null, tempC: null, lines }],
});

const recipes = new Map([
  recipe("bowl", "pranz", [line("a", "pui", 200, [150, 260]), line("b", "orez", 90, [50, 150]), line("c", "broccoli", 200), line("d", "ulei", 10)]),
  recipe("iaurt", "gustare", [line("a", "iaurt", 250, [200, 350]), line("b", "ovaz", 40, [20, 70])]),
  recipe("burger", "cina", [line("a", "vita", 200, [150, 240]), line("b", "cartofi", 450, [300, 700]), line("c", "ulei", 6)]),
].map((r) => [r.id, r]));
const getRecipe = (id: string) => recipes.get(id);

const meal = (date: string, slot: Meal["slot"], recipeId: string, extra: Partial<Meal> = {}): Meal => ({
  id: `${date}-${slot}`, date, slot, recipeId, ingredientId: null, grams: null, servings: 1,
  pinned: {}, solved: {}, status: "planned", sort: 0, ...extra,
});

const threeDays = ["2026-10-12", "2026-10-13", "2026-10-14"].flatMap((d) => [meal(d, "pranz", "bowl"), meal(d, "gustare", "iaurt"), meal(d, "cina", "burger")]);

describe("solver", () => {
  it("brings a full day within tolerance of the targets", () => {
    const res = solve({ meals: threeDays, recipes: getRecipe, lookup, settings: DEFAULT_SETTINGS });
    for (const m of res.days.values()) {
      expect(m.protein).toBeGreaterThanOrEqual(138);
      expect(m.protein).toBeLessThanOrEqual(158);
      expect(Math.abs(m.kcal - 2300)).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic and shares portions across the days of a recipe", () => {
    const a = solve({ meals: threeDays, recipes: getRecipe, lookup, settings: DEFAULT_SETTINGS });
    const b = solve({ meals: threeDays, recipes: getRecipe, lookup, settings: DEFAULT_SETTINGS });
    expect([...a.solved]).toEqual([...b.solved]);
    expect(a.solved.get("bowl")).toBeDefined();
  });

  it("respects flex bounds and manual pins", () => {
    const pinned = threeDays.map((m) => (m.slot === "cina" ? { ...m, pinned: { b: 300 } } : m));
    const res = solve({ meals: pinned, recipes: getRecipe, lookup, settings: DEFAULT_SETTINGS });
    expect(res.solved.get("burger")?.b).toBeUndefined();
    for (const [, lines] of res.solved) for (const g of Object.values(lines)) expect(g).toBeGreaterThan(0);
    const rice = res.solved.get("bowl")!.b;
    expect(rice).toBeGreaterThanOrEqual(50);
    expect(rice).toBeLessThanOrEqual(150);
  });

  it("scales the target to the planned slots", () => {
    const t = dayTarget([meal("2026-10-15", "cina", "burger")], DEFAULT_SETTINGS)!;
    expect(t.kcal).toBeCloseTo(2300 * 0.45);
    const res = solve({ meals: [meal("2026-10-15", "cina", "burger")], recipes: getRecipe, lookup, settings: DEFAULT_SETTINGS });
    expect(res.days.get("2026-10-15")!.kcal).toBeLessThan(1200);
  });

  it("ignores skipped meals and leaves base amounts when nothing is flexible", () => {
    const skipped = [meal("2026-10-16", "pranz", "bowl", { status: "skipped" })];
    const res = solve({ meals: skipped, recipes: getRecipe, lookup, settings: DEFAULT_SETTINGS });
    expect(res.solved.size).toBe(0);
    expect(dayMacros(skipped, getRecipe, lookup).kcal).toBe(0);
  });

  it("rounds chicken to a whole number of packs when that is cheap", () => {
    const res = solve({ meals: threeDays, recipes: getRecipe, lookup, settings: DEFAULT_SETTINGS });
    const chicken = res.solved.get("bowl")!.a * 3;
    // 3 porții × ~150 g ≈ 450 g → se aliniază la un pachet de 500 g (±1 g din rotunjirea per porție).
    expect(Math.abs(chicken - 500)).toBeLessThanOrEqual(3);
  });
});
