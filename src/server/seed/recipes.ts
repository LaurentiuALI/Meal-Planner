import type { RecipeCategory } from "@/domain/types";

/**
 * Rețetele prestabilite, toate pentru O porție (planul le înmulțește).
 * Ingredientele se referă prin cheie: numele unui aliment generic, `legacy:<nume>` sau `off:<cod de bare>`.
 * `flex` = intervalul în grame în care solverul are voie să ajusteze linia.
 */
export type SeedLine = [key: string, amount: number, unit?: string, flex?: [number, number]];
export type SeedStep = { action: string | null; text: string; lines?: SeedLine[]; minutes?: number };
export type SeedRecipe = {
  /** Id-ul de dinainte de redenumire, ca seed-ul (rulat la fiecare pornire) să nu dubleze rețeta. */
  key?: string;
  name: string;
  category: RecipeCategory;
  freezes?: boolean;
  keepsDays?: number;
  notes?: string;
  steps: SeedStep[];
};

/** Porții pentru produsele din catalog care nu le au în OpenFoodFacts. */
export const OFF_PORTIONS: Record<string, { name: string; grams: number }[]> = {
  "4056489165149": [{ name: "felie", grams: 30 }],
  "2504448004609": [{ name: "felie", grams: 15 }],
  "4056489195917": [{ name: "lingură", grams: 8 }],
};

const PUI_AF = "Condimentează cu sare, boia și usturoi granulat.";

