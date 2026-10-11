import "server-only";
import { eq, inArray, max } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "./db/client";
import * as t from "./db/schema";
import { rank } from "@/domain/match";
import { parseLidlSize, type Price } from "@/domain/prices";

const LIDL_URL = "https://www.lidl.ro/explore/assets/webPriceData/ro/preturiZilniceLidl.xlsb";
const UA = "MealPlanner/2.0 (self-hosted; github.com/LaurentiuALI/Meal-Planner)";
const STALE_MS = 20 * 60 * 60 * 1000;

export async function lidlPricesAge(): Promise<Date | null> {
  const [row] = await db.select({ at: max(t.lidlPrices.fetchedAt) }).from(t.lidlPrices);
  return row?.at ?? null;
}

/**
 * Descarcă fișierul zilnic Lidl (publicat de luni până vineri, prețuri naționale de raft,
 * fără SGR și fără Lidl Plus) și înlocuiește tabela. Actualizează și produsele legate de el.
 */
export async function refreshLidlPrices(): Promise<{ count: number }> {
  const res = await fetch(LIDL_URL, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Lidl a răspuns ${res.status}`);
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array" });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1);
  const fetchedAt = new Date();
  const values = rows
    .filter((r) => typeof r[0] === "string" && typeof r[3] === "number")
    .map((r) => {
      const name = String(r[0]).trim();
      const size = String(r[1] ?? "").trim();
      return { ref: `${name}|${size}`, name, size, category: String(r[2] ?? ""), price: Number(r[3]), grams: parseLidlSize(size).grams, fetchedAt };
    });
  if (values.length < 100) throw new Error("Fișierul Lidl pare incomplet; păstrez prețurile vechi");
  const unique = [...new Map(values.map((v) => [v.ref, v])).values()];

  await db.transaction(async (tx) => {
    await tx.delete(t.lidlPrices);
    for (let i = 0; i < unique.length; i += 500) await tx.insert(t.lidlPrices).values(unique.slice(i, i + 500));
  });

  // Produsele legate de o linie Lidl primesc prețul nou.
  const linked = await db.select({ id: t.ingredients.id, ref: t.ingredients.priceRef }).from(t.ingredients).where(eq(t.ingredients.priceSource, "lidl"));
  const byRef = new Map(unique.map((v) => [v.ref, v]));
  for (const l of linked) {
    const p = l.ref ? byRef.get(l.ref) : undefined;
    if (p?.grams) await db.update(t.ingredients).set({ priceRon: p.price, priceGrams: p.grams, priceAt: fetchedAt }).where(eq(t.ingredients.id, l.id));
  }
  return { count: unique.length };
}

/** Actualizează în fundal dacă prețurile au mai mult de ~o zi; nu blochează pagina. */
export async function refreshLidlPricesIfStale() {
  const age = await lidlPricesAge();
  if (age && Date.now() - age.getTime() < STALE_MS) return;
  refreshLidlPrices().catch(() => {});
}

export async function searchLidlPrices(query: string) {
  const rows = await db.select().from(t.lidlPrices);
  return rank(
    query,
    rows.map((r) => ({ ...r, id: r.ref, brand: r.category, inLibrary: false })),
    12,
  ).map((x) => x.candidate);
}

export async function linkLidlPrice(ingredientId: string, ref: string) {
  const [p] = await db.select().from(t.lidlPrices).where(eq(t.lidlPrices.ref, ref));
  if (!p) throw new Error("Produsul nu mai e în lista Lidl");
  if (!p.grams) throw new Error("Prețul e pe bucată; introdu-l manual cu gramajul unei bucăți");
  await db.update(t.ingredients).set({ priceRon: p.price, priceGrams: p.grams, priceSource: "lidl", priceRef: ref, priceAt: p.fetchedAt }).where(eq(t.ingredients.id, ingredientId));
}

export async function setManualPrice(ingredientId: string, priceRon: number | null, priceGrams: number | null) {
  await db
    .update(t.ingredients)
    .set(priceRon && priceGrams ? { priceRon, priceGrams, priceSource: "manual", priceRef: null, priceAt: new Date() } : { priceRon: null, priceGrams: null, priceSource: null, priceRef: null, priceAt: null })
    .where(eq(t.ingredients.id, ingredientId));
}

export async function pricesFor(ids: string[]): Promise<Map<string, Price & { source: string | null; at: Date | null }>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({ id: t.ingredients.id, priceRon: t.ingredients.priceRon, priceGrams: t.ingredients.priceGrams, source: t.ingredients.priceSource, at: t.ingredients.priceAt })
    .from(t.ingredients)
    .where(inArray(t.ingredients.id, ids));
  return new Map(
    rows.filter((r) => r.priceRon != null && r.priceGrams != null).map((r) => [r.id, { priceRon: r.priceRon!, priceGrams: r.priceGrams!, source: r.source, at: r.at }]),
  );
}
