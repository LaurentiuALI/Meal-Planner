"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Scheduled } from "@/domain/cooking";
import { addMinutes, isRinging, startTimer, suggestedStep, type Timer } from "@/domain/cook-guide";
import { alarm, chime, quietAudio, unlockAudio } from "./cook-audio";

export type CookState = {
  startedAt: number | null;
  done: string[];
  timers: Record<string, Timer>;
  /** Pasul afișat în modul pe tot ecranul (null = cel sugerat). */
  focus: string | null;
  /** Modul pe tot ecranul e deschis (rămâne deschis după un refresh). */
  open: boolean;
};

const EMPTY: CookState = { startedAt: null, done: [], timers: {}, focus: null, open: false };

function load(storageKey: string): CookState {
  const raw = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<CookState> & { timers?: Record<string, Timer | number> };
  // Versiunea veche ținea doar momentul în care se termină timerul.
  const timers = Object.fromEntries(
    Object.entries(raw.timers ?? {}).map(([id, t]) => [id, typeof t === "number" ? { startedAt: t, endsAt: t, baseMs: 0, halfAt: null } : t]),
  );
  return { ...EMPTY, ...raw, timers };
}

/** Starea sesiunii (pași bifați, timere, pasul curent) supraviețuiește unui refresh sau unui ecran blocat. */
function usePersisted(key: string) {
  const storageKey = `session:${key}`;
  const [state, setState] = useState<CookState>(EMPTY);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage există doar după hidratare
      setState(load(storageKey));
    } catch {
      setState(EMPTY);
    }
  }, [storageKey]);
  const update = useCallback(
    (fn: (s: CookState) => CookState) =>
      setState((s) => {
        const next = fn(s);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [storageKey],
  );
  return [state, update] as const;
}

/** Ține ecranul aprins cât gătești (iOS 16.4+, Android). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    acquire();
    const onVisible = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

async function notify(title: string, body: string) {
  try {
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag: title });
    else new Notification(title, { body });
  } catch {}
}

export const jobLabel = (s: Scheduled) => `${s.task.title}${s.batches > 1 ? ` (tura ${s.batch}/${s.batches})` : ""}`;

export function useCookSession(sessionKey: string, timeline: Scheduled[]) {
  const [state, update] = usePersisted(sessionKey);
  const [now, setNow] = useState(() => Date.now());
  /** Memento-ul de la jumătate, afișat ca banner până îl închizi (sau un minut). */
  const [nudge, setNudge] = useState<{ id: string; text: string; label: string; at: number } | null>(null);
  const hasTimers = Object.keys(state.timers).length > 0;
  const active = state.startedAt != null || state.open || hasTimers;
  useWakeLock(state.open || hasTimers);

  const stateRef = useRef(state);
  const timelineRef = useRef(timeline);
  useEffect(() => {
    stateRef.current = state;
    timelineRef.current = timeline;
  });

  // iOS: sunetul se deblochează la prima atingere (și după un refresh).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Ceasul: memento-ul de la jumătate, alarma care se repetă până o oprești, notificarea.
  const fired = useRef(new Set<string>());
  const lastRing = useRef(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      setNudge((n) => (n && t - n.at > 60_000 ? null : n));
      const { timers } = stateRef.current;
      const job = (id: string) => timelineRef.current.find((j) => j.id === id);
      for (const [id, timer] of Object.entries(timers)) {
        if (timer.halfAt != null && timer.halfAt <= t) {
          if (timer.endsAt > t) {
            const j = job(id);
            chime();
            setNudge({ id, text: j?.task.hint ?? "La jumătate", label: j ? jobLabel(j) : "", at: t });
          }
          update((s) => (s.timers[id] ? { ...s, timers: { ...s.timers, [id]: { ...s.timers[id], halfAt: null } } } : s));
        }
      }
      const ringing = Object.entries(timers).filter(([, timer]) => isRinging(timer, t));
      for (const id of fired.current) if (!ringing.some(([r]) => r === id)) fired.current.delete(id);
      for (const [id] of ringing) {
        if (fired.current.has(id)) continue;
        fired.current.add(id);
        const j = job(id);
        notify(j ? `Gata: ${jobLabel(j)}` : "Gata", "Cronometrul s-a terminat");
      }
      if (ringing.length && t - lastRing.current >= 3500) {
        lastRing.current = t;
        alarm();
      } else if (!ringing.length && lastRing.current) {
        lastRing.current = 0;
        quietAudio();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [active, update]);

  const actions = {
    /** Pornește (sau reia) modul pas cu pas. */
    open: () => {
      unlockAudio();
      update((s) => ({ ...s, startedAt: s.startedAt ?? Date.now(), open: true }));
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    },
    close: () => update((s) => ({ ...s, open: false })),
    show: (id: string | null) => update((s) => ({ ...s, focus: id, open: true, startedAt: s.startedAt ?? Date.now() })),
    /** Bifează pasul și treci la următorul pas pe care îl poți face. */
    complete: (id: string) =>
      update((s) => {
        const done = s.done.includes(id) ? s.done : [...s.done, id];
        return { ...s, done, focus: suggestedStep(timeline, { done, timers: s.timers })?.id ?? null };
      }),
    toggleDone: (id: string) => update((s) => ({ ...s, done: s.done.includes(id) ? s.done.filter((x) => x !== id) : [...s.done, id] })),
    startTimer: (job: Scheduled, minutes: number) => {
      unlockAudio();
      update((s) => ({ ...s, timers: { ...s.timers, [job.id]: startTimer(job, minutes, Date.now()) } }));
    },
    addTime: (id: string, minutes: number) =>
      update((s) => (s.timers[id] ? { ...s, timers: { ...s.timers, [id]: addMinutes(s.timers[id], minutes, Date.now()) } } : s)),
    /** Oprește cronometrul: pasul e gata. */
    stopTimer: (id: string) =>
      update((s) => {
        const timers = { ...s.timers };
        delete timers[id];
        return { ...s, timers, done: s.done.includes(id) ? s.done : [...s.done, id] };
      }),
    reset: () => update(() => EMPTY),
  };

  return { state, now, nudge, dismissNudge: () => setNudge(null), ...actions };
}

export type CookSession = ReturnType<typeof useCookSession>;
