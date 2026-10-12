import type { AisleId } from "./aisles";

/** Valori per 100g de produs crud/uscat. `fiber: null` înseamnă necunoscut, nu zero. */
export type Per100 = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
};

export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Cel puțin un ingredient din sumă nu are fibrele cunoscute. */
  fiberUnknown: boolean;
};

export type Portion = { name: string; grams: number };

export type IngredientSource = "off" | "usda" | "manual" | "legacy";

/**
 * Ce nu cântărești: condimentele (după gust) și uleiul (puțin). În rețetă păstrăm o cantitate
 * estimată, doar pentru calcul; în aplicație apare „condimentează” / „puțin ulei”, fără grame.
 */
export type ToTaste = "condiment" | "ulei";

export type Ingredient = {
  id: string;
  name: string;
  brand: string | null;
  per100: Per100;
  /** g/ml, folosit doar când rețeta cere ml. */
  density: number;
  portions: Portion[];
  packGrams: number | null;
  packLabel: string | null;
  aisle: AisleId;
  staple: boolean;
  lidl: boolean;
  source: IngredientSource;
  barcode: string | null;
  toTaste?: ToTaste | null;
};

export type RecipeCategory = "pranz" | "gustare" | "cina" | "rapid";

export const RECIPE_CATEGORIES: { id: RecipeCategory; label: string }[] = [
  { id: "pranz", label: "Prânz" },
  { id: "gustare", label: "Gustare" },
  { id: "cina", label: "Cină" },
  { id: "rapid", label: "Rapid" },
];

export type RecipeLine = {
  id: string;
  ingredientId: string;
  amount: number;
  /** "g", "kg", "ml", "l" sau numele unei porții definite pe ingredient ("bucată"). */
  unit: string;
  /** Interval în grame pentru toată rețeta; `null` = cantitate fixă. */
  flex: { min: number; max: number } | null;
};

export type RecipeStep = {
  id: string;
  text: string;
  actionId: string | null;
  /** Suprascriu valorile implicite ale acțiunii; `null` = folosește acțiunea. */
  minutes: number | null;
  activeMinutes: number | null;
  tempC: number | null;
  lines: RecipeLine[];
};

export type Recipe = {
  id: string;
  name: string;
  category: RecipeCategory;
  servings: number;
  freezes: boolean;
  keepsDays: number;
  notes: string;
  steps: RecipeStep[];
};

export type EquipmentKind = "plita" | "cuptor" | "airfryer" | "vas" | "vas-cuptor" | "aparat";

export type Equipment = {
  id: string;
  name: string;
  kind: EquipmentKind;
  /** Câte bucăți identice (ex. 4 ochiuri). */
  count: number;
  /** Cât încape într-o tură, în grame. */
  capacityG: number | null;
};

export type Action = {
  id: string;
  name: string;
  /** Cerințe simultane; fiecare cerință e o listă de alternative (ex. [[tigaie-28, sauté-24], [aragaz]]). */
  equipment: string[][];
  minutes: number;
  activeMinutes: number;
  /** Minute active în plus pe kg (tocat, curățat), peste valoarea de bază. */
  perKgMinutes: number;
  tempC: number | null;
  /** De câte ori mai mult volum ocupă în vas decât greutatea crudă (orez cu apă ≈ 3). */
  loadFactor: number;
  /** Cât încape într-o tură pentru acțiunea asta; `null` = capacitatea ustensilei. */
  capacityG: number | null;
  /** Timpul se repetă pentru fiecare tură când cantitatea depășește capacitatea. */
  perBatch: boolean;
  /** Se poate face o singură dată pentru mai multe rețete (aceleași setări). */
  mergeable: boolean;
  /** Alte acțiuni care dau același rezultat (airfryer ↔ cuptor ↔ tigaie); sesiunea alege cea mai rapidă. */
  alternatives: string[];
  hint: string | null;
};

export type MacroTargets = {
  kcal: number;
  protein: number;
  fat: number;
  fiber: number;
};

export type SlotId = "pranz" | "gustare" | "cina";

export type Settings = {
  targets: MacroTargets;
  slots: { id: SlotId; label: string; share: number }[];
};

export const DEFAULT_SETTINGS: Settings = {
  targets: { kcal: 2300, protein: 140, fat: 60, fiber: 30 },
  slots: [
    { id: "pranz", label: "Prânz", share: 0.35 },
    { id: "gustare", label: "Gustare", share: 0.2 },
    { id: "cina", label: "Cină", share: 0.45 },
  ],
};
