"use client";

import { AlertTriangle, Check, Clock, Flame, Play, RotateCcw, Snowflake, Sparkles, Thermometer, Timer, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { grams, minutes as fmtDuration } from "@/lib/format";
import { shortDate, weekdayName } from "@/domain/plan";
import type { SessionPlan } from "@/domain/cooking";
import { destinationOf, suggestedStep, timerMinutes } from "@/domain/cook-guide";
import { tasteNotes } from "@/domain/taste";
import { jobLabel, useCookSession } from "./use-cook-session";
import { clock, CookMode, linesSummary } from "./cook-mode";
import { colorBar, destinationText, recipeColors, RecipeChips, unitName } from "./cook-text";
import { AlarmOverlay, Nudge, TimerTray } from "./timers";

const at = (min: number) => clock(min * 60_000);

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
  const session = useCookSession(sessionKey, plan.timeline);
  const { state } = session;
  const running = state.startedAt != null;
  const next = suggestedStep(plan.timeline, state);
  const doneCount = state.done.filter((id) => plan.timeline.some((s) => s.id === id)).length;
  const unit = (k: string) => unitName(k, equipmentNames);
  const colors = recipeColors(plan);

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

      {!running ? (
        <Button size="lg" className="h-14 w-full text-lg" onClick={session.open}>
          <Play className="size-5" /> Gătește pas cu pas
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <button className="flex-1 rounded-lg bg-primary/10 px-3 py-2 text-left text-sm" onClick={session.open}>
            <div className="text-xs text-muted-foreground">
              {clock(session.now - state.startedAt!)} de la început · {doneCount}/{plan.timeline.length} pași
            </div>
            <div className="font-medium">{next ? `Acum: ${jobLabel(next)}` : "Gata! Spor la caserole."}</div>
          </button>
          <Button size="lg" className="h-12" onClick={session.open}>
            <Play /> Continuă
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Resetează sesiunea"
            onClick={() => confirm("Resetezi sesiunea (bifele și cronometrele)?") && session.reset()}
          >
            <RotateCcw />
          </Button>
        </div>
      )}

      <TimerTray session={session} timeline={plan.timeline} recipeNames={recipeNames} colors={colors} onShow={(id) => session.show(id)} />
      <Nudge session={session} />

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
              const isNow = running && s.id === next?.id;
              return (
                <li
                  key={s.id}
                  className={cn("relative overflow-hidden rounded-lg border p-3 pl-4 transition-opacity", done && "opacity-50", isNow && "border-primary ring-1 ring-primary/40")}
                >
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: colorBar(s.recipeIds, colors).replace("90deg", "180deg") }} aria-hidden />
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => session.toggleDone(s.id)}
                      aria-label={done ? "Marchează ca nefăcut" : "Marchează ca făcut"}
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                        done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      )}
                    >
                      {done && <Check className="size-4" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button className="flex flex-wrap items-baseline gap-x-2 text-left" onClick={() => session.show(s.id)}>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{at(s.start)}</span>
                        <span className={cn("font-semibold", done && "line-through")}>{s.task.title}</span>
                        {s.batches > 1 && <Badge variant="secondary">tura {s.batch}/{s.batches}</Badge>}
                      </button>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" /> {fmtDuration(s.end - s.start)}
                        </span>
                        {passive >= 1 && (
                          <span className="flex items-center gap-1">
                            <Flame className="size-3.5" /> {fmtDuration(passive)} singur
                          </span>
                        )}
                        {timerMinutes(s) != null && (
                          <span className="flex items-center gap-1">
                            <Timer className="size-3.5" /> cronometru
                          </span>
                        )}
                        {s.task.tempC != null && s.units.some((u) => /^(cuptor|airfryer)/.test(u)) && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="size-3.5" /> {s.task.tempC}°C
                          </span>
                        )}
                        {s.units.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Utensils className="size-3.5" /> {s.units.map(unit).join(", ")}
                          </span>
                        )}
                      </div>
                      {s.inputs.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {linesSummary(s, recipeNames).map((l) => (
                            <li key={l.name} className="text-sm">
                              <span className="font-semibold tabular-nums">{grams(l.total)}</span> {l.name}
                              {l.split && <span className="block text-xs text-muted-foreground">{l.split}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {tasteNotes(s.inputs).map((t) => (
                        <p key={t} className="mt-0.5 text-sm text-muted-foreground">{t}</p>
                      ))}
                      {s.rinse && <p className="mt-1 text-xs text-muted-foreground">Clătește vasul înainte (l-ai folosit la altă rețetă).</p>}
                      {s.task.hint && <p className="mt-1 text-xs text-muted-foreground">💡 {s.task.hint}</p>}
                      {s.task.texts.some((t) => s.recipeIds.includes(t.recipeId)) && (
                        <ul className="mt-1.5 space-y-0.5 text-xs">
                          {s.task.texts.filter((t) => s.recipeIds.includes(t.recipeId)).map((t) => (
                            <li key={t.recipeId + t.text}>
                              {s.recipeIds.length > 1 && <b>{(recipeNames[t.recipeId] ?? "").split(" ").slice(0, 3).join(" ")}: </b>}
                              {t.text}
                            </li>
                          ))}
                        </ul>
                      )}
                      {(() => {
                        const d = destinationOf(s, plan);
                        if (!d) return null;
                        const t = destinationText(d, plan, recipeNames, equipmentNames, s.units);
                        return <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">→ {t.title}</p>;
                      })()}
                      {s.recipeIds.length > 0 && <RecipeChips className="mt-1.5" recipeIds={s.recipeIds} recipeNames={recipeNames} colors={colors} />}

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
                    <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{at(s.start)}</span>
                    <span>
                      <b className="tabular-nums">{s.loadG >= 1 ? grams(s.loadG) : ""}</b> {s.task.title.replace(/^[^·]+· /, "")}
                      {s.batches > 1 && ` · tura ${s.batch}/${s.batches}`}
                      {s.task.tempC ? ` · ${s.task.tempC}°C` : ""} · {fmtDuration(s.end - s.start)}
                      <span className="block text-xs text-muted-foreground">{s.recipeIds.map((r) => recipeNames[r]).join(" + ")}</span>
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

      {state.open && <CookMode session={session} plan={plan} recipeNames={recipeNames} equipmentNames={equipmentNames} />}
      <AlarmOverlay session={session} plan={plan} recipeNames={recipeNames} equipmentNames={equipmentNames} />
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
