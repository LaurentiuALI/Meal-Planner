"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ClipboardCopy, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { grams } from "@/lib/format";
import { AISLES } from "@/domain/aisles";
import { syncChecksAction } from "@/server/shopping-actions";

export type ListItem = {
  id: string;
  name: string;
  brand: string | null;
  aisle: string;
  staple: boolean;
  lidl: boolean;
  packGrams: number | null;
  packLabel: string | null;
  needG: number;
  packs: number | null;
  buyG: number;
  surplusG: number;
  pieces: number | null;
  usedIn: string[];
};

type Checks = Record<string, { checked: boolean; at: number }>;

/** Ce cumperi, scris cum îl cauți pe raft. */
export function quantityLabel(i: ListItem) {
  if (i.packs && i.packGrams) return `${i.packs} × ${i.packLabel ?? grams(i.packGrams)}`;
  if (i.pieces && i.pieces > 0) return `${i.pieces} buc (~${grams(i.buyG)})`;
  return grams(i.buyG);
}

/**
 * Bifele trăiesc întâi în localStorage (merg și fără semnal în magazin) și se trimit la server
 * când se poate; cele nesincronizate rămân în coadă până revine conexiunea.
 */
function useChecks(listKey: string, serverChecks: Checks) {
  const storeKey = `checks:${listKey}`;
  const pendingKey = `checks-pending:${listKey}`;
  const [checks, setChecks] = useState<Checks>(serverChecks);
  const [offline, setOffline] = useState(false);

  const read = (k: string): Checks => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? "{}");
    } catch {
      return {};
    }
  };
  const write = (k: string, v: Checks) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };

  const flush = useCallback(async () => {
    const pending = read(pendingKey);
    const changes = Object.entries(pending).map(([ingredientId, c]) => ({ ingredientId, ...c }));
    if (!changes.length) return;
    try {
      const merged = await syncChecksAction(listKey, changes);
      write(pendingKey, {});
      write(storeKey, merged);
      setChecks(merged);
      setOffline(false);
    } catch {
      setOffline(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  useEffect(() => {
    // Combinăm ce știe serverul cu ce ai bifat offline: câștigă bifa mai recentă.
    const local = { ...read(storeKey), ...read(pendingKey) };
    const merged: Checks = { ...serverChecks };
    for (const [id, c] of Object.entries(local)) if (!merged[id] || merged[id].at < c.at) merged[id] = c;
    setChecks(merged);
    write(storeKey, merged);
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  const toggle = (id: string) => {
    const c = { checked: !checks[id]?.checked, at: Date.now() };
    const next = { ...checks, [id]: c };
    setChecks(next);
    write(storeKey, next);
    write(pendingKey, { ...read(pendingKey), [id]: c });
    flush();
  };

  return { checks, toggle, offline };
}

export function ShoppingList({ listKey, items, serverChecks, mealCount }: { listKey: string; items: ListItem[]; serverChecks: Checks; mealCount: number }) {
  const { checks, toggle, offline } = useChecks(listKey, serverChecks);
  const isChecked = (id: string) => !!checks[id]?.checked;

  const groups = useMemo(() => {
    const toBuy = items.filter((i) => !i.staple);
    return AISLES.map((a) => ({ ...a, items: toBuy.filter((i) => i.aisle === a.id) })).filter((g) => g.items.length);
  }, [items]);
  const staples = items.filter((i) => i.staple);
  const done = items.filter((i) => !i.staple && isChecked(i.id)).length;
  const total = items.filter((i) => !i.staple).length;

  const copy = async () => {
    const text = groups
      .map((g) => `${g.label}\n${g.items.filter((i) => !isChecked(i.id)).map((i) => `- ${i.name}: ${quantityLabel(i)}`).join("\n")}`)
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    toast.success("Lista e copiată");
  };

  if (mealCount === 0) {
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Nicio masă planificată în intervalul ăsta. <Link href="/plan" className="underline">Mergi la plan</Link>.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>
              {done} din {total} în coș
            </span>
            {offline && (
              <span className="flex items-center gap-1 text-amber-600">
                <CloudOff className="size-3.5" /> salvat pe telefon
              </span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={copy}>
          <ClipboardCopy /> Copiază
        </Button>
      </div>

      {groups.map((g) => (
        <section key={g.id}>
          <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</h2>
          <ul className="divide-y rounded-lg border">
            {[...g.items].sort((a, b) => Number(isChecked(a.id)) - Number(isChecked(b.id))).map((i) => (
              <Row key={i.id} item={i} checked={isChecked(i.id)} onToggle={() => toggle(i.id)} />
            ))}
          </ul>
        </section>
      ))}

      {staples.length > 0 && (
        <section>
          <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Verifică dacă mai ai acasă</h2>
          <ul className="divide-y rounded-lg border border-dashed">
            {staples.map((i) => (
              <Row key={i.id} item={i} checked={isChecked(i.id)} onToggle={() => toggle(i.id)} compact />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ item: i, checked, onToggle, compact }: { item: ListItem; checked: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <li>
      <button onClick={onToggle} className={cn("flex w-full items-start gap-3 px-3 text-left", compact ? "py-2" : "py-3")}>
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
          )}
        >
          {checked && <Check className="size-4" strokeWidth={3} />}
        </span>
        <span className={cn("min-w-0 flex-1", checked && "text-muted-foreground line-through")}>
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">
              {i.name}
              {i.brand && <span className="font-normal text-muted-foreground"> · {i.brand}</span>}
            </span>
            {!compact && <span className="shrink-0 text-sm font-semibold tabular-nums">{quantityLabel(i)}</span>}
          </span>
          {!compact && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              trebuie {grams(i.needG)}
              {i.surplusG >= 20 && ` · rămân ${grams(i.surplusG)}`} · {i.usedIn.join(", ")}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
