import "server-only";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "./db/client";
import * as t from "./db/schema";
import { rowToRecipe } from "./mappers";
import { getIngredients, addToLibrary } from "./ingredients";
import { getSettings } from "./settings";
import { listRecipes, recipeBundle } from "./recipes";
import { addDays, mondayOf, rankForSlot, slotState, weekDates, type Meal, type MealSlot } from "@/domain/plan";
import { solve } from "@/domain/solver";
import { buildShoppingList, suggestFromLeftovers } from "@/domain/shopping";
import type { Ingredient, Recipe, SlotId } from "@/domain/types";

const rowToMeal = (r: typeof t.meals.$inferSelect): Meal => ({
  id: r.id,
  date: r.date,
  slot: r.slot,
  recipeId: r.recipeId,
  ingredientId: r.ingredientId,
  grams: r.grams,
  servings: r.servings,
  pinned: r.pinned,
  solved: r.solved,
  status: r.status,
  sort: r.sort,
});

export async function mealsBetween(from: string, to: string): Promise<Meal[]> {
  const rows = await db
    .select()
    .from(t.meals)
    .where(and(gte(t.meals.date, from), lte(t.meals.date, to)))
    .orderBy(asc(t.meals.date), asc(t.meals.sort));
  return rows.map(rowToMeal);
}

export type PlanBundle = {
  meals: Meal[];
  recipes: Record<string, Recipe>;
  ingredients: Record<string, Ingredient>;
};

/** Mesele + tot ce trebuie ca să le calculezi macro-urile pe client. */
export async function bundleFor(meals: Meal[]): Promise<PlanBundle> {
  const recipeIds = [...new Set(meals.map((m) => m.recipeId).filter((x): x is string => !!x))];
  const recipeRows = recipeIds.length ? await db.select().from(t.recipes).where(inArray(t.recipes.id, recipeIds)) : [];
  const recipes = recipeRows.map(rowToRecipe);
  const ingredientIds = [
    ...recipes.flatMap((r) => r.steps.flatMap((s) => s.lines.map((l) => l.ingredientId))),
    ...meals.map((m) => m.ingredientId).filter((x): x is string => !!x),
  ];
  const ingredients = await getIngredients(ingredientIds);
  return { meals, recipes: Object.fromEntries(recipes.map((r) => [r.id, r])), ingredients: Object.fromEntries(ingredients) };
}

export async function getWeek(monday: string) {
  const dates = weekDates(monday);
  return bundleFor(await mealsBetween(dates[0], dates[6]));
}

/** Rulează solverul pe săptămâna care conține `date` și salvează porțiile pe fiecare masă. */
export async function resolveWeekOf(date: string) {
  const monday = mondayOf(date);
  const [bundle, settings] = await Promise.all([getWeek(monday), getSettings()]);
  const { solved } = solve({
    meals: bundle.meals,
    recipes: (id) => bundle.recipes[id],
    lookup: (id) => bundle.ingredients[id],
    settings,
  });
  await Promise.all(
    bundle.meals
      .filter((m) => m.recipeId)
      .map((m) => {
        const next = solved.get(m.recipeId!) ?? {};
        if (JSON.stringify(next) === JSON.stringify(m.solved)) return null;
        return db.update(t.meals).set({ solved: next }).where(eq(t.meals.id, m.id));
      }),
  );
}

export async function addMeal(input: { date: string; slot: MealSlot; recipeId?: string; ingredientId?: string; grams?: number; servings?: number }) {
  const existing = await db.select({ sort: t.meals.sort }).from(t.meals).where(and(eq(t.meals.date, input.date), eq(t.meals.slot, input.slot)));
  const id = `m-${crypto.randomUUID()}`;
  await db.insert(t.meals).values({
    id,
    date: input.date,
    slot: input.slot,
    recipeId: input.recipeId ?? null,
    ingredientId: input.ingredientId ?? null,
    grams: input.grams ?? null,
    servings: input.servings ?? 1,
    sort: existing.length ? Math.max(...existing.map((e) => e.sort)) + 1 : 0,
  });
  if (input.ingredientId) await addToLibrary([input.ingredientId]);
  await resolveWeekOf(input.date);
  return id;
}

export async function updateMeal(id: string, patch: Partial<Pick<Meal, "servings" | "status" | "pinned" | "grams" | "date" | "slot">>) {
  const [before] = await db.select({ date: t.meals.date }).from(t.meals).where(eq(t.meals.id, id));
  if (!before) return;
  await db.update(t.meals).set({ ...patch, updatedAt: new Date() }).where(eq(t.meals.id, id));
  await resolveWeekOf(before.date);
  if (patch.date && mondayOf(patch.date) !== mondayOf(before.date)) await resolveWeekOf(patch.date);
}

export async function removeMeal(id: string) {
  const [before] = await db.select({ date: t.meals.date }).from(t.meals).where(eq(t.meals.id, id));
  if (!before) return;
  await db.delete(t.meals).where(eq(t.meals.id, id));
  await resolveWeekOf(before.date);
}

