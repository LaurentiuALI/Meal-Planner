import { recipeLines, type IngredientLookup } from "./macros";
import { daysBetween, lineServingGrams, type Meal } from "./plan";
import type { Action, Equipment, Recipe, ToTaste } from "./types";

/**
 * Sesiunea de gătit: din mesele unui interval face un plan de lucru.
 *
 * 1. Cantități: pentru fiecare rețetă, gramele totale pe linie (porții × gramaj ajustat).
 * 2. Sarcini: fiecare pas devine o sarcină; ce tai la pașii de pregătire „curge” în pasul de gătit următor.
 * 3. Agregare: aceeași acțiune (aceeași temperatură) din rețete diferite se face o singură dată.
 * 4. Ture: dacă nu încape (coșul airfryerului, vasele din cuptor), sarcina se sparge în ture.
 * 5. Timeline: planificare cu resurse reale. Tu ești o resursă doar pentru timpul activ; în timpul
 *    pasiv (cuptor, airfryer, fiert) poți face altceva. Prioritate are drumul critic cel mai lung.
 *    Între un vas curat liber acum și unul deja murdar liber în ≤5 minute, îl așteptăm pe cel murdar.
 */

export type CookLine = { recipeId: string; ingredientId: string; name: string; grams: number; toTaste?: ToTaste | null };

export type Task = {
  id: string;
  actionId: string | null;
  title: string;
  texts: { recipeId: string; text: string }[];
  recipeIds: string[];
  /** Ingredientele adăugate la pasul ăsta. */
  lines: CookLine[];
  /** Tot ce intră în ustensilă: ce vine din pregătire (puiul tăiat) plus `lines`. */
  inputs: CookLine[];
  /** Gramele care intră în ustensilă (pentru capacitate), înainte de factorul de volum. */
  loadG: number;
  minutes: number;
  activeMinutes: number;
  tempC: number | null;
  hint: string | null;
  equipment: string[][];
  capacityG: number | null;
  loadFactor: number;
  perBatch: boolean;
  deps: string[];
  kind: "prep" | "cook" | "portion";
  alternatives: string[];
  /** Acțiunea din rețetă, dacă sesiunea a ales altă metodă (ex. tigaie în loc de airfryer). */
  switchedFrom: string | null;
};

export type Job = {
  id: string;
  task: Task;
  batch: number;
  batches: number;
  /** Rețetele și ingredientele din tura asta (o tură poate fi doar a unei rețete). */
  recipeIds: string[];
  inputs: CookLine[];
  loadG: number;
  minutes: number;
  activeMinutes: number;
  deps: string[];
};

export type Scheduled = Job & {
  start: number;
  end: number;
  activeEnd: number;
  /** Unitățile folosite, ex. ["aragaz#2", "tigaie-28#1"]. */
  units: string[];
  rinse: boolean;
};

export type SessionPortion = {
  recipeId: string;
  name: string;
  servings: number;
  days: string[];
  perServing: { name: string; grams: number }[];
  warnings: string[];
};

export type SessionPlan = {
  timeline: Scheduled[];
  totalMinutes: number;
  activeMinutes: number;
  /** Ce ar fi durat făcut rețetă cu rețetă, fără paralelizare și agregare. */
  serialMinutes: number;
  dishes: string[];
  byEquipment: { equipmentId: string; name: string; jobs: Scheduled[] }[];
  portions: SessionPortion[];
  /** Rețete fără niciun pas de gătit: se asamblează pe loc, nu în sesiune. */
  noCook: { recipeId: string; name: string; servings: number; minutes: number }[];
  /** Pașii la care sesiunea a ales altă metodă decât rețeta, ca să termini mai repede. */
  switches: { from: string; to: string; recipeIds: string[] }[];
  warnings: string[];
};

export type CookInput = {
  meals: Meal[];
  recipes: (id: string) => Recipe | undefined;
  lookup: IngredientLookup;
  actions: Map<string, Action>;
  equipment: Equipment[];
  /** Ziua în care gătești (pentru avertismentele de prospețime). */
  sessionDate: string;
};

const DEFAULT_STEP: Pick<Action, "minutes" | "activeMinutes" | "perKgMinutes"> = { minutes: 2, activeMinutes: 2, perKgMinutes: 0 };

// ─── 1–2. Cantități și sarcini ───

