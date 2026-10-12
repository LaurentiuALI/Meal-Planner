"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import * as t from "./db/schema";
import {
  deleteIngredient,
  getIngredients,
  invalidateIngredientIndex,
  lookupBarcode,
  saveIngredient,
  searchIngredients,
  type IngredientInput,
} from "./ingredients";
import { archiveRecipe, saveRecipe } from "./recipes";
import { saveSettings } from "./settings";
import { importAll, type BackupFile } from "./backup";
import { linkLidlPrice, refreshLidlPrices, searchLidlPrices, setManualPrice } from "./prices";
import { parseLines } from "@/domain/parse-lines";
import { isConfident } from "@/domain/match";
import { AISLE_IDS } from "@/domain/aisles";
import type { Ingredient, Recipe, Settings } from "@/domain/types";

// ─── Ingrediente ───

export async function searchAction(query: string, libraryOnly = false, limit = 15) {
  const hits = await searchIngredients(query, { limit, libraryOnly });
  return hits.map((h) => h.candidate);
}

export async function ingredientsAction(ids: string[]): Promise<Record<string, Ingredient>> {
  return Object.fromEntries(await getIngredients(ids));
}

const portion = z.object({ name: z.string(), grams: z.number().positive() });
const ingredientSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Numele e obligatoriu"),
  brand: z.string().nullable(),
  per100: z.object({
    kcal: z.number().min(0).max(950),
    protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100),
    fat: z.number().min(0).max(100),
    fiber: z.number().min(0).max(100).nullable(),
  }),
  density: z.number().positive(),
  portions: z.array(portion),
  packGrams: z.number().positive().nullable(),
  packLabel: z.string().nullable(),
  aisle: z.enum(AISLE_IDS as [string, ...string[]]),
  staple: z.boolean(),
  lidl: z.boolean(),
  barcode: z.string().nullable(),
  source: z.enum(["off", "usda", "manual", "legacy"]).optional(),
  verified: z.boolean().optional(),
  toTaste: z.enum(["condiment", "ulei"]).nullable().optional(),
});

export async function saveIngredientAction(input: IngredientInput) {
  const parsed = ingredientSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  try {
    const id = await saveIngredient(parsed.data as IngredientInput);
    revalidatePath("/ingrediente");
    return { ok: true as const, id };
  } catch (e) {
    const msg = String(e);
    return { ok: false as const, error: msg.includes("UNIQUE") ? "Codul de bare există deja la alt produs" : msg };
  }
}

export async function deleteIngredientAction(id: string) {
  try {
    await deleteIngredient(id);
    revalidatePath("/ingrediente");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function barcodeAction(code: string) {
  return lookupBarcode(code);
}

// ─── Rețete ───

export type ParsedMatch = {
  raw: string;
  amount: number | null;
  unit: string | null;
  query: string;
  options: { id: string; name: string; brand: string | null; inLibrary: boolean }[];
  confident: boolean;
};

/** Text lipit → linii cu cele mai bune potriviri; UI-ul cere confirmare unde nu e sigur. */
export async function parseRecipeTextAction(text: string): Promise<ParsedMatch[]> {
  return Promise.all(
    parseLines(text).map(async (l) => {
      const ranked = await searchIngredients(l.query, { limit: 5 });
      return {
        ...l,
        options: ranked.map((r) => ({ id: r.candidate.id, name: r.candidate.name, brand: r.candidate.brand, inLibrary: r.candidate.inLibrary })),
        confident: isConfident(ranked),
      };
    }),
  );
}

const lineSchema = z.object({
  id: z.string(),
  ingredientId: z.string().min(1),
  amount: z.number().min(0),
  unit: z.string().min(1),
  flex: z.object({ min: z.number().min(0), max: z.number().min(0) }).nullable(),
});
const recipeSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Numele rețetei e obligatoriu"),
  category: z.enum(["pranz", "gustare", "cina", "rapid"]),
  servings: z.number().int().min(1),
  freezes: z.boolean(),
  keepsDays: z.number().int().min(1).max(30),
  notes: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      actionId: z.string().nullable(),
      minutes: z.number().min(0).nullable(),
      activeMinutes: z.number().min(0).nullable(),
      tempC: z.number().nullable(),
      lines: z.array(lineSchema),
    }),
  ),
});

export async function saveRecipeAction(recipe: Recipe) {
  const parsed = recipeSchema.safeParse(recipe);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  if (!parsed.data.steps.some((s) => s.lines.length)) return { ok: false as const, error: "Adaugă cel puțin un ingredient" };
  const id = await saveRecipe(parsed.data);
  revalidatePath("/retete");
  return { ok: true as const, id };
}

export async function archiveRecipeAction(id: string) {
  await archiveRecipe(id);
  revalidatePath("/retete");
}

// ─── Bucătărie și setări ───

export async function updateEquipmentAction(id: string, patch: { count?: number; capacityG?: number | null; name?: string }) {
  await db.update(t.equipment).set(patch).where(eq(t.equipment.id, id));
  revalidatePath("/setari/bucatarie");
}

export async function updateActionAction(
  id: string,
  patch: { minutes?: number; activeMinutes?: number; tempC?: number | null; capacityG?: number | null; hint?: string | null; name?: string },
) {
  await db.update(t.actions).set(patch).where(eq(t.actions.id, id));
  revalidatePath("/setari/bucatarie");
}

export async function createActionAction(input: { name: string; equipment: string[][]; minutes: number; activeMinutes: number; tempC: number | null }) {
  const id = `a-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(t.actions).values({ id, ...input, sort: 1000 });
  revalidatePath("/setari/bucatarie");
  return id;
}

const settingsSchema = z.object({
  targets: z.object({ kcal: z.number().min(800).max(6000), protein: z.number().min(0), fat: z.number().min(0), fiber: z.number().min(0) }),
  slots: z.array(z.object({ id: z.enum(["pranz", "gustare", "cina"]), label: z.string(), share: z.number().min(0).max(1) })),
});

export async function saveSettingsAction(s: Settings) {
  const parsed = settingsSchema.safeParse(s);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const total = parsed.data.slots.reduce((a, b) => a + b.share, 0);
  if (Math.abs(total - 1) > 0.011) return { ok: false as const, error: `Procentele sloturilor trebuie să însumeze 100% (acum ${Math.round(total * 100)}%)` };
  await saveSettings(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ─── Prețuri ───

export async function searchLidlAction(query: string) {
  return (await searchLidlPrices(query)).map((r) => ({ ref: r.ref, name: r.name, size: r.size, price: r.price, grams: r.grams }));
}

export async function linkLidlAction(ingredientId: string, ref: string) {
  try {
    await linkLidlPrice(ingredientId, ref);
    revalidatePath(`/ingrediente/${ingredientId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function manualPriceAction(ingredientId: string, priceRon: number | null, priceGrams: number | null) {
  await setManualPrice(ingredientId, priceRon, priceGrams);
  revalidatePath(`/ingrediente/${ingredientId}`);
}

export async function refreshPricesAction() {
  try {
    const { count } = await refreshLidlPrices();
    revalidatePath("/cumparaturi");
    return { ok: true as const, count };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Backup ───

export async function importBackupAction(json: string) {
  try {
    await importAll(JSON.parse(json) as BackupFile);
    invalidateIngredientIndex();
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Fișier invalid" };
  }
}
