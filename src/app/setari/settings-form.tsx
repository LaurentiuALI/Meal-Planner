"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettingsAction } from "@/server/actions";
import type { Settings } from "@/domain/types";

const toNum = (v: string) => Number(v.replace(",", ".")) || 0;

export function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const { kcal, protein, fat, fiber } = s.targets;
  // Carbohidrații sunt „restul”: UE nu include fibrele în carbohidrați, fibrele au ~2 kcal/g.
  const carbs = Math.max(0, Math.round((kcal - 4 * protein - 9 * fat - 2 * fiber) / 4));
  const shares = Math.round(s.slots.reduce((a, b) => a + b.share, 0) * 100);

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Ținte zilnice</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["kcal", "Calorii", "kcal"],
            ["protein", "Proteine", "g"],
            ["fat", "Grăsimi", "g"],
            ["fiber", "Fibre", "g"],
          ] as const
        ).map(([k, label, unit]) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs">
              {label} ({unit})
            </Label>
            <Input inputMode="numeric" defaultValue={s.targets[k]} onChange={(e) => setS({ ...s, targets: { ...s.targets, [k]: toNum(e.target.value) } })} />
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Carbohidrați: restul, adică <b className="text-foreground">~{carbs} g</b>.
      </p>

      <h2 className="pt-2 font-semibold">Mesele zilei</h2>
      <div className="space-y-2">
        {s.slots.map((slot, i) => (
          <div key={slot.id} className="flex items-center gap-3">
            <span className="w-20 text-sm">{slot.label}</span>
            <Input
              className="w-20"
              inputMode="numeric"
              defaultValue={Math.round(slot.share * 100)}
              onChange={(e) => setS({ ...s, slots: s.slots.map((x, j) => (j === i ? { ...x, share: toNum(e.target.value) / 100 } : x)) })}
            />
            <span className="text-sm text-muted-foreground">% ≈ {Math.round(slot.share * kcal)} kcal</span>
          </div>
        ))}
        <p className={`text-xs ${shares === 100 ? "text-muted-foreground" : "text-destructive"}`}>Total {shares}%</p>
      </div>

      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await saveSettingsAction(s);
            if (res.ok) toast.success("Setări salvate");
            else toast.error(res.error);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />} Salvează
      </Button>
    </section>
  );
}
