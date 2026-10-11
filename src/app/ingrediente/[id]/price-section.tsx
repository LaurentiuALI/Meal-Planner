"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lei } from "@/domain/prices";
import { grams } from "@/lib/format";
import { linkLidlAction, manualPriceAction, searchLidlAction } from "@/server/actions";

type Hit = Awaited<ReturnType<typeof searchLidlAction>>[number];

/** Prețul unui produs: legat de o linie din fișierul zilnic Lidl (se actualizează singur) sau manual. */
export function PriceSection({
  ingredientId,
  name,
  current,
}: {
  ingredientId: string;
  name: string;
  current: { priceRon: number; priceGrams: number; source: string | null; ref: string | null; at: string | null } | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(name);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [manual, setManual] = useState({ price: current?.priceRon?.toString() ?? "", grams: current?.priceGrams?.toString() ?? "" });
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => start(async () => setHits(await searchLidlAction(query))), 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  return (
    <section className="mt-8 space-y-3 rounded-lg border p-3">
      <h2 className="font-semibold">Preț</h2>
      {current ? (
        <p className="text-sm">
          <b>{lei(current.priceRon)}</b> / {grams(current.priceGrams)}{" "}
          <span className="text-muted-foreground">
            · {current.source === "lidl" ? `Lidl (${current.ref?.split("|")[0]})` : "introdus de tine"}
            {current.at && ` · ${new Date(current.at).toLocaleDateString("ro-RO")}`}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Fără preț. Leagă-l de un produs Lidl sau scrie-l manual.</p>
      )}

      {!open ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Search /> Caută în prețurile Lidl
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} />
            {pending && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />}
          </div>
          {hits?.length === 0 && (
            <p className="text-xs text-muted-foreground">Nimic găsit. Dacă lista e goală, actualizează prețurile din pagina de cumpărături.</p>
          )}
          <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
            {hits?.map((h) => (
              <li key={h.ref}>
                <button
                  disabled={pending || !h.grams}
                  onClick={() =>
                    start(async () => {
                      const res = await linkLidlAction(ingredientId, h.ref);
                      if (!res.ok) return void toast.error(res.error);
                      toast.success("Preț legat de Lidl; se actualizează zilnic");
                      setOpen(false);
                      router.refresh();
                    })
                  }
                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  <span>
                    {h.name} <span className="text-muted-foreground">· {h.size}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{lei(h.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        Manual:
        <Input className="w-24" inputMode="decimal" placeholder="lei" value={manual.price} onChange={(e) => setManual({ ...manual, price: e.target.value })} />
        pentru
        <Input className="w-24" inputMode="numeric" placeholder="grame" value={manual.grams} onChange={(e) => setManual({ ...manual, grams: e.target.value })} />g
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const p = Number(manual.price.replace(",", "."));
              const g = Number(manual.grams.replace(",", "."));
              await manualPriceAction(ingredientId, p > 0 ? p : null, g > 0 ? g : null);
              toast.success(p > 0 && g > 0 ? "Preț salvat" : "Preț șters");
              router.refresh();
            })
          }
        >
          Salvează
        </Button>
      </div>
    </section>
  );
}
