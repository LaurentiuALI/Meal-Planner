import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/macros";
import { getIngredient, ingredientUsage } from "@/server/ingredients";
import { aisleLabel } from "@/domain/aisles";
import { IngredientForm } from "../ingredient-form";
import { PriceSection } from "./price-section";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const i = await getIngredient((await params).id);
  return { title: i?.name ?? "Produs" };
}

const SOURCE = { off: "Open Food Facts", usda: "USDA (generic)", manual: "introdus de tine", legacy: "din aplicația veche" };

export default async function IngredientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ din?: string }> }) {
  const { id } = await params;
  const { din } = await searchParams;
  const ing = await getIngredient(id);
  if (!ing) notFound();
  const usedIn = await ingredientUsage(id);
  const { inLibrary, price, ...input } = ing;
  // Venit din pagina unei rețete (?din=<id>): link înapoi și întoarcere acolo după salvare.
  const from = din ? usedIn.find((r) => r.id === din) : undefined;

  return (
    <>
      {from && (
        <Link href={`/retete/${from.id}`} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {from.name}
        </Link>
      )}
      <PageHeader title={ing.name} />
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{SOURCE[ing.source]}</Badge>
        <Badge variant="outline">{aisleLabel(ing.aisle)}</Badge>
        {inLibrary ? <Badge variant="secondary">în produsele tale</Badge> : <Badge variant="outline">din catalog</Badge>}
      </div>
      {usedIn.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Folosit în:{" "}
          {usedIn.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ", "}
              <Link href={`/retete/${r.id}`} className="underline underline-offset-2 hover:text-foreground">
                {r.name}
              </Link>
            </span>
          ))}
          . Ce schimbi aici se aplică în toate.
        </p>
      )}
      <IngredientForm initial={input} returnTo={from ? `/retete/${from.id}` : undefined} />
      <PriceSection ingredientId={ing.id} name={ing.name} current={price} />
    </>
  );
}
