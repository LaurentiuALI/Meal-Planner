import { PageHeader } from "@/components/macros";
import { IngredientForm } from "../ingredient-form";
import { blankIngredient } from "@/lib/ingredient-defaults";

export const metadata = { title: "Produs nou" };

export default async function NewIngredientPage({ searchParams }: { searchParams: Promise<{ barcode?: string; draft?: string }> }) {
  const { barcode, draft } = await searchParams;
  return (
    <>
      <PageHeader title="Produs nou" />
      <IngredientForm initial={blankIngredient(barcode ?? null)} fromDraft={draft === "1"} />
    </>
  );
}
