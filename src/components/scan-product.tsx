"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kcalFrom } from "@/domain/macros";
import { scoreName } from "@/domain/match";
import { saveScannedAction, scanLookupAction } from "@/server/actions";
import type { IngredientInput } from "@/server/ingredients";

export type ScanTarget = { id: string; name: string };

type Found = Awaited<ReturnType<typeof scanLookupAction>>;

const FOUND_TEXT: Record<Found["found"], string> = {
  local: "E deja în produsele tale. Compară valorile cu eticheta.",
  off: "Găsit pe Open Food Facts. Compară valorile cu eticheta; de multe ori sunt greșite sau vechi.",
  none: "Nu e în nicio bază. Copiază valorile de pe etichetă (la 100 g).",
};

const toNum = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Produsul din listă care seamănă cel mai mult cu ce ai scanat („Piept de pui” ← „Piept pui dezosat fără piele”). */
function guessTarget(name: string, targets: ScanTarget[]): string {
  let best = { id: "", score: 0.4 };
  for (const t of targets) {
    const score = scoreName(t.name, { id: t.id, name, brand: null, inLibrary: false });
    if (score > best.score) best = { id: t.id, score };
  }
  return best.id;
}

/**
 * În magazin: scanezi produsul pe care îl pui în coș, confirmi valorile de pe etichetă și intră
 * în bibliotecă. Dacă îl alegi pentru un produs din listă, îl înlocuiește în rețete, deci de
 * acum macro-urile vin de pe eticheta lui.
 */
export function ScanProduct({
  open,
  target,
  targets,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Produsul din listă de la care ai pornit scanarea, dacă e cazul. */
  target: ScanTarget | null;
  targets: ScanTarget[];
  onClose: () => void;
  onSaved: (id: string, replaced: string | null) => void;
}) {
  const [found, setFound] = useState<Found | null>(null);
  const [draft, setDraft] = useState<IngredientInput | null>(null);
  const [replaceId, setReplaceId] = useState("");
  const [looking, setLooking] = useState(false);
  const [pending, start] = useTransition();
  const gotCode = useRef(false);

  const reset = () => {
    setFound(null);
    setDraft(null);
    setLooking(false);
    gotCode.current = false;
  };
  const close = () => {
    reset();
    onClose();
  };

  const onCode = async (code: string) => {
    gotCode.current = true;
    setLooking(true);
    try {
      const res = await scanLookupAction(code);
      setFound(res);
      setDraft(res.draft);
      setReplaceId(target?.id ?? guessTarget(res.draft.name, targets));
    } catch {
      toast.error("Nu am putut căuta codul. Ai semnal?");
      close();
    } finally {
      setLooking(false);
    }
  };

  const set = (p: Partial<IngredientInput>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setMacro = (k: keyof IngredientInput["per100"], v: string) =>
    setDraft((d) => (d ? { ...d, per100: { ...d.per100, [k]: k === "fiber" && v.trim() === "" ? null : toNum(v) } } : d));

  const save = () =>
    draft &&
    start(async () => {
      const computed = Math.round(kcalFrom(draft.per100));
      const res = await saveScannedAction({ ...draft, per100: { ...draft.per100, kcal: draft.per100.kcal || computed } }, replaceId || null);
      if (!res.ok) return void toast.error(res.error);
      const old = targets.find((t) => t.id === replaceId);
      toast.success(
        res.recipes && old ? `Salvat. În ${res.recipes === 1 ? "o rețetă" : `${res.recipes} rețete`} folosești acum ${draft.name} în loc de ${old.name}.` : "Salvat în produsele tale",
      );
      onSaved(res.id, replaceId || null);
      close();
    });

  const computedKcal = draft ? Math.round(kcalFrom(draft.per100)) : 0;
  const kcalOff = !!draft && draft.per100.kcal > 0 && Math.abs(draft.per100.kcal - computedKcal) > Math.max(25, draft.per100.kcal * 0.15);
  const macro = (k: keyof IngredientInput["per100"], label: string, placeholder?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        inputMode="decimal"
        defaultValue={draft?.per100[k] == null || (k === "kcal" && !draft.per100.kcal) ? "" : String(draft.per100[k]).replace(".", ",")}
        placeholder={placeholder}
        onChange={(e) => setMacro(k, e.target.value)}
      />
    </div>
  );

  return (
    <>
      <BarcodeScanner
        open={open && !found && !looking}
        onOpenChange={(o) => {
          if (!o && !gotCode.current) close();
        }}
        onCode={onCode}
      />
      <Dialog open={open && (looking || !!found)} onOpenChange={(o) => !o && close()}>
        <DialogContent className="top-4 flex max-h-[92dvh] translate-y-0 flex-col gap-3 overflow-y-auto p-4 sm:top-[6%]">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>Confirmă de pe etichetă</DialogTitle>
            {found && <DialogDescription>{FOUND_TEXT[found.found]}</DialogDescription>}
          </DialogHeader>
          {!draft || !found ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div key={draft.barcode ?? "draft"} className="space-y-3">
              <div className="grid grid-cols-[1fr_8rem] gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nume</Label>
                  <Input defaultValue={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Piept de pui dezosat" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Marcă</Label>
                  <Input defaultValue={draft.brand ?? ""} onChange={(e) => set({ brand: e.target.value || null })} placeholder="Pilos" />
                </div>
              </div>
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium">La 100 g</legend>
                <div className="grid grid-cols-3 gap-2">
                  {macro("kcal", "kcal", String(computedKcal))}
                  {macro("protein", "Proteine")}
                  {macro("carbs", "Carbohidrați")}
                  {macro("fat", "Grăsimi")}
                  {macro("fiber", "Fibre", "?")}
                  <div className="space-y-1">
                    <Label className="text-xs">Pachet (g)</Label>
                    <Input inputMode="decimal" defaultValue={draft.packGrams ?? ""} onChange={(e) => set({ packGrams: toNum(e.target.value) || null })} />
                  </div>
                </div>
                {kcalOff && <p className="text-xs text-amber-600">Caloriile nu se potrivesc cu macro-urile ({computedKcal} kcal). Verifică eticheta.</p>}
              </fieldset>
              {targets.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">E pentru</Label>
                  <select value={replaceId} onChange={(e) => setReplaceId(e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-2 text-base md:text-sm">
                    <option value="">Nimic din listă, doar îl salvez</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {replaceId && replaceId !== draft.id && <p className="text-xs text-muted-foreground">Îl înlocuiește în rețete, cu aceleași gramaje.</p>}
                </div>
              )}
              <Button size="lg" className="w-full" onClick={save} disabled={pending || !draft.name.trim()}>
                {pending && <Loader2 className="animate-spin" />} Confirm și salvez
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
