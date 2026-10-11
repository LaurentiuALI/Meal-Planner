import type { Action, Equipment, Ingredient, Recipe } from "@/domain/types";
import type { AisleId } from "@/domain/aisles";
import type * as t from "./db/schema";

export function rowToIngredient(r: typeof t.ingredients.$inferSelect): Ingredient {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    per100: { kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber },
    density: r.density,
    portions: r.portions,
    packGrams: r.packGrams,
    packLabel: r.packLabel,
    aisle: r.aisle as AisleId,
    staple: r.staple,
    lidl: r.lidl,
    source: r.source,
    barcode: r.barcode,
  };
}

export function rowToRecipe(r: typeof t.recipes.$inferSelect): Recipe {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    servings: r.servings,
    freezes: r.freezes,
    keepsDays: r.keepsDays,
    notes: r.notes,
    steps: r.steps,
  };
}

export const rowToAction = (r: typeof t.actions.$inferSelect): Action => {
  const { sort: _sort, ...a } = r;
  return a;
};

export const rowToEquipment = (r: typeof t.equipment.$inferSelect): Equipment => {
  const { sort: _sort, ...e } = r;
  return e;
};
