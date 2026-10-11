import { notFound } from "next/navigation";
import { PageHeader } from "@/components/macros";
import { getRecipe, listKitchen, recipeBundle } from "@/server/recipes";
import { RecipeEditor } from "../../recipe-editor";

export const metadata = { title: "Editează rețeta" };
export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const recipe = await getRecipe((await params).id);
  if (!recipe) notFound();
  const [ingredients, { actions }] = await Promise.all([recipeBundle([recipe]), listKitchen()]);
  return (
    <>
      <PageHeader title="Editează rețeta" />
      <RecipeEditor initial={recipe} initialIngredients={ingredients} actions={actions} />
    </>
  );
}