function buildTasks(input: CookInput) {
  const { meals, recipes, lookup, actions } = input;
  const totals = new Map<string, { recipe: Recipe; servings: number; lineGrams: Map<string, number>; dates: Set<string> }>();
  for (const m of meals) {
    if (m.status === "skipped" || !m.recipeId) continue;
    const r = recipes(m.recipeId);
    if (!r) continue;
    const cur = totals.get(r.id) ?? { recipe: r, servings: 0, lineGrams: new Map(), dates: new Set<string>() };
    cur.servings += m.servings;
    cur.dates.add(m.date);
    for (const l of recipeLines(r)) cur.lineGrams.set(l.id, (cur.lineGrams.get(l.id) ?? 0) + lineServingGrams(r, l, lookup, m) * m.servings);
    totals.set(r.id, cur);
  }

  const vessels = new Set(input.equipment.filter((e) => e.kind === "vas").map((e) => e.id));
  const cooks = (a?: Action) => !!a && a.equipment.length > 0;
  const tasks: Task[] = [];
  const noCook: SessionPlan["noCook"] = [];
  for (const { recipe: r, servings } of totals.values()) {
    if (!r.steps.some((s) => cooks(s.actionId ? actions.get(s.actionId) : undefined))) {
      const minutes = r.steps.reduce((a, s) => a + (s.minutes ?? (s.actionId ? actions.get(s.actionId)?.minutes : undefined) ?? 2), 0);
      noCook.push({ recipeId: r.id, name: r.name, servings, minutes });
      totals.delete(r.id);
    }
  }
  for (const { recipe: r, servings, lineGrams, dates } of totals.values()) {
    // Ce mănânci în ziua sesiunii nu se pune în caserole.
    const eatenToday = [...dates].every((d) => d === input.sessionDate);
    // Dependențe reale, nu ordinea din rețetă: gătitul așteaptă pregătirea care îl alimentează și pasul
    // anterior doar dacă continuă în același vas; asamblarea de la final așteaptă tot.
    const ids: string[] = [];
    let prevPrep: string | null = null;
    let prevCook: string | null = null;
    let carry: CookLine[] = [];
    let vesselLoad = 0;
    let prevVessels: string[] = [];
    for (const s of r.steps) {
      const action = s.actionId ? actions.get(s.actionId) : undefined;
      const lines: CookLine[] = s.lines.map((l) => ({
        recipeId: r.id,
        ingredientId: l.ingredientId,
        name: lookup(l.ingredientId)?.name ?? "?",
        grams: lineGrams.get(l.id) ?? 0,
        toTaste: lookup(l.ingredientId)?.toTaste ?? null,
      }));
      const own = lines.reduce((a, l) => a + l.grams, 0);
      const isPrep = !action || action.equipment.length === 0;
      const inputs = isPrep ? lines : [...carry, ...lines];
      let loadG = own;
      let deps: string[] = [];
      if (!isPrep) {
        loadG = own + carry.reduce((a, l) => a + l.grams, 0);
        // Pașii care continuă în același vas (ceapă → carne → sos) adună conținutul; rumenirea în ture nu.
        const myVessels = action!.equipment.flat().filter((id) => vessels.has(id));
        // Ce se fierbe în apă (orez, paste, cartofi) cere vas curat, nu continuă în tigaia de dinainte.
        const continues = action!.loadFactor <= 1 && myVessels.some((id) => prevVessels.includes(id));
        vesselLoad = action!.perBatch || !continues ? loadG : vesselLoad + loadG;
        if (!action!.perBatch) loadG = vesselLoad;
        prevVessels = myVessels;
        deps = [carry.length ? prevPrep : null, continues ? prevCook : null].filter((d): d is string => !!d);
        carry = [];
      } else {
        const isLast = s === r.steps[r.steps.length - 1];
        // Pregătirea în lanț (tai → condimentez) rămâne în ordine; asamblarea finală așteaptă tot.
        deps = isLast && prevCook ? [...ids] : carry.length && prevPrep ? [prevPrep] : [];
        carry.push(...lines);
      }
      const base = action ?? DEFAULT_STEP;
      const kg = own / 1000;
      const id = `${r.id}:${s.id}`;
      tasks.push({
        id,
        actionId: action?.id ?? null,
        title: action?.name ?? (s.text.split(/[.;]/)[0] || "Pas"),
        texts: s.text ? [{ recipeId: r.id, text: s.text }] : [],
        recipeIds: [r.id],
        lines,
        inputs,
        loadG,
        minutes: (s.minutes ?? base.minutes) + (isPrep ? base.perKgMinutes * kg : 0),
        activeMinutes: Math.min(s.minutes ?? Infinity, (s.activeMinutes ?? base.activeMinutes) + base.perKgMinutes * kg),
        tempC: s.tempC ?? action?.tempC ?? null,
        hint: action?.hint ?? null,
        equipment: action?.equipment ?? [],
        capacityG: action?.capacityG ?? null,
        loadFactor: action?.loadFactor ?? 1,
        perBatch: action?.perBatch ?? false,
        deps,
        kind: isPrep ? "prep" : "cook",
        alternatives: action?.alternatives ?? [],
        switchedFrom: null,
      });
      ids.push(id);
      if (isPrep) prevPrep = id;
      else prevCook = id;
    }
    if (!eatenToday && (servings > 1 || r.category !== "rapid")) {
      tasks.push({
        id: `${r.id}:portion`,
        actionId: null,
        title: `Porționează în ${Math.ceil(servings)} ${Math.ceil(servings) === 1 ? "caserolă" : "caserole"}`,
        texts: [{ recipeId: r.id, text: "Lasă să se răcească puțin, apoi împarte egal. Capacul după ce nu mai iese abur." }],
        recipeIds: [r.id],
        lines: [],
        inputs: [],
        loadG: 0,
        minutes: 1 + 0.5 * servings,
        activeMinutes: 1 + 0.5 * servings,
        tempC: null,
        hint: null,
        equipment: [],
        capacityG: null,
        loadFactor: 1,
        perBatch: false,
        deps: [...ids],
        kind: "portion",
        alternatives: [],
        switchedFrom: null,
      });
    }
  }
  return { tasks, totals, noCook };
}

