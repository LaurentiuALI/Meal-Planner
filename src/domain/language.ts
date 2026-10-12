/**
 * Recunoaște numele de produse scrise în altă limbă decât româna (Open Food Facts are multe
 * produse vândute în România dar introduse în franceză, germană, engleză...).
 *
 * Comparăm cuvintele cu un lexicon românesc (de ex. numele din fișierul Lidl RO și produsele
 * generice) și cu cuvinte/litere tipice altor limbi. Un nume fără niciun semn (doar marcă:
 * „Coke”, „Galactic”) nu e considerat străin.
 */

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const nameWords = (s: string) => strip(s).split(/[^a-z]+/).filter((w) => w.length >= 2);

const FOREIGN_WORDS = new Set(
  [
    // franceză
    "au aux avec et des du le les fromage poulet lait sucre chocolat farine beurre huile oeufs jambon pomme pommes legumes",
    "fraise fraises boeuf porc riz pain gateau biscuits sec seche sechees sucrees nature fleurettes choux",
    // germană
    "und mit fur ohne vom von zum zur im am auf aus der die das ein eine kase milch huhn brot zucker schokolade wurst",
    "fleisch nudeln reis apfel tomaten frisch vollkorn kokonuss",
    // italiană, spaniolă, portugheză
    "di con della dello alla al del y el los las agua leche pollo queso biscoito",
    // poloneză, cehă, maghiară
    "ze na sa za bez od mleko ser maslo chleb sok szynka kielbasa cukier masla olej woda jablko",
    // engleză
    "the with of ground pork beef chicken chickpea chickpeas tuna dates cream cheese bread fries curly peanuts roasted",
    "salted sweet sour flat shredded yogurt yogourt greek truffles coconut milk juice water rice oats nuts almonds",
    "cashews honey jam spread wholegrain wheat flour sugar free sliced smoked",
  ]
    .join(" ")
    .split(" "),
);

const FOREIGN_LETTERS = /[äöüßéèêëàçñłżźśńőűøåæœìòùąęý]/i;
const ROMANIAN_LETTERS = /[ăâîșşțţ]/i;

export function isForeignName(name: string, lexicon: Set<string>): boolean {
  const ws = nameWords(name);
  const foreign = ws.filter((w) => FOREIGN_WORDS.has(w)).length + (FOREIGN_LETTERS.test(name) ? 2 : 0);
  const romanian = ws.filter((w) => lexicon.has(w) && !FOREIGN_WORDS.has(w)).length + (ROMANIAN_LETTERS.test(name) ? 2 : 0);
  return foreign > romanian;
}

/** Lexiconul din numele românești cunoscute (fișierul Lidl, produse generice, ale tale). */
export function buildLexicon(names: Iterable<string>): Set<string> {
  const lex = new Set<string>();
  for (const n of names) for (const w of nameWords(n)) lex.add(w);
  return lex;
}
