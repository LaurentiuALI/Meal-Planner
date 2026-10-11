# Meal Planner

Planificator de mese pentru o singură persoană: rețete cu macro-uri (proteine, carbohidrați, grăsimi, fibre), plan pe zile, listă de cumpărături și sesiuni de gătit optimizate pentru ustensilele din bucătărie. Specificația completă e în [SPEC.md](SPEC.md).

## Pornire locală

```bash
pnpm install
pnpm db:seed
pnpm dev
```

`db:seed` creează `var/meal-planner.db` (SQLite). Rulează migrările, apoi încarcă bucătăria, ~6000 de produse și rețetele prestabilite. Poți să-l rulezi de câte ori vrei: nu suprascrie ce ai modificat.

## Structură

- `src/domain/`: logica pură (unități, macro-uri, parserul de text, potrivirea ingredientelor), testată cu `pnpm test`
- `src/server/`: acces la baza de date și server actions
- `src/app/`: paginile (Next.js App Router)
- `data/`: snapshot-urile de date folosite de seed
- `scripts/`: seed și scripturile care regenerează datele

## Date

- `data/off-ro.json`: produsele din România de pe [Open Food Facts](https://world.openfoodfacts.org), © contribuitorii Open Food Facts, licență [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). Se regenerează cu `pnpm data:off`.
- `data/generic-ro.json`: alimente generice din USDA FoodData Central (SR Legacy, domeniu public), traduse în română. Se regenerează cu `pnpm tsx scripts/build-usda.ts <director CSV>`.
- `data/legacy.json`: ingredientele introduse în versiunea veche a aplicației.
