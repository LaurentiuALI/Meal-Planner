import type { Scheduled, SessionPlan } from "./cooking";

/**
 * Modul ghidat al sesiunii de gătit: ce pas urmează, ce trebuie așteptat și cronometrele.
 *
 * Planul (timeline) e ordinea ideală, dar în bucătărie ritmul real diferă. Ghidul te duce la primul
 * pas nefăcut care se poate face acum; un pas așteaptă pașii de care depinde până sunt bifați și
 * cronometrul lor s-a terminat (și l-ai oprit). Dacă nimic nu se poate face, așteptăm cronometrele.
 */

export type Timer = {
  startedAt: number;
  endsAt: number;
  /** Durata cu care a pornit, fără minutele adăugate. */
  baseMs: number;
  /** Când sună memento-ul de la jumătate („scutură coșul”), sau null dacă nu are / a sunat deja. */
  halfAt: number | null;
};

export type GuideState = { done: string[]; timers: Record<string, Timer> };

const MIN = 60_000;

/** Minutele cronometrului unui pas, sau null dacă pasul nu are nevoie de unul (tăiat, amestecat). */
export function timerMinutes(s: Scheduled): number | null {
  const minutes = Math.max(s.minutes, s.activeMinutes);
  const passive = s.minutes - s.activeMinutes;
  if (minutes < 3 || (s.units.length === 0 && passive < 3)) return null;
  return Math.round(minutes);
}

const HALFWAY = /la jumătate/i;

export function startTimer(s: Scheduled, minutes: number, now: number): Timer {
  const ms = Math.max(1, minutes) * MIN;
  return { startedAt: now, endsAt: now + ms, baseMs: ms, halfAt: s.task.hint && HALFWAY.test(s.task.hint) ? now + ms / 2 : null };
}

/** Mai adaugă minute; un cronometru care a sunat deja pornește din nou de acum. */
export function addMinutes(t: Timer, minutes: number, now: number): Timer {
  return { ...t, endsAt: Math.max(t.endsAt, now) + minutes * MIN };
}

export const remainingMs = (t: Timer, now: number) => Math.max(0, t.endsAt - now);
export const isRinging = (t: Timer, now: number) => t.endsAt <= now;

/** Un pas e gata de tot când l-ai bifat și nu mai are un cronometru pornit. */
export const isSettled = (id: string, st: GuideState) => st.done.includes(id) && !st.timers[id];

/** Pașii de care depinde `s` și care nu sunt încă gata, în ordinea în care se termină. */
export function blockers(s: Scheduled, timeline: Scheduled[], st: GuideState): { job: Scheduled; timer: Timer | null }[] {
  const byId = new Map(timeline.map((j) => [j.id, j]));
  return s.deps
    .map((id) => byId.get(id))
    .filter((j): j is Scheduled => !!j && !isSettled(j.id, st))
    .map((job) => ({ job, timer: st.timers[job.id] ?? null }))
    .sort((a, b) => (a.timer?.endsAt ?? Infinity) - (b.timer?.endsAt ?? Infinity));
}

/** Pasul la care te trimite ghidul: primul nefăcut care se poate face acum, altfel primul nefăcut. */
export function suggestedStep(timeline: Scheduled[], st: GuideState): Scheduled | null {
  const open = timeline.filter((s) => !st.done.includes(s.id));
  return open.find((s) => blockers(s, timeline, st).length === 0) ?? open[0] ?? null;
}

/** Ce faci când sună cronometrul. */
export function doneMessage(s: Scheduled): string {
  if (s.task.id === "preincalzire") return "Cuptorul e încălzit. Poți băga vasele.";
  if (s.units.some((u) => u.startsWith("airfryer"))) return "Scoate coșul și verifică dacă e gata.";
  if (s.units.some((u) => u.startsWith("cuptor"))) return "Verifică vasul din cuptor.";
  if (s.units.some((u) => u.startsWith("aragaz"))) return "Verifică dacă e gata.";
  return "Timpul a trecut.";
}

// ─── Unde merge ce ai gătit ───

export type BoxPart = {
  recipeId: string;
  /** Cât din ce iese din pas e al rețetei (pas comun mai multor rețete), 0–1. */
  share: number;
  /** Câte caserole; null = se mănâncă azi, nu se pune în caserole. */
  boxes: number | null;
};

export type Destination =
  /** Componentă gata: se împarte direct în caserole (sau se pune deoparte pentru azi). */
  | { kind: "boxes"; parts: BoxPart[] }
  /** Rămâne în același vas: pasul următor continuă acolo. */
  | { kind: "stays"; next: Scheduled }
  /** Intră în alt pas (ce ai tăiat merge în tigaie, orezul se amestecă în wok). */
  | { kind: "into"; next: Scheduled };

const firstJobOf = (taskId: string, timeline: Scheduled[]) => timeline.find((j) => j.task.id === taskId);

