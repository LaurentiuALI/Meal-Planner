import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/macros";
import { getRecipe, listKitchen, recipeBundle } from "@/server/recipes";
import { RecipeEditor } from "../../recipe-editor";

export const metadata = { title: "Editează rețeta" };
export const dynamic = "force-dynamic";

/** Doar căi din aplicație (ex. „/plan?w=2026-10-19”), nu adrese externe. */
const internal = (s?: string) => (s && /^\/[a-z]/.test(s) ? s : undefined);

export default async function EditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inapoi?: string }>;
}) {
  const recipe = await getRecipe((await params).id);
  if (!recipe) notFound();
  const returnTo = internal((await searchParams).inapoi);
  const [ingredients, { actions }] = await Promise.all([recipeBundle([recipe]), listKitchen()]);
  return (
    <>
      {returnTo && (
        <Link href={returnTo} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Înapoi la plan
        </Link>
      )}
      <PageHeader title="Editează rețeta" />
      <RecipeEditor initial={recipe} initialIngredients={ingredients} actions={actions} returnTo={returnTo} />
    </>
  );
}
