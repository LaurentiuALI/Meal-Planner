import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db/client";
import * as t from "./db/schema";
import { rowToIngredient } from "./mappers";
import { rank, type Candidate } from "@/domain/match";
import { kcalFrom } from "@/domain/macros";
import type { Ingredient } from "@/domain/types";
import type { AisleId } from "@/domain/aisles";
import { aisleFromOffCategories } from "@/domain/aisles";
import { blankIngredient } from "@/lib/ingredient-defaults";

export type IngredientHit = Candidate & {
  per100: Ingredient["per100"];
  lidl: boolean;
  packLabel: string | null;
  source: Ingredient["source"];
  verified: boolean;
  toTaste: Ingredient["toTaste"];
};

/**
 * ~6k produse încap ușor în memorie; căutarea fuzzy în JS e mai bună decât LIKE în SQL
 * (diacritice, plural, ordinea cuvintelor) și răspunde în câteva milisecunde.
 */
let index: IngredientHit[] | null = null;
let usage: Map<string, number> | null = null;

export function invalidateIngredientIndex() {
  index = null;
  usage = null;
}

async function loadIndex(): Promise<IngredientHit[]> {
  if (index) return index;
  const rows = await db.select().from(t.ingredients);
  if (!usage) usage = await countUsage();
  index = rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    inLibrary: r.inLibrary,
    uses: usage!.get(r.id) ?? 0,
    lidl: r.lidl,
    packLabel: r.packLabel,
    source: r.source,
    verified: r.verified,
    toTaste: r.toTaste,
    per100: { kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber },
  }));
  return index;
}

async function countUsage() {
  const counts = new Map<string, number>();
  const rows = await db.select({ steps: t.recipes.steps }).from(t.recipes).where(eq(t.recipes.archived, false));
  for (const r of rows) for (const s of r.steps) for (const l of s.lines) counts.set(l.ingredientId, (counts.get(l.ingredientId) ?? 0) + 1);
  return counts;
}

export async function searchIngredients(query: string, opts: { limit?: number; libraryOnly?: boolean } = {}) {
  const all = await loadIndex();
  const pool = opts.libraryOnly ? all.filter((i) => i.inLibrary) : all;
  if (!query.trim()) {
    return pool
      .filter((i) => i.inLibrary)
      .sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0) || a.name.localeCompare(b.name, "ro"))
      .slice(0, opts.limit ?? 30)
      .map((candidate) => ({ candidate, score: 1 }));
  }
  return rank(query, pool, opts.limit ?? 12);
}

export async function getIngredients(ids: string[]): Promise<Map<string, Ingredient>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(t.ingredients).where(inArray(t.ingredients.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, rowToIngredient(r)]));
}

/** Dintre produsele date, cele ale căror valori nu le-ai verificat încă. */
export async function unverifiedAmong(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: t.ingredients.id, verified: t.ingredients.verified })
    .from(t.ingredients)
    .where(inArray(t.ingredients.id, [...new Set(ids)]));
  return new Set(rows.filter((r) => !r.verified).map((r) => r.id));
}

export async function getIngredient(id: string) {
  const [row] = await db.select().from(t.ingredients).where(eq(t.ingredients.id, id));
  if (!row) return null;
  const price =
    row.priceRon != null && row.priceGrams != null
      ? { priceRon: row.priceRon, priceGrams: row.priceGrams, source: row.priceSource, ref: row.priceRef, at: row.priceAt?.toISOString() ?? null }
      : null;
  return { ...rowToIngredient(row), verified: row.verified, inLibrary: row.inLibrary, price };
}