/** Desface un pas unit înapoi în pașii rețetelor, refăcând dependențele către și dinspre el. */
function splitMerged(tasks: Task[], index: number, originals: Map<string, Task>): Task[] {
  const merged = tasks[index];
  const parts = merged.id
    .split("+")
    .map((id) => originals.get(id))
    .filter((x): x is Task => !!x)
    .map((o) => (merged.switchedFrom ? { ...o, ...pickMethod(merged), switchedFrom: merged.switchedFrom } : o));
  if (parts.length < 2) return tasks;
  // Dependențele originale pot trimite la pași care între timp au fost uniți cu alții.
  const current = (id: string) => tasks.find((x) => x.id === id || x.id.split("+").includes(id))?.id ?? id;
  const rest = tasks.filter((_, j) => j !== index);
  const fixedParts = parts.map((p) => ({ ...p, deps: [...new Set(p.deps.map(current))] }));
  return [
    ...rest.map((x) =>
      x.deps.includes(merged.id)
        ? {
            ...x,
            deps: [
              ...new Set(
                x.deps.flatMap((d) => {
                  if (d !== merged.id) return [d];
                  const mine = fixedParts.filter((p) => p.recipeIds.some((r) => x.recipeIds.includes(r)));
                  return (mine.length ? mine : fixedParts).map((p) => p.id);
                }),
              ),
            ],
          }
        : x,
    ),
    ...fixedParts,
  ];
}

const pickMethod = (t: Task) => ({
  actionId: t.actionId, title: t.title, minutes: t.minutes, activeMinutes: t.activeMinutes, tempC: t.tempC, hint: t.hint,
  equipment: t.equipment, capacityG: t.capacityG, loadFactor: t.loadFactor, perBatch: t.perBatch,
});

/** Cuptorul se pornește o dată, înainte de primul pas care îl folosește; ceilalți pași îl așteaptă. */
function withPreheat(tasks: Task[]): Task[] {
  const oven = tasks.filter((t) => t.equipment.some((g) => g.includes("cuptor")));
  if (!oven.length) return tasks;
  const temp = Math.max(...oven.map((t) => t.tempC ?? 0)) || 200;
  const preheat: Task = {
    id: "preincalzire",
    actionId: null,
    title: `Pornește cuptorul la ${temp}°C (ventilator)`,
    texts: [],
    recipeIds: [],
    lines: [],
    inputs: [],
    loadG: 0,
    minutes: 10,
    activeMinutes: 0,
    tempC: temp,
    hint: "Se încălzește cât pregătești restul.",
    equipment: [],
    capacityG: null,
    loadFactor: 1,
    perBatch: false,
    deps: [],
    kind: "prep",
    alternatives: [],
    switchedFrom: null,
  };
  return [preheat, ...tasks.map((t) => (oven.includes(t) ? { ...t, deps: [...t.deps, preheat.id] } : t))];
}

/** Aceeași sarcină, făcută cu altă metodă (păstrează ingredientele și ordinea). */
export function withAction(t: Task, a: Action): Task {
  return {
    ...t,
    actionId: a.id,
    title: a.name,
    minutes: a.minutes,
    activeMinutes: a.activeMinutes,
    tempC: a.tempC,
    hint: a.hint,
    equipment: a.equipment,
    capacityG: a.capacityG,
    loadFactor: a.loadFactor,
    perBatch: a.perBatch,
    switchedFrom: t.switchedFrom ?? t.actionId,
  };
}

// ─── 3. Agregare ───

function hasCycle(tasks: Map<string, Task>) {
  const state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === 1) return true;
    if (s === 2) return false;
    state.set(id, 1);
    for (const d of tasks.get(id)?.deps ?? []) if (visit(d)) return true;
    state.set(id, 2);
    return false;
  };
  return [...tasks.keys()].some(visit);
}

