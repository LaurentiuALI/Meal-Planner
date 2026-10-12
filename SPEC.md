# Meal Planner v2: specificație

Rescriere de la zero, stabilită pe 2026-10-11. Documentul ăsta e sursa de adevăr; codul îl urmează.

## 1. Context

- **Un singur utilizator.** UI în română, fără i18n.
- **Dispozitive:** iPhone (PWA adăugat pe ecranul principal, folosit în bucătărie și în magazin) și laptop pentru planificare.
- **Server:** laptop Legion (16GB RAM, fără GPU), Ubuntu Server + Docker Compose, accesat doar prin **Tailscale** (`tailscale serve` pentru HTTPS). Nu are login în aplicație.
- **Fără AI.** Crearea rețetelor folosește un parser de text determinist și căutare fuzzy.

## 2. Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- SQLite prin libsql + Drizzle ORM; căutare FTS5 cu diacritice normalizate
- `src/domain/`: logică pură (macro-uri, unități, solver, listă de cumpărături, strategie de gătit), fără I/O, testată cu Vitest
- Offline: service worker. Planul, rețetele, lista și modul de gătit sunt în cache. Bifele se salvează local și se sincronizează când revine conexiunea. Editarea cere conexiune.
- Backup: export/import JSON din aplicație + copie SQLite în fiecare noapte (Syncthing pe PC-ul principal)

## 3. Ingrediente

- **Unitatea de bază e mereu gramul, produs crud/uscat.** Macro-urile sunt per 100g: kcal, proteine, carbohidrați, grăsimi, fibre.
  - Fibrele pot fi `null` („necunoscut”), nu 0.
  - kcal vine de pe etichetă dacă există. Altfel se calculează 4·P + 4·C + 9·F + 2·fibre (carbohidrații UE exclud fibrele).
- **Porții definite** per ingredient: `bucată = 55g`, `felie = 30g`, `lingură = 10g`. Pentru ml există densitatea (implicit 1).
- **Pachet:** gramaj + etichetă (ex. „caserolă 500g”), folosit la rotunjirea listei de cumpărături.
- **Raion** (ordinea Lidl): fructe-legume, brutărie, lactate-ouă, carne, pește, mezeluri, congelate, cămară (paste, orez, făinoase), conserve, condimente-sosuri, gustări-dulciuri, băuturi, altele.
- `staple` = ai mereu în casă (ulei, sare, condimente). Pe listă apare separat, la „verifică”.
- **Surse:**
  1. Copie OpenFoodFacts cu produsele din România cu nutriție completă (Lidl marcat); licență ODbL, cu atribuire în aplicație
  2. USDA (Foundation/SR Legacy), alimente generice traduse în română
  3. Cele 18 ingrediente din aplicația veche
  4. Căutare live OFF după codul de bare (cu cache)
  5. Introducere manuală de pe etichetă, cu formularul precompletat

## 4. Ustensile și acțiuni

- **Ustensile (cu capacitate):**
  - Aragaz cu 4 ochiuri
  - Cuptor Electrolux cu ventilator, cu grătar, 2 vase ceramice mici (~500g fiecare) și jena mare (~1.5kg)
  - Tefal Ingenio: cratiță 16cm, cratiță 20cm, sauté 24cm, tigaie 28cm (toate merg în cuptor până la 260°C)
  - Airfryer Tefal Easy Fry & Grill 4.2L: ~700g legume/cartofi sau ~500g carne per tură, max 800g
  - Sandwich maker (plăci normal, triunghi, vafe), blender, microunde
- **Acțiuni predefinite** (~30), de ex. „Airfryer · cuburi de cartofi” = airfryer, 200°C, 18 min, pasiv, „întoarce la jumătate”. O acțiune are:
  - ustensilele folosite
  - durata și cât din ea e timp activ
  - temperatura
  - dacă timpul crește cu cantitatea (ture)
  - dacă se poate combina cu aceeași acțiune din altă rețetă

## 5. Rețete

- **Categoria:** prânz (birou, încălzit la microunde), gustare, cină, rapid (joi-vineri).
- **Metadate:** `porții` (randamentul), `se congelează`, `se păstrează N zile`.
- **Pași ordonați.** Fiecare pas are opțional o acțiune (cu timpi impliciți care se pot modifica) și ingredientele lui:
  - cantitate + unitate (g / ml / porție definită), convertite în grame
  - marcaj `fix` sau `flexibil (min-max g per porție)`, ca să știe solverul ce poate ajusta
  - condimentele și uleiul nu se cântăresc: produsul e marcat „condiment” sau „ulei”, iar aplicația scrie „Condimentează: boia, sare” / „Puțin ulei” în loc de grame. Cantitatea din rețetă rămâne doar ca estimare pentru calorii (uleiul contează: ~45 kcal la 5 g).
