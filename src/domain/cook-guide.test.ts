import { describe, expect, it } from "vitest";
import type { Scheduled } from "./cooking";
import { addMinutes, blockers, isRinging, startTimer, suggestedStep, timerMinutes, type GuideState } from "./cook-guide";

const job = (id: string, over: Partial<Scheduled> = {}, task: Partial<Scheduled["task"]> = {}): Scheduled =>
  ({
    id, batch: 1, batches: 1, recipeIds: ["r"], inputs: [], loadG: 0, minutes: 2, activeMinutes: 2, deps: [],
    start: 0, end: 2, activeEnd: 2, units: [], rinse: false,
    task: { id, title: id, hint: null, ...task },
    ...over,
  }) as Scheduled;

const preheat = job("preincalzire", { minutes: 10, activeMinutes: 0 });
const cut = job("taie", { minutes: 4, activeMinutes: 4 });
const bake = job("cuptor", { minutes: 30, activeMinutes: 2, deps: ["preincalzire", "taie"], units: ["cuptor#1", "jena#1"] });
const rice = job("orez", { minutes: 18, activeMinutes: 1, units: ["cratita-20#1", "aragaz#1"] });
const portion = job("portie", { deps: ["cuptor", "orez"] });
const timeline = [preheat, rice, cut, bake, portion];

const st = (done: string[], timers: GuideState["timers"] = {}): GuideState => ({ done, timers });

describe("cooking guide", () => {
  it("offers a timer only for steps that cook on their own", () => {
    expect(timerMinutes(preheat)).toBe(10);
    expect(timerMinutes(rice)).toBe(18);
    expect(timerMinutes(cut)).toBeNull();
    expect(timerMinutes(job("caleste", { minutes: 5, activeMinutes: 3, units: ["tigaie-28#1"] }))).toBe(5);
  });

  it("walks the plan in order while nothing is waiting", () => {
    expect(suggestedStep(timeline, st([]))?.id).toBe("preincalzire");
    expect(suggestedStep(timeline, st(["preincalzire", "orez"]))?.id).toBe("taie");
  });

  it("skips a step whose oven is still heating and comes back when the timer is stopped", () => {
    const heating = { preincalzire: startTimer(preheat, 10, 0) };
    const s = st(["preincalzire", "orez", "taie"], heating);
    expect(blockers(bake, timeline, s).map((b) => b.job.id)).toEqual(["preincalzire"]);
    // Nimic altceva de făcut: rămâi pe pasul cu cuptorul și aștepți.
    expect(suggestedStep(timeline, s)?.id).toBe("cuptor");
    expect(suggestedStep(timeline, st(["preincalzire", "orez", "taie"]))?.id).toBe("cuptor");
  });

  it("does the next free step while an earlier one waits", () => {
    const s = st(["preincalzire", "orez"], { preincalzire: startTimer(preheat, 10, 0) });
    expect(suggestedStep(timeline, s)?.id).toBe("taie");
  });

  it("returns null when everything is done", () => {
    expect(suggestedStep(timeline, st(timeline.map((j) => j.id)))).toBeNull();
  });

  it("adds minutes to a running timer and restarts a ringing one from now", () => {
    const t = startTimer(rice, 18, 0);
    expect(addMinutes(t, 2, 60_000).endsAt).toBe(20 * 60_000);
    const late = 25 * 60_000;
    expect(isRinging(t, late)).toBe(true);
    const more = addMinutes(t, 3, late);
    expect(more.endsAt).toBe(late + 3 * 60_000);
    expect(isRinging(more, late)).toBe(false);
  });

  it("reminds halfway only when the step asks for it", () => {
    const fries = job("af", { minutes: 20, activeMinutes: 1, units: ["airfryer#1"] }, { hint: "Scutură coșul la jumătate" });
    expect(startTimer(fries, 20, 0).halfAt).toBe(10 * 60_000);
    expect(startTimer(rice, 18, 0).halfAt).toBeNull();
  });
});
