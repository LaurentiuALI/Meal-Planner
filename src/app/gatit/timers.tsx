"use client";

import { useState } from "react";
import { BellRing, Check, ChevronRight, Timer as TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Scheduled, SessionPlan } from "@/domain/cooking";
import { destinationOf, doneMessage, isRinging, remainingMs } from "@/domain/cook-guide";
import { jobLabel, type CookSession } from "./use-cook-session";
import { destinationText, recipeColors, RecipeChips, shortRecipe } from "./cook-text";

export const countdown = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};


/** Butoanele de minute în plus, comune cronometrului mare, tăvii și alarmei. */
export function AddTime({ id, session, values = [1, 5], size = "sm" }: { id: string; session: CookSession; values?: number[]; size?: "sm" | "lg" }) {
  return (
    <>
      {values.map((m) => (
        <Button
          key={m}
          variant="outline"
          size={size}
          className={cn("tabular-nums", size === "lg" && "h-14 min-w-0 flex-1 shrink px-2 text-lg")}
          onClick={() => session.addTime(id, m)}
        >
          +{m} min
        </Button>
      ))}
    </>
  );
}

/** Cronometrele care merg „în fundal”: un rând pe cronometru, se deschide la atingere. */
export function TimerTray({
  session,
  timeline,
  recipeNames,
  colors = {},
  exclude,
  onShow,
  className,
}: {
  session: CookSession;
  timeline: Scheduled[];
  recipeNames: Record<string, string>;
  colors?: Record<string, string>;
  exclude?: string;
  onShow?: (id: string) => void;
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const items = Object.entries(session.state.timers)
    .filter(([id]) => id !== exclude)
    .map(([id, t]) => ({ id, t, job: timeline.find((j) => j.id === id) }))
    .sort((a, b) => a.t.endsAt - b.t.endsAt);
  if (!items.length) return null;

  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map(({ id, t, job }) => {
        const left = remainingMs(t, session.now);
        const total = t.endsAt - t.startedAt;
        const pct = total > 0 ? Math.min(100, ((session.now - t.startedAt) / total) * 100) : 100;
        const ringing = isRinging(t, session.now);
        const expanded = openId === id;
        return (
          <li key={id} className={cn("overflow-hidden rounded-lg border bg-card", ringing && "border-destructive")}>
            <button className="relative flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => setOpenId(expanded ? null : id)}>
              <span className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-500" style={{ width: `${pct}%` }} aria-hidden />
              {ringing ? <BellRing className="relative size-4 shrink-0 animate-pulse text-destructive" /> : <TimerIcon className="relative size-4 shrink-0 text-muted-foreground" style={{ color: job ? colors[job.recipeIds[0]] : undefined }} />}
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{job ? jobLabel(job) : "Cronometru"}</span>
                {job && <span className="block truncate text-[11px] text-muted-foreground">{job.recipeIds.map((r) => shortRecipe(recipeNames[r])).join(" + ")}</span>}
              </span>
              <span className={cn("relative text-xl font-semibold tabular-nums", ringing && "text-destructive")}>
                {ringing ? "Gata!" : countdown(left)}
              </span>
            </button>
            {expanded && (
              <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
                <AddTime id={id} session={session} />
                <Button size="sm" variant="secondary" onClick={() => session.stopTimer(id)}>
                  <Check /> Gata, oprește
                </Button>
                {onShow && (
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onShow(id)}>
                    Pasul <ChevronRight />
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Memento-ul de la jumătate („Scutură coșul”), sub cronometre, până îl închizi. */
export function Nudge({ session, className }: { session: CookSession; className?: string }) {
  const n = session.nudge;
  if (!n) return null;
  return (
    <button
      className={cn("flex w-full items-center gap-3 rounded-lg border border-amber-500/60 bg-amber-500/15 px-3 py-2.5 text-left animate-in fade-in slide-in-from-top-2", className)}
      onClick={session.dismissNudge}
    >
      <BellRing className="size-6 shrink-0 animate-pulse text-amber-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold leading-tight">{n.text}</span>
        <span className="block truncate text-xs text-muted-foreground">{n.label}</span>
      </span>
      <span className="text-sm text-muted-foreground">OK</span>
    </button>
  );
}

/** Când sună un cronometru: pe tot ecranul, peste orice, până îl oprești sau mai adaugi minute. */
export function AlarmOverlay({
  session,
  plan,
  recipeNames,
  equipmentNames,
}: {
  session: CookSession;
  plan: SessionPlan;
  recipeNames: Record<string, string>;
  equipmentNames: Record<string, string>;
}) {
  const timeline = plan.timeline;
  const colors = recipeColors(plan);
  const ringing = Object.entries(session.state.timers)
    .filter(([, t]) => isRinging(t, session.now))
    .map(([id, t]) => ({ id, t, job: timeline.find((j) => j.id === id) }));
  if (!ringing.length) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Cronometru terminat"
      className="fixed inset-0 z-[70] flex flex-col bg-background/95 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] backdrop-blur"
    >
      <div className="flex flex-1 flex-col justify-center gap-4 overflow-y-auto">
        {ringing.map(({ id, t, job }) => (
          <section key={id} className="rounded-2xl border-2 border-destructive bg-card p-5 text-center shadow-lg">
            <BellRing className="mx-auto size-12 animate-bounce text-destructive" />
            <h2 className="mt-3 text-3xl font-bold leading-tight">{job ? jobLabel(job) : "Cronometru"}</h2>
            {job && <RecipeChips className="mt-2 justify-center" recipeIds={job.recipeIds} recipeNames={recipeNames} colors={colors} size="lg" />}
            <p className="mt-4 text-xl">{job ? doneMessage(job) : "Timpul a trecut."}</p>
            {job && <AlarmDestination job={job} plan={plan} recipeNames={recipeNames} equipmentNames={equipmentNames} />}
            <p className="mt-1 text-sm text-muted-foreground">
              Mai trebuie? Adaugă minute. · a sunat acum {countdown(session.now - t.endsAt)}
            </p>
            <div className="mt-5 flex gap-2">
              <AddTime id={id} session={session} values={[1, 3, 5]} size="lg" />
            </div>
            <Button size="lg" className="mt-3 h-16 w-full text-xl" onClick={() => session.stopTimer(id)}>
              <Check className="size-6" /> Gata, oprește
            </Button>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Ce faci cu ce ai scos: „Împarte-l direct în cele 3 caserole …”. */
function AlarmDestination({ job, plan, recipeNames, equipmentNames }: { job: Scheduled; plan: SessionPlan; recipeNames: Record<string, string>; equipmentNames: Record<string, string> }) {
  const d = destinationOf(job, plan);
  if (!d) return null;
  const t = destinationText(d, plan, recipeNames, equipmentNames, job.units);
  return (
    <div className="mt-3 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-left">
      <p className="text-lg font-semibold leading-snug">{t.title}</p>
      {t.detail && <p className="mt-0.5 text-sm text-muted-foreground">{t.detail}</p>}
    </div>
  );
}
