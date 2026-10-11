/** Raioanele, în ordinea în care le parcurgi de obicei într-un Lidl. */
export const AISLES = [
  { id: "fructe-legume", label: "Fructe și legume" },
  { id: "brutarie", label: "Brutărie" },
  { id: "lactate-oua", label: "Lactate și ouă" },
  { id: "carne", label: "Carne" },
  { id: "peste", label: "Pește" },
  { id: "mezeluri", label: "Mezeluri" },
  { id: "congelate", label: "Congelate" },
  { id: "camara", label: "Paste, orez, cereale" },
  { id: "conserve", label: "Conserve" },
  { id: "condimente", label: "Condimente, uleiuri, sosuri" },
  { id: "gustari", label: "Gustări și dulciuri" },
  { id: "bauturi", label: "Băuturi" },
  { id: "altele", label: "Altele" },
] as const;

export type AisleId = (typeof AISLES)[number]["id"];

export const AISLE_IDS = AISLES.map((a) => a.id) as AisleId[];

export const aisleLabel = (id: string) => AISLES.find((a) => a.id === id)?.label ?? "Altele";

export const aisleOrder = (id: string) => {
  const i = AISLE_IDS.indexOf(id as AisleId);
  return i === -1 ? AISLE_IDS.length : i;
};

/** Primul tag care se potrivește câștigă, deci regulile specifice stau înaintea celor generale. */
const OFF_RULES: [RegExp, AisleId][] = [
  [/frozen/, "congelate"],
  [/canned|tinned|preserved/, "conserve"],
  [/beverages|drinks|juices|waters|sodas|coffees|teas/, "bauturi"],
  [/hams|sausages|salami|cured-meats|prepared-meats|bacon/, "mezeluri"],
  [/fishes|seafood|tunas|salmons/, "peste"],
  [/meats|poultry|chickens|beef|pork|turkey/, "carne"],
  [/eggs|dairies|milks|cheeses|yogurts|butters|creams/, "lactate-oua"],
  [/breads|bakery|viennoiseries|tortillas|wraps/, "brutarie"],
  [/fruits|vegetables|salads|mushrooms|potatoes|herbs/, "fructe-legume"],
  [/pastas|rices|cereals|flours|legumes|pulses|oats|seeds|nuts|grains/, "camara"],
  [/sauces|condiments|spices|oils|vinegars|dressings|mustards|ketchup|honeys|spreads/, "condimente"],
  [/snacks|sweets|chocolates|biscuits|confectioneries|desserts|chips/, "gustari"],
];

export function aisleFromOffCategories(tags: string[]): AisleId {
  // Tag-urile OFF merg de la general la specific, deci le parcurgem de la coadă.
  // „plant-based-foods-and-beverages” e prea general și ar potrivi „beverages” pentru orice.
  for (const tag of [...tags].reverse().filter((t) => !t.includes("foods-and-beverages"))) {
    for (const [re, aisle] of OFF_RULES) if (re.test(tag)) return aisle;
  }
  return "altele";
}
