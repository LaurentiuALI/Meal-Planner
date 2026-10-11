"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importBackupAction } from "@/server/actions";

export function BackupSection() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Backup</h2>
      <p className="text-sm text-muted-foreground">
        Un fișier JSON cu tot: produsele tale, rețetele, planul, bucătăria și setările. Pe server se face oricum o copie în fiecare noapte (vezi DEPLOY.md).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href="/api/export" download>
            <Download /> Exportă
          </a>
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? <Loader2 className="animate-spin" /> : <Upload />} Importă…
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !confirm("Importul înlocuiește TOT ce e acum în aplicație cu conținutul backup-ului. Continui?")) return;
            start(async () => {
              const res = await importBackupAction(await file.text());
              if (res.ok) {
                toast.success("Backup importat");
                router.refresh();
              } else toast.error(res.error);
            });
          }}
        />
      </div>
    </section>
  );
}
