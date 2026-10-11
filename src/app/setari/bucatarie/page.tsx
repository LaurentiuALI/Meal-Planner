import { PageHeader } from "@/components/macros";
import { listKitchen } from "@/server/recipes";
import { KitchenEditor } from "./kitchen-editor";

export const metadata = { title: "Bucătăria mea" };
export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const kitchen = await listKitchen();
  return (
    <>
      <PageHeader title="Bucătăria mea" />
      <p className="mb-4 text-sm text-muted-foreground">
        Capacitățile (grame de ingrediente crude per tură) decid câte ture îți propune sesiunea de gătit. Cele pentru airfryer vin din manualul Tefal;
        restul sunt estimări pe care le poți corecta.
      </p>
      <KitchenEditor {...kitchen} />
    </>
  );
}
