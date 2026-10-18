"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Droplets, Flame, Hourglass, Lightbulb, Minus, PartyPopper, Play, Plus,
  PackageOpen, Sparkles, Thermometer, Undo2, Utensils, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { grams, minutes as fmtDuration } from "@/lib/format";
import { shortDate, weekdayName } from "@/domain/plan";
import type { Scheduled, SessionPlan } from "@/domain/cooking";
import { blockers, boxContents, destinationOf, isRinging, remainingMs, suggestedStep, timerMinutes } from "@/domain/cook-guide";
import { tasteNotes } from "@/domain/taste";
import { jobLabel, type CookSession } from "./use-cook-session";
import { AddTime, countdown, Nudge, TimerTray } from "./timers";
import { colorBar, destinationText, recipeColors, RecipeChips, shortRecipe, unitName } from "./cook-text";

export { unitName };

export const clock = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

/** Ingredientele unui pas, adunate pe nume, cu împărțirea pe rețete când sunt mai multe. */
export function linesSummary(s: Scheduled, recipeNames: Record<string, string>) {
  const by = new Map<string, { total: number; parts: Map<string, number> }>();
  for (const l of s.inputs) {
    if (l.toTaste) continue; // condimentele și uleiul nu se cântăresc: apar în tasteNotes
    const cur = by.get(l.name) ?? { total: 0, parts: new Map() };
    cur.total += l.grams;
    cur.parts.set(l.recipeId, (cur.parts.get(l.recipeId) ?? 0) + l.grams);
    by.set(l.name, cur);
  }
  return [...by]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, { total, parts }]) => ({
      name,
      total,
      split: parts.size > 1 ? [...parts].map(([rid, g]) => `${shortRecipe(recipeNames[rid])} ${grams(g)}`).join(" + ") : null,
    }));
}

type Props = { session: CookSession; plan: SessionPlan; recipeNames: Record<string, string>; equipmentNames: Record<string, string> };

/** Modul pas cu pas, pe tot ecranul: un singur pas, scris mare, cu ce ai nevoie pentru el. */
export function CookMode({ session, plan, recipeNames, equipmentNames }: Props) {
  const { state, now } = session;
  const timeline = plan.timeline;
  const current = timeline.find((j) => j.id === state.focus) ?? suggestedStep(timeline, state);
  const index = current ? timeline.indexOf(current) : timeline.length;
  const doneCount = state.done.filter((id) => timeline.some((s) => s.id === id)).length;

  // Ecranul întreg: ascunde pagina de dedesubt; pe Android/laptop cere și fullscreen de la browser.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.body.style.overflow = prev;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="border-b pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-3 pb-2">
          <Button size="icon" variant="ghost" className="size-11" onClick={session.close} aria-label="Ieși din modul de gătit">
            <X className="size-6" />
          </Button>
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{current ? `Pasul ${index + 1} din ${timeline.length}` : "Gata"}</span>
              <span>
                {doneCount}/{timeline.length} făcuți · {clock(state.startedAt ? now - state.startedAt : 0)}
              </span>
            </div>
            <Progress value={(doneCount / Math.max(1, timeline.length)) * 100} />
          </div>
        </div>
        <TimerTray
          className="mx-auto max-h-[30dvh] w-full max-w-2xl overflow-y-auto px-3 pb-2"
          session={session}
          timeline={timeline}
          recipeNames={recipeNames}
          colors={recipeColors(plan)}
          exclude={current?.id}
          onShow={(id) => session.show(id)}
        />
        <div className="mx-auto w-full max-w-2xl px-3 empty:hidden [&:has(>button)]:pb-2">
          <Nudge session={session} />
        </div>
      </header>
      {current ? (
        <StepView key={current.id} job={current} index={index} {...{ session, plan, recipeNames, equipmentNames }} />
      ) : (
        <Finished session={session} plan={plan} />
      )}
    </div>
  );
}

