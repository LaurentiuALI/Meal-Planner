import { describe, expect, it } from "vitest";
import { buildShoppingList } from "./shopping";
import type { Meal } from "./plan";
import type { Ingredient, Recipe } from "./types";

const ing = (id: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id, name: id, brand: null, per100: { kcal: 100, protein: 10, carbs: 10, fat: 2, fiber: 1 }, density: 1, portions: [],
  packGrams: null, packLabel: null, aisle: "altele", staple: false, lidl: false, source: "manual", barcode: null, ...over,
});
const db = new Map(
  [
    ing("pui", { packGrams: 500, aisle: "carne" }),
    ing("cartofi", { aisle: "fructe-legume", portions: [{ name: "bucată", grams: 200 }] }),
    ing("sare", { staple: true, aisle: "condimente" }),
    ing("iaurt", { packGrams: 400, aisle: "lactate-oua" }),
  ].map((i) => [i.id, i]),
);
const recipe: Recipe = {
  id: "r", name: "Pui cu cartofi", category: "cina", servings: 1, freezes: false, keepsDays: 3, notes: "",
  steps: [{ id: "s", text: "", actionId: null, minutes: null, activeMinutes: null, tempC: null, lines: [
    { id: "a", ingredientId: "pui", amount: 170, unit: "g", flex: { min: 100, max: 250 } },
    { id: "b", ingredientId: "cartofi", amount: 430, unit: "g", flex: null },
    { id: "c", ingredientId: "sare", amount: 2, unit: "g", flex: null },
  ] }],
};
const meal = (date: string, extra: Partial<Meal> = {}): Meal => ({
  id: date, date, slot: "cina", recipeId: "r", ingredientId: null, grams: null, servings: 1, pinned: {}, solved: {}, status: "planned", sort: 0, ...extra,
});

describe("shopping list", () => {
  const list = buildShoppingList(
    [meal("d1"), meal("d2", { solved: { a: 200 } }), meal("d3", { status: "skipped" }), { ...meal("d4"), recipeId: null, ingredientId: "iaurt", grams: 250, slot: "extra" }],
    () => recipe,
    (id) => db.get(id),
  );
  const by = (id: string) => list.find((i) => i.ingredient.id === id)!;

  it("uses solved amounts and ignores skipped meals", () => {
    expect(by("pui").needG).toBe(370);
    expect(by("cartofi").needG).toBe(860);
  });
  it("rounds up to whole packs and reports the surplus", () => {
    expect(by("pui")).toMatchObject({ packs: 1, buyG: 500, surplusG: 130 });
    expect(by("iaurt")).toMatchObject({ packs: 1, buyG: 400, surplusG: 150 });
  });
  it("rounds loose produce and estimates pieces", () => {
    expect(by("cartofi")).toMatchObject({ packs: null, buyG: 900, pieces: 5 });
  });
  it("puts staples last and sorts by aisle", () => {
    expect(list.map((i) => i.ingredient.id)).toEqual(["cartofi", "iaurt", "pui", "sare"]);
  });
});