export async function listLibrary() {
  const rows = await db.select().from(t.ingredients).where(eq(t.ingredients.inLibrary, true));
  return rows.map(rowToIngredient).sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

export type IngredientInput = Omit<Ingredient, "id" | "source"> & { id?: string; source?: Ingredient["source"]; verified?: boolean };

export async function saveIngredient(input: IngredientInput): Promise<string> {
  const id = input.id ?? `manual-${crypto.randomUUID()}`;
  const values = {
    name: input.name.trim(),
    brand: input.brand?.trim() || null,
    kcal: input.per100.kcal || Math.round(kcalFrom(input.per100)),
    protein: input.per100.protein,
    carbs: input.per100.carbs,
    fat: input.per100.fat,
    fiber: input.per100.fiber,
    density: input.density || 1,
    portions: input.portions.filter((p) => p.name.trim() && p.grams > 0),
    packGrams: input.packGrams || null,
    packLabel: input.packLabel?.trim() || null,
    aisle: input.aisle,
    staple: input.staple,
    lidl: input.lidl,
    barcode: input.barcode?.trim() || null,
    inLibrary: true,
    verified: input.verified ?? false,
    toTaste: input.toTaste ?? null,
    updatedAt: new Date(),
  };
  if (input.id) {
    await db.update(t.ingredients).set(values).where(eq(t.ingredients.id, input.id));
  } else {
    await db.insert(t.ingredients).values({ id, source: input.source ?? "manual", ...values });
  }
  invalidateIngredientIndex();
  return id;
}

/** Un produs din catalog devine „al tău” când îl folosești. */
export async function addToLibrary(ids: string[]) {
  if (ids.length === 0) return;
  await db.update(t.ingredients).set({ inLibrary: true }).where(inArray(t.ingredients.id, ids));
  invalidateIngredientIndex();
}

export async function ingredientUsage(id: string): Promise<{ id: string; name: string }[]> {
  const rows = await db.select({ id: t.recipes.id, name: t.recipes.name, steps: t.recipes.steps }).from(t.recipes).where(eq(t.recipes.archived, false));
  return rows.filter((r) => r.steps.some((s) => s.lines.some((l) => l.ingredientId === id))).map(({ id, name }) => ({ id, name }));
}

export async function deleteIngredient(id: string) {
  const used = await ingredientUsage(id);
  if (used.length) throw new Error(`E folosit în: ${used.map((r) => r.name).join(", ")}`);
  await db.delete(t.ingredients).where(eq(t.ingredients.id, id));
  invalidateIngredientIndex();
}

// ─── Cod de bare ───

const UA = "MealPlanner/2.0 (self-hosted; github.com/LaurentiuALI/Meal-Planner)";

export type BarcodeResult =
  | { kind: "local"; id: string }
  | { kind: "off"; draft: IngredientInput }
  | { kind: "none"; barcode: string };

/** Întâi baza locală, apoi OpenFoodFacts live; dacă nu găsim nimic, formularul manual primește codul. */
export async function lookupBarcode(barcode: string): Promise<BarcodeResult> {
  const code = barcode.replace(/\D/g, "");
  const [row] = await db.select({ id: t.ingredients.id }).from(t.ingredients).where(eq(t.ingredients.barcode, code));
  if (row) return { kind: "local", id: row.id };

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}?fields=code,product_name,product_name_ro,brands,quantity,product_quantity,nutriments,categories_tags,stores`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) {
      const j = await res.json();
      const p = j.product;
      if (j.status === 1 && p) {
        const n = p.nutriments ?? {};
        const num = (v: unknown) => (typeof v === "number" ? v : 0);
        const pq = Number(p.product_quantity);
        return {
          kind: "off",
          draft: {
            name: p.product_name_ro || p.product_name || "",
            brand: String(p.brands ?? "").split(",")[0]?.trim() || null,
            per100: {
              kcal: num(n["energy-kcal_100g"]),
              protein: num(n.proteins_100g),
              carbs: num(n.carbohydrates_100g),
              fat: num(n.fat_100g),
              fiber: typeof n.fiber_100g === "number" ? n.fiber_100g : null,
            },
            density: 1,
            portions: [],
            packGrams: Number.isFinite(pq) && pq > 0 ? pq : null,
            packLabel: p.quantity ?? null,
            aisle: aisleFromOffCategories(p.categories_tags ?? []) as AisleId,
            staple: false,
            lidl: /lidl/i.test(String(p.stores ?? "")),
            source: "off",
            barcode: code,
          },
        };
      }
    }
  } catch {
    // Fără semnal sau OFF picat: trecem la introducerea manuală.
  }
  return { kind: "none", barcode: code };
}

/** Un cod scanat, ca formular de confirmat: produsul tău, cel din OpenFoodFacts sau unul gol, de completat de pe etichetă. */
export async function scanLookup(barcode: string): Promise<{ found: "local" | "off" | "none"; draft: IngredientInput }> {
  const res = await lookupBarcode(barcode);
  if (res.kind === "local") {
    const i = await getIngredient(res.id);
    if (i) {
      return { found: "local", draft: { ...rowFields(i), verified: i.verified } };
    }
  }
  if (res.kind === "off") return { found: "off", draft: { ...res.draft, lidl: true, verified: false } };
  return { found: "none", draft: blankIngredient(barcode.replace(/\D/g, "")) };
}

/**
 * Produsul scanat ia locul celui din rețete (de obicei un generic din catalog): rețetele și mesele
 * din plan trec pe el. Porțiile („cățel”, „bucată”), raionul și felul în care se folosește
 * (condiment, ulei, mereu în casă) vin de la cel vechi dacă produsul nou nu le are.
 * Întoarce câte rețete s-au schimbat.
 */
export async function replaceIngredient(oldId: string, newId: string): Promise<number> {
  if (oldId === newId) return 0;
  const rows = await db.select().from(t.ingredients).where(inArray(t.ingredients.id, [oldId, newId]));
  const old = rows.find((r) => r.id === oldId);
  const next = rows.find((r) => r.id === newId);
  if (!old || !next) throw new Error("Produsul nu mai există");

  const names = new Set(next.portions.map((p) => p.name));
  await db
    .update(t.ingredients)
    .set({
      portions: [...next.portions, ...old.portions.filter((p) => !names.has(p.name))],
      aisle: next.aisle === "altele" ? old.aisle : next.aisle,
      toTaste: next.toTaste ?? old.toTaste,
      staple: next.staple || old.staple,
      density: next.density !== 1 ? next.density : old.density,
      inLibrary: true,
    })
    .where(eq(t.ingredients.id, newId));

  let changed = 0;
  for (const r of await db.select({ id: t.recipes.id, steps: t.recipes.steps }).from(t.recipes)) {
    if (!r.steps.some((s) => s.lines.some((l) => l.ingredientId === oldId))) continue;
    const steps = r.steps.map((s) => ({ ...s, lines: s.lines.map((l) => (l.ingredientId === oldId ? { ...l, ingredientId: newId } : l)) }));
    await db.update(t.recipes).set({ steps, updatedAt: new Date() }).where(eq(t.recipes.id, r.id));
    changed++;
  }
  await db.update(t.meals).set({ ingredientId: newId }).where(eq(t.meals.ingredientId, oldId));
  invalidateIngredientIndex();
  return changed;
}

const rowFields = (i: Ingredient): IngredientInput => ({
  id: i.id,
  name: i.name,
  brand: i.brand,
  per100: i.per100,
  density: i.density,
  portions: i.portions,
  packGrams: i.packGrams,
  packLabel: i.packLabel,
  aisle: i.aisle,
  staple: i.staple,
  lidl: i.lidl,
  source: i.source,
  barcode: i.barcode,
  toTaste: i.toTaste,
});
