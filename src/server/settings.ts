import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import * as t from "./db/schema";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/types";

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(t.settings).where(eq(t.settings.id, 1));
  return row?.value ?? DEFAULT_SETTINGS;
}

export async function saveSettings(value: Settings) {
  await db.insert(t.settings).values({ id: 1, value }).onConflictDoUpdate({ target: t.settings.id, set: { value } });
}
