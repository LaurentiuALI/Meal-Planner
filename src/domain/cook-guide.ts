import type { Scheduled } from "./cooking";

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
