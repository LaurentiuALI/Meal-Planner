import { PageHeader } from "@/components/macros";

export const metadata = { title: "Lista de cumpărături" };

export default function Page() {
  return (
    <>
      <PageHeader title="Lista de cumpărături" />
      <p className="text-muted-foreground">Vine în etapa următoare.</p>
    </>
  );
}
