import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { MacroLine } from "@/components/macros";
import { grams, num } from "@/lib/format";
import { kcalFrom, macrosOf, sum } from "@/domain/macros";
import type { Ingredient, Recipe } from "@/domain/types";

const SOURCE: Record<Ingredient["source"], string> = {
  usda: "USDA generic",
  off: "Open Food Facts",
  manual: "introdus de tine",
  legacy: "aplicația veche",
};

const g1 = (n: number) => num(n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

/**
 * Ce aduce fiecare ingredient într-o porție, cele mai calorice întâi, cu valorile la 100 g și sursa lor.
 * De aici găsești repede de unde vine o diferență față de altă aplicație și corectezi produsul.
 */
export function IngredientBreakdown({
  recipe,
  totals,
  ingredients,
}: {
  recipe: Recipe;
  /** Gramele per ingredient pentru toată rețeta (`recipe.servings` porții). */
  totals: [string, number][];
  ingredients: Record<string, Ingredient>;
}) {
  const servings = Math.max(1, recipe.servings);
  const rows = totals
    .map(([id, g]) => {
      const ing = ingredients[id];
      const perServing = g / servings;
      return { id, ing, grams: perServing, m: ing ? macrosOf(ing.per100, perServing) : null };
    })
    .sort((a, b) => (b.m?.kcal ?? 0) - (a.m?.kcal ?? 0));
  const total = sum(rows.flatMap((r) => (r.m ? [r.m] : [])));
  const flexible = new Set(recipe.steps.flatMap((s) => s.lines.filter((l) => l.flex).map((l) => l.ingredientId)));

  return (
    <section>
      <h2 className="font-semibold">Ingrediente</h2>
      <p className="mb-2 text-xs text-muted-foreground">
        Per porție, cele mai calorice întâi. Atinge un produs ca să-i verifici sau corectezi valorile de pe etichetă.
      </p>
      <ul className="divide-y rounded-lg border">
        {rows.map(({ id, ing, grams: g, m }) => {
          if (!ing || !m) {
            return (
              <li key={id} className="px-3 py-2 text-sm text-destructive">
                Ingredient lipsă ({grams(g)})
              </li>
            );
          }
          const share = total.kcal > 0 ? (m.kcal / total.kcal) * 100 : 0;
          const p = ing.per100;
          const kcalOff = p.kcal > 0 && Math.abs(p.kcal - kcalFrom(p)) > Math.max(25, p.kcal * 0.15);
          return (
            <li key={id}>
              <Link href={`/ingrediente/${id}?din=${recipe.id}`} className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {ing.name}
                      {ing.brand && <span className="font-normal text-muted-foreground"> · {ing.brand}</span>}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums">
                      {flexible.has(id) && <span className="mr-1 text-xs text-primary" title="Solverul ajustează cantitatea">↕</span>}
                      {grams(g)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums">
                      <b>{Math.round(m.kcal)} kcal</b> <span className="text-muted-foreground">{Math.round(share)}%</span>
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2.5 text-xs tabular-nums">
                    <span><b className="text-protein">P</b> {g1(m.protein)}g</span>
                    <span><b className="text-carbs">C</b> {g1(m.carbs)}g</span>
                    <span><b className="text-fat">G</b> {g1(m.fat)}g</span>
                    <span><b className="text-fiber">F</b> {p.fiber == null ? "?" : `${g1(m.fiber)}g`}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    la 100 g: {Math.round(p.kcal)} kcal · P {num(p.protein)} · C {num(p.carbs)} · G {num(p.fat)} · F {p.fiber == null ? "?" : num(p.fiber)} · {SOURCE[ing.source]}
                  </div>
                  {kcalOff && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertTriangle className="size-3" /> Caloriile nu se potrivesc cu macro-urile ({Math.round(kcalFrom(p))} kcal calculat)
                    </div>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
        <li className="bg-muted/40 px-3 py-2.5">
          <div className="mb-0.5 text-xs font-medium text-muted-foreground">Total per porție</div>
          <MacroLine m={total} />
        </li>
      </ul>
    </section>
  );
}
