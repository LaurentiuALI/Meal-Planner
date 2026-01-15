import { Recipe, Ingredient, Badge, Macros } from '../types';

// BADGE DEFINITIONS
export const GOOD_BADGES: Record<string, Badge> = {
  HIGH_PROTEIN: { type: 'success', label: 'High Protein', description: '>30g Protein' },
  HIGH_FIBER: { type: 'success', label: 'High Fiber', description: '>10g Fiber' },
  HIGH_VOLUME: { type: 'success', label: 'High Volume', description: 'Low Calorie Density' },
  FEW_COOKWARE: { type: 'success', label: 'Minimal Cleanup', description: '≤2 Tools Used' },
  ONE_POT: { type: 'success', label: 'One Pot', description: 'Only 1 Tool Used' },
};

export const BAD_BADGES: Record<string, Badge> = {
  HIGH_CALORIE: { type: 'error', label: 'High Calorie', description: '>800 Calories' },
  HIGH_FAT: { type: 'error', label: 'High Fat', description: '>30g Fat' },
  MANY_COOKWARE: { type: 'error', label: 'Dishwasher Nightmare', description: '>3 Tools Used' },
  DEAD_TIME: { type: 'error', label: 'Dead Time', description: 'Inefficient Tool Reuse' },
};

export function calculateRecipeMacros(recipe: Recipe, allIngredients: Ingredient[]): Macros {
  const totalMacros: Macros = { protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 };

  recipe.steps.forEach(step => {
    step.ingredients.forEach((ri) => {
        const ingredient = allIngredients.find((i) => i.id === ri.ingredientId);
        if (ingredient) {
          const factor = ri.amount / 100;
          const macros = ingredient.macros;
          
          totalMacros.protein += (macros.protein || 0) * factor;
          totalMacros.carbs += (macros.carbs || 0) * factor;
          totalMacros.fat += (macros.fat || 0) * factor;
          totalMacros.calories += (macros.calories || 0) * factor;
          totalMacros.fiber += (macros.fiber || 0) * factor;
        }
    });
  });

  return totalMacros;
}

export function evaluateRecipeBadges(recipe: Recipe, macros: Macros): Badge[] {
  const badges: Badge[] = [];

  // --- MACROS ---
  if (macros.protein > 30) badges.push(GOOD_BADGES.HIGH_PROTEIN);
  if (macros.fiber > 10) badges.push(GOOD_BADGES.HIGH_FIBER);
  
  // High Volume: Arbitrary heuristic => < 150 cals per 100g of food?
  // We need total weight.
  let totalWeight = 0;
  recipe.steps.forEach(s => s.ingredients.forEach(ri => totalWeight += ri.amount));
  if (totalWeight > 0) {
    const calsPer100g = (macros.calories / totalWeight) * 100;
    if (calsPer100g < 100 && totalWeight > 300) { // <100kcal/100g is very voluminous (veggies/lean meat)
        badges.push(GOOD_BADGES.HIGH_VOLUME);
    }
  }

  if (macros.calories > 800) badges.push(BAD_BADGES.HIGH_CALORIE);
  if (macros.fat > 30) badges.push(BAD_BADGES.HIGH_FAT);

  // --- COOKWARE ---
  const allTools = recipe.steps.flatMap(s => s.tools.map(t => t.id));
  const uniqueTools = new Set(allTools);

  if (uniqueTools.size === 1) badges.push(GOOD_BADGES.ONE_POT);
  else if (uniqueTools.size <= 2) badges.push(GOOD_BADGES.FEW_COOKWARE);
  
  if (uniqueTools.size > 3) badges.push(BAD_BADGES.MANY_COOKWARE);

  // --- DEAD TIME / EFFICIENCY ---
  // Check if a tool is used, then NOT used in a subsequent step, then used again.
  // Step 1: Pan
  // Step 2: Bowl (Pan is idle)
  // Step 3: Pan (Wait, did I wash it? Or just reuse?)
  // This implies "Dead Time" or blocking if you need to wash it.
  
  const toolUsageIndices = new Map<string, number[]>();
  recipe.steps.forEach((step, index) => {
      step.tools.forEach(tool => {
          const indices = toolUsageIndices.get(tool.id) || [];
          indices.push(index);
          toolUsageIndices.set(tool.id, indices);
      });
  });

  let hasDeadTime = false;
  toolUsageIndices.forEach((indices) => {
      // If a tool is used in step i and step j (where j > i + 1), it implies a gap.
      // Example: used in 0 and 2. Gap at 1.
      for (let i = 0; i < indices.length - 1; i++) {
          if (indices[i+1] - indices[i] > 1) {
              hasDeadTime = true;
          }
      }
  });

  if (hasDeadTime) badges.push(BAD_BADGES.DEAD_TIME);

  return badges;
}
