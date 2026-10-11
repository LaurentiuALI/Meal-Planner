import type { ShoppingItem } from "./shopping";

/** „per kg” → 1000 g, „500g” → 500, „2x125g” → 250, „1,5l” → 1500, „1Stk.” → bucată. */
export function parseLidlSize(raw: string): { grams: number | null; pieces: number | null } {
  const s = raw.toLowerCase().replace(",", ".").replace(/\s+/g, "");
  if (s === "perkg" || s === "kg") return { grams: 1000, pieces: null };
  const multi = s.match(/^(\d+)x(\d+(?:\.\d+)?)(kg|g|ml|cl|l)/);
  const single = s.match(/^(\d+(?:\.\d+)?)(kg|g|ml|cl|l)/);
  const factor: Record<string, number> = { kg: 1000, g: 1, l: 1000, ml: 1, cl: 10 };
  if (multi) return { grams: Number(multi[1]) * Number(multi[2]) * factor[multi[3]], pieces: null };
  if (single) return { grams: Number(single[1]) * factor[single[2]], pieces: null };
  const pcs = s.match(/^(\d+)(stk|buc|bucati|pcs)/);
  if (pcs) return { grams: null, pieces: Number(pcs[1]) };
  return { grams: null, pieces: null };
}

export type Price = { priceRon: number; priceGrams: number };

/** Cât costă ce cumperi (pachete întregi, nu doar ce consumi). */
export function itemCost(item: Pick<ShoppingItem, "buyG">, price: Price | null): number | null {
  if (!price || price.priceGrams <= 0) return null;
  return (item.buyG / price.priceGrams) * price.priceRon;
}

export const lei = (n: number) => `${n.toFixed(2).replace(".", ",")} lei`;
