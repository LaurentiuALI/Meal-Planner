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

  // Separate cooked meals (recipes) from simple meals (ingredients)
  const cookedMeals = meals.filter(m => m.recipeId)
  const simpleMeals = meals.filter(m => m.ingredientId)

  // --- 1. Batch Efficiency (Cooked Meals Only) ---
  if (cookedMeals.length > 0) {
      const uniqueRecipeIds = Array.from(new Set(cookedMeals.map(m => m.recipeId)))
      const cookingEventsCount = uniqueRecipeIds.length
      const totalCookedCount = cookedMeals.length
      
      const batchRatio = totalCookedCount / cookingEventsCount

      if (batchRatio >= 2) {
          insights.push({
              type: 'success',
              title: 'Batch Cooking Master',
              message: `You're cooking ${cookingEventsCount} recipes to provide ${totalCookedCount} meals. Highly efficient!`
          })
      } else if (totalCookedCount > 4 && batchRatio < 1.2) {
          insights.push({
              type: 'info',
              title: 'High Kitchen Time',
              message: `You are cooking ${totalCookedCount} separate meals from scratch. Try doubling up 1-2 recipes.`
          })
      }
  } else if (simpleMeals.length > 5) {
      // Mostly ingredients
      insights.push({
          type: 'info',
          title: 'Assembly Only',
          message: `Your plan relies heavily on raw ingredients. Very fast, but check if you're getting enough warm/satisfying meals.`
      })
  }

  // --- 2. Cookware Overload (Recipes Only) ---
  const uniqueRecipeIds = Array.from(new Set(cookedMeals.map(m => m.recipeId)))
  const uniqueRecipes = uniqueRecipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as Recipe[]
  
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
      type: 'warning',
      title: 'Heavy Dishwashing',
      message: `You'll need the ${overloadedTools[0]} for ${toolCounts.get(overloadedTools[0])} different recipes. Plan your wash cycles!`
    })
  }

  // --- 3. Meat Diversity (Recipes + Ingredients) ---
  const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'steak', 'salmon', 'fish', 'tuna', 'turkey', 'shrimp']
  const meatsUsed = new Set<string>()
  
  // Check recipes
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
  
  // Check standalone ingredients (e.g. "Canned Tuna", "Smoked Salmon")
  simpleMeals.forEach(m => {
      const ing = allIngredients.find(i => i.id === m.ingredientId)
      if (ing) {
          const lowerName = ing.name.toLowerCase()
          meatKeywords.forEach(meat => {
              if (lowerName.includes(meat)) meatsUsed.add(meat)
          })
      }
  })

  if (meatsUsed.size > 3) {
    insights.push({
      type: 'warning',
      title: 'Complex Shopping List',
      message: `You're buying ${meatsUsed.size} types of protein (${Array.from(meatsUsed).slice(0,3).join(', ')}...). Stick to 1-2 to buy in bulk.`
    })
  }

  // --- 4. Macro Check (Avg of ALL consumed meals) ---
  let totalProtein = 0;
  let totalFiber = 0;
  let totalMealsCount = 0;
  
  meals.forEach(m => {
      let itemMacros = null;
      
      if (m.recipeId) {
          const r = recipes.find(rec => rec.id === m.recipeId)
          if (r) {
            itemMacros = calculateRecipeMacros(r, allIngredients);
          }
      } else if (m.ingredientId && m.ingredientAmount) {
          const i = allIngredients.find(ing => ing.id === m.ingredientId)
          if (i) {
              const ratio = m.ingredientAmount / 100;
              itemMacros = {
                  protein: i.macros.protein * ratio,
                  fiber: i.macros.fiber * ratio,
                  calories: i.macros.calories * ratio,
                  carbs: i.macros.carbs * ratio,
                  fat: i.macros.fat * ratio
              };
          }
      }

      if (itemMacros) {
          // Weighted by servings
          totalProtein += itemMacros.protein * m.servings;
          totalFiber += itemMacros.fiber * m.servings;
          totalMealsCount += m.servings;
      }
  });

  if (totalMealsCount > 0) {
      const avgProtein = totalProtein / totalMealsCount;
      if (avgProtein < 15) {
          insights.push({
              type: 'info',
              title: 'Low Protein Avg',
              message: `Meals average ${avgProtein.toFixed(0)}g protein. Aim for >20g to stay full.`
          })
      }
      
      const avgFiber = totalFiber / totalMealsCount;
      if (avgFiber < 4) {
          insights.push({
              type: 'info',
              title: 'Low Fiber Avg',
              message: `Meals average ${avgFiber.toFixed(0)}g fiber. Add veggies or fruit to snacks.`
          })
      }
  }

  return insights
}

// Strategy: Tool-Centric Aggregation

