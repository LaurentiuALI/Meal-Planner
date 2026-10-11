import { normalize, tokens } from "./text";

export type Candidate = { id: string; name: string; brand: string | null; inLibrary: boolean; uses?: number };

export type Ranked<C extends Candidate> = { candidate: C; score: number };

const STOPWORDS = new Set(["de", "cu", "si", "in", "la", "din", "pe", "fara", "pentru"]);

/**
 * Rădăcină aproximativă pentru română: taie vocalele finale și articolul,
 * ca „ouă”/„ou”, „cartofi”/„cartof”, „roșii”/„roșie” să ajungă la aceeași formă.
 */
export function stem(t: string): string {
  let s = t;
  if (s.length > 4) s = s.replace(/(ul|le|lor|ii)$/, "");
  return s.replace(/[aeiu]+$/, "") || s;
}

const words = (s: string) => tokens(s).filter((t) => !STOPWORDS.has(t));

/**
 * Scor: cât din cuvintele căutate apar în nume (exact > aceeași rădăcină > prefix),
 * minus cuvintele în plus din nume. Produsele tale și cele folosite des primesc un bonus mic,
 * suficient cât să câștige la egalitate.
 */
export function scoreName(query: string, c: Candidate): number {
  const q = words(query);
  if (q.length === 0) return 0;
  const name = words(`${c.name} ${c.brand ?? ""}`);
  const nameOnly = words(c.name);
  let hit = 0;
  for (const t of q) {
    if (name.includes(t)) hit += 1;
    else if (name.some((n) => stem(n) === stem(t))) hit += 0.9;
    else if (t.length >= 3 && name.some((n) => n.startsWith(t))) hit += 0.75;
  }
  if (hit === 0) return 0;
  let score = hit / q.length;
  score -= Math.min(0.4, Math.max(0, nameOnly.length - q.length) * 0.08);
  // Numele e exact ce ai căutat (până la plural/diacritice): „ouă” → „Ou”.
  if (nameOnly.length === q.length && nameOnly.every((n, i) => stem(n) === stem(q[i]))) score += 0.15;
  if (normalize(c.name).startsWith(normalize(query))) score += 0.1;
  if (c.inLibrary) score += 0.1;
  if (c.uses) score += Math.min(0.1, c.uses * 0.02);
  return score;
}

export function rank<C extends Candidate>(query: string, candidates: C[], limit = 8): Ranked<C>[] {
  const out: Ranked<C>[] = [];
  for (const candidate of candidates) {
    const score = scoreName(query, candidate);
    if (score > 0.4) out.push({ candidate, score });
  }
  return out.sort((a, b) => b.score - a.score || a.candidate.name.length - b.candidate.name.length).slice(0, limit);
}

/** Potrivirea e sigură doar dacă primul e aproape complet și clar mai bun decât al doilea. */
export function isConfident(ranked: Ranked<Candidate>[]): boolean {
  if (ranked.length === 0) return false;
  const [a, b] = ranked;
  return a.score >= 0.9 && (!b || a.score - b.score >= 0.08);
}
