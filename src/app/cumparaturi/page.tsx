import { PageHeader } from "@/components/macros";
import { RangePicker } from "@/components/range-picker";
import { bundleFor, mealsBetween } from "@/server/plan";
import { getChecks } from "@/server/shopping";
import { unverifiedAmong } from "@/server/ingredients";
import { lidlPricesAge, pricesFor, refreshLidlPricesIfStale } from "@/server/prices";
import { itemCost } from "@/domain/prices";
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
  refreshLidlPricesIfStale();
  const list = buildShoppingList(bundle.meals, (id) => bundle.recipes[id], (id) => bundle.ingredients[id]);
  const ids = list.map((i) => i.ingredient.id);
  const [checks, prices, pricesAt, unverified] = await Promise.all([getChecks(listKey), pricesFor(ids), lidlPricesAge(), unverifiedAmong(ids)]);
  const items: ListItem[] = list.map((i) => ({
    id: i.ingredient.id,
    name: i.ingredient.name,
    brand: i.ingredient.brand,
    aisle: i.ingredient.aisle,
    staple: i.ingredient.staple,
    lidl: i.ingredient.lidl,
    // Condimentele și uleiul nu se cântăresc, iar fructele și legumele vrac n-au etichetă: valorile generice ajung.
    verified: !unverified.has(i.ingredient.id) || !!i.ingredient.toTaste || i.ingredient.aisle === "fructe-legume",
    packGrams: i.ingredient.packGrams,
    packLabel: i.ingredient.packLabel,
    needG: i.needG,
    packs: i.packs,
    buyG: i.buyG,
    surplusG: i.surplusG,
    pieces: i.pieces,
    usedIn: i.usedIn,
    cost: itemCost(i, prices.get(i.ingredient.id) ?? null),
  }));

  return (
    <>
      <PageHeader title="Cumpărături" />
      <RangePicker basePath="/cumparaturi" from={range.from} to={range.to} />
      <ShoppingList
        listKey={listKey}
        items={items}
        serverChecks={checks}
        mealCount={bundle.meals.filter((m) => m.status !== "skipped").length}
        pricesAt={pricesAt?.toISOString() ?? null}
      />
    </>
  );
}
