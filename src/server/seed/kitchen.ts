import type { Action, Equipment } from "@/domain/types";

/**
 * Bucătăria ta, așa cum ai descris-o. Capacitățile sunt în grame de ingrediente crude per tură;
 * cele marcate „estimat” vin din reguli generale, nu din manual, și se pot modifica din aplicație.
 */
export const EQUIPMENT: Equipment[] = [
  { id: "aragaz", name: "Ochi aragaz", kind: "plita", count: 4, capacityG: null },
  { id: "cuptor", name: "Cuptor Electrolux (ventilator)", kind: "cuptor", count: 1, capacityG: null },
  // Manualul Tefal EY501: 300–800g cartofi, 700g optim; 100–500g piept de pui.
  { id: "airfryer", name: "Airfryer Tefal Easy Fry & Grill 4,2L", kind: "airfryer", count: 1, capacityG: 700 },
  { id: "cratita-16", name: "Cratiță Ingenio 16cm", kind: "vas", count: 1, capacityG: 1400 },
  { id: "cratita-20", name: "Cratiță Ingenio 20cm", kind: "vas", count: 1, capacityG: 2500 },
  { id: "saute-24", name: "Sauté Ingenio 24cm", kind: "vas", count: 1, capacityG: 2500 },
  { id: "tigaie-28", name: "Tigaie Ingenio 28cm", kind: "vas", count: 1, capacityG: 1200 },
  { id: "vas-ceramic", name: "Vas ceramic mic (cuptor)", kind: "vas-cuptor", count: 2, capacityG: 500 },
  { id: "jena", name: "Jena mare (cuptor)", kind: "vas-cuptor", count: 1, capacityG: 1500 },
  { id: "sandwich-maker", name: "Sandwich maker (normal, triunghi, vafe)", kind: "aparat", count: 1, capacityG: 250 },
  { id: "blender", name: "Blender", kind: "aparat", count: 1, capacityG: 1000 },
  { id: "microunde", name: "Cuptor cu microunde", kind: "aparat", count: 1, capacityG: 600 },
];

// Capacitățile vaselor sunt de volum (tocănițe, fierturi); limitele de rumenire stau pe acțiuni.
const STOVE = ["aragaz"];
const PANS = ["tigaie-28", "saute-24"];
const POTS = ["cratita-20", "cratita-16", "saute-24"];
const OVEN_DISH = ["jena", "vas-ceramic"];

type Defaults = "perKgMinutes" | "tempC" | "capacityG" | "hint" | "perBatch" | "mergeable" | "loadFactor" | "alternatives";
type A = Omit<Action, Defaults> & Partial<Pick<Action, Defaults>>;

const act = (a: A): Action => ({
  perKgMinutes: 0,
  tempC: null,
  capacityG: null,
  loadFactor: 1,
  alternatives: [],
  hint: null,
  perBatch: false,
  mergeable: true,
  ...a,
});

