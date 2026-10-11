import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import * as t from "./db/schema";

export async function getChecks(listKey: string): Promise<Record<string, { checked: boolean; at: number }>> {
  const rows = await db.select().from(t.shoppingChecks).where(eq(t.shoppingChecks.listKey, listKey));
  return Object.fromEntries(rows.map((r) => [r.ingredientId, { checked: r.checked, at: r.at }]));
}

/** Aplică bifele venite de pe telefon (inclusiv cele strânse offline); câștigă cea mai recentă. */
export async function applyChecks(listKey: string, changes: { ingredientId: string; checked: boolean; at: number }[]) {
  for (const c of changes) {
    await db
      .insert(t.shoppingChecks)
      .values({ listKey, ...c })
      .onConflictDoUpdate({
        target: [t.shoppingChecks.listKey, t.shoppingChecks.ingredientId],
        set: { checked: c.checked, at: c.at },
        setWhere: sql`${t.shoppingChecks.at} < ${c.at}`,
      });
  }
  return getChecks(listKey);
}
