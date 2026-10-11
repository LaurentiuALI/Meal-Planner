/** Afișează în terminal sesiunea de gătit pentru un interval: `pnpm tsx scripts/session-preview.ts 2026-10-12 2026-10-14`. */
import { and, gte, lte } from "drizzle-orm";
import { connect } from "../src/server/db/connect";
import * as t from "../src/server/db/schema";
import { rowToAction, rowToEquipment, rowToIngredient, rowToRecipe } from "../src/server/mappers";
import { planSession } from "../src/domain/cooking";
import { addDays, type Meal } from "../src/domain/plan";

async function main() {
const [from, to] = process.argv.slice(2);
const db = connect();
const [meals, recipes, ingredients, actions, equipment] = await Promise.all([
  db.select().from(t.meals).where(and(gte(t.meals.date, from), lte(t.meals.date, to))),
  db.select().from(t.recipes),
  db.select().from(t.ingredients),
  db.select().from(t.actions),
  db.select().from(t.equipment),
]);
const R = new Map(recipes.map((r) => [r.id, rowToRecipe(r)]));
const I = new Map(ingredients.map((r) => [r.id, rowToIngredient(r)]));
const p = planSession({
  meals: meals as Meal[],
  recipes: (id) => R.get(id),
  lookup: (id) => I.get(id),
  actions: new Map(actions.map((a) => [a.id, rowToAction(a)])),
  equipment: equipment.sort((a, b) => a.sort - b.sort).map(rowToEquipment),
  sessionDate: addDays(from, -1),
});
const mm = (x: number) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}`;
for (const s of p.timeline) {
  const batch = s.batches > 1 ? ` (tura ${s.batch}/${s.batches})` : "";
  console.log(`${mm(s.start)}–${mm(s.end)} ${s.activeEnd > s.start ? "●" : "○"} ${s.task.title}${batch} · ${Math.round(s.loadG)} g · ${s.units.join(",")}${s.rinse ? " (clătește)" : ""} · ${s.task.recipeIds.map((r) => R.get(r)?.name.slice(0, 18)).join(" + ")}`);
}
console.log(`\nTotal ${mm(p.totalMinutes)} (activ ${Math.round(p.activeMinutes)} min, rețetă cu rețetă ar fi ${mm(p.serialMinutes)})`);
console.log("Vase:", p.dishes.join(", "));
console.log("Avertismente:", p.warnings, p.portions.flatMap((x) => x.warnings));
}

main();
