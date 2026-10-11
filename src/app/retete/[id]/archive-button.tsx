"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveRecipeAction } from "@/server/actions";

export function ArchiveRecipeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("Arhivezi rețeta? Nu mai apare în listă și în sugestii.")) return;
        start(async () => {
          await archiveRecipeAction(id);
          toast.success("Rețeta a fost arhivată");
          router.push("/retete");
        });
      }}
    >
      <Archive /> Arhivează
    </Button>
  );
}