export function mergeTasks(tasks: Task[], actions: Map<string, Action>): Task[] {
  let map = new Map(tasks.map((t) => [t.id, t]));
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const a = t.actionId ? actions.get(t.actionId) : undefined;
    if (!a?.mergeable || t.kind === "portion") continue;
    const key = `${t.actionId}@${t.tempC ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  for (const group of groups.values()) {
    let into: Task | null = null;
    for (const original of group) {
      // Unirile anterioare (alt grup) pot fi rescris dependențele: lucrăm mereu cu versiunea curentă.
      const t = map.get(original.id);
      if (!t) continue;
      if (into) into = map.get(into.id) ?? into;
      if (!into) {
        into = t;
        continue;
      }
      if (into.recipeIds.some((r) => t.recipeIds.includes(r))) continue; // nu unim pași din aceeași rețetă
      const a = actions.get(t.actionId!)!;
      const lines = [...into.lines, ...t.lines];
      const kg = lines.reduce((s, l) => s + l.grams, 0) / 1000;
      const merged: Task = {
        ...into,
        id: `${into.id}+${t.id}`,
        texts: [...into.texts, ...t.texts],
        recipeIds: [...into.recipeIds, ...t.recipeIds],
        lines,
        inputs: [...into.inputs, ...t.inputs],
        loadG: into.loadG + t.loadG,
        // Pregătirea comună: timpul de bază o singură dată, plus timpul pe kg pentru tot.
        minutes: into.kind === "prep" ? a.minutes + a.perKgMinutes * kg : Math.max(into.minutes, t.minutes),
        activeMinutes: into.kind === "prep" ? a.activeMinutes + a.perKgMinutes * kg : Math.max(into.activeMinutes, t.activeMinutes),
        deps: [...new Set([...into.deps, ...t.deps])].filter((d) => d !== into!.id && d !== t.id),
      };
      const next = new Map(map);
      next.delete(into.id);
      next.delete(t.id);
      next.set(merged.id, merged);
      for (const [id, x] of next) {
        if (x.deps.includes(into.id) || x.deps.includes(t.id)) {
          next.set(id, { ...x, deps: [...new Set(x.deps.map((d) => (d === into!.id || d === t.id ? merged.id : d)))] });
        }
      }
      if (hasCycle(next)) continue;
      map = next;
      into = merged;
    }
  }
  return [...map.values()];
}

// ─── 4. Ture ───

type Unit = { key: string; equipmentId: string; capacityG: number | null; kind: Equipment["kind"] };

function capacityFor(task: Task, eq: Map<string, Equipment>): { cap: number | null; multiUnit: boolean } {
  if (task.capacityG) return { cap: task.capacityG, multiUnit: false };
  for (const group of task.equipment) {
    const items = group.map((id) => eq.get(id)).filter((e): e is Equipment => !!e && e.capacityG != null);
    if (!items.length) continue;
    // Vasele de cuptor se folosesc împreună (jena + vasele mici în același timp).
    if (items.every((e) => e.kind === "vas-cuptor")) return { cap: items.reduce((a, e) => a + e.capacityG! * e.count, 0), multiUnit: true };
    return { cap: Math.max(...items.map((e) => e.capacityG!)), multiUnit: false };
  }
  return { cap: null, multiUnit: false };
}

type BatchPlan = { recipeIds: string[]; inputs: CookLine[]; loadG: number };

/**
 * Cum se împarte un pas în ture. Un pas comun mai multor rețete se împarte pe rețete (puiul cu
 * marinadă de shawarma nu se amestecă cu cel de la prânz); două rețete împart o tură doar dacă încap.
 */
function batchPlan(t: Task, cap: number | null): BatchPlan[] {
  const volume = t.loadG * t.loadFactor;
  const whole = (k: number): BatchPlan[] =>
    Array.from({ length: k }, () => ({ recipeIds: t.recipeIds, inputs: t.inputs.map((l) => ({ ...l, grams: l.grams / k })), loadG: t.loadG / k }));
  if (!cap || volume <= cap) return whole(1);
  if (!t.perBatch || t.recipeIds.length < 2) return whole(Math.ceil(volume / cap));

  const total = t.inputs.reduce((a, l) => a + l.grams, 0);
  const chunks: BatchPlan[] = [];
  for (const r of t.recipeIds) {
    const mine = t.inputs.filter((l) => l.recipeId === r);
    const share = total > 0 ? mine.reduce((a, l) => a + l.grams, 0) / total : 1 / t.recipeIds.length;
    const load = t.loadG * share;
    const k = Math.max(1, Math.ceil((load * t.loadFactor) / cap));
    for (let i = 0; i < k; i++) chunks.push({ recipeIds: [r], inputs: mine.map((l) => ({ ...l, grams: l.grams / k })), loadG: load / k });
  }
  const bins: BatchPlan[] = [];
  for (const c of chunks.sort((a, b) => b.loadG - a.loadG)) {
    const bin = bins.find((b) => (b.loadG + c.loadG) * t.loadFactor <= cap);
    if (bin) {
      bin.recipeIds = [...new Set([...bin.recipeIds, ...c.recipeIds])];
      bin.inputs = [...bin.inputs, ...c.inputs];
      bin.loadG += c.loadG;
    } else bins.push({ ...c });
  }
  return bins;
}

export function expandJobs(tasks: Task[], eq: Map<string, Equipment>): { jobs: Job[]; warnings: string[] } {
  const warnings: string[] = [];
  const plans = new Map<string, BatchPlan[]>();
  for (const t of tasks) {
    const { cap } = capacityFor(t, eq);
    const plan = batchPlan(t, cap);
    plans.set(t.id, plan);
    if (plan.length > 1 && !t.perBatch) {
      warnings.push(`${t.title}: ~${Math.round(t.loadG * t.loadFactor)} g nu încap odată (${Math.round(cap!)} g); se face în ${plan.length} ture.`);
    }
  }
  const batchesOf = new Map([...plans].map(([id, p]) => [id, p.length]));

  // Pregătirea care alimentează doar un pas făcut în ture se taie în aceleași ture:
  // curăți prima porție de cartofi, o bagi în airfryer, apoi o cureți pe următoarea.
  const consumers = new Map<string, string[]>();
  for (const t of tasks) for (const d of t.deps) consumers.set(d, [...(consumers.get(d) ?? []), t.id]);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const splitInto = new Map<string, number>();
  for (const t of tasks) {
    if (t.kind !== "prep") continue;
    const users = consumers.get(t.id) ?? [];
    const user = users.length === 1 ? byId.get(users[0]) : undefined;
    if (user?.perBatch && (batchesOf.get(user.id) ?? 1) > 1) splitInto.set(t.id, batchesOf.get(user.id)!);
  }
  for (const [id, n] of splitInto) batchesOf.set(id, n);

  const jobId = (taskId: string, k: number) => ((batchesOf.get(taskId) ?? 1) === 1 ? taskId : `${taskId}#${k}`);
  const lastJob = (taskId: string) => jobId(taskId, batchesOf.get(taskId) ?? 1);

  const jobs: Job[] = [];
  for (const t of tasks) {
    const n = batchesOf.get(t.id) ?? 1;
    const split = splitInto.has(t.id);
    const plan = split ? batchPlanEven(t, n) : plans.get(t.id)!;
    for (let b = 1; b <= n; b++) {
      // Tura k a unui pas în ture așteaptă tura k a pregătirii lui (nu toată pregătirea).
      const depsFor = (d: string) => (splitInto.has(d) && (batchesOf.get(d) ?? 1) === n ? jobId(d, b) : lastJob(d));
      const deps = b === 1 ? t.deps.map(depsFor) : [jobId(t.id, b - 1), ...t.deps.filter((d) => splitInto.has(d)).map(depsFor)];
      const p = plan[b - 1];
      jobs.push({
        id: jobId(t.id, b),
        task: t,
        batch: b,
        batches: n,
        recipeIds: p.recipeIds,
        inputs: p.inputs,
        loadG: p.loadG,
        minutes: split ? t.minutes / n : t.minutes,
        activeMinutes: split ? t.activeMinutes / n : t.activeMinutes,
        deps: [...new Set(deps)],
      });
    }
  }
  return { jobs, warnings };
}

