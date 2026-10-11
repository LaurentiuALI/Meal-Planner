import { PageHeader } from "@/components/macros";
import { listKitchen } from "@/server/recipes";
import { RecipeEditor } from "../recipe-editor";
import { emptyRecipe } from "@/domain/recipe";

export const metadata = { title: "Rețetă nouă" };
export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const { actions } = await listKitchen();
  return (
    <>
      <PageHeader title="Rețetă nouă" />
      <RecipeEditor initial={emptyRecipe()} initialIngredients={{}} actions={actions} />
    </>
  );
}
