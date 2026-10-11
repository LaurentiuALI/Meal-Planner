import { dayMacros, defaultBlock, today } from "@/domain/plan";
import { bundleFor, mealsBetween } from "@/server/plan";

export const dynamic = "force-dynamic";

/** Widget pentru LaurHub: ce ai planificat azi și câte mese are blocul următor. */
export async function GET() {
  const now = today();
  const block = defaultBlock(now);
  const [todayMeals, blockMeals] = await Promise.all([mealsBetween(now, now), mealsBetween(block.from, block.to)]);
  const bundle = await bundleFor(todayMeals);
  const m = dayMacros(todayMeals, (id) => bundle.recipes[id], (id) => bundle.ingredients[id]);
  const planned = blockMeals.filter((x) => x.status !== "skipped" && x.slot !== "extra").length;
  return Response.json({
    items: [
      { label: "Azi", value: todayMeals.length ? `${Math.round(m.kcal)} kcal · ${Math.round(m.protein)}P` : "nimic planificat" },
      { label: "Blocul următor", value: `${planned} mese` },
    ],
  });
}
