import Link from "next/link";
import { PageHeader } from "@/components/macros";
import { RangePicker } from "@/components/range-picker";
import { getSession } from "@/server/cooking";
import { defaultBlock, shortDate, today, weekdayName } from "@/domain/plan";
import { SessionView } from "./session-view";

export const metadata = { title: "Sesiunea de gătit" };
export const dynamic = "force-dynamic";

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function CookingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const range = isDate(sp.from) && isDate(sp.to) && sp.from! <= sp.to! ? { from: sp.from!, to: sp.to! } : defaultBlock(today());
  const session = await getSession(range.from, range.to);
  const empty = session.plan.timeline.length === 0 && session.plan.noCook.length === 0;

  return (
    <>
      <PageHeader title="Gătit" />
      <RangePicker basePath="/gatit" from={range.from} to={range.to} />
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Gătești {weekdayName(session.sessionDate).toLowerCase()}, {shortDate(session.sessionDate)}
      </p>
      {empty ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Nimic de gătit în intervalul ăsta. <Link href="/plan" className="underline">Planifică mesele</Link>.
        </p>
      ) : (
        <SessionView
          sessionKey={`${range.from}_${range.to}`}
          plan={session.plan}
          recipeNames={session.recipeNames}
          equipmentNames={session.equipmentNames}
        />
      )}
    </>
  );
}
