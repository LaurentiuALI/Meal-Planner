import { describe, expect, it } from "vitest";
import { tasteNotes } from "./taste";

describe("tasteNotes", () => {
  it("turns spices and oil into instructions and skips weighed food", () => {
    expect(
      tasteNotes([
        { name: "Piept de pui", toTaste: null },
        { name: "Sare", toTaste: "condiment" },
        { name: "Boia dulce", toTaste: "condiment" },
        { name: "Sare", toTaste: "condiment" },
        { name: "Ulei de măsline", toTaste: "ulei" },
      ]),
    ).toEqual(["Condimentează: sare, boia dulce", "Puțin ulei de măsline"]);
  });

  it("says nothing when everything is weighed", () => {
    expect(tasteNotes([{ name: "Orez" }])).toEqual([]);
  });
});