function batchPlanEven(t: Task, n: number): BatchPlan[] {
  return Array.from({ length: n }, () => ({ recipeIds: t.recipeIds, inputs: t.inputs.map((l) => ({ ...l, grams: l.grams / n })), loadG: t.loadG / n }));
}

// ─── 5. Timeline ───

function units(equipment: Equipment[]): Unit[] {
  return equipment.flatMap((e) =>
    // Cuptorul cu ventilator are mai multe niveluri: două sarcini pot coace simultan la aceeași temperatură.
    Array.from({ length: e.kind === "cuptor" ? 2 : e.count }, (_, i) => ({ key: `${e.id}#${i + 1}`, equipmentId: e.id, capacityG: e.capacityG, kind: e.kind })),
  );
}

export function schedule(jobs: Job[], equipment: Equipment[]): Scheduled[] {
  const eq = new Map(equipment.map((e) => [e.id, e]));
  const pool = units(equipment);
  const busyUntil = new Map(pool.map((u) => [u.key, 0]));
  const usedBy = new Map<string, string | null>(pool.map((u) => [u.key, null])); // ultima rețetă care a murdărit vasul
  const ovenTemp = new Map<string, { temp: number | null; until: number }>();
  const reservedFor = new Map<string, string>(); // vas ținut pentru pasul următor al aceleiași rețete
  const done = new Map<string, number>();
  const out: Scheduled[] = [];

  // Prioritate: drumul critic rămas (minute), apoi cât de pasivă e sarcina (pornește întâi cuptorul).
  const succ = new Map<string, string[]>();
  for (const j of jobs) for (const d of j.deps) succ.set(d, [...(succ.get(d) ?? []), j.id]);
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const memo = new Map<string, number>();
  const tail = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const j = byId.get(id)!;
    const v = j.minutes + Math.max(0, ...(succ.get(id) ?? []).map(tail));
    memo.set(id, v);
    return v;
  };
  const priority = (j: Job) => tail(j.id) + (j.minutes - j.activeMinutes) * 0.5;
  // Ce cere un minut de atenție și apoi lucrează singur (orezul, cuptorul) pornește primul.
  const kicksOff = (j: Job) => j.activeMinutes <= 2 && j.minutes - j.activeMinutes >= 8;

  // Câți pași de mai târziu ai aceleiași rețete pot folosi ustensila (ca să nu muți mâncarea dintr-un vas în altul).
  const futureUse = (j: Job, equipmentId: string) => {
    let n = 0;
    let cur: Job | undefined = j;
    while ((cur = nextSameRecipe(cur))) if (cur.task.loadFactor <= 1 && cur.task.equipment.some((g) => g.includes(equipmentId))) n++;
    else if (cur.task.equipment.length) break;
    return n;
  };
  const order = (j: Job, group: string[]) => (a: Unit, b: Unit) =>
    futureUse(j, b.equipmentId) - futureUse(j, a.equipmentId) || group.indexOf(a.equipmentId) - group.indexOf(b.equipmentId);

  // Pasul următor al aceleiași rețete care poate continua în același vas.
  const nextSameRecipe = (j: Job) => (succ.get(j.id) ?? []).map((id) => byId.get(id)!).find((s) => s.task.recipeIds.some((r) => j.task.recipeIds.includes(r)));

  let personFree = 0;
  let t = 0;
  const pending = new Set(jobs.map((j) => j.id));
  let guard = 0;

  const tryAllocate = (j: Job, now: number, allowWaitForDirty: boolean): { keys: string[]; rinse: boolean } | null | "wait" => {
    const keys: string[] = [];
    let rinse = false;
    for (const group of j.task.equipment) {
      const candidates = pool.filter((u) => group.includes(u.equipmentId));
      if (!candidates.length) continue; // ustensilă ștearsă din bucătărie: nu blocăm sesiunea
      const isOvenDish = candidates.length > 0 && candidates.every((u) => u.kind === "vas-cuptor");
      const free = (u: Unit) => busyUntil.get(u.key)! <= now && (!reservedFor.has(u.key) || reservedFor.get(u.key) === j.id) && !keys.includes(u.key);
      if (isOvenDish) {
        // Câte vase de cuptor trebuie ca să încapă tura (cele mari întâi).
        let need = j.loadG * j.task.loadFactor;
        const chosen: Unit[] = [];
        for (const u of candidates.filter(free).sort((a, b) => (b.capacityG ?? 0) - (a.capacityG ?? 0))) {
          if (need <= 0) break;
          chosen.push(u);
          need -= u.capacityG ?? 0;
        }
        // Nu înghesuim: dacă vasele libere nu ajung, așteptăm să se elibereze altele.
        if (!chosen.length || need > 0) return null;
        keys.push(...chosen.map((u) => u.key));
        continue;
      }
      const isOven = candidates.some((u) => u.kind === "cuptor");
      const ok = candidates.filter(free).filter(() => {
        if (!isOven) return true;
        const o = ovenTemp.get("cuptor");
        return !o || o.until <= now || o.temp == null || j.task.tempC == null || Math.abs(o.temp - j.task.tempC) <= 10;
      });
      const reserved = ok.find((u) => reservedFor.get(u.key) === j.id);
      const fits = (u: Unit) => u.capacityG == null || j.task.capacityG != null || u.capacityG >= j.loadG * j.task.loadFactor;
      const dirtyFree = ok.filter((u) => usedBy.get(u.key) && fits(u));
      const cleanFree = ok.filter((u) => !usedBy.get(u.key) && fits(u));
      let pick = reserved ?? dirtyFree.sort(order(j, group))[0];
      if (!pick && cleanFree.length) {
        // Un vas murdar care se eliberează în ≤5 minute e mai bun decât încă un vas de spălat.
        const soonDirty = candidates.find(
          (u) => usedBy.get(u.key) && fits(u) && !reservedFor.has(u.key) && busyUntil.get(u.key)! > now && busyUntil.get(u.key)! - now <= 5,
        );
        if (soonDirty && allowWaitForDirty && eq.get(soonDirty.equipmentId)?.kind === "vas") return "wait";
        pick = cleanFree.sort(order(j, group))[0];
      }
      if (!pick) pick = ok.sort((a, b) => (b.capacityG ?? 0) - (a.capacityG ?? 0))[0];
      if (!pick) return null;
      const last = usedBy.get(pick.key);
      if (last && eq.get(pick.equipmentId)?.kind === "vas" && !j.task.recipeIds.includes(last) && reservedFor.get(pick.key) !== j.id) rinse = true;
      keys.push(pick.key);
    }
    return { keys, rinse };
  };

  while (pending.size && guard++ < 10_000) {
    const ready = [...pending]
      .map((id) => byId.get(id)!)
      .filter((j) => j.deps.every((d) => done.has(d) && done.get(d)! <= t))
      .sort((a, b) => Number(kicksOff(b)) - Number(kicksOff(a)) || priority(b) - priority(a) || a.id.localeCompare(b.id));

    let started = false;
    for (const j of ready) {
      const needsPerson = j.activeMinutes > 0;
      if (needsPerson && personFree > t) continue;
      const alloc = tryAllocate(j, t, true);
      if (!alloc || alloc === "wait") continue;
      const extra = alloc.rinse ? 1 : 0;
      const start = t;
      const activeEnd = start + j.activeMinutes + extra;
      const end = Math.max(activeEnd, start + j.minutes + extra);
      for (const k of alloc.keys) {
        busyUntil.set(k, end);
        usedBy.set(k, j.task.recipeIds[0]);
        if (reservedFor.get(k) === j.id) reservedFor.delete(k);
        if (k.startsWith("cuptor")) ovenTemp.set("cuptor", { temp: j.task.tempC, until: Math.max(end, ovenTemp.get("cuptor")?.until ?? 0) });
      }
      const nxt = nextSameRecipe(j);
      if (nxt) {
        for (const k of alloc.keys) {
          const unit = pool.find((u) => u.key === k)!;
          if (unit.kind === "vas" && nxt.task.loadFactor <= 1 && nxt.task.equipment.some((g) => g.includes(unit.equipmentId))) reservedFor.set(k, nxt.id);
        }
      }
      if (needsPerson) personFree = activeEnd;
      done.set(j.id, end);
      pending.delete(j.id);
      out.push({ ...j, start, end, activeEnd, units: alloc.keys, rinse: alloc.rinse });
      started = true;
      break;
    }
    if (started) continue;

    // Nimic nu poate porni acum: sărim la următorul moment în care se eliberează ceva.
    const times = [personFree, ...busyUntil.values(), ...done.values()].filter((x) => x > t);
    if (!times.length) {
      // Ultima soluție: pornește fără să mai așteptăm un vas murdar.
      const j = ready[0];
      if (!j) break;
      const alloc = tryAllocate(j, t, false);
      if (!alloc || alloc === "wait") break;
      const end = t + Math.max(j.minutes, j.activeMinutes);
      for (const k of alloc.keys) {
        busyUntil.set(k, end);
        usedBy.set(k, j.task.recipeIds[0]);
      }
      if (j.activeMinutes > 0) personFree = t + j.activeMinutes;
      done.set(j.id, end);
      pending.delete(j.id);
      out.push({ ...j, start: t, end, activeEnd: t + j.activeMinutes, units: alloc.keys, rinse: false });
      continue;
    }
    t = Math.min(...times);
  }
  return out.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

