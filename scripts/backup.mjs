/**
 * Backup consistent al bazei (VACUUM INTO, merge și cu aplicația pornită) în ./backups,
 * păstrând ultimele 14. Pe server rulează din cron; folderul îl sincronizează Syncthing pe PC.
 *   docker compose exec -T app node scripts/backup.mjs
 */
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const dir = process.env.BACKUP_DIR ?? "backups";
const keep = Number(process.env.BACKUP_KEEP ?? 14);
const url = process.env.DATABASE_URL ?? "file:var/meal-planner.db";

mkdirSync(dir, { recursive: true });
const d = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
const target = join(dir, `meal-planner-${stamp}.db`);

const db = createClient({ url });
await db.execute({ sql: "VACUUM INTO ?", args: [target] });
db.close();

const old = readdirSync(dir)
  .filter((f) => /^meal-planner-.*\.db$/.test(f))
  .sort()
  .slice(0, -keep);
for (const f of old) rmSync(join(dir, f));
console.log(`backup: ${target}${old.length ? ` (șterse ${old.length} vechi)` : ""}`);
