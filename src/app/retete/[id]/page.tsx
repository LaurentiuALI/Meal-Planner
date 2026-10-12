import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Flame, Pencil, Snowflake, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MacroLine } from "@/components/macros";
import { getRecipe, listKitchen, recipeBundle } from "@/server/recipes";
import { recipeIngredientGrams, recipePerServing } from "@/domain/macros";
import { RECIPE_CATEGORIES } from "@/domain/types";
import { formatAmount, minutes } from "@/lib/format";
import { ArchiveRecipeButton } from "./archive-button";
import { IngredientBreakdown } from "./ingredient-breakdown";
import { pricesFor } from "@/server/prices";
import { lei } from "@/domain/prices";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const r = await getRecipe((await params).id);
  return { title: r?.name ?? "Rețetă" };
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  const [ingredients, kitchen] = await Promise.all([recipeBundle([recipe]), listKitchen()]);
  const lookup = (iid: string) => ingredients[iid];
  const actions = new Map(kitchen.actions.map((a) => [a.id, a]));
  const perServing = recipePerServing(recipe, lookup);
  const totals = [...recipeIngredientGrams(recipe, lookup, recipe.servings)].sort((a, b) => b[1] - a[1]);
  const prices = await pricesFor(totals.map(([iid]) => iid));
  const priced = totals.filter(([iid]) => prices.has(iid));
  const costPerServing =
    priced.reduce((a, [iid, g]) => a + (g / prices.get(iid)!.priceGrams) * prices.get(iid)!.priceRon, 0) / Math.max(1, recipe.servings);
  const totalMinutes = recipe.steps.reduce((sum, s) => sum + (s.minutes ?? actions.get(s.actionId ?? "")?.minutes ?? 0), 0);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{RECIPE_CATEGORIES.find((c) => c.id === recipe.category)?.label}</Badge>
          {recipe.freezes && (
            <Badge variant="outline" className="gap-1">
              <Snowflake className="size-3" /> se congelează
            </Badge>
          )}
          <Badge variant="outline">se păstrează {recipe.keepsDays} zile</Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" /> ~{minutes(totalMinutes)} în serie
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{recipe.name}</h1>
        {recipe.notes && <p className="text-muted-foreground">{recipe.notes}</p>}
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            Per porție {recipe.servings > 1 && `(rețeta face ${recipe.servings})`}
          </div>
          <MacroLine m={perServing} />
          {priced.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              ~{lei(costPerServing)} / porție
              {priced.length < totals.length && ` (doar ${priced.length} din ${totals.length} ingrediente au preț)`}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/retete/${recipe.id}/editare`}>
              <Pencil /> Editează
            </Link>
          </Button>
          <ArchiveRecipeButton id={recipe.id} />
        </div>
      </header>

      <IngredientBreakdown recipe={recipe} totals={totals} ingredients={ingredients} />

      <section>
        <h2 className="mb-2 font-semibold">Pași</h2>
        <ol className="space-y-3">
          {recipe.steps.map((s, i) => {
            const action = s.actionId ? actions.get(s.actionId) : undefined;
            const mins = s.minutes ?? action?.minutes;
            const temp = s.tempC ?? action?.tempC;
            return (
              <li key={s.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  {action && <span className="font-medium">{action.name}</span>}
                  {mins != null && mins > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" /> {minutes(mins)}
                    </span>
                  )}
                  {temp != null && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Thermometer className="size-3.5" /> {temp}°C
                    </span>
                  )}
                  {action && action.activeMinutes < (mins ?? 0) / 2 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Flame className="size-3.5" /> pasiv
                    </span>
                  )}
                </div>
                {s.text && <p className="mt-2 text-sm">{s.text}</p>}
                {action?.hint && <p className="mt-1 text-xs text-muted-foreground">💡 {action.hint}</p>}
                {s.lines.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {s.lines.map((l) => (
                      <li key={l.id} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                        {ingredients[l.ingredientId]?.name ?? "?"} · {formatAmount(l.amount, l.unit, ingredients[l.ingredientId])}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}
