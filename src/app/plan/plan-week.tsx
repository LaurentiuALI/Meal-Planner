"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Copy, Loader2, MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MacroBar } from "@/components/macros";
import { cn } from "@/lib/utils";
import { addDays, mondayOf, dayMacros, mealMacros, shortDate, SLOT_LABELS, weekDates, weekday, weekdayName, type Meal, type MealSlot } from "@/domain/plan";
import type { Settings } from "@/domain/types";
import type { PlanBundle } from "@/server/plan";
import { addMealAction, clearWeekAction, copyDayAction } from "@/server/plan-actions";
import { MealSheet } from "./meal-sheet";
import { AddMealDialog } from "./add-meal-dialog";
import { ProposeDialog } from "./propose-dialog";

const SLOTS: MealSlot[] = ["pranz", "gustare", "cina", "extra"];

export function PlanWeek({
  monday,
  today,
  bundle,
  settings,
  suggestions,
  leadingDay,
}: {
  leadingDay?: string;
  monday: string;
  today: string;
  bundle: PlanBundle;
  settings: Settings;
  suggestions: { id: string; name: string; uses: string[] }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [proposing, setProposing] = useState(false);
  const todayRef = useRef<HTMLElement>(null);

  const recipes = (id: string) => bundle.recipes[id];
  const lookup = (id: string) => bundle.ingredients[id];
  const dates = weekDates(monday);
  // Duminica, când vezi săptămâna care începe mâine, ziua de azi apare deasupra.
  const days = leadingDay ? [leadingDay, ...dates] : dates;
  const byDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const m of bundle.meals) map.set(m.date, [...(map.get(m.date) ?? []), m]);
    return map;
  }, [bundle.meals]);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
  }, [monday]);

  const run = <T,>(fn: () => Promise<T>, msg?: string | ((r: T) => string)) =>
    start(async () => {
      const r = await fn();
      if (msg) toast.success(typeof msg === "function" ? msg(r) : msg);
      router.refresh();
    });

  const meal = bundle.meals.find((m) => m.id === openMeal);
  const empty = bundle.meals.length === 0;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Săptămâna trecută">
            <Link href={`/plan?w=${addDays(monday, -7)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <div className="text-center">
            <div className="text-lg font-semibold leading-tight">
              {shortDate(dates[0])} – {shortDate(dates[6])}
            </div>
            {monday !== mondayOf(weekday(today) === 6 ? addDays(today, 1) : today) && (
              <Link href="/plan" className="text-xs text-primary">
                înapoi la săptămâna curentă
              </Link>
            )}
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="Săptămâna viitoare">
            <Link href={`/plan?w=${addDays(monday, 7)}`}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <Button size="sm" onClick={() => setProposing(true)} disabled={pending}>
            <Sparkles /> Propune
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Mai multe">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => run(() => copyDayAction(addDays(monday, 2), [addDays(monday, 3), addDays(monday, 4)]), "Joi și vineri au primit mesele de miercuri")}
              >
                <Copy /> Săptămână aglomerată: joi–vineri ca miercuri
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => confirm("Golești toată săptămâna?") && run(() => clearWeekAction(monday), "Săptămâna a fost golită")}
              >
                <Trash2 /> Golește săptămâna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {empty && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Săptămâna e goală. Apasă <b className="text-foreground">Propune</b> ca să primești un prânz, o gustare și o cină pentru luni–miercuri (le gătești duminică),
          sau adaugă mesele manual.
        </div>
      )}

      {days.map((date) => {
        const dayMeals = byDate.get(date) ?? [];
        const totals = dayMacros(dayMeals, recipes, lookup);
        const isToday = date === today;
        const wd = weekday(date);
        const t = settings.targets;
        const carbsTarget = Math.max(0, (t.kcal - 4 * t.protein - 9 * t.fat - 2 * t.fiber) / 4);
        const showSuggestions = (wd === 3 || wd === 4) && !dayMeals.some((m) => m.slot === "cina");
        return (
          <section
            key={date}
            ref={isToday ? todayRef : undefined}
            className={cn("scroll-mt-4 rounded-xl border p-3", isToday && "border-primary/60 ring-1 ring-primary/30")}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">
                {weekdayName(date)} <span className="font-normal text-muted-foreground">{shortDate(date)}</span>
                {isToday && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">azi</span>}
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-8" aria-label="Opțiuni zi">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={!dayMeals.length || wd === 6} onClick={() => run(() => copyDayAction(date, [addDays(date, 1)]), "Copiat în ziua următoare")}>
                    <Copy /> Copiază în ziua următoare
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!dayMeals.length || wd >= 4}
                    onClick={() => run(() => copyDayAction(date, dates.slice(wd + 1, 5)), "Copiat până vineri")}
                  >
                    <Copy /> Copiază până vineri
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {dayMeals.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
                <div className="col-span-2 sm:col-span-1">
                  <MacroBar label="kcal" value={totals.kcal} target={t.kcal} unit="" tone="kcal" />
                </div>
                <MacroBar label="Proteine" value={totals.protein} target={t.protein} tone="protein" />
                <MacroBar label="Carbo" value={totals.carbs} target={carbsTarget} tone="carbs" />
                <MacroBar label="Grăsimi" value={totals.fat} target={t.fat} tone="fat" />
                <MacroBar label={totals.fiberUnknown ? "Fibre (min.)" : "Fibre"} value={totals.fiber} target={t.fiber} tone="fiber" />
              </div>
            )}

            <ul className="space-y-1">
              {SLOTS.map((slot) => {
                const items = dayMeals.filter((m) => m.slot === slot);
                if (slot === "extra" && !items.length) return null;
                return (
                  <li key={slot} className="flex items-start gap-2">
                    <span className="w-16 shrink-0 pt-2 text-xs text-muted-foreground">{SLOT_LABELS[slot]}</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      {items.map((m) => {
                        const mm = mealMacros(m, recipes, lookup);
                        const name = m.recipeId ? recipes(m.recipeId)?.name : lookup(m.ingredientId ?? "")?.name;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setOpenMeal(m.id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-2 text-left text-sm hover:bg-muted",
                              m.status === "skipped" && "opacity-50 line-through",
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate">
                                {m.status === "eaten" && <span className="mr-1 text-primary">✓</span>}
                                {name ?? "?"}
                                {m.servings !== 1 && <span className="ml-1 text-xs text-muted-foreground">×{m.servings}</span>}
                                {m.ingredientId && <span className="ml-1 text-xs text-muted-foreground">{m.grams} g</span>}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {Math.round(mm.kcal)} · <span className="text-protein">{Math.round(mm.protein)}P</span>
                            </span>
                          </button>
                        );
                      })}
                      {slot !== "extra" && (
                        <button
                          onClick={() => setAdding({ date, slot })}
                          className={cn(
                            "flex w-full items-center gap-1 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/50",
                            items.length > 0 && "border-transparent py-2",
                          )}
                        >
                          <Plus className="size-3.5" /> {items.length ? "încă una" : "adaugă"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button onClick={() => setAdding({ date, slot: "extra" })} className="-my-1 py-2.5 text-xs text-muted-foreground hover:text-foreground">
                + extra (ceva mâncat în plus)
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <div className="mb-1 text-xs text-muted-foreground">Idei rapide pentru azi:</div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      disabled={pending}
                      onClick={() => run(() => addMealAction({ date, slot: "cina", recipeId: s.id }), `${s.name} → cină`)}
                      className="rounded-2xl border px-2.5 py-1 text-left text-xs hover:bg-muted"
                    >
                      {s.name}
                      {s.uses.length > 0 && <span className="block text-[10px] text-primary">folosește resturile: {s.uses.slice(0, 2).join(", ")}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}

      {meal && (
        <MealSheet
          meal={meal}
          recipe={meal.recipeId ? recipes(meal.recipeId) : undefined}
          ingredients={bundle.ingredients}
          onClose={() => setOpenMeal(null)}
        />
      )}
      <ProposeDialog monday={monday} settings={settings} open={proposing} onClose={() => setProposing(false)} />
      <AddMealDialog key={adding ? `${adding.date}-${adding.slot}` : "closed"} target={adding} onClose={() => setAdding(null)} />
    </div>
  );
}
