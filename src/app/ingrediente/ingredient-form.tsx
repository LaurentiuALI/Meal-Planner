"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { AISLES } from "@/domain/aisles";
import { kcalFrom } from "@/domain/macros";
import { deleteIngredientAction, saveIngredientAction } from "@/server/actions";
import type { IngredientInput } from "@/server/ingredients";
import { blankIngredient } from "@/lib/ingredient-defaults";

const toNum = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function NumField({ label, value, onChange, suffix, placeholder }: { label: string; value: number | null; onChange: (v: number | null) => void; suffix?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          inputMode="decimal"
          defaultValue={value == null ? "" : String(value).replace(".", ",")}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.trim() === "" ? null : toNum(e.target.value))}
          className={suffix ? "pr-8" : ""}
        />
        {suffix && <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function IngredientForm({ initial, fromDraft = false, returnTo }: { initial: IngredientInput; fromDraft?: boolean; returnTo?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [key, setKey] = useState(0);
  const [pending, start] = useTransition();

  // Un produs găsit după codul de bare vine prin sessionStorage, ca să nu umple URL-ul.
  useEffect(() => {
    if (!fromDraft) return;
    const raw = sessionStorage.getItem("ingredient-draft");
    if (raw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage există doar după hidratare
      setV({ ...blankIngredient(), ...JSON.parse(raw) });
      setKey((k) => k + 1);
      sessionStorage.removeItem("ingredient-draft");
    }
  }, [fromDraft]);

  const set = (p: Partial<IngredientInput>) => setV((x) => ({ ...x, ...p }));
  // Cine rescrie valorile le are de obicei pe etichetă în față: le considerăm verificate.
  const setMacro = (k: keyof IngredientInput["per100"], n: number | null) =>
    setV((x) => ({ ...x, verified: true, per100: { ...x.per100, [k]: k === "fiber" ? n : (n ?? 0) } }));
  const computedKcal = Math.round(kcalFrom(v.per100));
  const kcalOff = v.per100.kcal > 0 && Math.abs(v.per100.kcal - computedKcal) > Math.max(25, v.per100.kcal * 0.15);

  function save() {
    start(async () => {
      const res = await saveIngredientAction({ ...v, per100: { ...v.per100, kcal: v.per100.kcal || computedKcal } });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Salvat");
      // Venit dintr-o rețetă: te întorci la ea, cu macro-urile recalculate.
      router.push(returnTo ?? `/ingrediente/${res.id}`);
      router.refresh();
    });
  }

  function remove() {
    if (!v.id || !confirm("Ștergi produsul?")) return;
    start(async () => {
      const res = await deleteIngredientAction(v.id!);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Șters");
      router.push("/ingrediente");
    });
  }

  return (
    <div key={key} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name">Nume</Label>
          <Input id="name" defaultValue={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="Iaurt grecesc 2%" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="brand">Marcă</Label>
          <Input id="brand" defaultValue={v.brand ?? ""} onChange={(e) => set({ brand: e.target.value || null })} placeholder="Pilos" />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Valori nutriționale la 100 g (de pe etichetă)</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <NumField label="Calorii" suffix="kcal" value={v.per100.kcal || null} placeholder={String(computedKcal)} onChange={(n) => setMacro("kcal", n)} />
          <NumField label="Proteine" suffix="g" value={v.per100.protein} onChange={(n) => setMacro("protein", n)} />
          <NumField label="Carbohidrați" suffix="g" value={v.per100.carbs} onChange={(n) => setMacro("carbs", n)} />
          <NumField label="Grăsimi" suffix="g" value={v.per100.fat} onChange={(n) => setMacro("fat", n)} />
          <NumField label="Fibre" suffix="g" value={v.per100.fiber} placeholder="?" onChange={(n) => setMacro("fiber", n)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Fibrele goale înseamnă „necunoscut”, nu 0. Caloriile goale se calculează din macro-uri ({computedKcal} kcal).
          {kcalOff && <span className="text-amber-600"> Caloriile nu se potrivesc cu macro-urile; verifică eticheta.</span>}
        </p>
        <label className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm", !v.verified && "border-amber-500/50 bg-amber-500/10")}>
          <Switch className="mt-0.5" checked={!!v.verified} onCheckedChange={(c) => set({ verified: c })} />
          <span>
            <span className="font-medium">Valori verificate</span>
            <span className="block text-xs text-muted-foreground">
              {v.verified ? "Le-ai confirmat (de pe etichetă sau ca generic bun)." : "Neverificate: vin dintr-o bază publică. Compară-le cu eticheta și bifează."}
            </span>
          </span>
        </label>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumField label="Pachet" suffix="g" value={v.packGrams} onChange={(n) => set({ packGrams: n })} />
        <div className="space-y-1">
          <Label className="text-xs">Eticheta pachetului</Label>
          <Input defaultValue={v.packLabel ?? ""} onChange={(e) => set({ packLabel: e.target.value || null })} placeholder="caserolă 500 g" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Raion</Label>
          <select value={v.aisle} onChange={(e) => set({ aisle: e.target.value as IngredientInput["aisle"] })} className="h-9 w-full rounded-md border bg-transparent px-2 text-base md:text-sm">
            {AISLES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <NumField label="Densitate (pentru ml)" suffix="g/ml" value={v.density} onChange={(n) => set({ density: n ?? 1 })} />
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={v.lidl} onCheckedChange={(c) => set({ lidl: c })} /> Îl iau de la Lidl
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={v.staple} onCheckedChange={(c) => set({ staple: c })} /> Am mereu în casă
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Porții (ex. 1 bucată = 55 g)</legend>
        {v.portions.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="flex-1" defaultValue={p.name} placeholder="bucată" onChange={(e) => set({ portions: v.portions.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <span className="text-sm">=</span>
            <Input className="w-24" inputMode="decimal" defaultValue={p.grams} onChange={(e) => set({ portions: v.portions.map((x, j) => (j === i ? { ...x, grams: toNum(e.target.value) } : x)) })} />
            <span className="text-sm">g</span>
            <Button variant="ghost" size="icon" onClick={() => set({ portions: v.portions.filter((_, j) => j !== i) })} aria-label="Șterge porția">
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set({ portions: [...v.portions, { name: "bucată", grams: 0 }] })}>
          <Plus /> Porție
        </Button>
      </fieldset>

      <div className="space-y-1">
        <Label className="text-xs">Cod de bare</Label>
        <Input inputMode="numeric" defaultValue={v.barcode ?? ""} onChange={(e) => set({ barcode: e.target.value || null })} />
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" size="lg" onClick={save} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Salvează
        </Button>
        {v.id && (
          <Button size="lg" variant="ghost" onClick={remove} disabled={pending}>
            <Trash2 /> Șterge
          </Button>
        )}
      </div>
    </div>
  );
}
