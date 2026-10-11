import type { Ingredient, Macros, Per100, Recipe, RecipeLine } from "./types";
import { toGrams } from "./units";

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, fiberUnknown: false };

/** Carbohidrații din UE exclud fibrele; fibrele aduc ~2 kcal/g. */
export function kcalFrom(m: { protein: number; carbs: number; fat: number; fiber?: number | null }) {
  return 4 * m.protein + 4 * m.carbs + 9 * m.fat + 2 * (m.fiber ?? 0);
}

export function macrosOf(per100: Per100, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
    fiber: (per100.fiber ?? 0) * f,
    fiberUnknown: per100.fiber == null && grams > 0,
  };
}

export function add(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
    fiberUnknown: a.fiberUnknown || b.fiberUnknown,
  };
}

export function scale(m: Macros, k: number): Macros {
  return {
    kcal: m.kcal * k,
    protein: m.protein * k,
    carbs: m.carbs * k,
    fat: m.fat * k,
    fiber: m.fiber * k,
    fiberUnknown: m.fiberUnknown,
  };
}

export const sum = (items: Macros[]) => items.reduce(add, ZERO);

export type IngredientLookup = (id: string) => Ingredient | undefined;

export function lineGrams(line: RecipeLine, lookup: IngredientLookup): number {
  const ing = lookup(line.ingredientId);
  if (!ing) return 0;
  return toGrams(ing, line.amount, line.unit);
}

export function lineMacros(line: RecipeLine, lookup: IngredientLookup, gramsOverride?: number): Macros {
  const ing = lookup(line.ingredientId);
  if (!ing) return ZERO;
  return macrosOf(ing.per100, gramsOverride ?? toGrams(ing, line.amount, line.unit));
}

export const recipeLines = (r: Recipe) => r.steps.flatMap((s) => s.lines);

/**
 * Macro-urile pentru o porție de rețetă.
 * `overrides` (lineId → grame pentru toată rețeta) vine din ajustările solverului sau manuale.
 */
export function recipePerServing(
  r: Recipe,
  lookup: IngredientLookup,
  overrides: Record<string, number> = {},
): Macros {
  const total = sum(recipeLines(r).map((l) => lineMacros(l, lookup, overrides[l.id])));
  return scale(total, 1 / Math.max(1, r.servings));
}

/** Gramajele totale per ingredient (pentru N porții), rețeta putând avea același ingredient pe mai mulți pași. */
export function recipeIngredientGrams(
  r: Recipe,
  lookup: IngredientLookup,
  servings: number,
  overrides: Record<string, number> = {},
): Map<string, number> {
  const k = servings / Math.max(1, r.servings);
  const out = new Map<string, number>();
  for (const l of recipeLines(r)) {
    const g = (overrides[l.id] ?? lineGrams(l, lookup)) * k;
    out.set(l.ingredientId, (out.get(l.ingredientId) ?? 0) + g);
  }
  return out;
}

export function round(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
    fiber: Math.round(m.fiber),
    fiberUnknown: m.fiberUnknown,
  };
}