- **Creare rapidă:** lipești linii de tipul `300g piept pui`, `2 buc ou`, `1 lingura ulei`. Parserul le mapează fuzzy pe baza de date și cere confirmare doar unde nu e sigur.
- **Set prestabilit** (produse ușor de găsit la Lidl, puțină diversitate, puțin timp în bucătărie): 5 prânzuri, 5 cine mari și sățioase, 4 gustări (una se gătește pe bloc, restul se asamblează rapid, inclusiv în sandwich maker), 5 rețete rapide. Rețetele vechi nu se păstrează.

## 6. Plan

- **Sloturi:**

  | Slot | % kcal |
  |---|---|
  | Prânz | 35% |
  | Gustare | 20% |
  | Cină | 45% |

  Sunt configurabile; nu există mic dejun.
- **Ținte zilnice:** 2300 kcal, 140g proteine, 60g grăsimi, 30g fibre, ~285g carbohidrați (restul).
- **Ritm:**
  - Duminică gătești pentru luni-miercuri. Aplicația propune o combinație (1 prânz, 1 cină, 1 gustare) diferită de săptămâna trecută.
  - Joi-vineri primești doar sugestii, cu prioritate pe resturile din pachete. Weekendul e opțional.
- **Gătit agregat:** aceeași rețetă pe mai multe mese se gătește o singură dată, cu cantitatea înmulțită.
- **Solver (determinist):** ajustează ingredientele flexibile, per zi. Ordinea priorităților:
  1. proteine ≥ 140 (max +15)
  2. kcal ± 75
  3. pachete întregi / fără resturi
  4. fibre ≥ 30
  5. grăsimi ± 10

  Override-ul manual are mereu câștig.
- **Urmărire:** bifezi „mâncat” sau „sărit” și poți adăuga rapid un extra (produs + grame). Fără jurnal complet și fără urmărirea greutății.

## 7. Lista de cumpărături

- Se generează din plan (un interval sau o sesiune) și e grupată pe raioane în ordinea Lidl.
- Se rotunjește la pachete întregi și arată surplusul. Surplusul alimentează sugestiile de joi-vineri.
- Staples-urile apar la „verifică”.
- E bifabilă offline. Nu există inventar de cămară.
- **Prețuri (extra):** fișierul zilnic Lidl (`preturiZilniceLidl.xlsb`) plus introducere manuală, cu ultimul preț cunoscut și data lui. Afișează costul listei și al porției.

## 8. Sesiunea de gătit

- Acoperă un set de mese, de exemplu duminică → luni-miercuri.
- **Agregare pe ustensilă/acțiune:** „Airfryer: 650g cartofi (A 400 + B 250), 200°C, 18 min”, plus prep-ul comun („taie 3 cepe pentru A și C”).
- **Capacitate:** calculează câte ture sunt nevoie.
- **Timeline cu paralelizare:**
  - Resurse: 1 om (doar timpul activ), 4 ochiuri, cuptorul, airfryerul, vasele.
  - Minimizează întâi timpul total, apoi vasele de spălat: reutilizează un vas dacă diferența e sub 5 minute.
- **Mod pas-cu-pas (pe tot ecranul, „te ține de mână”):**
  - Pornește cu „Gătește pas cu pas”. Un singur pas pe ecran: instrucțiunea rețetei scrisă mare, ustensila și temperatura, gramajele agregate, sfatul acțiunii. Butoane mari: înapoi, „Gata, mai departe”, înainte.
  - Ghidul urmează planul, dar se adaptează ritmului real: te duce la primul pas nefăcut care se poate face acum. Un pas care depinde de altul încă în lucru (cuptorul care se încălzește, orezul care fierbe) arată ce aștepți, cu minutele rămase, și ce poți face între timp.
  - **Cronometre:** pașii care gătesc singuri au cronometru, cu durata ajustabilă înainte de pornire. După pornire trece în bara de sus și poți merge mai departe. Când se termină: alarmă care se repetă și ecran de alertă, cu „+1 / +3 / +5 min” sau „Gata”. Minute în plus se pot adăuga oricând. La acțiunile cu „la jumătate” în sfat (scutură coșul, întoarce), sună un memento la jumătate.
  - Ecranul ținut aprins (Wake Lock); starea supraviețuiește unui refresh. Pe iOS sunetul cere aplicația deschisă (fără timere în fundalul telefonului); alarma cere sesiune audio „playback”, ca să sune și pe silențios.
  - La final: „împarte în N caserole” (cu zilele), apoi ce e în frigider și ce e de spălat.

## 9. Etape

1. **Fundația:** ingrediente (import + scanner + manual), ustensile și acțiuni, rețete (cu parser), macro-uri, set prestabilit
2. **Plan:** săptămână cu sloturi, solver, rotație propusă
3. **Lista de cumpărături:** raioane, pachete, staples, offline
4. **Sesiunea de gătit:** agregare, ture, timeline, mod pas-cu-pas
5. **Extra:** prețuri Lidl, sugestii din resturi, bifat „mâncat”, backup, deploy (Docker + Tailscale)
