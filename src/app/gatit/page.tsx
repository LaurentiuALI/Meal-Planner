import { PageHeader } from "@/components/macros";

export const metadata = { title: "Sesiunea de gătit" };

export default function Page() {
  return (
    <>
      <PageHeader title="Sesiunea de gătit" />
      <p className="text-muted-foreground">Vine în etapa următoare.</p>
    </>
  );
}
