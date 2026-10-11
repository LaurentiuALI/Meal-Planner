"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { updateActionAction, updateEquipmentAction } from "@/server/actions";
import type { Action, Equipment } from "@/domain/types";

const toNum = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

/** Salvează la blur: fără buton, fiecare câmp e independent. */
function useSaver() {
  const [, start] = useTransition();
  return (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      toast.success("Salvat", { duration: 1000 });
    });
}

export function KitchenEditor({ equipment, actions }: { equipment: Equipment[]; actions: Action[] }) {
  const save = useSaver();
  const names = new Map(equipment.map((e) => [e.id, e.name]));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 font-semibold">Ustensile</h2>
        <div className="divide-y rounded-lg border">
          {equipment.map((e) => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">{e.name}</span>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                buc
                <Input
                  className="h-8 w-14"
                  inputMode="numeric"
                  defaultValue={e.count}
                  onBlur={(ev) => {
                    const n = toNum(ev.target.value);
                    if (n && n !== e.count) save(() => updateEquipmentAction(e.id, { count: n }));
                  }}
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                g/tură
                <Input
                  className="h-8 w-20"
                  inputMode="numeric"
                  defaultValue={e.capacityG ?? ""}
                  placeholder="—"
                  onBlur={(ev) => {
                    const n = toNum(ev.target.value);
                    if (n !== e.capacityG) save(() => updateEquipmentAction(e.id, { capacityG: n }));
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Acțiuni</h2>
        <div className="divide-y rounded-lg border">
          {actions.map((a) => (
            <div key={a.id} className="space-y-1 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-40 flex-1 font-medium">{a.name}</span>
                {(
                  [
                    ["minutes", "min", a.minutes],
                    ["activeMinutes", "activ", a.activeMinutes],
                    ["tempC", "°C", a.tempC],
                  ] as const
                ).map(([k, label, value]) => (
                  <label key={k} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Input
                      className="h-8 w-16"
                      inputMode="numeric"
                      defaultValue={value ?? ""}
                      placeholder="—"
                      onBlur={(ev) => {
                        const n = toNum(ev.target.value);
                        if (n === value || (k !== "tempC" && n == null)) return;
                        save(() => updateActionAction(a.id, { [k]: n }));
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {a.equipment.length ? a.equipment.map((alts) => alts.map((id) => names.get(id) ?? id).join(" sau ")).join(" + ") : "doar tu"}
                {a.perBatch && " · se face în ture"}
                {a.hint && ` · ${a.hint}`}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
