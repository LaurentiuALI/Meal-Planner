import { PageHeader } from "@/components/macros";
import { IngredientBrowser } from "./ingredient-browser";

export const metadata = { title: "Produse" };

export default function IngredientsPage() {
  return (
    <>
      <PageHeader title="Produse" />
      <IngredientBrowser />
      <p className="mt-8 text-xs text-muted-foreground">
        Catalogul include date de la{" "}
        <a className="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
          Open Food Facts
        </a>{" "}
        (licență ODbL) și USDA FoodData Central (domeniu public).
      </p>
    </>
  );
}
