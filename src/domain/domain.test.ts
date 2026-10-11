import { describe, expect, it } from "vitest";
import { kcalFrom, recipeIngredientGrams, recipePerServing, round } from "./macros";
import { parseLine } from "./parse-lines";
import { isConfident, rank } from "./match";
import { toGrams, UnitError } from "./units";
import { normalize } from "./text";
import type { Ingredient, Recipe } from "./types";

const ing = (id: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name: id,
  brand: null,
  per100: { kcal: 100, protein: 10, carbs: 10, fat: 2, fiber: 1 },
  density: 1,
  portions: [],
  packGrams: null,
  packLabel: null,
  aisle: "altele",
  staple: false,
  lidl: false,
  source: "manual",
  barcode: null,
  ...over,
});

const pui = ing("pui", { per100: { kcal: 110, protein: 23, carbs: 0, fat: 1.5, fiber: 0 } });
const ou = ing("ou", { per100: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: null }, portions: [{ name: "bucată", grams: 55 }] });
const ulei = ing("ulei", { per100: { kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }, density: 0.92, portions: [{ name: "lingură", grams: 13 }] });
const db = new Map([pui, ou, ulei].map((i) => [i.id, i]));
const lookup = (id: string) => db.get(id);

describe("units", () => {
  it("converts weights, volumes and portions", () => {
    expect(toGrams(pui, 1.5, "kg")).toBe(1500);
    expect(toGrams(ulei, 100, "ml")).toBeCloseTo(92);
    expect(toGrams(ou, 2, "buc")).toBe(110);
    expect(toGrams(ulei, 1, "lingura")).toBe(13);
    expect(toGrams(pui, 1, "lingură")).toBe(10); // porție generică
  });
  it("fails loudly on unknown units", () => {
    expect(() => toGrams(pui, 1, "felie")).toThrow(UnitError);
  });
});

describe("macros", () => {
  it("computes kcal with EU fiber convention", () => {
    expect(kcalFrom({ protein: 140, carbs: 285, fat: 60, fiber: 30 })).toBe(2300);
  });

  const recipe: Recipe = {
    id: "r",
    name: "Pui cu ou",
    category: "cina",
    servings: 2,
    freezes: false,
    keepsDays: 3,
    notes: "",
    steps: [
      { id: "s1", text: "", actionId: null, minutes: null, activeMinutes: null, tempC: null, lines: [
        { id: "l1", ingredientId: "pui", amount: 400, unit: "g", flex: null },
        { id: "l2", ingredientId: "ulei", amount: 1, unit: "lingură", flex: null },
      ] },
      { id: "s2", text: "", actionId: null, minutes: null, activeMinutes: null, tempC: null, lines: [
        { id: "l3", ingredientId: "ou", amount: 2, unit: "bucată", flex: null },
        { id: "l4", ingredientId: "ulei", amount: 1, unit: "lingură", flex: null },
      ] },
    ],
  };

  it("divides by servings and flags unknown fiber", () => {
    const m = round(recipePerServing(recipe, lookup));
    expect(m.protein).toBe(Math.round((92 + 13.86) / 2));
    expect(m.fiberUnknown).toBe(true);
  });

  it("applies per-line overrides", () => {
    const m = recipePerServing(recipe, lookup, { l1: 600 });
    expect(m.protein).toBeCloseTo((138 + 13.86) / 2);
  });

  it("aggregates the same ingredient across steps and scales servings", () => {
    const g = recipeIngredientGrams(recipe, lookup, 6);
    expect(g.get("ulei")).toBe(26 * 3);
    expect(g.get("pui")).toBe(1200);
  });
});

describe("parseLine", () => {
  it.each([
    ["300g piept pui", 300, "g", "piept pui"],
    ["300 g piept de pui", 300, "g", "piept de pui"],
    ["1,5 kg cartofi", 1.5, "kg", "cartofi"],
    ["2 buc ou", 2, "bucată", "ou"],
    ["2 ouă", 2, "bucată", "ouă"],
    ["1 lingură ulei de măsline", 1, "lingură", "ulei de măsline"],
    ["½ lingurita sare", 0.5, "linguriță", "sare"],
    ["piept pui 250g", 250, "g", "piept pui"],
    ["- 200 ml lapte", 200, "ml", "lapte"],
    ["150 de grame orez", 150, "g", "orez"],
    ["400 orez basmati", 400, "g", "orez basmati"],
  ])("%s", (raw, amount, unit, query) => {
    expect(parseLine(raw)).toMatchObject({ amount, unit, query });
  });

  it("keeps lines without quantity", () => {
    expect(parseLine("piper după gust")).toMatchObject({ amount: null, query: "piper" });
  });
});

describe("match", () => {
  const cands = [
    { id: "1", name: "Piept de pui", brand: null, inLibrary: true },
    { id: "2", name: "Pizza cu piept de pui și ciuperci", brand: null, inLibrary: false },
    { id: "3", name: "Pulpe de pui", brand: null, inLibrary: true },
    { id: "4", name: "Cartofi albi", brand: null, inLibrary: false },
  ];
  it("prefers short exact names from the library", () => {
    const r = rank("piept pui", cands);
    expect(r[0].candidate.id).toBe("1");
    expect(isConfident(r)).toBe(true);
  });
  it("matches plural forms and ignores diacritics", () => {
    expect(rank("cartof", cands)[0].candidate.id).toBe("4");
    expect(normalize("Șuncă ţărănească")).toBe("sunca taraneasca");
  });
});
