import { recipeLines, type IngredientLookup } from "./macros";
import { dayMacros, lineServingGrams, type Meal } from "./plan";
import type { Macros, MacroTargets, Recipe, Settings } from "./types";

/**
 * Solverul de porții. Ajustează liniile „flexibile” ale rețetelor din plan ca fiecare zi să ajungă
 * la ținte, în ordinea priorităților din SPEC:
 *   1. proteine ≥ țintă (max +15)   2. kcal ± 75   3. pachete întregi   4. fibre ≥ țintă   5. grăsimi ± 10
 *
 * O variabilă = o linie flexibilă a unei rețete, comună pentru toate mesele cu acea rețetă din interval
 * (gătești o dată, porționezi la fel). Pierderea e o sumă de pătrate „cu toleranță”, deci convexă:
 * gradientul proiectat converge sigur și dă mereu același rezultat pentru aceleași date.
 */

export type SolveInput = {
  meals: Meal[];
  recipes: (id: string) => Recipe | undefined;
  lookup: IngredientLookup;
  settings: Settings;
};

export type SolveResult = {
  /** recipeId → lineId → grame per porție. */
  solved: Map<string, Record<string, number>>;
  /** Totalurile zilnice după ajustare. */
  days: Map<string, Macros>;
};

type Variable = {
  recipeId: string;
  lineId: string;
  ingredientId: string;
  min: number;
  max: number;
  base: number;
  /** grame per „pas” de rotunjire (o bucată, o felie) sau pasul generic. */
  step: number;
  /** macro-uri per gram. */
  per: { kcal: number; protein: number; fat: number; fiber: number };
};

const MAIN_SLOTS = new Set(["pranz", "gustare", "cina"]);

/** Ținta zilei, scalată la sloturile planificate (o zi cu doar cina nu trebuie să ajungă la 2300). */
export function dayTarget(meals: Meal[], settings: Settings): MacroTargets | null {
  const filled = new Set(meals.filter((m) => m.status !== "skipped" && MAIN_SLOTS.has(m.slot)).map((m) => m.slot));
  const share = settings.slots.filter((s) => filled.has(s.id)).reduce((a, s) => a + s.share, 0);
  if (share === 0) return null;
  const t = settings.targets;
  return { kcal: t.kcal * share, protein: t.protein * share, fat: t.fat * share, fiber: t.fiber * share };
}

// Pierderile, normalizate ca 1 unitate = o abatere „deranjantă”.
const W = { proteinLow: 60, proteinHigh: 15, kcalOut: 30, kcalCenter: 0.6, fiber: 6, fat: 4, drift: 0.05 };
const hinge = (x: number) => (x > 0 ? x : 0);

function dayLoss(m: { kcal: number; protein: number; fat: number; fiber: number }, t: MacroTargets) {
  const pLow = hinge(t.protein - m.protein) / 10;
  const pHigh = hinge(m.protein - (t.protein + 15 * (t.protein / 140))) / 10;
  const kTol = 75 * (t.kcal / 2300);
  const kOut = hinge(Math.abs(m.kcal - t.kcal) - kTol) / kTol;
  const kCenter = (m.kcal - t.kcal) / kTol;
  const fib = hinge(t.fiber - m.fiber) / 5;
  const fTol = 10 * (t.fat / 60);
  const fat = hinge(Math.abs(m.fat - t.fat) - fTol) / fTol;
  return W.proteinLow * pLow ** 2 + W.proteinHigh * pHigh ** 2 + W.kcalOut * kOut ** 2 + W.kcalCenter * kCenter ** 2 + W.fiber * fib ** 2 + W.fat * fat ** 2;
}

/** Derivatele pierderii zilei față de fiecare macro. */
function dayGrad(m: { kcal: number; protein: number; fat: number; fiber: number }, t: MacroTargets) {
  const kTol = 75 * (t.kcal / 2300);
  const fTol = 10 * (t.fat / 60);
  const pHi = t.protein + 15 * (t.protein / 140);
  const dk = m.kcal - t.kcal;
  const df = m.fat - t.fat;
  return {
    protein: (-2 * W.proteinLow * hinge(t.protein - m.protein)) / 100 + (2 * W.proteinHigh * hinge(m.protein - pHi)) / 100,
    kcal: (2 * W.kcalOut * hinge(Math.abs(dk) - kTol) * Math.sign(dk)) / kTol ** 2 + (2 * W.kcalCenter * dk) / kTol ** 2,
    fiber: (-2 * W.fiber * hinge(t.fiber - m.fiber)) / 25,
    fat: (2 * W.fat * hinge(Math.abs(df) - fTol) * Math.sign(df)) / fTol ** 2,
  };
}

