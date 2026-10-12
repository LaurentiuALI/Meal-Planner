import type { ToTaste } from "./types";

/** Ce scriem în loc de grame. */
export const TASTE_LABEL: Record<ToTaste, string> = { condiment: "după gust", ulei: "puțin" };

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Condimentele și uleiul unui pas, ca instrucțiune: „Condimentează: sare, boia dulce”, „Puțin ulei de măsline”.
 * Ingredientele cântărite sunt ignorate.
 */
export function tasteNotes(items: { name: string; toTaste?: ToTaste | null }[]): string[] {
  const unique = (kind: ToTaste) => [...new Set(items.filter((i) => i.toTaste === kind).map((i) => lower(i.name)))];
  const spices = unique("condiment");
  const oils = unique("ulei");
  return [
    ...(spices.length ? [`Condimentează: ${spices.join(", ")}`] : []),
    ...(oils.length ? [`Puțin ${oils.join(" sau ")}`] : []),
  ];
}
