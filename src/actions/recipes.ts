'use server'

import { db } from '@/lib/db'
import { Recipe, Tool } from '@/types'
import { revalidatePath } from 'next/cache'

// --- Tools ---
export async function getTools(): Promise<Tool[]> {
  return await db.tool.findMany({ orderBy: { name: 'asc' } });
}

export async function createTool(name: string): Promise<Tool> {
  const tool = await db.tool.create({ data: { name } });
  return tool;
}

export async function deleteTool(id: string) {
  await db.tool.delete({ where: { id } });
}

// --- Recipes ---

export async function getRecipes(): Promise<Recipe[]> {
  const data = await db.recipe.findMany({
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
        include: {
          ingredients: { include: { ingredient: true } }, // Include ingredient details for macros
          tools: { include: { tool: true } }
        }
      }
    }
  });

  return data.map(r => ({
    id: r.id,
    name: r.name,
    method: JSON.parse(r.method || '[]'),
    steps: r.steps.map(s => ({
      id: s.id,
      description: s.description,
      sortOrder: s.sortOrder,
      ingredients: s.ingredients.map(ri => ({
        ingredientId: ri.ingredientId,
        amount: ri.amount,
        ingredient: { // Map the nested ingredient details
             id: ri.ingredient.id,
             name: ri.ingredient.name,
             unit: ri.ingredient.unit,
             macros: {
                protein: ri.ingredient.protein,
                carbs: ri.ingredient.carbs,
                fat: ri.ingredient.fat,
                calories: ri.ingredient.calories,
                fiber: ri.ingredient.fiber
             },
             purchaseUnit: {
                 name: ri.ingredient.purchaseUnitName,
                 amount: ri.ingredient.purchaseUnitAmount
             }
        }
      })),
      tools: s.tools.map(st => st.tool)
    }))
  }))
}

export async function createRecipe(data: Omit<Recipe, 'id'>) {
  const recipe = await db.recipe.create({
    data: {
      name: data.name,
      method: JSON.stringify(data.method || []),
      steps: {
        create: data.steps.map((step, index) => ({
          description: step.description,
          sortOrder: index,
          ingredients: {
            create: step.ingredients.map(ri => ({
              ingredientId: ri.ingredientId,
              amount: ri.amount
            }))
          },
          tools: {
            create: step.tools.map(t => ({
              toolId: t.id
            }))
          }
        }))
      }
    }
  })
  revalidatePath('/recipes')
  return recipe
}

export async function updateRecipe(id: string, data: Partial<Recipe>) {
  // Strategy: Delete all steps and recreate them. 
  // This avoids complex diffing logic for nested arrays.
  
  await db.$transaction(async (tx) => {
    // 1. Update basic fields
    if (data.name || data.method) {
        await tx.recipe.update({
            where: { id },
            data: {
                name: data.name,
                method: data.method ? JSON.stringify(data.method) : undefined
            }
        });
    }

    // 2. If steps are provided, replace them
    if (data.steps) {
        // Delete existing steps (cascade deletes ingredients/steptools)
        await tx.recipeStep.deleteMany({ where: { recipeId: id } });

        // Create new steps
        for (let i = 0; i < data.steps.length; i++) {
            const step = data.steps[i];
            await tx.recipeStep.create({
                data: {
                    recipeId: id,
                    description: step.description,
                    sortOrder: i,
                    ingredients: {
                        create: step.ingredients.map(ri => ({
                            ingredientId: ri.ingredientId,
                            amount: ri.amount
                        }))
                    },
                    tools: {
                        create: step.tools.map(t => ({
                            toolId: t.id
                        }))
                    }
                }
            });
        }
    }
  });

  revalidatePath('/recipes')
}

export async function deleteRecipe(id: string) {
  await db.recipe.delete({ where: { id } })
  revalidatePath('/recipes')
}