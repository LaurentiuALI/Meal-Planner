'use server'

import { searchOpenFoodFacts, OFFProduct } from './openfoodfacts';
import { searchSpoonacular, SpoonacularIngredient } from './spoonacular';

export interface UnifiedSearchResult {
  source: 'OpenFoodFacts' | 'Spoonacular';
  id: string; // barcode or spoonacular ID
  name: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  unit: string; // usually 'g' or 'ml'
  originalData?: any;
}

export async function searchIngredientsUnified(query: string): Promise<UnifiedSearchResult[]> {
  const [offResults, spoonResults] = await Promise.all([
    searchOpenFoodFacts(query),
    searchSpoonacular(query)
  ]);

  const unifiedOFF: UnifiedSearchResult[] = offResults.map(p => ({
    source: 'OpenFoodFacts',
    id: p.code || `off-${Math.random()}`, // fallback if no code
    name: p.product_name,
    macros: {
        calories: p.nutriments["energy-kcal_100g"] || 0,
        protein: p.nutriments.proteins_100g || 0,
        carbs: p.nutriments.carbohydrates_100g || 0,
        fat: p.nutriments.fat_100g || 0,
        fiber: p.nutriments.fiber_100g || 0
    },
    unit: 'g', // OFF data is per 100g
    originalData: p
  }));

  const unifiedSpoon: UnifiedSearchResult[] = spoonResults.map(p => {
    const nutrients = p.nutrition?.nutrients || [];
    const getNutrient = (name: string) => nutrients.find(n => n.name.toLowerCase() === name.toLowerCase())?.amount || 0;

    return {
        source: 'Spoonacular',
        id: `spoon-${p.id}`,
        name: p.name,
        macros: {
            calories: getNutrient('Calories'),
            protein: getNutrient('Protein'),
            carbs: getNutrient('Carbohydrates'),
            fat: getNutrient('Fat'),
            fiber: getNutrient('Fiber')
        },
        unit: 'g', // We requested amount=100&unit=g
        originalData: p
    };
  });

  return [...unifiedOFF, ...unifiedSpoon];
}
