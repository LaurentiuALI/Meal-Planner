"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addMeal, applyProposal, clearWeek, copyDay, proposalFor, removeMeal, updateMeal } from "./plan";
import { listRecipes, recipeBundle } from "./recipes";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slot = z.enum(["pranz", "gustare", "cina", "extra"]);

const done = () => revalidatePath("/plan");

export async function addMealAction(input: { date: string; slot: string; recipeId?: string; ingredientId?: string; grams?: number; servings?: number }) {
  const p = z
    .object({ date, slot, recipeId: z.string().optional(), ingredientId: z.string().optional(), grams: z.number().positive().optional(), servings: z.number().positive().optional() })
    .parse(input);
  await addMeal(p);
  done();
}

export async function updateMealAction(id: string, patch: { servings?: number; status?: "planned" | "eaten" | "skipped"; pinned?: Record<string, number>; grams?: number }) {
  const p = z
    .object({
      servings: z.number().min(0.25).max(10).optional(),
      status: z.enum(["planned", "eaten", "skipped"]).optional(),
      pinned: z.record(z.string(), z.number().min(0)).optional(),
      grams: z.number().positive().optional(),
    })
    .parse(patch);
  await updateMeal(id, p);
  done();
}

export async function removeMealAction(id: string) {
  await removeMeal(id);
  done();
}

export async function copyDayAction(from: string, to: string[]) {
  await copyDay(date.parse(from), z.array(date).parse(to));
  done();
}

export async function proposalAction(monday: string) {
  return proposalFor(date.parse(monday));
}

export async function applyProposalAction(monday: string, picks: { slot: string; recipeId: string }[]) {
  await applyProposal(date.parse(monday), z.array(z.object({ slot: z.enum(["pranz", "gustare", "cina"]), recipeId: z.string().min(1) })).parse(picks));
  done();
}

export async function clearWeekAction(monday: string) {
  await clearWeek(date.parse(monday));
  done();
}

/** Rețetele pentru dialogul de adăugare, cu ingredientele lor (pentru macro-uri pe client). */
export async function recipeChoicesAction() {
  const recipes = await listRecipes();
  return { recipes, ingredients: await recipeBundle(recipes) };
}
