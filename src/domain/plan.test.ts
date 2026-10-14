import { describe, expect, it } from "vitest";
import { proposeForSlot } from "./plan";

const recipeIds = ["a", "b", "c", "d"];
const base = { recipeIds, lastUsed: new Map<string, string>(), lastWeek: new Set<string>(), seed: "2026-10-19" };
const meals = (recipeId: string, over: Partial<{ status: "planned" | "eaten"; pinned: Record<string, number> }> = {}) =>
  [1, 2, 3].map((i) => ({ id: `m${i}`, recipeId, status: "planned" as const, pinned: {}, ...over }));

describe("proposeForSlot", () => {
  it("gives a different recipe on every press, cycling through the pool", () => {
    const seen: string[] = [];
    let current: ReturnType<typeof meals> = [];
    for (let i = 0; i < 4; i++) {
      const p = proposeForSlot({ ...base, current })!;
      seen.push(p.pick);
      current = meals(p.pick);
    }
    expect(new Set(seen).size).toBe(4);
  });

  it("prefers recipes not used lately and skips last week's", () => {
    const lastUsed = new Map([["a", "2026-10-01"], ["b", "2026-10-13"], ["c", "2026-09-20"]]);
    const p = proposeForSlot({ ...base, lastUsed, lastWeek: new Set(["b"]), current: [] })!;
    expect(p.pick).toBe("d"); // nefolosită deloc
    const next = proposeForSlot({ ...base, lastUsed, lastWeek: new Set(["b"]), current: meals("d") })!;
    expect(next.pick).toBe("c");
    expect(next.replace).toEqual(["m1", "m2", "m3"]);
  });

  it("leaves a slot you changed alone", () => {
    expect(proposeForSlot({ ...base, current: meals("a", { status: "eaten" }) })).toBeNull();
    expect(proposeForSlot({ ...base, current: meals("a", { pinned: { l1: 120 } }) })).toBeNull();
    expect(proposeForSlot({ ...base, current: [...meals("a").slice(0, 2), { id: "m3", recipeId: "b", status: "planned", pinned: {} }] })).toBeNull();
  });

  it("does not order ties alphabetically", () => {
    const picks = new Set(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"].map((seed) => proposeForSlot({ ...base, seed, current: [] })!.pick));
    expect(picks.size).toBeGreaterThan(1);
  });
});
