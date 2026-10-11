/**
 * Construiește data/generic-ro.json: alimente generice (crude) din USDA SR Legacy, traduse în română.
 * Rulat manual: `pnpm tsx scripts/build-usda.ts <director cu CSV-urile SR Legacy>`.
 * Datele USDA FoodData Central sunt în domeniul public.
 *
 * Carbohidrații USDA („by difference”) includ fibrele; îi convertim la convenția UE (fără fibre).
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import type { AisleId } from "../src/domain/aisles";
import type { Portion } from "../src/domain/types";

type Entry = [fdcId: number, name: string, aisle: AisleId, extra?: { staple?: boolean; portions?: Portion[]; density?: number }];

const buc = (grams: number): { portions: Portion[] } => ({ portions: [{ name: "bucată", grams }] });
const felie = (grams: number): { portions: Portion[] } => ({ portions: [{ name: "felie", grams }] });
const spice = (tsp: number) => ({ staple: true, portions: [{ name: "linguriță", grams: tsp }] });
const oil = { staple: true, density: 0.92, portions: [{ name: "lingură", grams: 13.5 }, { name: "linguriță", grams: 4.5 }] };
const lingura = (g: number, staple = false) => ({ staple, portions: [{ name: "lingură", grams: g }] });

const ENTRIES: Entry[] = [
  // Carne
  [171077, "Piept de pui", "carne"],
  [173627, "Pulpe de pui dezosate, fără piele", "carne"],
  [171116, "Carne tocată de pui", "carne"],
  [172850, "Carne tocată de curcan", "carne"],
  [171098, "Piept de curcan", "carne"],
  [174030, "Carne tocată de vită 90/10", "carne"],
  [171796, "Carne tocată de vită 85/15", "carne"],
  [171790, "Carne tocată de vită slabă 95/5", "carne"],
  [173121, "Vită, pulpă slabă", "carne"],
  [167902, "Carne tocată de porc", "carne"],
  [168249, "Mușchiuleț de porc", "carne"],
  [168263, "Cotlet de porc dezosat", "carne"],
  [171060, "Ficat de pui", "carne"],
  // Pește
  [175167, "Somon", "peste"],
  [171955, "Cod", "peste"],
  [173725, "Cod de Alaska (pollock)", "peste"],
  [175176, "Tilapia", "peste"],
  [174210, "Creveți cruzi", "peste"],
  [175119, "Macrou", "peste"],
  // Lactate și ouă
  [171287, "Ou", "lactate-oua", buc(55)],
  [172183, "Albuș de ou", "lactate-oua", buc(33)],
  [170894, "Iaurt grecesc 0%", "lactate-oua"],
  [170903, "Iaurt grecesc 2%", "lactate-oua"],
  [171284, "Iaurt natural 3,5%", "lactate-oua"],
  [171265, "Lapte integral 3,5%", "lactate-oua", { density: 1.03 }],
  [171267, "Lapte semidegresat 2%", "lactate-oua", { density: 1.03 }],
  [172182, "Brânză de vaci 2%", "lactate-oua"],
  [170845, "Mozzarella", "lactate-oua"],
  [170847, "Mozzarella light", "lactate-oua"],
  [173420, "Brânză feta", "lactate-oua"],
  [171247, "Parmezan ras", "lactate-oua", lingura(5)],
  [171241, "Cașcaval (tip gouda)", "lactate-oua", felie(20)],
  [171248, "Ricotta", "lactate-oua"],
  [171257, "Smântână", "lactate-oua", lingura(15)],
  [170859, "Smântână lichidă 36%", "lactate-oua"],
  [173418, "Cremă de brânză", "lactate-oua", lingura(15)],
  [173410, "Unt", "lactate-oua", lingura(14)],
  // Fructe și legume
  [170028, "Cartofi albi", "fructe-legume", buc(200)],
  [168482, "Cartof dulce", "fructe-legume", buc(250)],
  [170379, "Broccoli", "fructe-legume"],
  [170000, "Ceapă", "fructe-legume", buc(110)],
  [169230, "Usturoi", "fructe-legume", { portions: [{ name: "cățel", grams: 4 }] }],
  [170393, "Morcov", "fructe-legume", buc(70)],
  [170108, "Ardei gras roșu", "fructe-legume", buc(150)],
  [170427, "Ardei gras verde", "fructe-legume", buc(150)],
  [169383, "Ardei gras galben", "fructe-legume", buc(150)],
  [170497, "Ardei iute", "fructe-legume", buc(15)],
  [170457, "Roșii", "fructe-legume", buc(120)],
  [168409, "Castravete", "fructe-legume", buc(300)],
  [168462, "Spanac proaspăt", "fructe-legume", { portions: [{ name: "pumn", grams: 30 }] }],
  [169251, "Ciuperci champignon", "fructe-legume"],
  [169291, "Dovlecel", "fructe-legume", buc(300)],
  [169986, "Conopidă", "fructe-legume"],
  [169975, "Varză albă", "fructe-legume"],
  [169977, "Varză roșie", "fructe-legume"],
  [169247, "Salată romană", "fructe-legume"],
  [169248, "Salată iceberg", "fructe-legume"],
  [169387, "Rucola", "fructe-legume", { portions: [{ name: "pumn", grams: 20 }] }],
  [169998, "Porumb dulce", "fructe-legume"],
  [170419, "Mazăre verde", "fructe-legume"],
  [169961, "Fasole verde", "fructe-legume"],
  [169246, "Praz", "fructe-legume", buc(90)],
  [169988, "Țelină apio", "fructe-legume"],
  [169228, "Vânătă", "fructe-legume", buc(450)],
  [168448, "Dovleac", "fructe-legume"],
  [169295, "Dovleac butternut", "fructe-legume"],
  [169145, "Sfeclă roșie", "fructe-legume", buc(150)],
  [169276, "Ridichi", "fructe-legume"],
  [170005, "Ceapă verde", "fructe-legume", buc(15)],
  [172233, "Mărar proaspăt", "fructe-legume"],
  [170416, "Pătrunjel proaspăt", "fructe-legume"],
  [172232, "Busuioc proaspăt", "fructe-legume"],
  [169231, "Ghimbir proaspăt", "fructe-legume"],
  [168389, "Sparanghel", "fructe-legume"],
  [170383, "Varză de Bruxelles", "fructe-legume"],
  [168421, "Kale", "fructe-legume"],
  [171705, "Avocado", "fructe-legume", buc(150)],
  [167746, "Lămâie", "fructe-legume", buc(85)],
  [173944, "Banană", "fructe-legume", buc(120)],
  [171688, "Măr", "fructe-legume", buc(180)],
  [167776, "Pară", "fructe-legume", buc(180)],
  [169097, "Portocală", "fructe-legume", buc(140)],
  [168153, "Kiwi", "fructe-legume", buc(70)],
  [169928, "Piersică", "fructe-legume", buc(150)],
  [169949, "Prune", "fructe-legume"],
  [174683, "Struguri", "fructe-legume"],
  [171711, "Afine", "fructe-legume"],
  [167762, "Căpșuni", "fructe-legume"],
  [167755, "Zmeură", "fructe-legume"],
  [169910, "Mango", "fructe-legume"],
  [167765, "Pepene roșu", "fructe-legume"],
  [171719, "Cireșe", "fructe-legume"],
  // Congelate
  [170471, "Mix de legume congelate", "congelate"],
  [169287, "Spanac congelat", "congelate"],
  [169968, "Broccoli congelat", "congelate"],
  [170398, "Conopidă congelată", "congelate"],
  [169962, "Fasole verde congelată", "congelate"],
  [168410, "Edamame congelat", "congelate"],
  [170523, "Cartofi prăjiți congelați", "congelate"],
  // Paste, orez, cereale
  [168877, "Orez alb bob lung", "camara"],
  [169703, "Orez brun", "camara"],
  [169707, "Orez parboiled", "camara"],
  [169736, "Paste", "camara"],
  [169738, "Paste integrale", "camara"],
  [169705, "Fulgi de ovăz", "camara", lingura(8)],
  [168872, "Tărâțe de ovăz", "camara", lingura(6)],
  [170688, "Bulgur", "camara"],
  [169699, "Cuscus", "camara"],
  [168874, "Quinoa", "camara"],
  [168894, "Făină albă", "camara", lingura(8)],
  [168867, "Mălai", "camara"],
  [169715, "Griș", "camara"],
  [169742, "Tăiței de orez", "camara"],
  [169731, "Tăiței cu ou", "camara"],
  [172420, "Linte", "camara"],
  [174284, "Linte roșie", "camara"],
  [173756, "Năut uscat", "camara"],
  [173734, "Fasole neagră uscată", "camara"],
  [175193, "Fasole roșie uscată", "camara"],
  [170187, "Miez de nucă", "camara"],
  [170162, "Caju", "camara"],
  [172430, "Arahide crude", "camara"],
  [173806, "Arahide prăjite, nesărate", "camara"],
  [170554, "Semințe de chia", "camara", lingura(12)],
  [169414, "Semințe de in", "camara", lingura(10)],
  [170150, "Susan", "camara", lingura(9)],
  [170562, "Semințe de floarea-soarelui", "camara"],
  [170556, "Semințe de dovleac", "camara"],
  [168165, "Stafide", "camara"],
  [168191, "Curmale", "camara", buc(24)],
  [169593, "Cacao neîndulcită", "camara", lingura(5)],
  [169698, "Amidon de porumb", "camara", lingura(8)],
  // Conserve
  [173709, "Ton în apă (scurs)", "conserve"],
  [175140, "Sardine în sos tomat", "conserve"],
  [174285, "Fasole roșie conservă (scursă)", "conserve"],
  [173800, "Năut conservă (scurs)", "conserve"],
  [175204, "Fasole albă conservă", "conserve"],
  [170501, "Roșii tocate (conservă)", "conserve"],
  [170054, "Passata / sos de roșii", "conserve"],
  [170459, "Pastă de tomate", "conserve", lingura(16)],
  [169214, "Porumb conservă (scurs)", "conserve"],
  [169254, "Ciuperci conservă (scurse)", "conserve"],
  [169094, "Măsline negre", "conserve"],
  [168558, "Castraveți murați", "conserve"],
  [169279, "Varză murată", "conserve"],
  // Condimente, uleiuri, sosuri
  [171413, "Ulei de măsline", "condimente", oil],
  [171017, "Ulei de floarea-soarelui", "condimente", oil],
  [171412, "Ulei de cocos", "condimente", { ...oil, staple: false }],
  [173468, "Sare", "condimente", spice(6)],
  [170931, "Piper negru", "condimente", spice(2.3)],
  [171329, "Boia dulce", "condimente", spice(2.3)],
  [170923, "Chimen", "condimente", spice(2)],
  [171328, "Oregano uscat", "condimente", spice(1)],
  [171325, "Usturoi granulat", "condimente", spice(3)],
  [171327, "Ceapă granulată", "condimente", spice(2.4)],
  [171320, "Scorțișoară", "condimente", spice(2.6)],
  [172231, "Turmeric", "condimente", spice(3)],
  [170924, "Curry", "condimente", spice(2)],
  [170938, "Cimbru uscat", "condimente", spice(1)],
  [171333, "Rozmarin uscat", "condimente", spice(1.2)],
  [171317, "Busuioc uscat", "condimente", spice(0.7)],
  [171319, "Chili praf", "condimente", spice(2.7)],
  [170926, "Ghimbir praf", "condimente", spice(1.8)],
  [170917, "Foi de dafin", "condimente", { staple: true, portions: [{ name: "bucată", grams: 0.2 }] }],
  [172803, "Praf de copt", "condimente", spice(4.6)],
  [173471, "Esență de vanilie", "condimente", spice(4.2)],
  [174278, "Sos de soia", "condimente", { staple: true, density: 1.2, portions: [{ name: "lingură", grams: 16 }] }],
  [173469, "Oțet de mere", "condimente", { staple: true, portions: [{ name: "lingură", grams: 15 }] }],
  [169640, "Miere", "condimente", lingura(21)],
  [169655, "Zahăr", "condimente", { portions: [{ name: "linguriță", grams: 4 }] }],
  [169661, "Sirop de arțar", "condimente", lingura(20)],
  [172234, "Muștar", "condimente", lingura(15)],
  [171009, "Maioneză", "condimente", lingura(14)],
  [168556, "Ketchup", "condimente", lingura(17)],
  [173472, "Hrean", "condimente", lingura(15)],
  [172470, "Unt de arahide", "condimente", lingura(16)],
  [174289, "Hummus", "condimente", lingura(15)],
  [171580, "Pesto", "condimente", lingura(16)],
  // Brutărie
  [172688, "Pâine integrală", "brutarie", felie(30)],
  [174924, "Pâine albă", "brutarie", felie(25)],
  [168013, "Pâine multicereale", "brutarie", felie(30)],
  [172684, "Pâine de secară", "brutarie", felie(30)],
  [175037, "Lipie (tortilla)", "brutarie", buc(60)],
  [172796, "Chiflă de burger", "brutarie", buc(50)],
  // Mezeluri, gustări
  [173863, "Șuncă feliată slabă", "mezeluri", felie(15)],
  [170273, "Ciocolată neagră 70-85%", "gustari"],
];

const NUTRIENTS: Record<string, "kcal" | "protein" | "fat" | "carbs" | "fiber"> = {
  "1008": "kcal",
  "1003": "protein",
  "1004": "fat",
  "1005": "carbs",
  "1079": "fiber",
};

const unquote = (line: string) => line.slice(1, -1).split('","');
const r1 = (n: number) => Math.round(n * 10) / 10;

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("Dă-mi directorul cu CSV-urile SR Legacy");
  const wanted = new Set(ENTRIES.map((e) => String(e[0])));
  const values = new Map<string, Partial<Record<string, number>>>();

  const rl = createInterface({ input: createReadStream(join(dir, "food_nutrient.csv")) });
  for await (const line of rl) {
    const [, fdcId, nutrientId, amount] = unquote(line);
    const key = NUTRIENTS[nutrientId];
    if (!key || !wanted.has(fdcId)) continue;
    const v = values.get(fdcId) ?? {};
    v[key] = Number(amount);
    values.set(fdcId, v);
  }

  const missing: number[] = [];
  const products = ENTRIES.flatMap(([fdcId, name, aisle, extra = {}]) => {
    const v = values.get(String(fdcId));
    if (!v || v.protein == null || v.fat == null || v.carbs == null) {
      missing.push(fdcId);
      return [];
    }
    const fiber = v.fiber ?? null;
    const carbs = Math.max(0, v.carbs - (fiber ?? 0));
    const kcal = 4 * v.protein + 4 * carbs + 9 * v.fat + 2 * (fiber ?? 0);
    return [{
      fdcId,
      name,
      aisle,
      staple: extra.staple ?? false,
      density: extra.density ?? 1,
      portions: extra.portions ?? [],
      kcal: Math.round(kcal),
      protein: r1(v.protein),
      carbs: r1(carbs),
      fat: r1(v.fat),
      fiber: fiber == null ? null : r1(fiber),
    }];
  });

  if (missing.length) console.warn("Lipsesc din CSV:", missing.join(", "));
  writeFileSync(
    "data/generic-ro.json",
    JSON.stringify({ source: "USDA FoodData Central, SR Legacy (domeniu public)", products }, null, 1),
  );
  console.log(`${products.length} alimente generice → data/generic-ro.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