/** Pașii aceleiași rețete care folosesc ce iese din `job` (fără asamblarea și porționarea de la final). */
function consumers(job: Scheduled, timeline: Scheduled[]): Scheduled[] {
  const tasks = new Map(timeline.map((j) => [j.task.id, j.task]));
  return [...tasks.values()]
    .filter((t) => t.id !== job.task.id && t.kind !== "portion" && !t.assembly && t.deps.includes(job.task.id))
    .filter((t) => t.recipeIds.some((r) => job.recipeIds.includes(r)))
    .map((t) => firstJobOf(t.id, timeline)!)
    .sort((a, b) => a.start - b.start);
}

/** Ustensilele în care stă mâncarea (nu ochiul de aragaz sau cuptorul în sine). */
const vessels = (units: string[]) => units.filter((u) => !/^(aragaz|cuptor)#/.test(u));

export function boxCount(recipeId: string, plan: Pick<SessionPlan, "timeline" | "portions">): number | null {
  const portioned = plan.timeline.some((j) => j.task.kind === "portion" && j.recipeIds.includes(recipeId));
  const p = plan.portions.find((x) => x.recipeId === recipeId);
  return portioned && p ? Math.ceil(p.servings) : null;
}

export function destinationOf(job: Scheduled, plan: Pick<SessionPlan, "timeline" | "portions">): Destination | null {
  if (job.task.kind === "portion" || job.task.assembly || job.recipeIds.length === 0) return null;
  const next = consumers(job, plan.timeline)[0];
  if (next) {
    const mine = vessels(job.units);
    return mine.length && vessels(next.units).some((u) => mine.includes(u)) ? { kind: "stays", next } : { kind: "into", next };
  }
  const weighed = job.inputs.filter((l) => !l.toTaste);
  const total = weighed.reduce((a, l) => a + l.grams, 0);
  return {
    kind: "boxes",
    parts: job.recipeIds.map((recipeId) => ({
      recipeId,
      share: total > 0 ? weighed.filter((l) => l.recipeId === recipeId).reduce((a, l) => a + l.grams, 0) / total : 1 / job.recipeIds.length,
      boxes: boxCount(recipeId, plan),
    })),
  };
}

/** Nume scurt de produs: „Pulpe de pui dezosate, fără piele” → „pulpe de pui”, „Fasole rosie - Bio...” → „fasole rosie”. */
export function shortName(name: string): string {
  const head = name.split(/,| - |\(|\d/)[0].trim().toLowerCase();
  // Două cuvinte „pline”: „pulpe de pui”, nu „pulpe de”.
  const out: string[] = [];
  let full = 0;
  for (const w of head.split(/\s+/)) {
    if (full === 2) break;
    out.push(w);
    if (!/^(de|cu|din|in|în|si|și|la|pe)$/.test(w)) full++;
  }
  return out.join(" ");
}

/** Tot ce a intrat (în aceeași rețetă) până la pasul ăsta: tocănița = ceapă + carne + fasole. */
function upstream(job: Scheduled, recipeId: string, timeline: Scheduled[]): Scheduled[] {
  const byTask = new Map(timeline.map((j) => [j.task.id, j]));
  const out = new Map<string, Scheduled>();
  const visit = (j: Scheduled) => {
    if (out.has(j.task.id)) return;
    out.set(j.task.id, j);
    for (const d of j.task.deps) {
      const dep = byTask.get(d);
      if (dep && dep.task.recipeIds.includes(recipeId) && dep.task.kind !== "portion") visit(dep);
    }
  };
  visit(job);
  return [...out.values()];
}

/** „orez”, „carne tocata, fasole rosie, linte”: ce e în componentă, după cântărit, cele mai grele întâi. */
export function componentLabel(job: Scheduled, recipeId: string, timeline: Scheduled[] = []): string {
  const grams = new Map<string, number>();
  for (const j of upstream(job, recipeId, timeline.length ? timeline : [job])) {
    for (const l of j.task.inputs) if (l.recipeId === recipeId && !l.toTaste) grams.set(l.name, (grams.get(l.name) ?? 0) + l.grams);
  }
  const names: string[] = [];
  for (const [name] of [...grams].sort((a, b) => b[1] - a[1])) {
    const short = shortName(name);
    if (!names.some((n) => n.split(" ")[0] === short.split(" ")[0])) names.push(short);
  }
  return names.length ? names.slice(0, 3).join(", ") : job.task.title.replace(/^[^·]+· /, "").toLowerCase();
}

/** Ce trebuie să fie în fiecare caserolă a unei rețete: componentele gătite și ce pui la final. */
export function boxContents(recipeId: string, plan: Pick<SessionPlan, "timeline" | "portions">): { components: string[]; finishing: string[] } {
  const seen = new Set<string>();
  const components: string[] = [];
  const finishing: string[] = [];
  for (const j of plan.timeline) {
    if (!j.recipeIds.includes(recipeId) || seen.has(j.task.id)) continue;
    seen.add(j.task.id);
    if (j.task.assembly) {
      finishing.push(...j.task.texts.filter((t) => t.recipeId === recipeId).map((t) => t.text));
      continue;
    }
    if (destinationOf(j, plan)?.kind === "boxes") components.push(componentLabel(j, recipeId, plan.timeline));
  }
  return { components: [...new Set(components)], finishing };
}