function StepView({ job, index, session, plan, recipeNames, equipmentNames }: Props & { job: Scheduled; index: number }) {
  const { state, now } = session;
  const timeline = plan.timeline;
  const done = state.done.includes(job.id);
  const timer = state.timers[job.id];
  const baseMinutes = timerMinutes(job);
  const [minutes, setMinutes] = useState(baseMinutes ?? 0);
  const waits = done ? [] : blockers(job, timeline, state);
  const other = waits.length ? suggestedStep(timeline, state) : null;
  const meanwhile = other && other.id !== job.id && !blockers(other, timeline, state).length ? other : null;
  const after = timeline.slice(index + 1).find((s) => !state.done.includes(s.id));

  const texts = job.task.texts.filter((t) => job.recipeIds.includes(t.recipeId));
  const lines = linesSummary(job, recipeNames);
  const taste = tasteNotes(job.inputs);
  const passive = job.minutes - job.activeMinutes;
  const showTemp = job.task.tempC != null && job.units.some((u) => /^(cuptor|airfryer)/.test(u));
  const portion = job.task.kind === "portion" ? plan.portions.find((p) => p.recipeId === job.recipeIds[0]) : undefined;
  const halfway = timer ? timer.halfAt != null : /la jumătate/i.test(job.task.hint ?? "");
  const colors = recipeColors(plan);
  const destination = destinationOf(job, plan);
  const dest = destination ? destinationText(destination, plan, recipeNames, equipmentNames, job.units) : null;
  const contents = portion ? boxContents(portion.recipeId, plan) : null;

  const finish = () => {
    if (timer) session.stopTimer(job.id);
    session.complete(job.id);
  };

  let primary: React.ReactNode;
  if (done) {
    primary = (
      <Button size="lg" className="h-14 flex-1 text-lg" onClick={() => session.show(null)}>
        La pasul curent <ArrowRight className="size-5" />
      </Button>
    );
  } else if (baseMinutes != null && !timer) {
    primary = (
      <Button size="lg" className="h-14 flex-1 text-lg" onClick={() => session.startTimer(job, minutes)}>
        <Play className="size-5" /> Pornește · {minutes} min
      </Button>
    );
  } else {
    primary = (
      <Button size="lg" className="h-14 flex-1 text-lg" onClick={() => session.complete(job.id)}>
        {timer ? (
          <>
            Următorul pas <ArrowRight className="size-5" />
          </>
        ) : (
          <>
            <Check className="size-5" /> Gata, mai departe
          </>
        )}
      </Button>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {/* Culoarea rețetei: o vezi din colțul ochiului și știi pentru ce e pasul. */}
        <div className="sticky top-0 z-10 h-2" style={{ background: colorBar(job.recipeIds, colors) }} aria-hidden />
        <div className="mx-auto w-full max-w-2xl animate-in fade-in slide-in-from-right-4 space-y-5 px-5 py-5 duration-300">
          <div>
            {job.recipeIds.length > 0 && <RecipeChips className="mb-3" recipeIds={job.recipeIds} recipeNames={recipeNames} colors={colors} size="lg" />}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>{job.task.kind === "prep" ? "Pregătire" : job.task.kind === "portion" ? "La final" : "Gătit"}</span>
              {job.batches > 1 && <span className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground">Tura {job.batch} din {job.batches}</span>}
              {done && <span className="rounded bg-muted px-1.5 py-0.5 normal-case">✓ făcut</span>}
            </div>
            {texts.length ? (
              <>
                <p className="mt-1 text-base text-muted-foreground">{job.task.title}</p>
                <div className="mt-2 space-y-3">
                  {texts.map((t) => (
                    <p key={t.recipeId + t.text} className="text-[1.7rem] font-semibold leading-snug">
                      {texts.length > 1 && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: colors[t.recipeId] }} />
                          {recipeNames[t.recipeId]}
                        </span>
                      )}
                      {t.text}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <h2 className="mt-2 text-[1.7rem] font-semibold leading-snug">{job.task.title}</h2>
            )}
          </div>

          {waits.length > 0 && (
            <div className="space-y-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Hourglass className="size-5 text-amber-600" /> Întâi trebuie să fie gata:
              </p>
              <ul className="space-y-2">
                {waits.map(({ job: w, timer: t }) => (
                  <li key={w.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-base">{jobLabel(w)}</span>
                    {t ? (
                      <span className="text-2xl font-semibold tabular-nums">{isRinging(t, now) ? "Gata!" : countdown(remainingMs(t, now))}</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => session.show(w.id)}>
                        Du-te la pas
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {meanwhile && (
                <Button variant="secondary" className="h-auto w-full justify-between py-3 text-left whitespace-normal" onClick={() => session.show(meanwhile.id)}>
                  <span>
                    <span className="block text-xs text-muted-foreground">Între timp poți face</span>
                    <span className="text-base font-semibold">{jobLabel(meanwhile)}</span>
                  </span>
                  <ChevronRight />
                </Button>
              )}
            </div>
          )}

          {(job.units.length > 0 || showTemp) && (
            <div className="flex flex-wrap gap-2">
              {job.units.map((u) => (
                <span key={u} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-base">
                  {u.startsWith("aragaz") ? <Flame className="size-4 text-orange-500" /> : <Utensils className="size-4 text-muted-foreground" />}
                  {unitName(u, equipmentNames)}
                </span>
              ))}
              {showTemp && (
                <span className="flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-base font-semibold">
                  <Thermometer className="size-4 text-orange-500" /> {job.task.tempC}°C
                </span>
              )}
            </div>
          )}

          {lines.length > 0 && (
            <ul className="divide-y rounded-xl border">
              {lines.map((l) => (
                <li key={l.name} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span className="w-24 shrink-0 text-right text-2xl font-bold tabular-nums">{grams(l.total)}</span>
                  <span className="text-lg leading-tight">
                    {l.name}
                    {l.split && <span className="block text-xs text-muted-foreground">{l.split}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {taste.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-dashed px-4 py-3 text-lg">
              {taste.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Sparkles className="size-4 shrink-0 text-muted-foreground" /> {t}
                </li>
              ))}
            </ul>
          )}

          {dest && (
            <div className="flex gap-3 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 p-4">
              <PackageOpen className="mt-1 size-6 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Când e gata</p>
                <p className="text-lg font-semibold leading-snug">{dest.title}</p>
                {dest.detail && <p className="mt-0.5 text-base text-muted-foreground">{dest.detail}</p>}
                {job.batches > 1 && destination?.kind === "boxes" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    E tura {job.batch} din {job.batches}: împarte și tura asta, la fel, în toate caserolele.
                  </p>
                )}
              </div>
            </div>
          )}

          {portion && (
            <div className="rounded-xl border-2 p-4" style={{ borderColor: colors[portion.recipeId] }}>
              <p className="text-lg font-semibold">
                În fiecare din cele {Math.ceil(portion.servings)} {Math.ceil(portion.servings) === 1 ? "caserolă" : "caserole"} trebuie să ai:
              </p>
              <ul className="mt-2 space-y-1.5 text-lg">
                {contents!.components.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <Check className="mt-1 size-5 shrink-0 text-emerald-600" /> {c}
                  </li>
                ))}
              </ul>
              {contents!.finishing.length > 0 && (
                <>
                  <p className="mt-3 text-sm font-medium text-muted-foreground">Și ce ai pus la final:</p>
                  <ul className="mt-1 space-y-1 text-base">
                    {contents!.finishing.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Câte una pentru: {portion.days.map((d) => `${weekdayName(d)} ${shortDate(d)}`).join(", ")}.
              </p>
              {portion.warnings.map((w) => (
                <p key={w} className="mt-2 text-sm text-muted-foreground">❄️ {w}</p>
              ))}
            </div>
          )}

          {job.rinse && (
            <Note icon={Droplets} tone="amber">
              Clătește vasul înainte: l-ai folosit la altă rețetă.
            </Note>
          )}
          {job.task.hint && (
            <Note icon={Lightbulb}>
              {job.task.hint}
              {halfway && <span className="block text-sm text-muted-foreground">Sun la jumătate ca să-ți amintesc.</span>}
            </Note>
          )}

          {baseMinutes != null && !done && (
            <div className="rounded-2xl bg-muted/60 p-5 text-center">
              {timer ? (
                <>
                  <div className="text-7xl font-semibold tracking-tight tabular-nums">{countdown(remainingMs(timer, now))}</div>
                  <Progress className="mt-3" value={Math.min(100, ((now - timer.startedAt) / Math.max(1, timer.endsAt - timer.startedAt)) * 100)} />
                  <p className="mt-2 text-sm text-muted-foreground">Merge și în fundal: treci la pasul următor, te anunț cu un sunet.</p>
                  <div className="mt-3 flex justify-center gap-2">
                    <AddTime id={job.id} session={session} />
                    <Button size="sm" variant="ghost" onClick={finish}>
                      <Check /> E gata deja
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-4">
                    <Button size="icon" variant="outline" className="size-12 rounded-full" onClick={() => setMinutes((m) => Math.max(1, m - 1))} aria-label="Un minut mai puțin">
                      <Minus />
                    </Button>
                    <div className="text-6xl font-semibold tracking-tight tabular-nums">{countdown(minutes * 60_000)}</div>
                    <Button size="icon" variant="outline" className="size-12 rounded-full" onClick={() => setMinutes((m) => m + 1)} aria-label="Un minut mai mult">
                      <Plus />
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {job.task.id === "preincalzire"
                      ? "Pornește-l când dai drumul la cuptor."
                      : job.activeMinutes >= 2 && passive >= 1
                      ? `Pornește-l când începi. Tu stai lângă ~${Math.round(job.activeMinutes)} min, restul merge singur.`
                      : job.activeMinutes >= 2
                        ? "Pornește-l când începi. Stai lângă și amestecă."
                        : "Pornește-l când ai pus la gătit."}
                  </p>
                  <button className="mt-1 px-2 py-2.5 text-sm text-muted-foreground underline underline-offset-4" onClick={() => session.complete(job.id)}>
                    Fără cronometru, mai departe
                  </button>
                </>
              )}
            </div>
          )}

          {baseMinutes == null && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" /> ~{fmtDuration(job.minutes)}
            </p>
          )}

          {done && (
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4" onClick={() => session.toggleDone(job.id)}>
              <Undo2 className="size-4" /> Nu l-am făcut, debifează
            </button>
          )}

          {after && !done && (
            <p className="border-t pt-3 text-sm text-muted-foreground">
              Apoi: <span className="text-foreground">{jobLabel(after)}</span>
            </p>
          )}
        </div>
      </main>

      <footer className="border-t pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3">
          <Button
            size="icon"
            variant="outline"
            className="size-14"
            disabled={index === 0}
            onClick={() => session.show(timeline[index - 1].id)}
            aria-label="Pasul anterior"
          >
            <ChevronLeft className="size-6" />
          </Button>
          {primary}
          <Button
            size="icon"
            variant="outline"
            className="size-14"
            disabled={index >= timeline.length - 1}
            onClick={() => session.show(timeline[index + 1].id)}
            aria-label="Pasul următor"
          >
            <ChevronRight className="size-6" />
          </Button>
        </div>
      </footer>
    </>
  );
}

function Note({ icon: Icon, tone, children }: { icon: typeof Lightbulb; tone?: "amber"; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4 text-lg", tone === "amber" && "border-amber-500/50 bg-amber-500/10")}>
      <Icon className={cn("mt-1 size-5 shrink-0", tone === "amber" ? "text-amber-600" : "text-yellow-500")} />
      <div>{children}</div>
    </div>
  );
}

function Finished({ session, plan }: Pick<Props, "session" | "plan">) {
  const { state, now } = session;
  const left = Object.keys(state.timers).length;
  // Ce mănânci chiar azi nu ajunge în caserole.
  const boxed = plan.portions.filter((p) => plan.timeline.some((j) => j.task.kind === "portion" && j.recipeIds.includes(p.recipeId)));
  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl space-y-5 px-5 py-8 animate-in fade-in duration-300">
          <div className="text-center">
            <PartyPopper className="mx-auto size-14 text-primary" />
            <h2 className="mt-3 text-3xl font-bold">Gata cu gătitul!</h2>
            {state.startedAt && <p className="mt-1 text-muted-foreground">Ți-a luat {fmtDuration((now - state.startedAt) / 60_000)}.</p>}
          </div>
          {left > 0 && (
            <Note icon={AlertTriangle} tone="amber">
              Mai {left === 1 ? "merge un cronometru" : `merg ${left} cronometre`} sus. Te anunț când {left === 1 ? "e gata" : "sunt gata"}.
            </Note>
          )}
          {boxed.length > 0 && (
            <section className="rounded-xl border p-4">
              <h3 className="mb-2 font-semibold">În frigider</h3>
              <ul className="space-y-1">
                {boxed.map((p) => (
                  <li key={p.recipeId}>
                    <b>{Math.ceil(p.servings)}×</b> {p.name}
                    <span className="block text-sm text-muted-foreground">{p.days.map((d) => weekdayName(d)).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {plan.dishes.length > 0 && (
            <section className="rounded-xl border p-4">
              <h3 className="mb-1 font-semibold">De spălat</h3>
              <p className="text-muted-foreground">{plan.dishes.join(", ")}</p>
            </section>
          )}
          {plan.noCook.length > 0 && (
            <section className="rounded-xl border border-dashed p-4">
              <h3 className="mb-1 font-semibold">Le faci pe loc, în ziua respectivă</h3>
              <p className="text-muted-foreground">{plan.noCook.map((n) => n.name).join(", ")}</p>
            </section>
          )}
        </div>
      </main>
      <footer className="border-t pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2 px-3">
          <Button size="lg" variant="outline" className="h-14" onClick={() => session.show(plan.timeline[plan.timeline.length - 1]?.id ?? null)}>
            <ChevronLeft className="size-5" />
          </Button>
          <Button size="lg" className="h-14 flex-1 text-lg" onClick={session.close}>
            Închide
          </Button>
        </div>
      </footer>
    </>
  );
}
