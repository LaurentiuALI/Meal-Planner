import "server-only";
import { db } from "./db/client";
import * as t from "./db/schema";

/** Tabelele care contează; prețurile Lidl se descarcă oricând din nou. */
const TABLES = {
  ingredients: t.ingredients,
  equipment: t.equipment,
  actions: t.actions,
  recipes: t.recipes,
  settings: t.settings,
  meals: t.meals,
  shoppingChecks: t.shoppingChecks,
} as const;

type TableName = keyof typeof TABLES;
export type BackupFile = { app: "meal-planner"; version: 1; exportedAt: string; tables: Record<TableName, unknown[]> };

export async function exportAll(): Promise<BackupFile> {
  const entries = await Promise.all(Object.entries(TABLES).map(async ([name, table]) => [name, await db.select().from(table)] as const));
  return { app: "meal-planner", version: 1, exportedAt: new Date().toISOString(), tables: Object.fromEntries(entries) as BackupFile["tables"] };
}

/** Înlocuiește tot conținutul cu cel din backup, într-o singură tranzacție (totul sau nimic). */
export async function importAll(file: BackupFile) {
  if (file.app !== "meal-planner" || file.version !== 1) throw new Error("Nu e un backup Meal Planner");
  // Datele din JSON au datele ca text; Drizzle vrea Date pentru coloanele timestamp.
  const revive = (row: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, /At$/.test(k) && typeof v === "string" ? new Date(v) : v]));
  await db.transaction(async (tx) => {
    for (const [name, table] of Object.entries(TABLES)) {
      await tx.delete(table);
      const rows = (file.tables[name as TableName] ?? []) as Record<string, unknown>[];
      for (let i = 0; i < rows.length; i += 300) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(table).values(rows.slice(i, i + 300).map(revive) as any);
      }
    }
  });
}