// ─── Totul la un loc ───

export function planSession(input: CookInput): SessionPlan {
  const eq = new Map(input.equipment.map((e) => [e.id, e]));
  const { tasks, totals, noCook } = buildTasks(input);
  // Rețetă cu rețetă: fiecare pas pe rând, cu toate turele, fără nimic în paralel.
  const serialMinutes = expandJobs(tasks, eq).jobs.reduce((a, j) => a + j.minutes, 0);
  const isDish = (k: string) => {
    const e = eq.get(k.split("#")[0]);
    return !!e && (e.kind === "vas" || e.kind === "vas-cuptor" || e.kind === "airfryer" || e.kind === "aparat");
  };

  const evaluate = (ts: Task[]) => {
    const { jobs, warnings } = expandJobs(withPreheat(ts), eq);
    const timeline = schedule(jobs, input.equipment);
    const end = Math.max(0, ...timeline.map((x) => x.end));
    const dishes = new Set(timeline.flatMap((x) => x.units).filter(isDish)).size;
    // Timpul total primează; un vas în plus „costă” cât un minut.
    const score = end + dishes + (timeline.length < jobs.length ? 1e6 : 0);
    return { tasks: ts, jobs, warnings, timeline, score };
  };

  // Metode alternative: încearcă fiecare pas de gătit cu celelalte metode (airfryer ↔ cuptor ↔ tigaie)
  // și păstrează schimbarea dacă sesiunea se scurtează. Căutare locală, deterministă.
  const originals = new Map(tasks.map((t) => [t.id, t]));
  let best = evaluate(mergeTasks(tasks, input.actions));
  for (let round = 0; round < 4; round++) {
    let improved = false;
    for (let i = 0; i < best.tasks.length; i++) {
      const t = best.tasks[i];
      if (t.kind !== "cook") continue;
      // Un pas unit poate fi mai bun despărțit (shawarma la airfryer, puiul de prânz în tigaie).
      if (t.recipeIds.length > 1) {
        // Despărțirea singură rar câștigă ceva; o evaluăm împreună cu cea mai bună metodă pentru fiecare parte.
        let candidate = evaluate(splitMerged(best.tasks, i, originals));
        const partIds = new Set(t.id.split("+"));
        for (let k = 0; k < candidate.tasks.length; k++) {
          const part = candidate.tasks[k];
          if (!partIds.has(part.id)) continue;
          const orig = part.switchedFrom ?? part.actionId;
          for (const id of [orig, ...(input.actions.get(orig ?? "")?.alternatives ?? [])]) {
            const a = id ? input.actions.get(id) : undefined;
            if (!a || id === part.actionId) continue;
            const next = [...candidate.tasks];
            next[k] = id === orig ? { ...withAction(part, a), switchedFrom: null } : withAction(part, a);
            const e = evaluate(next);
            if (e.score < candidate.score) candidate = e;
          }
        }
        if (candidate.score < best.score - 1) {
          best = candidate;
          improved = true;
          continue;
        }
      }
      const original = t.switchedFrom ?? t.actionId;
      const options = [original, ...(input.actions.get(original ?? "")?.alternatives ?? [])].filter((id): id is string => !!id && id !== t.actionId);
      for (const id of options) {
        const a = input.actions.get(id);
        if (!a) continue;
        const next = [...best.tasks];
        next[i] = id === original ? { ...withAction(t, a), switchedFrom: null } : withAction(t, a);
        const candidate = evaluate(next);
        if (candidate.score < best.score - 1) {
          best = candidate;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  const { jobs, warnings, timeline } = best;
  const switches = best.tasks
    .filter((t) => t.switchedFrom)
    .map((t) => ({ from: input.actions.get(t.switchedFrom!)?.name ?? t.switchedFrom!, to: t.title, recipeIds: t.recipeIds }));
  if (timeline.length < jobs.length) {
    const missing = jobs.filter((j) => !timeline.some((x) => x.id === j.id)).map((j) => j.task.title);
    warnings.push(`Nu am putut planifica: ${[...new Set(missing)].join(", ")}. Verifică ustensilele.`);
  }

  const totalMinutes = Math.max(0, ...timeline.map((s) => s.end));
  const activeMinutes = timeline.reduce((a, s) => a + (s.activeEnd - s.start), 0);
  const dishSet = new Set<string>();
  for (const s of timeline) for (const k of s.units) {
    const e = eq.get(k.split("#")[0]);
    if (e && (e.kind === "vas" || e.kind === "vas-cuptor" || e.kind === "airfryer" || e.kind === "aparat")) dishSet.add(k);
  }
  const dishes = [...dishSet].map((k) => {
    const [id, n] = k.split("#");
    const e = eq.get(id)!;
    return e.count > 1 ? `${e.name} (${n})` : e.name;
  });

  const byEquipment = input.equipment
    .filter((e) => e.kind !== "plita")
    .map((e) => ({ equipmentId: e.id, name: e.name, jobs: timeline.filter((s) => s.units.some((k) => k.startsWith(`${e.id}#`))) }))
    .filter((g) => g.jobs.length);

  const portions: SessionPortion[] = [...totals.values()].map(({ recipe: r, servings, lineGrams, dates }) => {
    const days = [...dates].sort();
    const w: string[] = [];
    const last = days[days.length - 1];
    const age = daysBetween(input.sessionDate, last);
    if (age > r.keepsDays) {
      w.push(
        r.freezes
          ? `Se ține ${r.keepsDays} zile: congelează porțiile de după ${r.keepsDays} zile și scoate-le în frigider cu o seară înainte.`
          : `Se ține ${r.keepsDays} zile, dar ultima porție e peste ${age} zile. Mut-o mai devreme sau găteș-o separat.`,
      );
    }
    const perIngredient = new Map<string, number>();
    for (const l of recipeLines(r)) perIngredient.set(l.ingredientId, (perIngredient.get(l.ingredientId) ?? 0) + (lineGrams.get(l.id) ?? 0) / servings);
    return {
      recipeId: r.id,
      name: r.name,
      servings,
      days,
      perServing: [...perIngredient]
        .map(([id, g]) => ({ name: input.lookup(id)?.name ?? "?", grams: g, toTaste: input.lookup(id)?.toTaste }))
        // Condimentele și uleiul nu se împart la gram.
        .filter((x) => x.grams >= 5 && !x.toTaste)
        .sort((a, b) => b.grams - a.grams),
      warnings: w,
    };
  });

  return { timeline, totalMinutes, activeMinutes, serialMinutes, dishes, byEquipment, portions, noCook, switches, warnings };
}
