/**
 * Creează/actualizează baza de date: migrări, bucătăria, ingredientele (generice, vechi, OpenFoodFacts)
 * și rețetele prestabilite. Idempotent: ce există deja nu e suprascris.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { connect } from "../src/server/db/connect";
import * as t from "../src/server/db/schema";
import { EQUIPMENT, ACTIONS } from "../src/server/seed/kitchen";
import { OFF_PORTIONS, PRESET_RECIPES } from "../src/server/seed/recipes";
import { DEFAULT_SETTINGS, type Portion, type RecipeStep } from "../src/domain/types";
import { canonicalUnit } from "../src/domain/units";
import { normalize } from "../src/domain/text";

type GenericRow = { fdcId: number; name: string; aisle: string; staple: boolean; density: number; portions: Portion[]; kcal: number; protein: number; carbs: number; fat: number; fiber: number | null };
type LegacyRow = { name: string; aisle: string; lidl: boolean; kcal: number; protein: number; carbs: number; fat: number; fiber: number | null; packGrams: number | null; portions?: Portion[] };
type OffRow = { code: string; name: string; brand: string | null; lidl: boolean; kcal: number; protein: number; carbs: number; fat: number; fiber: number | null; packGrams: number | null; packLabel: string | null; aisle: string };

const ANIMAL_AISLES = new Set(["lactate-oua", "carne", "peste", "mezeluri"]);
const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8"));
const slug = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function main() {
  mkdirSync("var", { recursive: true });
  const db = connect();
  await migrate(db, { migrationsFolder: "drizzle" });

  await db.insert(t.equipment).values(EQUIPMENT.map((e, sort) => ({ ...e, sort }))).onConflictDoNothing();
  await db.insert(t.actions).values(ACTIONS.map((a, sort) => ({ ...a, sort }))).onConflictDoNothing();
  await db.insert(t.settings).values({ id: 1, value: DEFAULT_SETTINGS }).onConflictDoNothing();

  const generic = json<{ products: GenericRow[] }>("data/generic-ro.json").products;
  const legacy = json<{ products: LegacyRow[] }>("data/legacy.json").products;
  const off = json<{ products: OffRow[] }>("data/off-ro.json").products;

  // Cheile din rețete → id-uri, ca să știm ce produse din catalog intră direct în biblioteca ta.
  const keyToId = new Map<string, string>();
  generic.forEach((g) => keyToId.set(g.name, `usda-${g.fdcId}`));
  legacy.forEach((l) => keyToId.set(`legacy:${l.name}`, `legacy-${slug(l.name)}`));
  off.forEach((o) => keyToId.set(`off:${o.code}`, `off-${o.code}`));
  const usedOff = new Set(
    PRESET_RECIPES.flatMap((r) => r.steps.flatMap((s) => s.lines ?? []))
      .map(([key]) => key)
      .filter((k) => k.startsWith("off:"))
      .map((k) => k.slice(4)),
  );

  const rows: (typeof t.ingredients.$inferInsert)[] = [
    ...generic.map((g) => ({
      id: `usda-${g.fdcId}`, name: g.name, brand: null, kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat, fiber: g.fiber,
      density: g.density, portions: g.portions, aisle: g.aisle, staple: g.staple, source: "usda" as const, inLibrary: true,
    })),
    ...legacy.map((l) => ({
      id: `legacy-${slug(l.name)}`, name: l.name.trim(), brand: null, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat, fiber: l.fiber,
      portions: l.portions ?? [], packGrams: l.packGrams, aisle: l.aisle, lidl: l.lidl, source: "legacy" as const, inLibrary: true,
    })),
    ...off.map((o) => ({
      id: `off-${o.code}`, name: o.name, brand: o.brand, kcal: o.kcal, protein: o.protein, carbs: o.carbs, fat: o.fat,
      // Produsele de origine animală practic nu au fibre; OFF lasă des câmpul gol.
      fiber: o.fiber ?? (ANIMAL_AISLES.has(o.aisle) && o.carbs < 8 ? 0 : null),
      portions: OFF_PORTIONS[o.code] ?? [], packGrams: o.packGrams, packLabel: o.packLabel, aisle: o.aisle, lidl: o.lidl,
      source: "off" as const, barcode: o.code, inLibrary: usedOff.has(o.code),
    })),
  ];
  await chunked(rows, 500, (c) => db.insert(t.ingredients).values(c).onConflictDoNothing());

  const missing: string[] = [];
  const recipes = PRESET_RECIPES.map((r) => {
    const steps: RecipeStep[] = r.steps.map((s, si) => ({
      id: `s${si + 1}`,
      text: s.text,
      actionId: s.action,
      minutes: s.minutes ?? null,
      activeMinutes: null,
      tempC: null,
      lines: (s.lines ?? []).map(([key, amount, unit = "g", flex], li) => {
        const ingredientId = keyToId.get(key);
        if (!ingredientId) missing.push(`${r.name}: ${key}`);
        return {
          id: `s${si + 1}l${li + 1}`,
          ingredientId: ingredientId ?? key,
          amount,
          unit: canonicalUnit(unit) ?? unit,
          flex: flex ? { min: flex[0], max: flex[1] } : null,
        };
      }),
    }));
    return {
      id: `preset-${slug(r.name)}`, name: r.name, category: r.category, servings: 1, freezes: r.freezes ?? false,
      keepsDays: r.keepsDays ?? 3, notes: r.notes ?? "", steps, preset: true,
    };
  });
  if (missing.length) throw new Error(`Ingrediente negăsite în rețetele prestabilite:\n${missing.join("\n")}`);
  await db.insert(t.recipes).values(recipes).onConflictDoNothing();

  console.log(`Seed gata: ${EQUIPMENT.length} ustensile, ${ACTIONS.length} acțiuni, ${rows.length} ingrediente, ${recipes.length} rețete.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
