import { canonicalUnit } from "./units";
import { normalize, tokens } from "./text";

export type ParsedLine = {
  raw: string;
  amount: number | null;
  unit: string | null;
  query: string;
};

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

function parseNumber(s: string): number | null {
  if (FRACTIONS[s] != null) return FRACTIONS[s];
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?|\d+\/\d+|[½¼¾⅓⅔])`;
const UNIT = String.raw`([a-zA-ZăâîșşțţĂÂÎȘŞȚŢ]+\.?)`;
const LEADING = new RegExp(String.raw`^${NUM}\s*${UNIT}?\s+(.+)$`);
const GLUED = new RegExp(String.raw`^${NUM}${UNIT}\s*(.*)$`);
const TRAILING = new RegExp(String.raw`^(.+?)\s+${NUM}\s*${UNIT}?$`);

/** Ce nu e unitate dar apare des între cantitate și ingredient. */
const FILLER = new Set(["de", "x"]);

export function parseLine(raw: string): ParsedLine | null {
  const line = raw.replace(/^[\s*•\-–]+/, "").trim();
  if (!line) return null;

  for (const re of [GLUED, LEADING]) {
    const m = line.match(re);
    if (!m) continue;
    const amount = parseNumber(m[1]);
    // „150 de grame de orez”: sărim peste umplutură, luăm unitatea dacă e una, apoi restul e ingredientul.
    const words = [m[2], ...m[3].split(/\s+/)].filter(Boolean).map((w) => w.replace(/\.$/, ""));
    const skipFiller = () => {
      while (words.length > 1 && FILLER.has(normalize(words[0]))) words.shift();
    };
    skipFiller();
    const unit = words.length > 1 ? canonicalUnit(words[0]) : null;
    if (unit) words.shift();
    skipFiller();
    const query = words.join(" ");
    if (amount != null && query) return { raw, amount, unit: unit ?? defaultUnit(amount), query };
  }

  const t = line.match(TRAILING);
  if (t) {
    const amount = parseNumber(t[2]);
    const unit = t[3] ? canonicalUnit(t[3].replace(/\.$/, "")) : null;
    if (amount != null && (unit || !t[3])) return { raw, amount, unit: unit ?? defaultUnit(amount), query: t[1] };
  }

  // Fără cantitate („sare”, „piper după gust”): îl păstrăm, cu cantitate necunoscută.
  return { raw, amount: null, unit: null, query: line.replace(/\b(dupa|după) gust\b/i, "").trim() };
}

/** „2 ouă” înseamnă bucăți; „300 piept” înseamnă grame. */
function defaultUnit(amount: number) {
  return amount < 20 && Number.isInteger(amount) ? "bucată" : "g";
}

export function parseLines(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map(parseLine)
    .filter((l): l is ParsedLine => l != null && tokens(l.query).length > 0);
}
