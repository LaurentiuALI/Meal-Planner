"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ScanBarcode, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { barcodeAction, searchAction } from "@/server/actions";

type Hit = Awaited<ReturnType<typeof searchAction>>[number];

export function IngredientBrowser() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [pending, start] = useTransition();
  const [scanning, setScanning] = useState(false);
  const [onlyUnverified, setOnlyUnverified] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const n = ++seq.current;
    const timer = setTimeout(() => start(async () => {
      const res = await searchAction(query, false, query.trim() ? 30 : 1000);
      if (n === seq.current) setHits(res);
    }), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const onCode = useCallback(
    async (code: string) => {
      const toastId = toast.loading(`Caut ${code}…`);
      const res = await barcodeAction(code);
      toast.dismiss(toastId);
      if (res.kind === "local") router.push(`/ingrediente/${res.id}`);
      else if (res.kind === "off") {
        sessionStorage.setItem("ingredient-draft", JSON.stringify(res.draft));
        toast.success("Găsit pe Open Food Facts. Verifică valorile și salvează.");
        router.push(`/ingrediente/nou?draft=1`);
      } else {
        toast("Produsul nu e în nicio bază. Completează-l de pe etichetă.");
        router.push(`/ingrediente/nou?barcode=${res.barcode}`);
      }
    },
    [router],
  );

  // Condimentele și uleiul nu se cântăresc, deci nu le cerem verificate.
  const doubtful = (h: Hit) => !h.verified && !h.toTaste;
  const unverifiedUsed = hits.filter((h) => (h.uses ?? 0) > 0 && doubtful(h)).length;
  const shown = onlyUnverified ? hits.filter(doubtful) : hits;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută în produsele tale și în catalog" className="pl-9" />
          {pending && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <Button variant="outline" size="icon" onClick={() => setScanning(true)} aria-label="Scanează cod de bare">
          <ScanBarcode />
        </Button>
        <Button asChild size="icon" aria-label="Produs nou">
          <Link href="/ingrediente/nou">
            <Plus />
          </Link>
        </Button>
      </div>
      {query.trim() ? (
        <HitList hits={hits} markMine />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Toate produsele tale ({hits.length}). Caută ca să vezi și catalogul (~6000 de produse).</p>
            {unverifiedUsed > 0 && (
              <Button size="sm" variant={onlyUnverified ? "default" : "outline"} onClick={() => setOnlyUnverified((x) => !x)}>
                <span className="size-2 rounded-full bg-amber-500" /> Neverificate din rețete · {unverifiedUsed}
              </Button>
            )}
          </div>
          <Section title="În rețetele tale" hits={shown.filter((h) => (h.uses ?? 0) > 0)} />
          {!onlyUnverified && <Section title="Restul produselor tale" hits={shown.filter((h) => !h.uses)} />}
        </>
      )}
      {query && !pending && hits.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nimic pentru „{query}”. <Link href="/ingrediente/nou" className="underline">Adaugă-l de pe etichetă</Link> sau scanează-l.
        </p>
      )}
      <BarcodeScanner open={scanning} onOpenChange={setScanning} onCode={onCode} />
    </div>
  );
}

const SOURCE: Record<Hit["source"], string | null> = { usda: "generic", off: null, manual: null, legacy: null };

function Section({ title, hits }: { title: string; hits: Hit[] }) {
  if (!hits.length) return null;
  return (
    <section className="space-y-1.5">
      <h2 className="text-sm font-semibold">
        {title} <span className="font-normal text-muted-foreground">· {hits.length}</span>
      </h2>
      <HitList hits={[...hits].sort((a, b) => a.name.localeCompare(b.name, "ro"))} />
    </section>
  );
}

function HitList({ hits, markMine = false }: { hits: Hit[]; markMine?: boolean }) {
  if (!hits.length) return null;
  return (
    <ul className="divide-y rounded-lg border">
      {hits.map((h) => (
        <li key={h.id}>
          <Link href={`/ingrediente/${h.id}`} className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-muted/50">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {h.inLibrary && !h.verified && !h.toTaste && <span className="mr-1.5 inline-block size-2 rounded-full bg-amber-500 align-middle" title="Valori neverificate" />}
                {h.name}
              </span>
              <span className="block text-xs text-muted-foreground tabular-nums">
                {h.brand && `${h.brand} · `}
                {Math.round(h.per100.kcal)} kcal · P {h.per100.protein} · C {h.per100.carbs} · G {h.per100.fat} · F {h.per100.fiber ?? "?"}
              </span>
            </span>
            <span className="flex shrink-0 gap-1">
              {SOURCE[h.source] && <Badge variant="outline">{SOURCE[h.source]}</Badge>}
              {h.lidl && <Badge variant="outline">Lidl</Badge>}
              {markMine && h.inLibrary && <Badge variant="secondary">al tău</Badge>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
