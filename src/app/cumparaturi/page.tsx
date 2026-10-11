import { PageHeader } from "@/components/macros";
import { RangePicker } from "@/components/range-picker";
import { bundleFor, mealsBetween } from "@/server/plan";
import { getChecks } from "@/server/shopping";
import { buildShoppingList } from "@/domain/shopping";
import { defaultBlock, today } from "@/domain/plan";
import { ShoppingList, type ListItem } from "./shopping-list";

export const metadata = { title: "Lista de cumpărături" };
export const dynamic = "force-dynamic";

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const range = isDate(sp.from) && isDate(sp.to) && sp.from! <= sp.to! ? { from: sp.from!, to: sp.to! } : defaultBlock(today());
  const listKey = `${range.from}_${range.to}`;
  const bundle = await bundleFor(await mealsBetween(range.from, range.to));
  const [checks] = await Promise.all([getChecks(listKey)]);
  const items: ListItem[] = buildShoppingList(bundle.meals, (id) => bundle.recipes[id], (id) => bundle.ingredients[id]).map((i) => ({
    id: i.ingredient.id,
    name: i.ingredient.name,
    brand: i.ingredient.brand,
    aisle: i.ingredient.aisle,
    staple: i.ingredient.staple,
    lidl: i.ingredient.lidl,
    packGrams: i.ingredient.packGrams,
    packLabel: i.ingredient.packLabel,
    needG: i.needG,
    packs: i.packs,
    buyG: i.buyG,
    surplusG: i.surplusG,
    pieces: i.pieces,
    usedIn: i.usedIn,
  }));

  return (
    <>
      <PageHeader title="Cumpărături" />
      <RangePicker basePath="/cumparaturi" from={range.from} to={range.to} />
      <ShoppingList listKey={listKey} items={items} serverChecks={checks} mealCount={bundle.meals.filter((m) => m.status !== "skipped").length} />
    </>
  );
}
