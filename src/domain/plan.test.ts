import { describe, expect, it } from "vitest";
import { firstPick, rankForSlot, slotState } from "./plan";

const recipeIds = ["a", "b", "c", "d"];
const base = { recipeIds, lastUsed: new Map<string, string>(), lastWeek: new Set<string>(), seed: "2026-10-19" };
const meals = (recipeId: string, over: Partial<{ status: "planned" | "eaten"; pinned: Record<string, number> }> = {}) =>
  [1, 2, 3].map(() => ({ recipeId, status: "planned" as const, pinned: {}, ...over }));

describe("rankForSlot", () => {
  it("prefers recipes not used lately and puts last week's at the end", () => {
    const lastUsed = new Map([["a", "2026-10-01"], ["b", "2026-10-13"], ["c", "2026-09-20"]]);
    expect(rankForSlot({ ...base, lastUsed, lastWeek: new Set(["b"]) })).toEqual(["d", "c", "a", "b"]);
  });

  it("does not order ties alphabetically", () => {
    const firsts = new Set(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"].map((seed) => rankForSlot({ ...base, seed })[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });
});

describe("slotState / firstPick", () => {
  it("starts an empty slot with the first candidate", () => {
    expect(firstPick(recipeIds, slotState([]))).toBe(0);
  });

  it("moves past an untouched proposal, so every press gives something else", () => {
    const state = slotState(meals("b"));
    expect(state).toEqual({ recipeId: "b", locked: false });
    expect(firstPick(recipeIds, state)).toBe(2);
    expect(firstPick(recipeIds, slotState(meals("d")))).toBe(0);
  });

  it("keeps a slot you changed on what you chose", () => {
    expect(slotState(meals("a", { status: "eaten" })).locked).toBe(true);
    expect(slotState(meals("a", { pinned: { l1: 120 } })).locked).toBe(true);
    expect(slotState([...meals("a").slice(0, 2), { recipeId: "b", status: "planned", pinned: {} }]).locked).toBe(true);
    expect(firstPick(recipeIds, slotState(meals("c", { status: "eaten" })))).toBe(2);
  });

  it("has nothing to pick without recipes", () => {
    expect(firstPick([], slotState([]))).toBe(-1);
  });
});
