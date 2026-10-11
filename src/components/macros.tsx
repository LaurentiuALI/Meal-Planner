import { cn } from "@/lib/utils";
import type { Macros } from "@/domain/types";

const fmt = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toString();

/** Rând compact: kcal · P · C · G · F. */
export function MacroLine({ m, className }: { m: Macros; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm tabular-nums", className)}>
      <span className="font-semibold">{Math.round(m.kcal)} kcal</span>
      <span><b className="text-protein">P</b> {fmt(m.protein)}g</span>
      <span><b className="text-carbs">C</b> {fmt(m.carbs)}g</span>
      <span><b className="text-fat">G</b> {fmt(m.fat)}g</span>
      <span title={m.fiberUnknown ? "Unele ingrediente nu au fibrele cunoscute" : undefined}>
        <b className="text-fiber">F</b> {fmt(m.fiber)}g{m.fiberUnknown ? "+" : ""}
      </span>
    </div>
  );
}

/** Bară de progres față de o țintă; depășirea se vede ca bară plină și text accentuat. */
export function MacroBar({
  label,
  value,
  target,
  unit = "g",
  tone,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  tone: "protein" | "carbs" | "fat" | "fiber" | "kcal";
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const bar = {
    protein: "bg-protein",
    carbs: "bg-carbs",
    fat: "bg-fat",
    fiber: "bg-fiber",
    kcal: "bg-primary",
  }[tone];
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs tabular-nums">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          <span className="text-foreground">{Math.round(value)}</span> / {Math.round(target)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