export const ACTIONS: Action[] = [
  // Pregătire (doar tu, fără ustensile limitate)
  act({ id: "taie-legume", name: "Taie legumele", equipment: [], minutes: 3, activeMinutes: 3, perKgMinutes: 8 }),
  act({ id: "taie-ceapa", name: "Toacă ceapa / usturoiul", equipment: [], minutes: 2, activeMinutes: 2, perKgMinutes: 12 }),
  act({ id: "curata-cartofi", name: "Curăță și taie cartofii", equipment: [], minutes: 3, activeMinutes: 3, perKgMinutes: 7 }),
  act({ id: "taie-carne", name: "Taie carnea cuburi / fâșii", equipment: [], minutes: 2, activeMinutes: 2, perKgMinutes: 6 }),
  act({ id: "condimenteaza", name: "Condimentează / marinează", equipment: [], minutes: 2, activeMinutes: 2, perKgMinutes: 1, mergeable: false }),
  act({ id: "amesteca", name: "Amestecă într-un bol", equipment: [], minutes: 2, activeMinutes: 2, perKgMinutes: 1, mergeable: false }),
  act({ id: "asambleaza", name: "Asamblează (fără gătit)", equipment: [], minutes: 3, activeMinutes: 3, mergeable: false }),

  // Airfryer
  act({ id: "af-cartofi", name: "Airfryer · cartofi cuburi / wedges", equipment: [["airfryer"]], alternatives: ["cuptor-cartofi"], minutes: 20, activeMinutes: 1, tempC: 200, perBatch: true, hint: "Scutură coșul la jumătate" }),
  act({ id: "af-cartof-dulce", name: "Airfryer · cartof dulce cuburi", equipment: [["airfryer"]], alternatives: ["cuptor-cartofi"], minutes: 18, activeMinutes: 1, tempC: 200, perBatch: true, hint: "Scutură coșul la jumătate" }),
  act({ id: "af-congelate", name: "Airfryer · cartofi / legume congelate", equipment: [["airfryer"]], alternatives: ["cuptor-legume"], minutes: 16, activeMinutes: 1, tempC: 200, perBatch: true, hint: "Scutură coșul la jumătate" }),
  act({ id: "af-legume", name: "Airfryer · legume (broccoli, ardei, dovlecel)", equipment: [["airfryer"]], alternatives: ["cuptor-legume", "soteaza-legume"], minutes: 12, activeMinutes: 1, tempC: 190, perBatch: true, hint: "Scutură coșul la jumătate" }),
  act({ id: "af-pui", name: "Airfryer · piept / pulpe de pui", equipment: [["airfryer"]], alternatives: ["tigaie-pui", "cuptor-pui"], minutes: 16, activeMinutes: 1, tempC: 190, capacityG: 500, perBatch: true, hint: "Întoarce la jumătate" }),
  act({ id: "af-peste", name: "Airfryer · pește", equipment: [["airfryer"]], minutes: 10, activeMinutes: 1, tempC: 190, capacityG: 500, perBatch: true }),
  act({ id: "af-chiftele", name: "Airfryer · chiftele / burgeri", equipment: [["airfryer"]], alternatives: ["cuptor-pui"], minutes: 12, activeMinutes: 1, tempC: 190, capacityG: 600, perBatch: true, hint: "Întoarce la jumătate" }),

  // Cuptor
  act({ id: "cuptor-legume", name: "Cuptor · legume la tavă", equipment: [["cuptor"], OVEN_DISH], alternatives: ["af-legume"], minutes: 30, activeMinutes: 2, tempC: 200 }),
  act({ id: "cuptor-cartofi", name: "Cuptor · cartofi la tavă", equipment: [["cuptor"], OVEN_DISH], alternatives: ["af-cartofi"], minutes: 40, activeMinutes: 2, tempC: 200 }),
  act({ id: "cuptor-pui", name: "Cuptor · pui / chiftele la tavă", equipment: [["cuptor"], OVEN_DISH], alternatives: ["af-pui", "tigaie-pui"], minutes: 30, activeMinutes: 2, tempC: 200 }),
  act({ id: "cuptor-gratinat", name: "Cuptor · gratinat / caserolă", equipment: [["cuptor"], OVEN_DISH], minutes: 25, activeMinutes: 1, tempC: 180, mergeable: false }),
  act({ id: "cuptor-copt", name: "Cuptor · brioșe / frittata / prăjitură", equipment: [["cuptor"], OVEN_DISH], minutes: 22, activeMinutes: 1, tempC: 180, mergeable: false }),

  // Aragaz
  act({ id: "fierbe-orez", name: "Fierbe orezul", equipment: [POTS, STOVE], loadFactor: 3, minutes: 18, activeMinutes: 1, hint: "1 parte orez, 2 părți apă, capac, foc mic" }),
  act({ id: "fierbe-paste", name: "Fierbe pastele", equipment: [["cratita-20", "saute-24"], STOVE], loadFactor: 4, minutes: 14, activeMinutes: 2 }),
  act({ id: "fierbe-cereale", name: "Fierbe quinoa / bulgur / linte", equipment: [POTS, STOVE], loadFactor: 3, minutes: 15, activeMinutes: 1 }),
  act({ id: "fierbe-cartofi", name: "Fierbe cartofii", equipment: [["cratita-20", "saute-24"], STOVE], loadFactor: 2, minutes: 20, activeMinutes: 1 }),
  act({ id: "fierbe-oua", name: "Fierbe ouăle", equipment: [["cratita-16", "cratita-20"], STOVE], loadFactor: 3, minutes: 10, activeMinutes: 1, hint: "10 minute pentru tari, apoi apă rece" }),
  act({ id: "fierbe-legume", name: "Fierbe legumele (apă / abur)", equipment: [POTS, STOVE], loadFactor: 2, minutes: 8, activeMinutes: 1 }),
  act({ id: "caleste-ceapa", name: "Călește ceapa / usturoiul", equipment: [PANS, STOVE], minutes: 5, activeMinutes: 3, mergeable: false }),
  act({ id: "rumeneste-tocata", name: "Rumenește carnea tocată", equipment: [PANS, STOVE], minutes: 9, activeMinutes: 6, capacityG: 800, perBatch: true }),
  act({ id: "tigaie-pui", name: "Tigaie · pui cuburi / fâșii", equipment: [PANS, STOVE], alternatives: ["af-pui", "cuptor-pui"], minutes: 10, activeMinutes: 5, capacityG: 600, perBatch: true }),
  act({ id: "soteaza-legume", name: "Sotează legumele", equipment: [PANS, STOVE], alternatives: ["af-legume"], minutes: 7, activeMinutes: 4, capacityG: 600, perBatch: true }),
  act({ id: "fierbe-sos", name: "Fierbe la foc mic (sos / tocăniță)", equipment: [["saute-24", "cratita-20"], STOVE], minutes: 20, activeMinutes: 2, mergeable: false }),
  act({ id: "omleta", name: "Tigaie · omletă / jumări", equipment: [PANS, STOVE], minutes: 5, activeMinutes: 5, mergeable: false }),
  act({ id: "clatite", name: "Tigaie · clătite", equipment: [PANS, STOVE], minutes: 15, activeMinutes: 15, mergeable: false }),

  // Aparate
  act({ id: "sandwich", name: "Sandwich maker · sandwich / vafe", equipment: [["sandwich-maker"]], minutes: 5, activeMinutes: 1, perBatch: true, mergeable: false }),
  act({ id: "blender", name: "Blender · mixează", equipment: [["blender"]], minutes: 2, activeMinutes: 2, mergeable: false }),
  act({ id: "microunde", name: "Microunde", equipment: [["microunde"]], minutes: 3, activeMinutes: 0, mergeable: false }),
];
