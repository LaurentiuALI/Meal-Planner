import { add, macrosOf, recipeLines, scale, sum, ZERO, type IngredientLookup } from "./macros";
import { toGrams } from "./units";
import type { Macros, Recipe, RecipeLine, SlotId } from "./types";

export type MealSlot = SlotId | "extra";
export type MealStatus = "planned" | "eaten" | "skipped";

/**
 * O masă din plan: fie o rețetă (cu porții), fie un produs simplu (extra, gustare rapidă).
 * Gramajele sunt per O porție: `pinned` (setat de tine) bate `solved` (de la solver), care bate rețeta.
 */
export type Meal = {
  id: string;
  date: string;
  slot: MealSlot;
  recipeId: string | null;
  ingredientId: string | null;
  grams: number | null;
  servings: number;
  pinned: Record<string, number>;
  solved: Record<string, number>;
  status: MealStatus;
  sort: number;
};

export const SLOT_LABELS: Record<MealSlot, string> = { pranz: "Prânz", gustare: "Gustare", cina: "Cină", extra: "Extra" };

/** Gramele per porție pentru o linie de rețetă, după ajustări. */
export function lineServingGrams(recipe: Recipe, line: RecipeLine, lookup: IngredientLookup, meal?: Pick<Meal, "pinned" | "solved">): number {
  const pinned = meal?.pinned[line.id];
  if (pinned != null) return pinned;
  const solved = meal?.solved[line.id];
  if (solved != null) return solved;
  const ing = lookup(line.ingredientId);
  if (!ing) return 0;
  return toGrams(ing, line.amount, line.unit) / Math.max(1, recipe.servings);
}

/** Macro-urile mesei întregi (toate porțiile). Mesele sărite nu contează. */
export function mealMacros(meal: Meal, recipes: (id: string) => Recipe | undefined, lookup: IngredientLookup): Macros {
  if (meal.status === "skipped") return ZERO;
  if (meal.ingredientId) {
    const ing = lookup(meal.ingredientId);
    return ing ? macrosOf(ing.per100, meal.grams ?? 0) : ZERO;
  }
  const recipe = meal.recipeId ? recipes(meal.recipeId) : undefined;
  if (!recipe) return ZERO;
  const perServing = sum(
    recipeLines(recipe).map((l) => {
      const ing = lookup(l.ingredientId);
      return ing ? macrosOf(ing.per100, lineServingGrams(recipe, l, lookup, meal)) : ZERO;
    }),
  );
  return scale(perServing, meal.servings);
}

export function dayMacros(meals: Meal[], recipes: (id: string) => Recipe | undefined, lookup: IngredientLookup): Macros {
  return meals.reduce((acc, m) => add(acc, mealMacros(m, recipes, lookup)), ZERO);
}

// ─── Date (YYYY-MM-DD, fără fus orar) ───

const toUtc = (d: string) => new Date(`${d}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** 0 = luni … 6 = duminică. */
export const weekday = (date: string) => (toUtc(date).getUTCDay() + 6) % 7;

export const mondayOf = (date: string) => addDays(date, -weekday(date));

export const weekDates = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export const daysBetween = (a: string, b: string) => Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);

const WEEKDAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const MONTHS = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];

export const weekdayName = (date: string) => WEEKDAYS[weekday(date)];

export function shortDate(date: string) {
  const d = toUtc(date);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Data de azi în fusul orar al utilizatorului (implicit Europe/Bucharest). */
export function today(tz = "Europe/Bucharest"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Intervalul implicit pentru cumpărături/gătit: duminică–marți te pregătești pentru luni–miercuri
 * (duminica, pentru săptămâna care începe mâine); miercuri–sâmbătă, pentru joi–vineri.
 */
export function defaultBlock(todayDate: string): { from: string; to: string } {
  const wd = weekday(todayDate);
  const monday = wd === 6 ? addDays(todayDate, 1) : mondayOf(todayDate);
  if (wd === 6 || wd <= 1) return { from: monday, to: addDays(monday, 2) };
  return { from: addDays(monday, 3), to: addDays(monday, 4) };
}

// ─── Rotația propusă ───

/** Un număr stabil din text (FNV-1a), ca ordinea la egalitate să difere de la o săptămână la alta, nu alfabetic. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Ordinea în care propunem rețetele unui slot: întâi cele folosite cel mai demult (nefolosite deloc
 * primele), iar cele de săptămâna trecută la coadă. „Alta” din fereastra de propunere merge mai
 * departe pe lista asta.
 */
export function rankForSlot(opts: { recipeIds: string[]; lastUsed: Map<string, string>; lastWeek: Set<string>; seed: string }): string[] {
  const { recipeIds, lastUsed, lastWeek, seed } = opts;
  const pool = [...recipeIds].sort(
    (a, b) => (lastUsed.get(a) ?? "").localeCompare(lastUsed.get(b) ?? "") || hash(`${seed}:${a}`) - hash(`${seed}:${b}`),
  );
  return [...pool.filter((id) => !lastWeek.has(id)), ...pool.filter((id) => lastWeek.has(id))];
}

/**
 * Ce e deja în slot în zilele de gătit: nimic, o propunere neatinsă (aceeași rețetă, planificată,
 * fără gramaje fixate) sau ceva modificat de tine (mâncat, sărit, gramaje fixate, rețete diferite).
 */
export function slotState(current: Pick<Meal, "recipeId" | "status" | "pinned">[]): { recipeId: string | null; locked: boolean } {
  if (!current.length) return { recipeId: null, locked: false };
  const ids = new Set(current.map((m) => m.recipeId));
  const untouched = ids.size === 1 && current.every((m) => m.recipeId && m.status === "planned" && Object.keys(m.pinned).length === 0);
  return { recipeId: current[0].recipeId, locked: !untouched };
}

/**
 * Prima rețetă arătată pentru slot: după o propunere neatinsă vine următoarea, ca „Propune” să dea
 * mereu altceva; un slot modificat de tine rămâne pe ce ai ales (-1 dacă nu e o rețetă din listă).
 */
export function firstPick(candidates: string[], state: { recipeId: string | null; locked: boolean }): number {
  if (!candidates.length) return -1;
  const at = state.recipeId ? candidates.indexOf(state.recipeId) : -1;
  if (state.locked) return at;
  return at < 0 ? 0 : (at + 1) % candidates.length;
}
