"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Loader2, Minus, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MacroLine } from "@/components/macros";
import { cn } from "@/lib/utils";
import { grams } from "@/lib/format";
import { recipeLines } from "@/domain/macros";
import { lineServingGrams, mealMacros, type Meal } from "@/domain/plan";
import { TASTE_LABEL } from "@/domain/taste";
import type { Ingredient, Recipe } from "@/domain/types";
import { removeMealAction, updateMealAction } from "@/server/plan-actions";

/** Detaliile unei mese, desfăcute direct în plan: ingredientele per porție (ajustabile), mâncat/sărit, rețeta. */
export function MealPanel({
  meal,
  recipe,
  ingredients,
  returnTo,
  onClose,
}: {
  meal: Meal;
  recipe?: Recipe;
  ingredients: Record<string, Ingredient>;
  /** Unde te întoarce editorul de rețete după salvare. */
  returnTo: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pins, setPins] = useState<Record<string, number>>(meal.pinned);
  const lookup = (id: string) => ingredients[id];
  const ingredient = meal.ingredientId ? lookup(meal.ingredientId) : undefined;
  const preview = { ...meal, pinned: pins };
  const m = mealMacros(preview, () => recipe, lookup);
  const dirty = JSON.stringify(pins) !== JSON.stringify(meal.pinned);

  const act = (fn: () => Promise<unknown>, close = false) =>
    start(async () => {
      await fn();
      router.refresh();
      if (close) onClose();
    });

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3 animate-in fade-in slide-in-from-top-1 duration-200">
        {recipe && (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/retete/${recipe.id}/editare?inapoi=${encodeURIComponent(returnTo)}`}>
                <Pencil /> Editează rețeta
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/retete/${recipe.id}`}>
                <BookOpen /> Vezi rețeta
              </Link>
            </Button>
          </div>
        )}

        <div className="rounded-lg bg-muted/60 p-3">
          <MacroLine m={m} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {recipe && (
            <div className="flex items-center rounded-md border">
              <Button size="icon" variant="ghost" disabled={pending || meal.servings <= 0.5} onClick={() => act(() => updateMealAction(meal.id, { servings: meal.servings - 0.5 }))} aria-label="Mai puțin">
                <Minus />
              </Button>
              <span className="w-20 text-center text-sm tabular-nums">{meal.servings} porț.</span>
              <Button size="icon" variant="ghost" disabled={pending} onClick={() => act(() => updateMealAction(meal.id, { servings: meal.servings + 0.5 }))} aria-label="Mai mult">
                <Plus />
              </Button>
            </div>
          )}
          {ingredient && (
            <label className="flex items-center gap-2 text-sm">
              <Input
                className="w-24"
                inputMode="numeric"
                defaultValue={meal.grams ?? ""}
                onBlur={(e) => {
                  const g = Number(e.target.value.replace(",", "."));
                  if (g > 0 && g !== meal.grams) act(() => updateMealAction(meal.id, { grams: g }));
                }}
              />
              g
            </label>
          )}
          <div className="ml-auto flex gap-1">
            <Button
              size="sm"
              variant={meal.status === "eaten" ? "default" : "outline"}
              disabled={pending}
              onClick={() => act(() => updateMealAction(meal.id, { status: meal.status === "eaten" ? "planned" : "eaten" }))}
            >
              <Check /> Mâncat
            </Button>
            <Button
              size="sm"
              variant={meal.status === "skipped" ? "secondary" : "ghost"}
              disabled={pending}
              onClick={() => act(() => updateMealAction(meal.id, { status: meal.status === "skipped" ? "planned" : "skipped" }))}
            >
              <X /> Sărit
            </Button>
          </div>
        </div>

        {recipe && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Ingrediente per porție</span>
              <span>↕ ajustat automat · scrie ca să fixezi</span>
            </div>
            <ul className="divide-y rounded-lg border">
              {recipeLines(recipe).map((l) => {
                const g = lineServingGrams(recipe, l, lookup, preview);
                const isPinned = pins[l.id] != null;
                const taste = lookup(l.ingredientId)?.toTaste;
                const isSolved = !isPinned && meal.solved[l.id] != null;
                return (
                  <li key={l.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">{lookup(l.ingredientId)?.name ?? "?"}</span>
                    {l.flex ? (
                      <>
                        {isSolved && <span className="text-xs text-primary">↕</span>}
                        <Input
                          key={`${l.id}-${isPinned}-${meal.solved[l.id]}`}
                          className={cn("h-8 w-20 text-right", isPinned && "border-primary")}
                          inputMode="numeric"
                          defaultValue={Math.round(g)}
                          onChange={(e) => {
                            const n = Number(e.target.value.replace(",", "."));
                            if (e.target.value.trim() && Number.isFinite(n)) setPins((p) => ({ ...p, [l.id]: n }));
                          }}
                        />
                        <span className="w-3 text-xs">g</span>
                      </>
                    ) : (
                      <span className="tabular-nums text-muted-foreground">{taste ? TASTE_LABEL[taste] : grams(g)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex gap-2">
              {dirty && (
                <Button size="sm" disabled={pending} onClick={() => act(() => updateMealAction(meal.id, { pinned: pins }).then(() => toast.success("Gramaje fixate")))}>
                  {pending && <Loader2 className="animate-spin" />} Fixează gramajele
                </Button>
              )}
              {Object.keys(meal.pinned).length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setPins({});
                    act(() => updateMealAction(meal.id, { pinned: {} }));
                  }}
                >
                  <RotateCcw /> Lasă solverul să decidă
                </Button>
              )}
            </div>
          </div>
        )}

        <Button variant="ghost" className="justify-start text-destructive" disabled={pending} onClick={() => act(() => removeMealAction(meal.id), true)}>
          <Trash2 /> Scoate din plan
        </Button>
    </div>
  );
}
