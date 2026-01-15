import { DayPlan, Recipe, Ingredient } from '@/types'
import { calculateRecipeMacros } from './badges'

interface Insight {
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
}

export function generatePlanInsights(
  plan: DayPlan,
  recipes: Recipe[],
  allIngredients: Ingredient[]
): Insight[] {
  const insights: Insight[] = []
  
  const meals = plan.meals
  if (meals.length === 0) return insights

  // Identify Unique Recipes (Cooking Events)
  const uniqueRecipeIds = Array.from(new Set(meals.map(m => m.recipeId)))
  const uniqueRecipes = uniqueRecipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as Recipe[]
  
  const totalMealsCount = meals.length
  const cookingEventsCount = uniqueRecipes.length
  const batchRatio = totalMealsCount / cookingEventsCount

  // --- 1. Batch Efficiency (New!) ---
  if (batchRatio >= 2) {
      insights.push({
          type: 'success',
          title: 'Batch Cooking Master',
          message: `Excellent! You are averaging ${batchRatio.toFixed(1)} meals per cooking session. This minimizes cleanup and active time.`
      })
  } else if (totalMealsCount > 3 && batchRatio < 1.2) {
      insights.push({
          type: 'info',
          title: 'Low Batch Efficiency',
          message: `You are cooking almost every meal from scratch. Try making double portions of 1-2 recipes to save time.`
      })
  }

  // --- 2. Cookware Overload (Based on Unique Recipes) ---
  // If I cook Recipe A (Pan) and Recipe B (Pan), that's 2 Pan uses (Cleanups).
  // If I cook Recipe A (Pan) x 5, that's 1 Pan use.
  const toolCounts = new Map<string, number>()
  uniqueRecipes.forEach(r => {
    r.steps.forEach(s => {
        s.tools.forEach(t => {
            toolCounts.set(t.name, (toolCounts.get(t.name) || 0) + 1)
        })
    })
  })

  // Check if any tool is used in > 2 DIFFERENT recipes
  const overloadedTools: string[] = []
  toolCounts.forEach((count, tool) => {
    if (count > 2) overloadedTools.push(tool)
  })

  if (overloadedTools.length > 0) {
    insights.push({
      type: 'error',
      title: 'Cookware Bottleneck',
      message: `You need the following tools for ${overloadedTools.length} different recipes: ${overloadedTools.join(', ')}. This means multiple wash cycles. Can you swap one recipe?`
    })
  }
  
  // Total unique tools across the PLAN
  if (toolCounts.size > 5) {
      insights.push({
          type: 'warning',
          title: 'Too Many Tools',
          message: `Your plan requires ${toolCounts.size} different tools overall. Aim for recipes that share equipment to simplify your kitchen setup.`
      })
  }

  // --- 3. Meat Diversity (Based on Unique Recipes) ---
  const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'steak', 'salmon', 'fish', 'tuna', 'turkey', 'shrimp']
  const meatsUsed = new Set<string>()
  
  uniqueRecipes.forEach(r => {
    r.steps.forEach(s => {
        s.ingredients.forEach(ri => {
            const ing = allIngredients.find(i => i.id === ri.ingredientId)
            if (ing) {
                const lowerName = ing.name.toLowerCase()
                meatKeywords.forEach(meat => {
                    if (lowerName.includes(meat)) meatsUsed.add(meat)
                })
            }
        })
    })
  })

  if (meatsUsed.size > 2) {
    insights.push({
      type: 'warning',
      title: 'High Meat Variety',
      message: `You're buying ${meatsUsed.size} different types of meat (${Array.from(meatsUsed).join(', ')}). Buying in bulk is cheaper—try to use the same protein across multiple meals.`
    })
  }

  // --- 4. Ingredient Efficiency ---
  const uniqueIngredients = new Set<string>()
  uniqueRecipes.forEach(r => {
      r.steps.forEach(s => s.ingredients.forEach(ri => uniqueIngredients.add(ri.ingredientId)))
  })
  
  // Ratio of Unique Ingredients to Total Meals
  // Lower is better (fewer grocery items feeding more meals)
  const ingredientEfficiency = uniqueIngredients.size / totalMealsCount
  
  if (ingredientEfficiency > 3) { 
      insights.push({
          type: 'warning',
          title: 'Complex Grocery List',
          message: `You need ${uniqueIngredients.size} unique ingredients for ${totalMealsCount} meals. Simplify your sides to reuse produce.`
      })
  }

  // --- 5. Macro Check (Avg of consumed meals) ---
  let totalProtein = 0;
  let totalFiber = 0;
  
  meals.forEach(m => { // Iterate over MEALS, not recipes, to weight by consumption
      const r = recipes.find(rec => rec.id === m.recipeId)
      if (r) {
        const macros = calculateRecipeMacros(r, allIngredients);
        totalProtein += macros.protein;
        totalFiber += macros.fiber;
      }
  });

  const avgProtein = totalProtein / totalMealsCount;
  if (avgProtein < 20) {
      insights.push({
          type: 'info',
          title: 'Low Protein',
          message: `Your meals average only ${avgProtein.toFixed(0)}g protein. Consider adding a high-protein side.`
      })
  }
  
  const avgFiber = totalFiber / totalMealsCount;
  if (avgFiber < 5) {
      insights.push({
          type: 'info',
          title: 'Low Fiber',
          message: `Your meals average only ${avgFiber.toFixed(0)}g fiber. Add some veggies or legumes.`
      })
  }

  return insights
}

// Strategy remains mostly the same, but we iterate over UNIQUE recipes to define the "Cooking" steps
export function generateCookingStrategy(
  plan: DayPlan,
  recipes: Recipe[]
): string[] {
  const strategy: string[] = []
  const meals = plan.meals
  // Use Unique Recipes for Cooking Steps
  const uniqueRecipeIds = Array.from(new Set(meals.map(m => m.recipeId)))
  const uniqueRecipes = uniqueRecipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as Recipe[]
  
  if (uniqueRecipes.length === 0) return ["Add meals to generate a strategy."]

  const slowMethods = ['slow cooker', 'oven', 'roast', 'bake', 'stew', 'braise']
  
  // Categorize
  const ovenMeals = uniqueRecipes.filter(r => r.method.some(m => slowMethods.some(sm => m.toLowerCase().includes(sm))))
  const stoveMeals = uniqueRecipes.filter(r => !ovenMeals.includes(r))

  strategy.push(`**Step 1: The Batch Bake**`)
  if (ovenMeals.length > 0) {
    strategy.push(`- Preheat oven immediately.`)
    ovenMeals.forEach(r => {
      strategy.push(`- Prep and start **${r.name}** (${r.method.join(', ')}).`)
    })
  } else {
    strategy.push(`- No long-cook meals. Jump to stove work.`)
  }

  strategy.push(`**Step 2: Stovetop & Chop**`)
  strategy.push(`- While oven works, chop vegetables for: ${stoveMeals.map(r => r.name).join(', ') || "remaining meals"}.`)
  stoveMeals.forEach(r => {
      strategy.push(`- Batch cook **${r.name}**.`)
  })
  
  strategy.push(`**Step 3: Assembly Line**`)
  strategy.push(`- Lay out ${meals.length} containers.`)
  strategy.push(`- Portion out meals.`)
  strategy.push(`- **Cooling Tip:** Let food cool to room temp before sealing lids.`)

  return strategy
}
