import { aisleOrder } from "./aisles";
import { recipeLines, type IngredientLookup } from "./macros";
import { lineServingGrams, type Meal } from "./plan";
import type { Ingredient, Recipe } from "./types";

export type ShoppingItem = {
  ingredient: Ingredient;
  /** Câte grame cer mesele. */
  needG: number;
  /** Câte pachete iei și cât cântăresc în total (null dacă produsul nu are pachet definit). */
  packs: number | null;
  buyG: number;
  /** Ce rămâne după interval: intră în sugestiile pentru zilele următoare. */
  surplusG: number;
  /** Câte bucăți înseamnă, dacă produsul are porția „bucată”. */
  pieces: number | null;
  /** Rețetele care îl folosesc, pentru context în magazin. */
  usedIn: string[];
};

/** Cât ai nevoie din fiecare ingredient pentru mesele date (mesele sărite nu contează). */
export function ingredientNeeds(meals: Meal[], recipes: (id: string) => Recipe | undefined, lookup: IngredientLookup) {
  const need = new Map<string, { grams: number; usedIn: Set<string> }>();
  const addNeed = (id: string, g: number, label: string) => {
    if (g <= 0) return;
    const cur = need.get(id) ?? { grams: 0, usedIn: new Set<string>() };
    cur.grams += g;
    cur.usedIn.add(label);
    need.set(id, cur);
  };
  for (const m of meals) {
    if (m.status === "skipped") continue;
    if (m.ingredientId) {
      addNeed(m.ingredientId, m.grams ?? 0, "extra");
      continue;
    }
    const r = m.recipeId ? recipes(m.recipeId) : undefined;
    if (!r) continue;
    for (const l of recipeLines(r)) addNeed(l.ingredientId, lineServingGrams(r, l, lookup, m) * m.servings, r.name);
  }
  return need;
}

/** Rotunjire „de magazin” pentru produsele fără pachet: nimeni nu cere 437 g de ceapă. */
function roundUpLoose(g: number) {
  if (g <= 50) return Math.ceil(g / 5) * 5;
  if (g <= 300) return Math.ceil(g / 25) * 25;
  return Math.ceil(g / 50) * 50;
}

export function buildShoppingList(meals: Meal[], recipes: (id: string) => Recipe | undefined, lookup: IngredientLookup): ShoppingItem[] {
  const items: ShoppingItem[] = [];
  for (const [id, { grams, usedIn }] of ingredientNeeds(meals, recipes, lookup)) {
    const ingredient = lookup(id);
    if (!ingredient) continue;
    const pack = ingredient.packGrams;
    // 2% toleranță: 1010 g din pachete de 500 g nu justifică un al treilea pachet.
    const packs = pack ? Math.max(1, Math.ceil(grams / pack - 0.02)) : null;
    const buyG = packs && pack ? packs * pack : roundUpLoose(grams);
    const piece = ingredient.portions.find((p) => p.name === "bucată")?.grams;
    items.push({
      ingredient,
      needG: grams,
      packs,
      buyG,
      surplusG: Math.max(0, buyG - grams),
      pieces: piece ? Math.ceil(grams / piece - 0.1) : null,
      usedIn: [...usedIn],
    });
  }
  return items.sort(
    (a, b) =>
      Number(a.ingredient.staple) - Number(b.ingredient.staple) ||
      aisleOrder(a.ingredient.aisle) - aisleOrder(b.ingredient.aisle) ||
      a.ingredient.name.localeCompare(b.ingredient.name, "ro"),
  );
}
