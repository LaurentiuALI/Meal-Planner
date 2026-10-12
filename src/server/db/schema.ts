import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, index, primaryKey } from "drizzle-orm/sqlite-core";
import type { Portion, RecipeStep, Settings } from "@/domain/types";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
};

export const ingredients = sqliteTable(
  "ingredients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand"),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    fiber: real("fiber"),
    density: real("density").notNull().default(1),
    portions: text("portions", { mode: "json" }).$type<Portion[]>().notNull().default([]),
    packGrams: real("pack_grams"),
    packLabel: text("pack_label"),
    aisle: text("aisle").notNull().default("altele"),
    staple: integer("staple", { mode: "boolean" }).notNull().default(false),
    lidl: integer("lidl", { mode: "boolean" }).notNull().default(false),
    source: text("source", { enum: ["off", "usda", "manual", "legacy"] }).notNull(),
    barcode: text("barcode").unique(),
    /** Ingredientele „tale” (create, importate sau folosite), față de catalogul brut. */
    inLibrary: integer("in_library", { mode: "boolean" }).notNull().default(false),
    /** Valorile au fost verificate de tine (de pe etichetă sau ca generic bun). */
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    /** Nu se cântărește: condiment (după gust) sau ulei (puțin). */
    toTaste: text("to_taste", { enum: ["condiment", "ulei"] }),
    /** Prețul (lei) pentru `priceGrams` grame; din fișierul Lidl sau introdus de tine. */
    priceRon: real("price_ron"),
    priceGrams: real("price_grams"),
    priceSource: text("price_source", { enum: ["lidl", "manual"] }),
    /** Linia din fișierul Lidl de care e legat produsul („Denumire|Gramaj”). */
    priceRef: text("price_ref"),
    priceAt: integer("price_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [index("ingredients_library_idx").on(t.inLibrary)],
);

export const equipment = sqliteTable("equipment", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["plita", "cuptor", "airfryer", "vas", "vas-cuptor", "aparat"] }).notNull(),
  count: integer("count").notNull().default(1),
  capacityG: real("capacity_g"),
  sort: integer("sort").notNull().default(0),
});

export const actions = sqliteTable("actions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  equipment: text("equipment", { mode: "json" }).$type<string[][]>().notNull().default([]),
  minutes: real("minutes").notNull(),
  activeMinutes: real("active_minutes").notNull(),
  perKgMinutes: real("per_kg_minutes").notNull().default(0),
  tempC: integer("temp_c"),
  capacityG: real("capacity_g"),
  loadFactor: real("load_factor").notNull().default(1),
  perBatch: integer("per_batch", { mode: "boolean" }).notNull().default(false),
  mergeable: integer("mergeable", { mode: "boolean" }).notNull().default(true),
  alternatives: text("alternatives", { mode: "json" }).$type<string[]>().notNull().default([]),
  hint: text("hint"),
  sort: integer("sort").notNull().default(0),
});

/** Pașii (cu liniile de ingrediente) stau ca JSON: o rețetă se editează și se salvează întotdeauna întreagă. */
export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: ["pranz", "gustare", "cina", "rapid"] }).notNull(),
  servings: integer("servings").notNull().default(1),
  freezes: integer("freezes", { mode: "boolean" }).notNull().default(false),
  keepsDays: integer("keeps_days").notNull().default(3),
  notes: text("notes").notNull().default(""),
  steps: text("steps", { mode: "json" }).$type<RecipeStep[]>().notNull().default([]),
  preset: integer("preset", { mode: "boolean" }).notNull().default(false),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  value: text("value", { mode: "json" }).$type<Settings>().notNull(),
});

export const meals = sqliteTable(
  "meals",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    slot: text("slot", { enum: ["pranz", "gustare", "cina", "extra"] }).notNull(),
    recipeId: text("recipe_id"),
    ingredientId: text("ingredient_id"),
    grams: real("grams"),
    servings: real("servings").notNull().default(1),
    /** lineId → grame per porție, setate manual (bat solverul). */
    pinned: text("pinned", { mode: "json" }).$type<Record<string, number>>().notNull().default({}),
    /** lineId → grame per porție, calculate de solver. */
    solved: text("solved", { mode: "json" }).$type<Record<string, number>>().notNull().default({}),
    status: text("status", { enum: ["planned", "eaten", "skipped"] }).notNull().default("planned"),
    sort: integer("sort").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("meals_date_idx").on(t.date)],
);

/** Bifele de pe lista de cumpărături, pe interval („2026-10-12_2026-10-14”). */
export const shoppingChecks = sqliteTable(
  "shopping_checks",
  {
    listKey: text("list_key").notNull(),
    ingredientId: text("ingredient_id").notNull(),
    checked: integer("checked", { mode: "boolean" }).notNull(),
    /** Ora de pe telefon, ca la sincronizare să câștige ultima bifă, nu ultima cerere. */
    at: integer("at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.listKey, t.ingredientId] })],
);

/** Prețurile zilnice Lidl (preturiZilniceLidl.xlsb), înlocuite la fiecare actualizare. */
export const lidlPrices = sqliteTable("lidl_prices", {
  ref: text("ref").primaryKey(),
  name: text("name").notNull(),
  size: text("size").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  /** Gramele la care se referă prețul; `null` pentru prețul pe bucată. */
  grams: real("grams"),
  fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
});
