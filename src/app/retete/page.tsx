import Link from "next/link";
import { Plus, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MacroLine, PageHeader } from "@/components/macros";
import { listRecipes, recipeBundle } from "@/server/recipes";
import { recipePerServing } from "@/domain/macros";
import { RECIPE_CATEGORIES, type RecipeCategory } from "@/domain/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Rețete" };
export const dynamic = "force-dynamic";

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const category = RECIPE_CATEGORIES.find((x) => x.id === c)?.id as RecipeCategory | undefined;
  const all = await listRecipes();
  const recipes = category ? all.filter((r) => r.category === category) : all;
  const ingredients = await recipeBundle(recipes);
  const lookup = (id: string) => ingredients[id];

  return (
    <>
      <PageHeader title="Rețete">
        <Button asChild size="sm">
          <Link href="/retete/nou">
            <Plus /> Rețetă nouă
          </Link>
        </Button>
      </PageHeader>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip href="/retete" active={!category}>
          Toate <span className="text-muted-foreground">{all.length}</span>
        </FilterChip>
        {RECIPE_CATEGORIES.map((cat) => (
          <FilterChip key={cat.id} href={`/retete?c=${cat.id}`} active={category === cat.id}>
            {cat.label} <span className="text-muted-foreground">{all.filter((r) => r.category === cat.id).length}</span>
          </FilterChip>
        ))}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {recipes.map((r) => {
          const m = recipePerServing(r, lookup);
          return (
            <li key={r.id}>
              <Link href={`/retete/${r.id}`} className="block rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-snug">{r.name}</span>
                  <div className="flex shrink-0 gap-1">
                    {r.freezes && <Snowflake className="size-4 text-fat" aria-label="Se congelează" />}
                    <Badge variant="secondary">{RECIPE_CATEGORIES.find((x) => x.id === r.category)?.label}</Badge>
                  </div>
                </div>
                <MacroLine m={m} className="mt-2 text-xs text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
      {recipes.length === 0 && <p className="py-10 text-center text-muted-foreground">Nicio rețetă aici încă.</p>}
    </>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-sm",
        active ? "border-primary bg-primary text-primary-foreground [&_span]:text-primary-foreground/70" : "hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
