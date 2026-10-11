import type { Ingredient } from "./types";
import { normalize } from "./text";

/** Sinonimele pe care le recunoaște parserul, mapate pe unitatea canonică. */
const UNIT_ALIASES: Record<string, string> = {
  g: "g", gr: "g", gram: "g", grame: "g", grama: "g",
  kg: "kg", kilogram: "kg", kilograme: "kg",
  ml: "ml", l: "l", litru: "l", litri: "l",
  buc: "bucată", bucata: "bucată", bucati: "bucată", bc: "bucată",
  felie: "felie", felii: "felie",
  lingura: "lingură", linguri: "lingură", lg: "lingură",
  lingurita: "linguriță", lingurite: "linguriță", lgt: "linguriță",
  cana: "cană", cani: "cană",
  pumn: "pumn", pumni: "pumn",
  catel: "cățel", catei: "cățel",
  conserva: "conservă", conserve: "conservă",
  pachet: "pachet", pachete: "pachet",
};

/** Valori implicite când ingredientul nu își definește porția. */
const GENERIC_PORTIONS: Record<string, number> = {
  "lingură": 10,
  "linguriță": 4,
  "cană": 240,
};

export function canonicalUnit(raw: string): string | null {
  return UNIT_ALIASES[normalize(raw)] ?? null;
}

export class UnitError extends Error {}

/** Câte grame înseamnă `amount unit` pentru ingredientul dat. */
export function toGrams(ing: Ingredient, amount: number, unit: string): number {
  const u = canonicalUnit(unit) ?? unit;
  switch (u) {
    case "g":
      return amount;
    case "kg":
      return amount * 1000;
    case "ml":
      return amount * ing.density;
    case "l":
      return amount * 1000 * ing.density;
    case "pachet":
      if (ing.packGrams) return amount * ing.packGrams;
      break;
  }
  const portion = ing.portions.find((p) => normalize(p.name) === normalize(u));
  if (portion) return amount * portion.grams;
  if (GENERIC_PORTIONS[u]) return amount * GENERIC_PORTIONS[u];
  throw new UnitError(`„${ing.name}” nu are definită unitatea „${unit}”`);
}

/** Unitățile pe care le poți alege pentru un ingredient, în ordinea utilității. */
export function unitsFor(ing: Ingredient): string[] {
  const out = ["g", ...ing.portions.map((p) => p.name)];
  if (ing.packGrams) out.push("pachet");
  out.push("ml", "lingură", "linguriță");
  return [...new Set(out)];
}
