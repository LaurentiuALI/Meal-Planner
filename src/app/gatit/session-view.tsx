"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, Check, Clock, Flame, Pause, Play, RotateCcw, Snowflake, Sparkles, Thermometer, Timer, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { grams, minutes as fmtDuration } from "@/lib/format";
import { shortDate, weekdayName } from "@/domain/plan";
import type { Scheduled, SessionPlan } from "@/domain/cooking";

const clock = (min: number) => {
  const m = Math.max(0, Math.round(min));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

type State = { startedAt: number | null; done: string[]; timers: Record<string, number> };
const EMPTY: State = { startedAt: null, done: [], timers: {} };

/** Starea sesiunii (pornită, pași bifați, timere) supraviețuiește unui refresh sau unui ecran blocat. */
function useSessionState(key: string) {
  const storageKey = `session:${key}`;
  const [state, setState] = useState<State>(EMPTY);
  useEffect(() => {
    try {
      setState({ ...EMPTY, ...JSON.parse(localStorage.getItem(storageKey) ?? "{}") });
    } catch {
      setState(EMPTY);
    }
  }, [storageKey]);
  const update = useCallback(
    (fn: (s: State) => State) =>
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

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.3, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
  } catch {}
  navigator.vibrate?.([300, 150, 300]);
}

async function notify(title: string) {
  try {
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body: "Timerul s-a terminat", tag: title });
    else new Notification(title);
  } catch {}
}

/** Ingredientele unui pas, adunate pe nume, cu împărțirea pe rețete când sunt mai multe. */
function linesSummary(s: Scheduled, recipeNames: Record<string, string>) {
  const by = new Map<string, { total: number; parts: Map<string, number> }>();
  for (const l of s.task.lines) {
    const cur = by.get(l.name) ?? { total: 0, parts: new Map() };
    const g = l.grams / s.batches;
    cur.total += g;
    cur.parts.set(l.recipeId, (cur.parts.get(l.recipeId) ?? 0) + g);
    by.set(l.name, cur);
  }
  return [...by]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, { total, parts }]) => ({
      name,
      total,
      split: parts.size > 1 ? [...parts].map(([rid, g]) => `${(recipeNames[rid] ?? "?").split(" ").slice(0, 2).join(" ")} ${grams(g)}`).join(" + ") : null,
    }));
}

