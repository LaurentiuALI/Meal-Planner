"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Dices, Loader2, Lock, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MacroLine } from "@/components/macros";
import { add, recipeLines, recipePerServing, ZERO } from "@/domain/macros";
import { addDays, firstPick, shortDate } from "@/domain/plan";
import type { Settings, SlotId } from "@/domain/types";
import { applyProposalAction, proposalAction } from "@/server/plan-actions";

type Proposal = Awaited<ReturnType<typeof proposalAction>>;

const LABELS: Record<SlotId, string> = { pranz: "Prânz", gustare: "Gustare / desert", cina: "Cină" };

/**
 * „Propune” pentru luni–miercuri: câte o rețetă pe slot, cu „Alta” pe fiecare până îți convine
 * combinația. Abia „Pune în plan” scrie ceva în plan.
 */
export function ProposeDialog({ monday, settings, open, onClose }: { monday: string; settings: Settings; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<Proposal | null>(null);
  const [picks, setPicks] = useState<Partial<Record<SlotId, number>>>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    proposalAction(monday)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setPicks(Object.fromEntries(d.slots.map((s) => [s.slot, firstPick(s.candidates, { recipeId: s.current, locked: s.locked })])));
      })
      .catch(() => toast.error("Nu am putut încărca rețetele. Ai semnal?"));
    return () => {
      cancelled = true;
      setData(null);
    };
  }, [open, monday]);

  const lookup = (id: string) => data?.ingredients[id];
  const chosen = (data?.slots ?? []).map((s) => {
    const i = picks[s.slot] ?? -1;
    const id = i >= 0 ? s.candidates[i] : s.current;
    return { ...s, index: i, recipe: id ? data!.recipes[id] : undefined, keep: s.locked && i === s.candidates.indexOf(s.current ?? "") };
  });
  const changes = chosen.filter((c) => c.recipe && !c.keep && c.recipe.id !== c.current).map((c) => ({ slot: c.slot, recipeId: c.recipe!.id }));
  const day = chosen.reduce((acc, c) => (c.recipe ? add(acc, recipePerServing(c.recipe, lookup)) : acc), ZERO);

  const roll = (slot: SlotId, n: number, step: number) => setPicks((p) => ({ ...p, [slot]: ((p[slot] ?? -1) + step + n) % n }));

  const apply = () =>
    start(async () => {
      await applyProposalAction(monday, changes);
      toast.success("Luni–miercuri sunt în plan. Lista de cumpărături s-a actualizat.");
      router.refresh();
      onClose();
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-4 flex max-h-[92dvh] translate-y-0 flex-col gap-3 overflow-y-auto p-4 sm:top-[6%]">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Propunere pentru luni–miercuri</DialogTitle>
          <DialogDescription>
            {shortDate(monday)} – {shortDate(addDays(monday, 2))}, gătit duminică. Apasă „Alta” la ce nu-ți convine.
          </DialogDescription>
        </DialogHeader>

        {!data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {chosen.map((c) => {
                const n = c.candidates.length;
                const main = c.recipe
                  ? [...new Set(recipeLines(c.recipe).map((l) => lookup(l.ingredientId)).filter((i) => i && !i.toTaste && !i.staple).map((i) => i!.name))]
                  : [];
                return (
                  <section key={c.slot} className="rounded-xl border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{LABELS[c.slot]}</span>
                      {n > 1 && (
                        <div className="flex items-center gap-1">
                          {c.index >= 0 && (
                            <span className="mr-1 text-xs tabular-nums text-muted-foreground">
                              {c.index + 1}/{n}
                            </span>
                          )}
                          <Button size="icon" variant="ghost" className="size-8" aria-label="Înapoi" disabled={c.index < 0} onClick={() => roll(c.slot, n, -1)}>
                            <ChevronLeft />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => roll(c.slot, n, 1)}>
                            <Dices /> Alta
                          </Button>
                        </div>
                      )}
                    </div>
                    {c.recipe ? (
                      <>
                        <div className="flex items-center gap-1.5 font-medium leading-snug">
                          {c.recipe.name}
                          {c.recipe.freezes && <Snowflake className="size-3.5 shrink-0 text-fat" />}
                        </div>
                        <MacroLine m={recipePerServing(c.recipe, lookup)} className="mt-1 text-xs text-muted-foreground" />
                        {main.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{main.slice(0, 6).join(" · ")}</p>}
                        {c.keep && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-500">
                            <Lock className="mt-0.5 size-3.5 shrink-0" /> L-ai modificat deja (bife sau gramaje), deci rămâne așa. „Alta” îl înlocuiește.
                          </p>
                        )}
                        {!c.keep && c.recipe.id === c.current && <p className="mt-2 text-xs text-muted-foreground">E deja în plan.</p>}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{n ? "Ai pus în plan altceva decât o rețetă din categoria asta. „Alta” îl înlocuiește." : "Nicio rețetă în categoria asta."}</p>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>Pe zi, câte o porție din fiecare:</span>
                <span className="tabular-nums">
                  <b className="text-foreground">{Math.round(day.kcal)}</b>/{settings.targets.kcal} kcal · <b className="text-protein">{Math.round(day.protein)}</b>/{settings.targets.protein} g proteine
                </span>
              </div>
              <div className="mt-0.5">Gramajele se ajustează după ce le pui în plan, ca să atingi țintele.</div>
            </div>

            <Button size="lg" onClick={apply} disabled={pending || !changes.length}>
              {pending && <Loader2 className="animate-spin" />}
              {changes.length ? "Pune în plan luni–miercuri" : "Nimic de schimbat"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
