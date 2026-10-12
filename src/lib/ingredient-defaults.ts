import type { IngredientInput } from "@/server/ingredients";

export const blankIngredient = (barcode: string | null = null): IngredientInput => ({
  name: "",
  brand: null,
  per100: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: null },
  density: 1,
  portions: [],
  packGrams: null,
  packLabel: null,
  aisle: "altele",
  staple: false,
  lidl: true,
  barcode,
  // Un produs nou se completează de pe etichetă.
  verified: true,
});
