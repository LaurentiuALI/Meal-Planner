import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const DEFAULT_DB_URL = "file:var/meal-planner.db";

/** Folosit și de scripturi (seed, migrări), deci fără `server-only`. */
export function connect(url = process.env.DATABASE_URL ?? DEFAULT_DB_URL) {
  return drizzle(createClient({ url }), { schema });
}