export function generateCookingStrategy(

  plan: DayPlan,

  recipes: Recipe[],

  allIngredients: Ingredient[]

): string[] {

  const strategy: string[] = []

  const meals = plan.meals

  

  // 1. Identify Unique Recipes & Scale

  // We need to know the TOTAL servings required for each recipe across the plan

  const recipeServings = new Map<string, number>()

  meals.forEach(m => {

      if (m.recipeId) {

          recipeServings.set(m.recipeId, (recipeServings.get(m.recipeId) || 0) + m.servings)

      }

  })



  const uniqueRecipes = Array.from(recipeServings.keys())

    .map(id => recipes.find(r => r.id === id))

    .filter(Boolean) as Recipe[]

  

  if (uniqueRecipes.length === 0) return ["Add meals to generate a strategy."]



  // 2. Aggregate Tasks by Tool

  // Map<ToolName, Array<{ ingredientName, amount, unit, recipeName }>>

  const toolTasks = new Map<string, any[]>()

  const prepTasks: any[] = []



  uniqueRecipes.forEach(recipe => {

      const totalServings = recipeServings.get(recipe.id) || 1;

      // Heuristic: Base recipe is usually for ~4 servings. 

      // If we don't have base servings in DB, assume 1 serving = 1/4 of recipe? 

      // OR assume DB recipe amounts are for "1 batch". 

      // Let's assume the amounts in RecipeIngredient are for ONE Serving for now, or scaled to servings.

      // Actually, standard usually is Recipe = Fixed Yield (e.g. 4). 

      // Let's assume amounts are BASE amounts. We multiply by (totalServings).

      

      recipe.steps.forEach(step => {

          const tools = step.tools;

          

          step.ingredients.forEach(ri => {

              const ing = allIngredients.find(i => i.id === ri.ingredientId);

              if (!ing) return;



              const task = {

                  ingredient: ing.name,

                  amount: ri.amount * totalServings, // Scale to total plan need

                  unit: ing.unit,

                  recipe: recipe.name,

                  stepDesc: step.description

              };



              if (tools.length === 0) {

                  // Implicit Prep (Knife/Board)

                  prepTasks.push(task);

              } else {

                  tools.forEach(tool => {

                      const existing = toolTasks.get(tool.name) || [];

                      existing.push(task);

                      toolTasks.set(tool.name, existing);

                  });

              }

          });

      });

  });



  // 3. Generate Phases



  // Phase 1: Smart Prep (Aggregated Chopping)

  if (prepTasks.length > 0) {

      strategy.push(`**Phase 1: Mise en Place (Prep)**`);

      

      // Group by Ingredient (e.g. "Onion")

      const groupedPrep = new Map<string, { amount: number, unit: string, recipes: Set<string> }>();

      

      prepTasks.forEach(t => {

          const key = t.ingredient; // Simple name match

          const entry = groupedPrep.get(key) || { amount: 0, unit: t.unit, recipes: new Set() };

          entry.amount += t.amount;

          entry.recipes.add(t.recipe);

          groupedPrep.set(key, entry);

      });



      groupedPrep.forEach((data, name) => {

          const recipeList = Array.from(data.recipes).join(', ');

          strategy.push(`- Prep **${data.amount.toFixed(0)}${data.unit} ${name}** (for ${recipeList}).`);

      });

  }



  // Phase 2: Tool Batching (The "Oala" Logic)

  strategy.push(`**Phase 2: Hot Stations**`);

  

  // Sort tools to prioritize "Passive" (Oven) before "Active" (Pan)

  // Heuristic: Oven/Slow Cooker first.

  const slowTools = ['oven', 'slow cooker', 'roaster', 'crockpot'];

  const sortedTools = Array.from(toolTasks.keys()).sort((a, b) => {

      const aSlow = slowTools.some(s => a.toLowerCase().includes(s));

      const bSlow = slowTools.some(s => b.toLowerCase().includes(s));

      return (aSlow === bSlow) ? 0 : aSlow ? -1 : 1;

  });



  sortedTools.forEach(toolName => {

      const tasks = toolTasks.get(toolName) || [];

      

      // Check for MERGEABLE tasks (Same ingredient in same tool)

      // e.g. Rice in Pot for Recipe A, Rice in Pot for Recipe B

      const mergedTasks = new Map<string, { amount: number, unit: string, recipes: Set<string> }>();

      

      tasks.forEach(t => {

          // Key by ingredient name to merge "Rice" with "Rice"

          const key = t.ingredient;

          const entry = mergedTasks.get(key) || { amount: 0, unit: t.unit, recipes: new Set() };

          entry.amount += t.amount;

          entry.recipes.add(t.recipe);

          mergedTasks.set(key, entry);

      });



      // Output for this Tool

      const actions: string[] = [];

      mergedTasks.forEach((data, ingName) => {

          if (data.recipes.size > 1) {

              // It's a BATCH!

              actions.push(`**BATCH COOK**: ${data.amount.toFixed(0)}${data.unit} **${ingName}** (for ${Array.from(data.recipes).join(' & ')}).`);

          } else {

              // Single recipe use

              actions.push(`Cook ${data.amount.toFixed(0)}${data.unit} ${ingName} (for ${Array.from(data.recipes)[0]}).`);

          }

      });



      if (actions.length > 0) {

          strategy.push(`*Station: ${toolName}*`);

          actions.forEach(a => strategy.push(`- ${a}`));

      }

  });

  

  strategy.push(`**Phase 3: Assembly**`);

  strategy.push(`- Portion out all ${meals.length} meals into containers.`);

  strategy.push(`- Allow to cool before refrigerating.`);



  return strategy

}


