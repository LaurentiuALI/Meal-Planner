"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchAction } from "@/server/actions";

type Hit = Awaited<ReturnType<typeof searchAction>>[number];

/** Căutare în biblioteca ta + catalog (OpenFoodFacts, USDA). Rezultatele tale apar primele. */
export function IngredientPicker({
  open,
  onOpenChange,
  onPick,
  initialQuery = "",
  title = "Alege ingredientul",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (hit: Hit) => void;
  initialQuery?: string;
  title?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>([]);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery(initialQuery);
  }

  useEffect(() => {
    if (!open) return;
    const n = ++seq.current;
    const timer = setTimeout(() => {
      start(async () => {
        const res = await searchAction(query);
        if (n === seq.current) setHits(res);
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [query, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 flex max-h-[85dvh] translate-y-0 flex-col gap-3 p-4 sm:top-[10%]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="piept pui, iaurt grecesc, pilos…"
            className="pl-9"
          />
          {pending && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <ul className="-mx-1 flex-1 overflow-y-auto">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(h);
                  onOpenChange(false);
                }}
                className="flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{h.name}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {h.brand && `${h.brand} · `}
                    {Math.round(h.per100.kcal)} kcal · P {h.per100.protein} · C {h.per100.carbs} · G {h.per100.fat} / 100g
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {h.lidl && <Badge variant="outline">Lidl</Badge>}
                  {h.inLibrary && <Badge variant="secondary">al tău</Badge>}
                </span>
              </button>
            </li>
          ))}
          {!pending && hits.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">Nimic găsit. Poți adăuga produsul din „Produse”.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