/** Copiază mesele unei zile (fără bife și fără gramaje fixate) în alte zile. */
export async function copyDay(from: string, to: string[]) {
  const source = await mealsBetween(from, from);
  for (const date of to) {
    for (const m of source.filter((x) => x.slot !== "extra")) {
      await db.insert(t.meals).values({
        id: `m-${crypto.randomUUID()}`,
        date,
        slot: m.slot,
        recipeId: m.recipeId,
        ingredientId: m.ingredientId,
        grams: m.grams,
        servings: m.servings,
        pinned: m.pinned,
        sort: m.sort,
      });
    }
  }
  for (const monday of new Set(to.map(mondayOf))) await resolveWeekOf(monday);
}

export async function clearWeek(monday: string) {
  const dates = weekDates(monday);
  await db.delete(t.meals).where(and(gte(t.meals.date, dates[0]), lte(t.meals.date, dates[6])));
}

// ─── Rotația propusă ───

const PREP_DAYS = [0, 1, 2]; // luni–miercuri, gătite duminică
const SLOTS: { slot: SlotId; category: Recipe["category"] }[] = [
  { slot: "pranz", category: "pranz" },
  { slot: "gustare", category: "gustare" },
  { slot: "cina", category: "cina" },
];

export type SlotProposal = {
  slot: SlotId;
  /** Rețetele în ordinea propunerii (vezi `rankForSlot`). */
  candidates: string[];
  /** Ce e acum în slot luni–miercuri și dacă l-ai modificat tu. */
  current: string | null;
  locked: boolean;
};

/**
 * Propunerea pentru luni–miercuri, pe sloturi, cu rețetele și ingredientele lor ca fereastra
 * să poată da „Alta” și să arate macro-urile fără să mai întrebe serverul.
 */
export async function proposalFor(monday: string) {
  const [recipes, history, current] = await Promise.all([
    listRecipes(),
    mealsBetween(addDays(monday, -56), addDays(monday, -1)),
    mealsBetween(monday, addDays(monday, 6)),
  ]);
  const lastUsed = new Map<string, string>();
  for (const m of history) if (m.recipeId) lastUsed.set(m.recipeId, m.date);
  const lastWeek = new Set(history.filter((m) => m.date >= addDays(monday, -7)).flatMap((m) => (m.recipeId ? [m.recipeId] : [])));
  const dates = PREP_DAYS.map((d) => addDays(monday, d));

  const slots: SlotProposal[] = SLOTS.map(({ slot, category }) => {
    const state = slotState(current.filter((m) => m.slot === slot && dates.includes(m.date)));
    return {
      slot,
      candidates: rankForSlot({ recipeIds: recipes.filter((r) => r.category === category).map((r) => r.id), lastUsed, lastWeek, seed: monday }),
      current: state.recipeId,
      locked: state.locked,
    };
  });
  return { slots, recipes: Object.fromEntries(recipes.map((r) => [r.id, r])), ingredients: await recipeBundle(recipes) };
}

/**
 * Pune rețetele alese luni–miercuri. Mesele planificate din slot se înlocuiesc; cele bifate
 * (mâncat/sărit) rămân și ziua lor nu primește alta.
 */
export async function applyProposal(monday: string, picks: { slot: SlotId; recipeId: string }[]) {
  const dates = PREP_DAYS.map((d) => addDays(monday, d));
  const current = await mealsBetween(dates[0], dates[dates.length - 1]);
  for (const { slot, recipeId } of picks) {
    const inSlot = current.filter((m) => m.slot === slot);
    const replace = inSlot.filter((m) => m.status === "planned").map((m) => m.id);
    if (replace.length) await db.delete(t.meals).where(inArray(t.meals.id, replace));
    for (const date of dates) {
      if (inSlot.some((m) => m.date === date && m.status !== "planned")) continue;
      await db.insert(t.meals).values({ id: `m-${crypto.randomUUID()}`, date, slot, recipeId });
    }
  }
  await resolveWeekOf(monday);
}

/**
 * Sugestii pentru joi–vineri: rețete rapide, întâi cele care folosesc ce rămâne din pachetele
 * cumpărate pentru luni–miercuri, apoi cele nefolosite de mult.
 */
export async function quickSuggestions(monday: string, limit = 3) {
  const [recipes, history, block] = await Promise.all([
    listRecipes(),
    mealsBetween(addDays(monday, -28), addDays(monday, 6)),
    mealsBetween(monday, addDays(monday, 2)),
  ]);
  const lastUsed = new Map<string, string>();
  for (const m of history) if (m.recipeId) lastUsed.set(m.recipeId, m.date);
  const rapid = recipes.filter((r) => r.category === "rapid");
  const bundle = await bundleFor([...block, ...rapid.map((r) => ({ id: r.id, date: monday, slot: "cina" as const, recipeId: r.id, ingredientId: null, grams: null, servings: 1, pinned: {}, solved: {}, status: "skipped" as const, sort: 0 }))]);
  const lookup = (id: string) => bundle.ingredients[id];
  // Doar pachetele începute sunt resturi reale; rotunjirea la vrac (550 g în loc de 510 g) nu contează.
  const surplus = new Map(
    buildShoppingList(block, (id) => bundle.recipes[id], lookup)
      .filter((i) => i.packs)
      .map((i) => [i.ingredient.id, i.surplusG]),
  );
  return suggestFromLeftovers(rapid, surplus, lookup, lastUsed)
    .slice(0, limit)
    .map((s) => ({ id: s.recipe.id, name: s.recipe.name, uses: s.uses.map((u) => u.name) }));
}
