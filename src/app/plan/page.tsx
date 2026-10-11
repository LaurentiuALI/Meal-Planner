import { getSettings } from "@/server/settings";
import { getWeek, quickSuggestions } from "@/server/plan";
import { addDays, mondayOf, today, weekday } from "@/domain/plan";
import { PlanWeek } from "./plan-week";

export const metadata = { title: "Plan" };
export const dynamic = "force-dynamic";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const now = today();
  // Duminica (ziua de gătit) te interesează săptămâna care începe mâine.
  const fallback = weekday(now) === 6 ? addDays(now, 1) : now;
  const monday = mondayOf(w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : fallback);
  const [bundle, settings, suggestions] = await Promise.all([getWeek(monday), getSettings(), quickSuggestions(monday)]);
  return <PlanWeek monday={monday} today={now} bundle={bundle} settings={settings} suggestions={suggestions} />;
}
