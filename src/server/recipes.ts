import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "./db/client";
import * as t from "./db/schema";
import { rowToAction, rowToEquipment, rowToRecipe } from "./mappers";
import { addToLibrary, getIngredients, invalidateIngredientIndex } from "./ingredients";
import type { Recipe } from "@/domain/types";

export async function listRecipes() {
  const rows = await db.select().from(t.recipes).where(eq(t.recipes.archived, false)).orderBy(asc(t.recipes.name));
  return rows.map(rowToRecipe);
}

export async function getRecipe(id: string) {
  const [row] = await db.select().from(t.recipes).where(eq(t.recipes.id, id));
  return row ? rowToRecipe(row) : null;
}

export async function saveRecipe(r: Recipe & { id?: string }): Promise<string> {
  const id = r.id || `r-${crypto.randomUUID()}`;
  const values = {
    name: r.name.trim(),
    category: r.category,
    servings: Math.max(1, Math.round(r.servings)),
    freezes: r.freezes,
    keepsDays: r.keepsDays,
    notes: r.notes,
    steps: r.steps,
    updatedAt: new Date(),
  };
  await db.insert(t.recipes).values({ id, ...values }).onConflictDoUpdate({ target: t.recipes.id, set: values });
  await addToLibrary(r.steps.flatMap((s) => s.lines.map((l) => l.ingredientId)));
  invalidateIngredientIndex();
  return id;
}

/** Arhivăm în loc să ștergem: planurile vechi pot încă trimite la rețetă. */
export async function archiveRecipe(id: string) {
  await db.update(t.recipes).set({ archived: true }).where(eq(t.recipes.id, id));
  invalidateIngredientIndex();
}

export async function listKitchen() {
  const [equipment, actions] = await Promise.all([
    db.select().from(t.equipment).orderBy(asc(t.equipment.sort)),
    db.select().from(t.actions).orderBy(asc(t.actions.sort)),
  ]);
  return { equipment: equipment.map(rowToEquipment), actions: actions.map(rowToAction) };
}

/** Tot ce trebuie ca să afișezi/calculezi o rețetă pe client. */
export async function recipeBundle(recipes: Recipe[]) {
  const ids = recipes.flatMap((r) => r.steps.flatMap((s) => s.lines.map((l) => l.ingredientId)));
  const ingredients = await getIngredients(ids);
  return Object.fromEntries(ingredients);
}
