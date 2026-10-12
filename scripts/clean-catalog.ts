/**
 * Scoate din catalog produsele Open Food Facts cu nume în altă limbă (franceză, germană, engleză...).
 * Nu atinge produsele tale (in_library), pe cele din rețete sau din plan.
 *
 *   pnpm tsx scripts/clean-catalog.ts           # doar arată ce ar scoate
 *   pnpm tsx scripts/clean-catalog.ts --apply   # scoate din baza de date și din data/off-ro.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { inArray } from "drizzle-orm";
import { connect } from "../src/server/db/connect";
import * as t from "../src/server/db/schema";
import { buildLexicon, isForeignName } from "../src/domain/language";

async function main() {
  const apply = process.argv.includes("--apply");
  const db = connect();
  const [ingredients, lidl, recipes, meals] = await Promise.all([
    db.select({ id: t.ingredients.id, name: t.ingredients.name, source: t.ingredients.source, inLibrary: t.ingredients.inLibrary }).from(t.ingredients),
    db.select({ name: t.lidlPrices.name }).from(t.lidlPrices),
    db.select({ steps: t.recipes.steps }).from(t.recipes),
    db.select({ ingredientId: t.meals.ingredientId }).from(t.meals),
  ]);
  const lexicon = buildLexicon([...lidl.map((r) => r.name), ...ingredients.filter((i) => i.source !== "off").map((i) => i.name)]);
  const used = new Set([
    ...recipes.flatMap((r) => r.steps.flatMap((s) => s.lines.map((l) => l.ingredientId))),
    ...meals.flatMap((m) => (m.ingredientId ? [m.ingredientId] : [])),
  ]);

  const foreign = ingredients.filter((i) => i.source === "off" && isForeignName(i.name, lexicon));
  const removable = foreign.filter((i) => !i.inLibrary && !used.has(i.id));
  const kept = foreign.filter((i) => !removable.includes(i));
  console.log(`Lexicon: ${lexicon.size} cuvinte. Nume străine: ${foreign.length}; de scos: ${removable.length}.`);
  console.log("Exemple:", removable.slice(0, 30).map((i) => i.name).join(" | "));
  if (kept.length) console.log("Rămân (sunt ale tale, redenumește-le):", kept.map((i) => i.name).join(" | "));
  if (!apply) return console.log("\nNimic schimbat. Rulează cu --apply ca să le scoți.");

  const ids = removable.map((i) => i.id);
  for (let i = 0; i < ids.length; i += 500) await db.delete(t.ingredients).where(inArray(t.ingredients.id, ids.slice(i, i + 500)));
  // Și din snapshot, ca o instalare nouă să nu le aducă înapoi.
  const snapshot = JSON.parse(readFileSync("data/off-ro.json", "utf8")) as { products: { name: string }[] };
  const before = snapshot.products.length;
  snapshot.products = snapshot.products.filter((o) => !isForeignName(o.name, lexicon));
  writeFileSync("data/off-ro.json", JSON.stringify(snapshot));
  console.log(`Scoase ${ids.length} din baza de date și ${before - snapshot.products.length} din data/off-ro.json.`);
}

main();
