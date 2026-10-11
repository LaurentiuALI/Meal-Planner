/** Litere mici, fără diacritice (inclusiv ş/ţ cu sedilă), spații comprimate. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  return normalize(s)
    .split(/[\s,.-]+/)
    .filter((t) => t.length > 1 || /\d/.test(t));
}
