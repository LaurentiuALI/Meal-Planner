import { describe, expect, it } from "vitest";
import { buildLexicon, isForeignName } from "./language";

const lex = buildLexicon(["Pilos Iaurt natur", "Carne tocata de porc", "Piept de pui", "Chips cu sare", "Ton in ulei", "Fasole rosie"]);

describe("isForeignName", () => {
  it.each(["Chips de légumes", "Bio Kokonuss mit Reis", "Ground Pork", "Tuna shredded", "Boulettes de bœuf", "Salsiccia al Finocchio"])(
    "flags %s",
    (name) => expect(isForeignName(name, lex)).toBe(true),
  );

  it.each(["Iaurt 3,5 % Grăsime", "Crenvursti Din Piept De Pui Extra", "Lapte bătut 1%", "Chips cu sare de mare", "Fusilli", "Coke", "Galactic"])(
    "keeps %s",
    (name) => expect(isForeignName(name, lex)).toBe(false),
  );
});
