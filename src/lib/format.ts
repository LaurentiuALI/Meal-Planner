import type { Ingredient } from "@/domain/types";
import { toGrams } from "@/domain/units";

const PLURAL: Record<string, string> = {
  bucată: "bucăți",
  felie: "felii",
  lingură: "linguri",
  linguriță: "lingurițe",
  cană: "căni",
  pumn: "pumni",
  cățel: "căței",
  pachet: "pachete",
  conservă: "conserve",
};

export const num = (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toString().replace(".", ","));

export function grams(g: number) {
  if (g >= 1000) return `${num(Math.round(g / 10) / 100)} kg`;
  return `${g >= 20 ? Math.round(g) : num(g)} g`;
}

/** „2 bucăți (110 g)”, „300 g”, „1 lingură (13,5 g)”. */
export function formatAmount(amount: number, unit: string, ing?: Ingredient) {
  if (unit === "g") return grams(amount);
  if (unit === "kg") return grams(amount * 1000);
  const label = amount === 1 ? unit : (PLURAL[unit] ?? unit);
  if (!ing) return `${num(amount)} ${label}`;
  try {
    return `${num(amount)} ${label} (${grams(toGrams(ing, amount, unit))})`;
  } catch {
    return `${num(amount)} ${label}`;
  }
}

export function minutes(m: number) {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h} h ${r} min` : `${h} h`;
}