export function SessionView({
  sessionKey,
  plan,
  recipeNames,
  equipmentNames,
}: {
  sessionKey: string;
  plan: SessionPlan;
  recipeNames: Record<string, string>;
  equipmentNames: Record<string, string>;
}) {
  const [state, update] = useSessionState(sessionKey);
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(new Set<string>());
  const running = state.startedAt != null;
  useWakeLock(running);

  useEffect(() => {
    if (!running && !Object.keys(state.timers).length) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running, state.timers]);

  // Timerele terminate: sunet, vibrație, notificare (o singură dată pe timer).
  useEffect(() => {
    for (const [jobId, endsAt] of Object.entries(state.timers)) {
      if (endsAt <= now && !fired.current.has(jobId)) {
        fired.current.add(jobId);
        const job = plan.timeline.find((j) => j.id === jobId);
        const title = job ? `${job.task.title}${job.batches > 1 ? ` (tura ${job.batch})` : ""}` : "Timer";
        beep();
        notify(title);
        toast.warning(`Gata: ${title}`, { duration: 10_000 });
      }
    }
  }, [now, state.timers, plan.timeline]);

  const elapsed = running ? (now - state.startedAt!) / 60_000 : 0;
  const unitName = (k: string) => {
    const [id, n] = k.split("#");
    return id === "aragaz" ? `ochiul ${n}` : (equipmentNames[id] ?? id).replace(/ \(.*\)$/, "") + (id === "vas-ceramic" ? ` ${n}` : "");
  };

  const start = async () => {
    update((s) => ({ ...s, startedAt: Date.now() }));
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  };
  const toggleDone = (id: string) =>
    update((s) => ({ ...s, done: s.done.includes(id) ? s.done.filter((x) => x !== id) : [...s.done, id] }));
  const startTimer = (s: Scheduled) => {
    const mins = s.end - s.start;
    update((st) => ({ ...st, timers: { ...st.timers, [s.id]: Date.now() + mins * 60_000 } }));
    fired.current.delete(s.id);
  };
  const stopTimer = (id: string) =>
    update((st) => {
      const timers = { ...st.timers };
      delete timers[id];
      return { ...st, timers };
    });

  const next = useMemo(() => plan.timeline.find((s) => !state.done.includes(s.id)), [plan.timeline, state.done]);
  const doneCount = state.done.filter((id) => plan.timeline.some((s) => s.id === id)).length;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Total" value={fmtDuration(plan.totalMinutes)} />
        <Stat label="Tu, activ" value={fmtDuration(plan.activeMinutes)} />
        <Stat label="Rețetă cu rețetă" value={fmtDuration(plan.serialMinutes)} muted />
      </div>

      {plan.switches.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <li className="text-xs font-medium text-muted-foreground">Ca să termini mai repede, am schimbat metoda:</li>
          {plan.switches.map((sw) => (
            <li key={sw.from + sw.to + sw.recipeIds.join()} className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="text-muted-foreground line-through">{sw.from}</span> → <b>{sw.to}</b>
                <span className="block text-xs text-muted-foreground">{sw.recipeIds.map((r) => recipeNames[r]).join(", ")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {plan.warnings.length + plan.portions.flatMap((p) => p.warnings).length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          {plan.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /> {w}
            </li>
          ))}
          {plan.portions.flatMap((p) =>
            p.warnings.map((w) => (
              <li key={p.recipeId + w} className="flex gap-2">
                <Snowflake className="mt-0.5 size-4 shrink-0 text-fat" /> <span><b>{p.name}:</b> {w}</span>
              </li>
            )),
          )}
        </ul>
      )}

      <div className="flex items-center gap-2">
        {!running ? (
          <Button size="lg" className="flex-1" onClick={start}>
            <Play /> Începe sesiunea
          </Button>
        ) : (
          <>
            <div className="flex-1 rounded-lg bg-primary/10 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">
                {clock(elapsed)} de la început · {doneCount}/{plan.timeline.length} pași
              </div>
              {next ? (
                <div className="font-medium">
                  {next.start <= elapsed + 0.5 ? "Acum" : `La ${clock(next.start)}`}: {next.task.title}
                  {next.batches > 1 && ` (tura ${next.batch}/${next.batches})`}
                </div>
              ) : (
                <div className="font-medium">Gata! Spor la caserole.</div>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Resetează sesiunea"
              onClick={() => confirm("Resetezi sesiunea (bifele și timerele)?") && update(() => EMPTY)}
            >
              <RotateCcw />
            </Button>
          </>
        )}
      </div>

      <Tabs defaultValue="pasi">
        <TabsList className="w-full">
          <TabsTrigger value="pasi">Pași</TabsTrigger>
          <TabsTrigger value="ustensile">Ustensile</TabsTrigger>
          <TabsTrigger value="caserole">Caserole</TabsTrigger>
        </TabsList>

        <TabsContent value="pasi">
          <ol className="space-y-2">
            {plan.timeline.map((s) => {
              const done = state.done.includes(s.id);
              const passive = s.end - s.activeEnd;
              const timerEnds = state.timers[s.id];
              const left = timerEnds ? Math.max(0, (timerEnds - now) / 1000) : null;
              const isNow = running && !done && s.start <= elapsed + 0.5;
              return (
                <li
                  key={s.id}
                  className={cn("rounded-lg border p-3 transition-opacity", done && "opacity-50", isNow && "border-primary ring-1 ring-primary/40")}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleDone(s.id)}
                      aria-label={done ? "Marchează ca nefăcut" : "Marchează ca făcut"}
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                        done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      )}
                    >
                      {done && <Check className="size-4" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{clock(s.start)}</span>
                        <span className={cn("font-semibold", done && "line-through")}>{s.task.title}</span>
                        {s.batches > 1 && <Badge variant="secondary">tura {s.batch}/{s.batches}</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" /> {fmtDuration(s.end - s.start)}
                        </span>
                        {passive >= 1 && (
                          <span className="flex items-center gap-1">
                            <Flame className="size-3.5" /> {fmtDuration(passive)} singur
                          </span>
                        )}
                        {s.task.tempC != null && s.units.some((u) => /^(cuptor|airfryer)/.test(u)) && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="size-3.5" /> {s.task.tempC}°C
                          </span>
                        )}
                        {s.units.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Utensils className="size-3.5" /> {s.units.map(unitName).join(", ")}
                          </span>
                        )}
                      </div>

                      {s.task.lines.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {linesSummary(s, recipeNames).map((l) => (
                            <li key={l.name} className="text-sm">
                              <span className="font-semibold tabular-nums">{grams(l.total)}</span> {l.name}
                              {l.split && <span className="block text-xs text-muted-foreground">{l.split}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.rinse && <p className="mt-1 text-xs text-muted-foreground">Clătește vasul înainte (l-ai folosit la altă rețetă).</p>}
                      {s.task.hint && <p className="mt-1 text-xs text-muted-foreground">💡 {s.task.hint}</p>}
                      {s.task.texts.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-xs">
                          {s.task.texts.map((t) => (
                            <li key={t.recipeId + t.text}>
                              {s.task.recipeIds.length > 1 && <b>{(recipeNames[t.recipeId] ?? "").split(" ").slice(0, 3).join(" ")}: </b>}
                              {t.text}
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.task.recipeIds.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {s.task.recipeIds.map((r) => (
                            <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              {recipeNames[r]}
                            </span>
                          ))}
                        </div>
                      )}

                      {running && passive >= 3 && !done && (
                        <div className="mt-2">
                          {left == null ? (
                            <Button size="sm" variant="outline" onClick={() => startTimer(s)}>
                              <Timer /> Pornește timerul ({fmtDuration(s.end - s.start)})
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={cn("font-mono text-2xl font-semibold tabular-nums", left === 0 && "animate-pulse text-destructive")}>
                                {left === 0 ? (
                                  <span className="flex items-center gap-1">
                                    <Bell className="size-5" /> Gata!
                                  </span>
                                ) : (
                                  `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`
                                )}
                              </span>
                              <Button size="sm" variant="ghost" onClick={() => stopTimer(s.id)}>
                                <Pause /> Oprește
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </TabsContent>

        <TabsContent value="ustensile" className="space-y-3">
          {plan.byEquipment.map((g) => (
            <section key={g.equipmentId} className="rounded-lg border p-3">
              <h3 className="mb-2 font-semibold">{g.name}</h3>
              <ul className="space-y-1.5 text-sm">
                {g.jobs.map((s) => (
                  <li key={s.id} className="flex gap-3">
                    <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{clock(s.start)}</span>
                    <span>
                      <b className="tabular-nums">{s.loadG >= 1 ? grams(s.loadG) : ""}</b> {s.task.title.replace(/^[^·]+· /, "")}
                      {s.batches > 1 && ` · tura ${s.batch}/${s.batches}`}
                      {s.task.tempC ? ` · ${s.task.tempC}°C` : ""} · {fmtDuration(s.end - s.start)}
                      <span className="block text-xs text-muted-foreground">{s.task.recipeIds.map((r) => recipeNames[r]).join(" + ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-xs text-muted-foreground">De spălat la final: {plan.dishes.join(", ") || "nimic"}.</p>
        </TabsContent>

        <TabsContent value="caserole" className="space-y-3">
          {plan.portions.map((p) => (
            <section key={p.recipeId} className="rounded-lg border p-3">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                {p.servings} {p.servings === 1 ? "caserolă" : "caserole"} · {p.days.map((d) => `${weekdayName(d)} ${shortDate(d)}`).join(", ")}
              </p>
              <div className="text-xs text-muted-foreground">Per caserolă (cantități crude):</div>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 text-sm">
                {p.perServing.map((x) => (
                  <li key={x.name} className="flex justify-between gap-2">
                    <span className="truncate">{x.name}</span>
                    <span className="tabular-nums">{grams(x.grams)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {plan.noCook.length > 0 && (
            <section className="rounded-lg border border-dashed p-3 text-sm">
              <h3 className="mb-1 font-semibold">Fără gătit (le faci pe loc)</h3>
              <ul className="space-y-0.5">
                {plan.noCook.map((n) => (
                  <li key={n.recipeId}>
                    {n.name} · {n.servings} {n.servings === 1 ? "porție" : "porții"} · ~{fmtDuration(n.minutes)} fiecare
                  </li>
                ))}
              </ul>
            </section>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-2">
      <div className={cn("text-lg font-semibold tabular-nums", muted && "text-muted-foreground line-through decoration-1")}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
