/**
 * Descarcă un snapshot cu produsele din România de pe OpenFoodFacts (search-a-licious)
 * și îl scrie compact în data/off-ro.json. Rulat manual, rar: `pnpm data:off`.
 *
 * Date © OpenFoodFacts contributors, licență ODbL (https://opendatacommons.org/licenses/odbl/1-0/).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { aisleFromOffCategories } from "../src/domain/aisles";
import { buildLexicon, isForeignName } from "../src/domain/language";

const UA = "MealPlanner/2.0 (self-hosted; github.com/LaurentiuALI/Meal-Planner)";
const FIELDS =
  "code,product_name,product_name_ro,brands,stores,quantity,product_quantity,product_quantity_unit,nutriments,categories_tags";

const LIDL_BRANDS = [
  "pilos", "milbona", "chef-select", "solevita", "crownfield", "golden-seafood", "dulano",
  "combino", "vitasia", "kania", "alesto", "snack-day", "freshona", "baresa", "italiamo",
  "sondey", "deluxe", "harvest-basket", "lovilio", "eridanous", "realvalle", "mcennedy",
  "bellarom", "fin-carre", "nixe", "w5", "lidl", "chef-select-you", "vemondo", "pikok",
];

const QUERIES = [
  'countries_tags:"en:romania" AND states_tags:"en:nutrition-facts-completed"',
  'countries_tags:"en:romania" AND stores_tags:"lidl"',
  `countries_tags:"en:romania" AND brands_tags:(${LIDL_BRANDS.map((b) => `"${b}"`).join(" OR ")})`,
];

type Hit = {
  code: string;
  product_name?: string;
  product_name_ro?: string;
  brands?: string[] | string;
  stores?: string[] | string;
  quantity?: string;
  product_quantity?: number | string;
  product_quantity_unit?: string;
  nutriments?: Record<string, number | undefined>;
  categories_tags?: string[];
};

export type OffProduct = {
  code: string;
  name: string;
  brand: string | null;
  lidl: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  packGrams: number | null;
  packLabel: string | null;
  aisle: string;
};

const ENTITIES: Record<string, string> = { quot: '"', amp: "&", apos: "'", lt: "<", gt: ">", nbsp: " " };
const decodeEntities = (s: string) => s.replace(/&(\w+);/g, (m, e) => ENTITIES[e] ?? m);

/** „500 g”, „1 kg”, „2 x 125g”, „1,5 l” → grame (ml tratați ca grame). */
export function parseQuantity(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(",", ".");
  const factor: Record<string, number> = { g: 1, gr: 1, kg: 1000, ml: 1, cl: 10, l: 1000 };
  const multi = s.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|gr|g|ml|cl|l)(?![a-z])/);
  const single = s.match(/(\d+(?:\.\d+)?)\s*(kg|gr|g|ml|cl|l)(?![a-z])/);
  const g = multi
    ? Number(multi[1]) * Number(multi[2]) * factor[multi[3]]
    : single
      ? Number(single[1]) * factor[single[2]]
      : NaN;
  return Number.isFinite(g) && g > 0 && g <= 20000 ? Math.round(g) : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAll(q: string): Promise<Hit[]> {
  const out: Hit[] = [];
  for (let page = 1; ; page++) {
    const url =
      "https://search.openfoodfacts.org/search?" +
      new URLSearchParams({ q, page_size: "100", page: String(page), fields: FIELDS });
    let json: { hits: Hit[]; page_count: number } | undefined;
    for (let attempt = 0; attempt < 5 && !json; attempt++) {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) json = await res.json();
      else await sleep(2000 * (attempt + 1));
    }
    if (!json) throw new Error(`Nu am putut descărca pagina ${page} pentru ${q}`);
    out.push(...json.hits);
    process.stdout.write(`\r${q.slice(0, 50)}… pagina ${page}/${json.page_count}`);
    if (page >= json.page_count || json.hits.length === 0) break;
    await sleep(700);
  }
  process.stdout.write("\n");
  return out;
}

const list = (v: string[] | string | undefined) =>
  (Array.isArray(v) ? v : (v ?? "").split(",")).map((s) => s.trim()).filter(Boolean);

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round1 = (n: number) => Math.round(n * 10) / 10;

function toProduct(h: Hit): OffProduct | null {
  const n = h.nutriments ?? {};
  const protein = num(n.proteins_100g);
  const carbs = num(n.carbohydrates_100g);
  const fat = num(n.fat_100g);
  let kcal = num(n["energy-kcal_100g"]);
  const fiber = num(n.fiber_100g);
  if (protein == null || carbs == null || fat == null) return null;
  if (kcal == null) kcal = 4 * protein + 4 * carbs + 9 * fat + 2 * (fiber ?? 0);
  // Respinge valorile imposibile (greșeli de introducere în OFF).
  if (protein + carbs + fat > 101 || kcal > 950 || [protein, carbs, fat, kcal].some((x) => x < 0)) return null;
  const est = 4 * protein + 4 * carbs + 9 * fat + 2 * (fiber ?? 0);
  if (Math.abs(est - kcal) > Math.max(40, 0.25 * kcal)) return null;

  const name = decodeEntities(h.product_name_ro || h.product_name || "").trim();
  if (!name) return null;
  const brands = list(h.brands);
  const stores = list(h.stores).map((s) => s.toLowerCase());
  const brandSlugs = brands.map((b) => b.toLowerCase().replace(/\s+/g, "-"));

  const packGrams = parseQuantity(h.quantity) ?? parseQuantity(`${h.product_quantity ?? ""} ${h.product_quantity_unit ?? "g"}`);

  return {
    code: h.code,
    name,
    brand: brands[0] ?? null,
    lidl: stores.some((s) => s.includes("lidl")) || brandSlugs.some((b) => LIDL_BRANDS.includes(b)),
    kcal: Math.round(kcal),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    fiber: fiber == null ? null : round1(fiber),
    packGrams,
    packLabel: h.quantity?.trim() || null,
    aisle: aisleFromOffCategories(h.categories_tags ?? []),
  };
}

async function main() {
  const byCode = new Map<string, OffProduct>();
  for (const q of QUERIES) {
    for (const hit of await fetchAll(q)) {
      const p = toProduct(hit);
      if (p && !byCode.has(p.code)) byCode.set(p.code, p);
    }
  }
  // Fără nume în alte limbi: lexiconul vine din produsele generice și cele vechi (în română).
  const names = (file: string) => (JSON.parse(readFileSync(file, "utf8")) as { products: { name: string }[] }).products.map((p) => p.name);
  const lexicon = buildLexicon([...names("data/generic-ro.json"), ...names("data/legacy.json"), ...byCode.values().map((p) => p.name).filter((n) => /[ăâîșşțţ]/i.test(n))]);
  const products = [...byCode.values()].filter((p) => !isForeignName(p.name, lexicon)).sort((a, b) => a.name.localeCompare(b.name, "ro"));
  mkdirSync("data", { recursive: true });
  writeFileSync(
    "data/off-ro.json",
    JSON.stringify({
      source: "OpenFoodFacts (ODbL), search.openfoodfacts.org",
      fetchedAt: new Date().toISOString(),
      products,
    }),
  );
  const lidl = products.filter((p) => p.lidl).length;
  const fiber = products.filter((p) => p.fiber != null).length;
  console.log(`${products.length} produse (${lidl} Lidl, ${fiber} cu fibre) → data/off-ro.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
