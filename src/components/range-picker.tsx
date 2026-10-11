import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, mondayOf, shortDate, weekdayName } from "@/domain/plan";

const PRESETS = [
  { label: "L–Mi", from: 0, to: 2 },
  { label: "J–V", from: 3, to: 4 },
  { label: "L–V", from: 0, to: 4 },
  { label: "Săpt.", from: 0, to: 6 },
];

/** Alegerea intervalului (luni–miercuri, joi–vineri…) pentru listă și sesiunea de gătit. */
export function RangePicker({ basePath, from, to }: { basePath: string; from: string; to: string }) {
  const monday = mondayOf(from);
  const href = (f: string, t: string) => `${basePath}?from=${f}&to=${t}`;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Săptămâna anterioară">
          <Link href={href(addDays(from, -7), addDays(to, -7))}>
            <ChevronLeft />
          </Link>
        </Button>
        <div className="text-center text-sm">
          <div className="font-semibold">
            {from === to ? `${weekdayName(from)} ${shortDate(from)}` : `${weekdayName(from)} ${shortDate(from)} – ${weekdayName(to)} ${shortDate(to)}`}
          </div>
          <div className="text-xs text-muted-foreground">{days + 1} {days === 0 ? "zi" : "zile"}</div>
        </div>
        <Button asChild variant="ghost" size="icon" aria-label="Săptămâna următoare">
          <Link href={href(addDays(from, 7), addDays(to, 7))}>
            <ChevronRight />
          </Link>
        </Button>
      </div>
      <div className="flex justify-center gap-1.5">
        {PRESETS.map((p) => {
          const f = addDays(monday, p.from);
          const t = addDays(monday, p.to);
          return (
            <Link
              key={p.label}
              href={href(f, t)}
              className={cn("rounded-full border px-3 py-1 text-xs", f === from && t === to ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
