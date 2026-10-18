import { cn } from "@/lib/utils";
import { shortDate, weekdayName } from "@/domain/plan";
import type { SessionPlan } from "@/domain/cooking";
import type { Destination } from "@/domain/cook-guide";

/** „ochiul 2”, „Tigaie Ingenio 28cm”, „Vas ceramic mic 1”. */
export function unitName(k: string, equipmentNames: Record<string, string>) {
  const [id, n] = k.split("#");
  return id === "aragaz" ? `ochiul ${n}` : (equipmentNames[id] ?? id).replace(/ \(.*\)$/, "") + (id === "vas-ceramic" ? ` ${n}` : "");
}

export const shortRecipe = (name?: string) => (name ?? "").split(" ").slice(0, 3).join(" ");

/**
 * O culoare pe rețetă, aceeași în toată sesiunea (pași, cronometre, caserole), ca să vezi dintr-o privire
 * „ăsta e pentru burger”. Culori care se disting și pe fundal deschis, și pe întunecat.
 */
const PALETTE = ["#0ea5e9", "#f59e0b", "#22c55e", "#ec4899", "#8b5cf6", "#f97316", "#14b8a6", "#ef4444"];

export function recipeColors(plan: Pick<SessionPlan, "portions" | "noCook">): Record<string, string> {
  const ids = [...plan.portions.map((p) => p.recipeId), ...plan.noCook.map((n) => n.recipeId)];
  return Object.fromEntries(ids.map((id, i) => [id, PALETTE[i % PALETTE.length]]));
}

/** Bara colorată a unui pas: o culoare sau dungi, dacă pasul e comun mai multor rețete. */
export function colorBar(recipeIds: string[], colors: Record<string, string>) {
  const cs = recipeIds.map((r) => colors[r] ?? "#a3a3a3");
  if (cs.length <= 1) return cs[0] ?? "transparent";
  return `linear-gradient(90deg, ${cs.map((c, i) => `${c} ${(i / cs.length) * 100}% ${((i + 1) / cs.length) * 100}%`).join(", ")})`;
}

export function RecipeChips({
  recipeIds,
  recipeNames,
  colors,
  size = "sm",
  className,
}: {
  recipeIds: string[];
  recipeNames: Record<string, string>;
  colors: Record<string, string>;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {recipeIds.map((r) => (
        <span
          key={r}
          className={cn("flex items-center gap-1.5 rounded-full border font-medium", size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]")}
          style={{ borderColor: colors[r], backgroundColor: `${colors[r]}1f` }}
        >
          <span className={cn("shrink-0 rounded-full", size === "lg" ? "size-2.5" : "size-2")} style={{ backgroundColor: colors[r] }} />
          {size === "lg" ? recipeNames[r] : shortRecipe(recipeNames[r])}
        </span>
      ))}
    </div>
  );
}

const days = (plan: Pick<SessionPlan, "portions">, recipeId: string) =>
  plan.portions.find((p) => p.recipeId === recipeId)?.days.map((d) => `${weekdayName(d).slice(0, 2)} ${shortDate(d)}`).join(", ") ?? "";

/** Ce faci cu ce iese din pas, în cuvinte: unde îl pui, în câte caserole, sau unde continui. */
export function destinationText(
  d: Destination,
  plan: Pick<SessionPlan, "portions">,
  recipeNames: Record<string, string>,
  equipmentNames: Record<string, string>,
  units: string[] = [],
): { title: string; detail?: string } {
  if (d.kind === "stays") {
    const vessel = units.find((u) => !/^(aragaz|cuptor)#/.test(u));
    return {
      title: `Rămâne ${vessel ? `în ${unitName(vessel, equipmentNames)}` : "în vas"}`,
      detail: `Continui acolo: ${d.next.task.texts.find((t) => d.next.recipeIds.includes(t.recipeId))?.text ?? d.next.task.title}`,
    };
  }
  if (d.kind === "into") {
    // Ce ai tăiat merge direct mai departe; ce ai gătit așteaptă într-un bol.
    return units.length === 0
      ? { title: "Merge mai departe", detail: `Îl folosești la: ${d.next.task.title}` }
      : { title: "Pune-l deoparte într-un bol", detail: `Îl adaugi la: ${d.next.task.title}` };
  }
  const name = (r: string) => `„${shortRecipe(recipeNames[r])}”`;
  if (d.parts.length === 1) {
    const [p] = d.parts;
    return p.boxes
      ? { title: `Împarte-l direct în cele ${p.boxes} caserole ${name(p.recipeId)}`, detail: `În mod egal. Caserolele sunt pentru ${days(plan, p.recipeId)}.` }
      : { title: `Pune-l deoparte pentru ${name(p.recipeId)}, de azi`, detail: "Nu merge în caserole: îl mănânci azi." };
  }
  return {
    title: "Împarte-l între rețete",
    detail: d.parts
      .map((p) => `~${Math.round(p.share * 100)}% ${p.boxes ? `în cele ${p.boxes} caserole` : "deoparte, pentru azi,"} ${name(p.recipeId)}`)
      .join("; "),
  };
}
