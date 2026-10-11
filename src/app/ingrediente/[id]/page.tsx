import Link from "next/link";
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

export default async function IngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ing = await getIngredient(id);
  if (!ing) notFound();
  const usedIn = await ingredientUsage(id);
  const { inLibrary, price, ...input } = ing;

  return (
    <>
      <PageHeader title={ing.name} />
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{SOURCE[ing.source]}</Badge>
        <Badge variant="outline">{aisleLabel(ing.aisle)}</Badge>
        {inLibrary ? <Badge variant="secondary">în produsele tale</Badge> : <Badge variant="outline">din catalog</Badge>}
      </div>
      {usedIn.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Folosit în: {usedIn.join(", ")}. <Link href="/retete" className="underline">Rețete</Link>
        </p>
      )}
      <IngredientForm initial={input} />
      <PriceSection ingredientId={ing.id} name={ing.name} current={price} />
    </>
  );
}