export const PRESET_RECIPES: SeedRecipe[] = [
  // ───────────── Prânz (birou, se încălzește la microunde) ─────────────
  {
    name: "Bowl de pui cu orez și broccoli",
    category: "pranz",
    keepsDays: 4,
    notes: "Clasicul de meal prep. Sosul de soia îl poți ține separat și îl pui la încălzire.",
    steps: [
      { action: "taie-carne", text: "Taie pieptul de pui cuburi.", lines: [["Piept de pui", 200, "g", [150, 260]]] },
      { action: "condimenteaza", text: PUI_AF, lines: [["Sare", 1, "g"], ["Boia dulce", 2, "g"], ["Usturoi granulat", 2, "g"], ["Ulei de măsline", 5, "g"]] },
      { action: "af-pui", text: "Puiul la airfryer." },
      { action: "fierbe-orez", text: "Fierbe orezul.", lines: [["Orez alb bob lung", 90, "g", [50, 150]]] },
      { action: "af-congelate", text: "Broccoli congelat la airfryer, cu puțin ulei.", lines: [["Broccoli congelat", 200, "g"], ["Ulei de măsline", 5, "g"]] },
      { action: "asambleaza", text: "Împarte în caserole și stropește cu sos de soia.", lines: [["Sos de soia", 15, "g"]] },
    ],
  },
  {
    name: "Chili con carne cu orez",
    category: "pranz",
    freezes: true,
    keepsDays: 4,
    notes: "Se congelează foarte bine; e varianta bună pentru săptămânile aglomerate.",
    steps: [
      { action: "taie-legume", text: "Toacă ceapa și ardeiul.", lines: [["Ceapă", 80, "g"], ["Ardei gras roșu", 100, "g"]] },
      { action: "caleste-ceapa", text: "Călește ceapa și ardeiul în ulei.", lines: [["Ulei de floarea-soarelui", 5, "g"]] },
      { action: "rumeneste-tocata", text: "Adaugă carnea și rumenește-o.", lines: [["Carne tocată de vită 90/10", 180, "g", [140, 220]]] },
      {
        action: "fierbe-sos",
        text: "Adaugă roșiile, fasolea, porumbul și condimentele; fierbe la foc mic.",
        lines: [
          ["Roșii tocate (conservă)", 200, "g"],
          ["Fasole roșie conservă (scursă)", 120, "g"],
          ["Porumb conservă (scurs)", 50, "g"],
          ["Chimen", 2, "g"],
          ["Boia dulce", 3, "g"],
          ["Chili praf", 1, "g"],
          ["Sare", 2, "g"],
        ],
      },
      { action: "fierbe-orez", text: "Fierbe orezul.", lines: [["Orez alb bob lung", 70, "g", [40, 130]]] },
    ],
  },
  {
    key: "paste-cu-curcan-tocat-si-dovlecel",
    name: "Paste cu pui tocat și dovlecel",
    category: "pranz",
    freezes: true,
    keepsDays: 4,
    steps: [
      { action: "taie-legume", text: "Toacă ceapa, usturoiul și dovlecelul cuburi.", lines: [["Ceapă", 60, "g"], ["Usturoi", 1, "cățel"], ["Dovlecel", 150, "g"]] },
      { action: "rumeneste-tocata", text: "Rumenește carnea tocată cu ceapa și usturoiul.", lines: [["Carne tocată de pui", 180, "g", [140, 230]], ["Ulei de măsline", 5, "g"]] },
      { action: "fierbe-sos", text: "Adaugă dovlecelul, passata și oregano; fierbe 15 minute.", lines: [["Passata / sos de roșii", 200, "g"], ["Oregano uscat", 1, "g"], ["Sare", 2, "g"]] },
      { action: "fierbe-paste", text: "Fierbe pastele al dente și amestecă-le cu sosul.", lines: [["Paste", 100, "g", [60, 150]]] },
      { action: "asambleaza", text: "Presară parmezan în caserole.", lines: [["Parmezan ras", 10, "g"]] },
    ],
  },
  {
    name: "Pulpe de pui cu cartof dulce și fasole verde",
    category: "pranz",
    keepsDays: 4,
    notes: "Tot la airfryer: puiul și cartoful dulce în ture, fasolea fiartă între timp.",
    steps: [
      { action: "curata-cartofi", text: "Curăță cartoful dulce și taie-l cuburi.", lines: [["Cartof dulce", 330, "g", [200, 450]]] },
      { action: "af-cartof-dulce", text: "Cartoful dulce la airfryer cu ulei.", lines: [["Ulei de măsline", 5, "g"]] },
      { action: "condimenteaza", text: PUI_AF, lines: [["Pulpe de pui dezosate, fără piele", 220, "g", [170, 280]], ["Boia dulce", 2, "g"], ["Usturoi granulat", 2, "g"], ["Sare", 1, "g"]] },
      { action: "af-pui", text: "Pulpele la airfryer." },
      { action: "fierbe-legume", text: "Fierbe fasolea verde 8 minute.", lines: [["Fasole verde congelată", 150, "g"]] },
    ],
  },
  {
    key: "curry-de-pui-cu-linte-rosie-si-orez",
    name: "Curry de pui cu năut și orez",
    category: "pranz",
    freezes: true,
    keepsDays: 4,
    steps: [
      { action: "taie-legume", text: "Toacă ceapa și taie puiul cuburi.", lines: [["Ceapă", 60, "g"], ["Piept de pui", 170, "g", [130, 220]]] },
      { action: "tigaie-pui", text: "Rumenește puiul și ceapa cu curry și turmeric.", lines: [["Ulei de floarea-soarelui", 8, "g"], ["Curry", 4, "g"], ["Turmeric", 1, "g"], ["Usturoi granulat", 2, "g"]] },
      {
        action: "fierbe-sos",
        text: "Adaugă roșiile, năutul scurs, spanacul și 50 ml apă; fierbe 10 minute.",
        lines: [["Roșii tocate (conservă)", 150, "g"], ["Năut conservă (scurs)", 100, "g"], ["Spanac congelat", 100, "g"], ["Sare", 2, "g"]],
      },
      { action: "asambleaza", text: "Stinge focul și amestecă iaurtul.", lines: [["off:4056489683759", 50, "g"]] },
      { action: "fierbe-orez", text: "Fierbe orezul.", lines: [["Orez alb bob lung", 70, "g", [40, 130]]] },
    ],
  },

  // ───────────── Cină (mare, sățioasă, multe legume) ─────────────
  {
    name: "Burger bowl cu cartofi la airfryer",
    category: "cina",
    keepsDays: 3,
    notes: "Salata se ține separat și se pune după ce încălzești carnea și cartofii. Iaurtul vine în cutia lui, neîncălzit.",
    steps: [
      { action: "curata-cartofi", text: "Taie cartofii wedges (cu coajă).", lines: [["Cartofi albi", 500, "g", [300, 700]]] },
      { action: "af-cartofi", text: "Cartofii la airfryer cu ulei și sare.", lines: [["Ulei de floarea-soarelui", 6, "g"], ["Sare", 1, "g"]] },
      { action: "rumeneste-tocata", text: "Rumenește carnea cu sare și piper.", lines: [["Carne tocată de vită 90/10", 200, "g", [150, 240]], ["Piper negru", 0.5, "g"]] },
      {
        action: "taie-legume",
        text: "Taie salata, roșiile și ceapa roșie.",
        lines: [["Salată iceberg", 100, "g"], ["Roșii", 100, "g"], ["legacy:Ceapa Rosie", 30, "g"]],
      },
      { action: "asambleaza", text: "Pune feliile de brânză peste carnea caldă.", lines: [["legacy:High Protein Mature Cheese slices - Milbona (Lidl)", 1, "felie"]] },
      { action: "asambleaza", text: "Separat, lângă caserolă: o cutie de iaurt grecesc. Nu-l încălzi.", lines: [["off:4056489683759", 100, "g"]] },
    ],
  },
  {
    name: "Tavă de pui cu cartofi și legume la cuptor",
    category: "cina",
    keepsDays: 4,
    notes: "Un singur vas pe porție, zero atenție cât stă în cuptor.",
    steps: [
      { action: "curata-cartofi", text: "Taie cartofii cuburi.", lines: [["Cartofi albi", 450, "g", [250, 650]]] },
      { action: "taie-legume", text: "Taie ardeiul, ceapa și dovlecelul.", lines: [["Ardei gras roșu", 150, "g"], ["Ceapă", 100, "g"], ["Dovlecel", 150, "g"]] },
      {
        action: "condimenteaza",
        text: "Amestecă totul în vas cu puiul, uleiul și condimentele.",
        lines: [["Pulpe de pui dezosate, fără piele", 250, "g", [200, 300]], ["Ulei de măsline", 12, "g"], ["Boia dulce", 3, "g"], ["Rozmarin uscat", 1, "g"], ["Sare", 2, "g"]],
      },
      { action: "cuptor-cartofi", text: "La cuptor, amestecă o dată la jumătate." },
    ],
  },
  {
    name: "Orez prăjit cu pui, legume și ou",
    category: "cina",
    keepsDays: 3,
    steps: [
      { action: "fierbe-orez", text: "Fierbe orezul (ideal cu o zi înainte, dar merge și cald).", lines: [["Orez alb bob lung", 100, "g", [60, 160]]] },
      { action: "taie-carne", text: "Taie puiul cuburi mici.", lines: [["Piept de pui", 180, "g", [140, 230]]] },
      { action: "tigaie-pui", text: "Rumenește puiul.", lines: [["Ulei de floarea-soarelui", 5, "g"]] },
      { action: "soteaza-legume", text: "Sotează legumele congelate, apoi adaugă orezul.", lines: [["Mix de legume congelate", 250, "g"], ["Ulei de floarea-soarelui", 5, "g"]] },
      { action: "omleta", text: "Împinge orezul pe margine, sparge ouăle, amestecă; stinge cu sos de soia.", lines: [["Ou", 2, "bucată"], ["Sos de soia", 20, "g"], ["Ceapă verde", 1, "bucată"]] },
    ],
  },
  {
    key: "chiftele-de-curcan-cu-piure-si-salata-de-varza",
    name: "Chiftele de pui cu piure și salată de varză",
    category: "cina",
    freezes: true,
    keepsDays: 4,
    steps: [
      {
        action: "amesteca",
        text: "Amestecă carnea cu oul, ovăzul, ceapa și condimentele; formează chiftele.",
        lines: [["Carne tocată de pui", 220, "g", [170, 270]], ["Ou", 20, "g"], ["Fulgi de ovăz", 15, "g"], ["Ceapă", 30, "g"], ["Usturoi granulat", 2, "g"], ["Sare", 1.5, "g"]],
      },
      { action: "af-chiftele", text: "Chiftelele la airfryer." },
      { action: "curata-cartofi", text: "Curăță cartofii.", lines: [["Cartofi albi", 450, "g", [250, 650]]] },
      { action: "fierbe-cartofi", text: "Fierbe cartofii, apoi pasează-i cu lapte și unt.", lines: [["Lapte semidegresat 2%", 60, "g"], ["Unt", 8, "g"], ["Sare", 1, "g"]] },
      { action: "taie-legume", text: "Taie varza fideluță, frec-o cu sare, oțet, ulei și mărar.", lines: [["Varză albă", 150, "g"], ["Oțet de mere", 10, "g"], ["Ulei de floarea-soarelui", 5, "g"], ["Mărar proaspăt", 5, "g"]] },
    ],
  },
  {
    name: "Somon cu cartof dulce și broccoli",
    category: "cina",
    keepsDays: 2,
    notes: "Peștele se ține 2 zile; pune-l în primele zile din bloc.",
    steps: [
      { action: "curata-cartofi", text: "Taie cartoful dulce cuburi.", lines: [["Cartof dulce", 400, "g", [250, 550]]] },
      { action: "af-cartof-dulce", text: "Cartoful dulce la airfryer.", lines: [["Ulei de măsline", 5, "g"]] },
      { action: "af-peste", text: "Somonul la airfryer, cu sare și lămâie.", lines: [["Somon", 170, "g", [140, 210]], ["Lămâie", 20, "g"], ["Sare", 1, "g"]] },
      { action: "af-congelate", text: "Broccoli la airfryer.", lines: [["Broccoli congelat", 250, "g"]] },
    ],
  },

  // ───────────── Gustări ─────────────
  {
    name: "Brioșe cu ouă, șuncă de curcan și legume",
    category: "gustare",
    keepsDays: 4,
    notes: "Se gătesc duminică în vasele ceramice; se mănâncă reci sau încălzite 30 de secunde.",
    steps: [
      { action: "taie-legume", text: "Taie ardeiul și șunca mărunt.", lines: [["Ardei gras roșu", 40, "g"], ["off:2504448004609", 50, "g"]] },
      { action: "amesteca", text: "Bate ouăle cu albușurile, spanacul, cașcavalul și sare.", lines: [["Ou", 2, "bucată"], ["Albuș de ou", 2, "bucată"], ["Spanac congelat", 50, "g"], ["Cașcaval (tip gouda)", 15, "g"], ["Sare", 0.5, "g"]] },
      { action: "cuptor-copt", text: "Toarnă în vasele ceramice unse și coace." },
      { action: "asambleaza", text: "Cu o felie de pâine integrală.", lines: [["off:4056489165149", 1, "felie", [0, 90]]] },
    ],
  },
  {
    name: "Clătite proteice cu ovăz și banană",
    category: "gustare",
    keepsDays: 3,
    steps: [
      { action: "blender", text: "Mixează ovăzul, oul, albușurile, banana, brânza și scorțișoara.", lines: [["off:4056489195917", 50, "g", [30, 80]], ["Ou", 1, "bucată"], ["Albuș de ou", 2, "bucată"], ["Banană", 60, "g"], ["Brânză de vaci 2%", 80, "g"], ["Scorțișoară", 1, "g"]] },
      { action: "clatite", text: "Coace clătitele în tigaia de 28, cu foarte puțin ulei.", lines: [["Ulei de floarea-soarelui", 3, "g"]] },
    ],
  },
  {
    key: "bol-de-iaurt-grecesc-cu-ovaz-si-afine",
    name: "Bol de iaurt cu ovăz și afine",
    category: "gustare",
    keepsDays: 2,
    notes: "Fără gătit. Merge pus seara în caserolă (overnight oats).",
    steps: [
      {
        action: "asambleaza",
        text: "Pune totul într-un bol sau într-o caserolă.",
        lines: [["off:4056489683759", 250, "g", [200, 350]], ["off:4056489195917", 40, "g", [20, 70]], ["legacy:Afine de Cultura camara noastra", 80, "g"], ["Miere", 10, "g"], ["Semințe de chia", 10, "g"]],
      },
    ],
  },
  {
    name: "Sandwich proteic la sandwich maker",
    category: "gustare",
    keepsDays: 1,
    notes: "Se face pe loc, în 5 minute.",
    steps: [
      {
        action: "sandwich",
        text: "Pâine, muștar, șuncă, brânză, roșie; în sandwich maker până se rumenește.",
        lines: [["off:4056489165149", 2, "felie", [30, 90]], ["off:2504448004609", 60, "g", [40, 100]], ["legacy:High Protein Mature Cheese slices - Milbona (Lidl)", 1, "felie"], ["Roșii", 50, "g"], ["Muștar", 5, "g"]],
      },
    ],
  },

  // ───────────── Rapid (joi-vineri, sub 30 de minute) ─────────────
  {
    name: "Omletă mare cu ciuperci, spanac și pâine",
    category: "rapid",
    keepsDays: 1,
    steps: [
      { action: "taie-legume", text: "Taie ciupercile.", lines: [["Ciuperci champignon", 100, "g"]] },
      { action: "soteaza-legume", text: "Sotează ciupercile și spanacul.", lines: [["Spanac proaspăt", 60, "g"], ["Ulei de măsline", 5, "g"]] },
      { action: "omleta", text: "Adaugă ouăle bătute și cașcavalul.", lines: [["Ou", 3, "bucată"], ["Albuș de ou", 2, "bucată"], ["Cașcaval (tip gouda)", 20, "g"], ["Sare", 1, "g"]] },
      { action: "asambleaza", text: "Cu pâine integrală.", lines: [["off:4056489165149", 2, "felie", [30, 120]]] },
    ],
  },
  {
    name: "Wrap cu pui și legume",
    category: "rapid",
    keepsDays: 1,
    steps: [
      { action: "taie-carne", text: "Taie puiul fâșii.", lines: [["Piept de pui", 160, "g", [120, 220]]] },
      { action: "tigaie-pui", text: "Rumenește puiul cu boia și usturoi.", lines: [["Ulei de măsline", 5, "g"], ["Boia dulce", 2, "g"], ["Usturoi granulat", 1, "g"], ["Sare", 1, "g"]] },
      { action: "taie-legume", text: "Taie salata și roșia.", lines: [["Salată romană", 50, "g"], ["Roșii", 80, "g"], ["Porumb conservă (scurs)", 40, "g"]] },
      { action: "asambleaza", text: "Unge lipiile cu iaurt și rulează.", lines: [["Lipie (tortilla)", 2, "bucată", [60, 180]], ["off:4056489683759", 50, "g"]] },
    ],
  },
  {
    name: "Paste cu ton și roșii",
    category: "rapid",
    keepsDays: 2,
    steps: [
      { action: "fierbe-paste", text: "Fierbe pastele.", lines: [["Paste", 100, "g", [70, 150]]] },
      { action: "fierbe-sos", text: "Încălzește passata cu usturoiul și tonul; amestecă pastele.", minutes: 8, lines: [["Passata / sos de roșii", 150, "g"], ["Usturoi", 1, "cățel"], ["Ton în apă (scurs)", 120, "g", [100, 160]], ["Ulei de măsline", 5, "g"]] },
      { action: "asambleaza", text: "Parmezan deasupra.", lines: [["Parmezan ras", 10, "g"]] },
    ],
  },
  {
    name: "Quesadilla cu pui afumat la sandwich maker",
    category: "rapid",
    keepsDays: 1,
    steps: [
      { action: "amesteca", text: "Amestecă fasolea și porumbul.", lines: [["Fasole roșie conservă (scursă)", 60, "g"], ["Porumb conservă (scurs)", 40, "g"]] },
      {
        action: "sandwich",
        text: "Pe lipie: pui afumat, fasole, porumb, mozzarella; pliază și pune în sandwich maker.",
        lines: [["Lipie (tortilla)", 2, "bucată", [60, 180]], ["off:2501427002175", 100, "g", [80, 150]], ["off:20047214", 40, "g"]],
      },
    ],
  },
  {
    name: "Salată de ton cu năut și ou",
    category: "rapid",
    keepsDays: 2,
    steps: [
      { action: "fierbe-oua", text: "Fierbe ouăle tari.", lines: [["Ou", 2, "bucată"]] },
      { action: "taie-legume", text: "Taie castravetele, roșiile și ceapa roșie.", lines: [["Castravete", 150, "g"], ["Roșii", 120, "g"], ["legacy:Ceapa Rosie", 30, "g"]] },
      {
        action: "asambleaza",
        text: "Amestecă tonul, năutul, legumele, uleiul și lămâia.",
        lines: [["Ton în apă (scurs)", 120, "g", [100, 160]], ["Năut conservă (scurs)", 120, "g", [80, 200]], ["Ulei de măsline", 10, "g"], ["Lămâie", 20, "g"], ["Sare", 1, "g"]],
      },
    ],
  },

  // ───────────── Adăugate 2026-10-18 (tot din lista Lidl) ─────────────
  {
    name: "Pui teriyaki cu orez și legume chinezești",
    category: "pranz",
    freezes: true,
    keepsDays: 4,
    notes: "Legumele: Freshona mix chinezesc congelat (750 g).",
    steps: [
      { action: "taie-carne", text: "Taie pieptul de pui cuburi.", lines: [["Piept de pui", 200, "g", [150, 260]]] },
      { action: "tigaie-pui", text: "Rumenește puiul în ulei.", lines: [["Ulei de floarea-soarelui", 6, "g"]] },
      { action: "soteaza-legume", text: "Adaugă legumele congelate și sotează-le cu puiul.", lines: [["Mix de legume congelate", 250, "g"]] },
      {
        action: "fierbe-sos",
        text: "Stinge cu sosul de soia, mierea, usturoiul și ghimbirul; lasă să scadă până se lipește sosul.",
        minutes: 4,
        lines: [["Sos de soia", 20, "g"], ["Miere", 12, "g"], ["Usturoi", 1, "cățel"], ["Ghimbir praf", 1, "g"]],
      },
      { action: "fierbe-orez", text: "Fierbe orezul.", lines: [["Orez alb bob lung", 80, "g", [50, 140]]] },
    ],
  },
  {
    name: "Paste bolognese cu vită și legume",
    category: "pranz",
    freezes: true,
    keepsDays: 4,
    notes: "Sosul se congelează separat foarte bine; pastele le fierbi proaspete.",
    steps: [
      { action: "taie-legume", text: "Toacă mărunt ceapa, morcovul și ciupercile.", lines: [["Ceapă", 60, "g"], ["Morcov", 60, "g"], ["Ciuperci champignon", 80, "g"]] },
      { action: "caleste-ceapa", text: "Călește legumele în ulei.", lines: [["Ulei de măsline", 5, "g"]] },
      { action: "rumeneste-tocata", text: "Adaugă carnea și rumenește-o.", lines: [["Carne tocată de vită 90/10", 170, "g", [130, 220]]] },
      {
        action: "fierbe-sos",
        text: "Adaugă passata, pasta de tomate și condimentele; fierbe la foc mic.",
        lines: [["Passata / sos de roșii", 200, "g"], ["Pastă de tomate", 15, "g"], ["Oregano uscat", 1, "g"], ["Sare", 2, "g"], ["Piper negru", 0.5, "g"]],
      },
      { action: "fierbe-paste", text: "Fierbe pastele al dente.", lines: [["Paste", 90, "g", [60, 140]]] },
      { action: "asambleaza", text: "Parmezan deasupra, în caserole.", lines: [["Parmezan ras", 10, "g"]] },
    ],
  },
  {
    name: "Tocăniță de pui cu ciuperci și mazăre, cu orez",
    category: "pranz",
    freezes: true,
    keepsDays: 4,
    steps: [
      { action: "taie-carne", text: "Taie pulpele cuburi.", lines: [["Pulpe de pui dezosate, fără piele", 200, "g", [160, 260]]] },
      { action: "taie-legume", text: "Toacă ceapa și taie ciupercile felii.", lines: [["Ceapă", 60, "g"], ["Ciuperci champignon", 150, "g"]] },
      { action: "tigaie-pui", text: "Rumenește puiul cu ceapa.", lines: [["Ulei de floarea-soarelui", 6, "g"]] },
      {
        action: "fierbe-sos",
        text: "Adaugă ciupercile, mazărea, pasta de tomate, condimentele și un pahar de apă; fierbe la foc mic.",
        lines: [["Mazăre verde", 100, "g"], ["Pastă de tomate", 15, "g"], ["Boia dulce", 2, "g"], ["Cimbru uscat", 1, "g"], ["Sare", 2, "g"]],
      },
      { action: "fierbe-orez", text: "Fierbe orezul.", lines: [["Orez alb bob lung", 70, "g", [40, 130]]] },
    ],
  },
  {
    name: "Musaca de cartofi cu pui tocat",
    category: "cina",
    freezes: true,
    keepsDays: 4,
    notes: "Se face în jena mare pentru tot blocul și se taie în caserole după ce se răcește.",
    steps: [
      { action: "curata-cartofi", text: "Curăță cartofii și taie-i felii subțiri.", lines: [["Cartofi albi", 400, "g", [250, 550]]] },
      { action: "taie-ceapa", text: "Toacă ceapa.", lines: [["Ceapă", 60, "g"]] },
      {
        action: "rumeneste-tocata",
        text: "Rumenește carnea cu ceapa, pasta de tomate și condimentele.",
        lines: [["Carne tocată de pui", 180, "g", [140, 230]], ["Ulei de floarea-soarelui", 5, "g"], ["Pastă de tomate", 15, "g"], ["Boia dulce", 2, "g"], ["Cimbru uscat", 1, "g"], ["Sare", 2, "g"], ["Piper negru", 0.5, "g"]],
      },
      { action: "amesteca", text: "Bate oul cu iaurtul și un praf de sare (stratul de deasupra).", lines: [["Ou", 1, "bucată"], ["off:4056489683759", 60, "g"]] },
      {
        action: "cuptor-gratinat",
        text: "În jenă: cartofi, carne, cartofi. Toarnă oul cu iaurtul, presară cașcavalul; acoperă 35 de minute, apoi descoperă 15.",
        minutes: 50,
        lines: [["Cașcaval (tip gouda)", 20, "g"]],
      },
      { action: "asambleaza", text: "Cu salată de castraveți.", lines: [["Castravete", 150, "g"]] },
    ],
  },
  {
    name: "Cod cu cartofi la cuptor și salată de varză",
    category: "cina",
    keepsDays: 2,
    notes: "Codul de Alaska congelat (Ocean Sea) se dezgheață peste noapte în frigider. Peștele se ține 2 zile.",
    steps: [
      { action: "curata-cartofi", text: "Taie cartofii felii groase.", lines: [["Cartofi albi", 400, "g", [250, 600]]] },
      { action: "cuptor-cartofi", text: "Cartofii la cuptor, cu ulei, boia și sare.", lines: [["Ulei de măsline", 8, "g"], ["Boia dulce", 2, "g"], ["Sare", 1, "g"]] },
      { action: "af-peste", text: "Codul la airfryer, cu sare și lămâie.", lines: [["Cod de Alaska (pollock)", 220, "g", [160, 280]], ["Lămâie", 20, "g"], ["Sare", 1, "g"]] },
      { action: "taie-legume", text: "Taie varza fideluță, frec-o cu sare, oțet, ulei și mărar.", lines: [["Varză albă", 150, "g"], ["Oțet de mere", 10, "g"], ["Ulei de floarea-soarelui", 5, "g"], ["Mărar proaspăt", 5, "g"]] },
    ],
  },
  {
    name: "Ciulama de pui cu ciuperci și mămăligă",
    category: "cina",
    keepsDays: 3,
    notes: "Variantă mai slabă: sos din lapte îngroșat cu puțină făină, fără smântână.",
    steps: [
      { action: "taie-carne", text: "Taie pulpele cuburi.", lines: [["Pulpe de pui dezosate, fără piele", 220, "g", [170, 280]]] },
      { action: "taie-legume", text: "Toacă ceapa și taie ciupercile.", lines: [["Ceapă", 60, "g"], ["Ciuperci champignon", 200, "g"]] },
      { action: "tigaie-pui", text: "Rumenește puiul cu ceapa și ciupercile.", lines: [["Unt", 6, "g"]] },
      {
        action: "fierbe-sos",
        text: "Presară făina, amestecă, apoi toarnă laptele treptat; fierbe până se îngroașă.",
        minutes: 10,
        lines: [["Făină albă", 10, "g"], ["Lapte semidegresat 2%", 200, "g"], ["Usturoi granulat", 1, "g"], ["Sare", 2, "g"], ["Piper negru", 0.5, "g"]],
      },
      { action: "fierbe-cereale", text: "Mămăliga: mălaiul în apă clocotită cu sare, amestecă până se îngroașă.", minutes: 12, lines: [["Mălai", 70, "g", [40, 110]]] },
    ],
  },
  {
    name: "Brânză de vaci cu afine, ovăz și miere",
    category: "gustare",
    keepsDays: 3,
    notes: "Fără gătit; se face în 2 minute direct în caserolă.",
    steps: [
      {
        action: "asambleaza",
        text: "Brânza în caserolă, deasupra afinele, ovăzul și mierea.",
        lines: [["Brânză de vaci 2%", 200, "g", [150, 280]], ["legacy:Afine de Cultura camara noastra", 80, "g"], ["off:4056489195917", 25, "g", [0, 50]], ["Miere", 10, "g"]],
      },
    ],
  },
  {
    name: "Vafe proteice la sandwich maker",
    category: "gustare",
    keepsDays: 3,
    notes: "Pe plăcile de vafe. Se fac duminică pentru tot blocul și se încălzesc 30 de secunde la microunde.",
    steps: [
      {
        action: "blender",
        text: "Mixează ovăzul, oul, albușurile, brânza, banana și praful de copt.",
        lines: [["off:4056489195917", 50, "g", [30, 80]], ["Ou", 1, "bucată"], ["Albuș de ou", 2, "bucată"], ["Brânză de vaci 2%", 60, "g"], ["Banană", 50, "g"], ["Praf de copt", 2, "g"]],
      },
      { action: "sandwich", text: "Coace vafele în sandwich maker până se rumenesc." },
      { action: "asambleaza", text: "Cu iaurt deasupra.", lines: [["off:4056489683759", 80, "g"]] },
    ],
  },
  {
    name: "Ouă în sos de roșii cu năut și feta",
    category: "rapid",
    keepsDays: 1,
    notes: "Shakshuka simplă, 20 de minute, o singură tigaie.",
    steps: [
      { action: "taie-legume", text: "Taie ceapa și ardeiul.", lines: [["Ceapă", 50, "g"], ["Ardei gras roșu", 100, "g"]] },
      { action: "soteaza-legume", text: "Sotează ceapa și ardeiul în ulei.", lines: [["Ulei de măsline", 6, "g"]] },
      {
        action: "fierbe-sos",
        text: "Adaugă passata, năutul și condimentele; fă 3 gropițe, sparge ouăle și acoperă până se întăresc albușurile.",
        minutes: 12,
        lines: [["Passata / sos de roșii", 200, "g"], ["Năut conservă (scurs)", 100, "g"], ["Boia dulce", 2, "g"], ["Sare", 1, "g"], ["Ou", 3, "bucată"]],
      },
      { action: "asambleaza", text: "Feta sfărâmată deasupra; cu pâine integrală.", lines: [["Brânză feta", 30, "g"], ["off:4056489165149", 2, "felie", [0, 120]]] },
    ],
  },
];
