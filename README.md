# Meal Planner

Planificator de mese pentru o singură persoană: rețete cu macro-uri (proteine, carbohidrați, grăsimi, fibre), plan pe zile, listă de cumpărături și sesiuni de gătit optimizate pentru ustensilele din bucătărie. Specificația completă e în [SPEC.md](SPEC.md).

## Pornire locală

```bash
pnpm install
pnpm db:seed
pnpm dev
```

`db:seed` creează `var/meal-planner.db` (SQLite). Rulează migrările, apoi încarcă bucătăria, ~6000 de produse și rețetele prestabilite. Poți să-l rulezi de câte ori vrei: nu suprascrie ce ai modificat.

Pentru instalarea pe server (Docker, Tailscale, backup nocturn) vezi [DEPLOY.md](DEPLOY.md).

## Comenzi utile

- `pnpm test`: testele logicii de domeniu (macro-uri, solver, listă, sesiunea de gătit)
- `pnpm db:backup`: copie a bazei în `backups/`
- `pnpm tsx scripts/session-preview.ts 2026-10-12 2026-10-14`: sesiunea de gătit pentru un interval, afișată în terminal

## Structură

- `src/domain/`: logica pură: unități, macro-uri, parserul de text, potrivirea ingredientelor, solverul de porții (`solver.ts`), lista de cumpărături și sesiunea de gătit (`cooking.ts`)
- `src/server/`: acces la baza de date și server actions
- `src/app/`: paginile (Next.js App Router)
- `data/`: snapshot-urile de date folosite de seed
- `scripts/`: seed și scripturile care regenerează datele

## Date

- `data/off-ro.json`: produsele din România de pe [Open Food Facts](https://world.openfoodfacts.org), © contribuitorii Open Food Facts, licență [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). Se regenerează cu `pnpm data:off`.
- `data/generic-ro.json`: alimente generice din USDA FoodData Central (SR Legacy, domeniu public), traduse în română. Se regenerează cu `pnpm tsx scripts/build-usda.ts <director CSV>`.
- `data/legacy.json`: ingredientele introduse în versiunea veche a aplicației.
- Prețuri: [fișierul zilnic Lidl](https://www.lidl.ro/c/preturile-la-zi/s10019622), descărcat de server.
