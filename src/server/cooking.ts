import "server-only";
import { planSession } from "@/domain/cooking";
import { addDays, weekday } from "@/domain/plan";
import { bundleFor, mealsBetween } from "./plan";
import { listKitchen } from "./recipes";

/** Gătești în ziua dinainte când blocul începe lunea (duminica), altfel în prima zi a blocului. */
export const sessionDateFor = (from: string) => (weekday(from) === 0 ? addDays(from, -1) : from);

export async function getSession(from: string, to: string) {
  const [meals, kitchen] = await Promise.all([mealsBetween(from, to), listKitchen()]);
  const bundle = await bundleFor(meals);
  const sessionDate = sessionDateFor(from);
  const plan = planSession({
    meals,
    recipes: (id) => bundle.recipes[id],
    lookup: (id) => bundle.ingredients[id],
    actions: new Map(kitchen.actions.map((a) => [a.id, a])),
    equipment: kitchen.equipment,
    sessionDate,
  });
  const recipeNames = Object.fromEntries(Object.values(bundle.recipes).map((r) => [r.id, r.name]));
  const equipmentNames = Object.fromEntries(kitchen.equipment.map((e) => [e.id, e.name]));
  return { plan, sessionDate, recipeNames, equipmentNames };
}