function roundingStep(grams: number, unitGrams: number | null) {
  if (unitGrams) return unitGrams;
  if (grams < 30) return 1;
  if (grams < 100) return 5;
  return 10;
}

export function solve({ meals, recipes, lookup, settings }: SolveInput): SolveResult {
  const active = meals.filter((m) => m.status !== "skipped");
  const byDate = new Map<string, Meal[]>();
  for (const m of active) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m]);

  // 1. Variabilele: liniile flexibile ale rețetelor folosite, care nu sunt fixate manual peste tot.
  const vars: Variable[] = [];
  const varIndex = new Map<string, number>();
  for (const m of active) {
    const r = m.recipeId ? recipes(m.recipeId) : undefined;
    if (!r) continue;
    for (const l of recipeLines(r)) {
      if (!l.flex || m.pinned[l.id] != null) continue;
      const key = `${r.id}:${l.id}`;
      if (varIndex.has(key)) continue;
      const ing = lookup(l.ingredientId);
      if (!ing) continue;
      const base = lineServingGrams(r, l, lookup);
      const portion = ing.portions.find((p) => p.name === l.unit)?.grams ?? null;
      const k = 1 / Math.max(1, r.servings);
      varIndex.set(key, vars.length);
      vars.push({
        recipeId: r.id,
        lineId: l.id,
        ingredientId: l.ingredientId,
        min: Math.min(base, l.flex.min * k),
        max: Math.max(base, l.flex.max * k),
        base,
        step: roundingStep(base, portion),
        per: {
          kcal: ing.per100.kcal / 100,
          protein: ing.per100.protein / 100,
          fat: ing.per100.fat / 100,
          fiber: (ing.per100.fiber ?? 0) / 100,
        },
      });
    }
  }

  // 2. Pentru fiecare zi: macro-urile fixe + câte porții din fiecare variabilă apar în ziua aia.
  type Day = { date: string; target: MacroTargets; fixed: Macros; counts: Map<number, number> };
  const days: Day[] = [];
  for (const [date, dayMeals] of byDate) {
    const target = dayTarget(dayMeals, settings);
    if (!target) continue;
    const counts = new Map<number, number>();
    // Macro-urile fixe = ziua calculată cu variabilele la zero.
    const zeroed = dayMeals.map((m) => {
      if (!m.recipeId) return m;
      const solved = { ...m.solved };
      for (const [key, idx] of varIndex) {
        const [rid, lid] = key.split(":");
        if (rid === m.recipeId && m.pinned[lid] == null) {
          solved[lid] = 0;
          counts.set(idx, (counts.get(idx) ?? 0) + m.servings);
        }
      }
      return { ...m, solved };
    });
    days.push({ date, target, fixed: dayMacros(zeroed, recipes, lookup), counts });
  }

  const evalDay = (d: Day, x: number[]) => {
    const m = { kcal: d.fixed.kcal, protein: d.fixed.protein, fat: d.fixed.fat, fiber: d.fixed.fiber };
    for (const [j, c] of d.counts) {
      m.kcal += vars[j].per.kcal * x[j] * c;
      m.protein += vars[j].per.protein * x[j] * c;
      m.fat += vars[j].per.fat * x[j] * c;
      m.fiber += vars[j].per.fiber * x[j] * c;
    }
    return m;
  };
  const loss = (x: number[]) =>
    days.reduce((a, d) => a + dayLoss(evalDay(d, x), d.target), 0) +
    vars.reduce((a, v, j) => a + W.drift * ((x[j] - v.base) / Math.max(v.base, 20)) ** 2, 0);

  // 3. Gradient proiectat pe variabile normalizate în [0, 1]; `fixed` rămân neatinse.
  const range = vars.map((v) => Math.max(1, v.max - v.min));
  const optimize = (start: number[], fixed: Set<number>): number[] => {
    let x = [...start];
    if (!days.length || fixed.size === vars.length) return x;
    let u = vars.map((v, j) => (x[j] - v.min) / range[j]);
    let lr = 0.05;
    let current = loss(x);
    for (let iter = 0; iter < 3000; iter++) {
      const g = new Array(vars.length).fill(0);
      for (const d of days) {
        const dg = dayGrad(evalDay(d, x), d.target);
        for (const [j, c] of d.counts) {
          const p = vars[j].per;
          g[j] += c * (dg.kcal * p.kcal + dg.protein * p.protein + dg.fat * p.fat + dg.fiber * p.fiber);
        }
      }
      vars.forEach((v, j) => (g[j] += (2 * W.drift * (x[j] - v.base)) / Math.max(v.base, 20) ** 2));
      const nextU = u.map((ui, j) => (fixed.has(j) ? ui : Math.min(1, Math.max(0, ui - lr * g[j] * range[j]))));
      const nextX = vars.map((v, j) => (fixed.has(j) ? x[j] : v.min + nextU[j] * range[j]));
      const nextLoss = loss(nextX);
      if (nextLoss <= current) {
        const improvement = current - nextLoss;
        u = nextU;
        x = nextX;
        current = nextLoss;
        lr *= 1.1;
        if (improvement < 1e-9) break;
      } else {
        lr *= 0.5;
        if (lr < 1e-7) break;
      }
    }
    return x;
  };

  // 4. Rotunjire la valori practice (bucăți întregi, 5/10 g).
  const roundAll = (x: number[], fixed: Set<number>) =>
    x.map((xi, j) => {
      if (fixed.has(j)) return xi;
      const v = vars[j];
      const r = Math.round(xi / v.step) * v.step;
      return Math.min(v.max, Math.max(v.min, r || v.step));
    });

  let fixed = new Set<number>();
  let x = roundAll(optimize(vars.map((v) => v.base), fixed), fixed);

  // 5. Pachete întregi: aliniem totalul unui ingredient pe interval la N pachete, apoi lăsăm
  //    celelalte variabile să compenseze. Acceptăm doar o creștere mică a pierderii: pachetele
  //    contează mai mult decât fibrele și grăsimile, dar nu mai mult decât proteinele și caloriile.
  const servingsOf = (j: number) => days.reduce((a, d) => a + (d.counts.get(j) ?? 0), 0);
  const byIngredient = new Map<string, number[]>();
  vars.forEach((v, j) => byIngredient.set(v.ingredientId, [...(byIngredient.get(v.ingredientId) ?? []), j]));
  const packed = [...byIngredient]
    .map(([id, js]) => ({ js, pack: lookup(id)?.packGrams ?? 0, total: js.reduce((a, j) => a + x[j] * servingsOf(j), 0) }))
    .filter((p) => p.pack > 0 && p.total > 0)
    .sort((a, b) => b.total - a.total);

  let bestLoss = loss(x);
  for (const { js, pack } of packed) {
    const total = js.reduce((a, j) => a + x[j] * servingsOf(j), 0);
    const packs = Math.max(1, Math.round(total / pack));
    const factor = (packs * pack) / total;
    if (Math.abs(factor - 1) < 0.005 || Math.abs(factor - 1) > 0.2) continue;
    const snapped = [...x];
    if (js.some((j) => x[j] * factor < vars[j].min - 0.5 || x[j] * factor > vars[j].max + 0.5)) continue;
    js.forEach((j) => (snapped[j] = Math.round(x[j] * factor)));
    const nextFixed = new Set([...fixed, ...js]);
    const candidate = roundAll(optimize(snapped, nextFixed), nextFixed);
    const l = loss(candidate);
    if (l <= bestLoss + 3) {
      x = candidate;
      fixed = nextFixed;
      bestLoss = Math.min(bestLoss, l);
    }
  }

  const solved = new Map<string, Record<string, number>>();
  vars.forEach((v, j) => solved.set(v.recipeId, { ...(solved.get(v.recipeId) ?? {}), [v.lineId]: x[j] }));

  const totals = new Map<string, Macros>();
  for (const [date, dayMeals] of byDate) {
    const withSolved = dayMeals.map((m) => (m.recipeId && solved.has(m.recipeId) ? { ...m, solved: { ...m.solved, ...solved.get(m.recipeId) } } : m));
    totals.set(date, dayMacros(withSolved, recipes, lookup));
  }
  return { solved, days: totals };
}
