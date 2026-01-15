'use server'

import { db } from "@/lib/db";
import { PlanTemplate, TemplateDay, TemplateMeal, Ingredient } from "@/types";
import { revalidatePath } from "next/cache";

// --- Plan Template CRUD ---

export async function getTemplates(): Promise<PlanTemplate[]> {
  if (!db.planTemplate) {
    throw new Error("Database client not initialized. Please restart your development server and run 'npx prisma generate' to apply schema changes.");
  }
  const templates = await db.planTemplate.findMany({
    include: {
      days: {
        orderBy: { sortOrder: 'asc' },
        include: {
          meals: {
            orderBy: { sortOrder: 'asc' },
            include: {
                ingredient: true,
              recipe: {
                include: {
                  steps: {
                     orderBy: { sortOrder: 'asc' },
                     include: {
                        ingredients: {
                           include: { ingredient: true }
                        },
                        tools: {
                           include: { tool: true }
                        }
                     }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Map Prisma structure to our Type interfaces
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    isActive: t.isActive,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    days: t.days.map(d => ({
      id: d.id,
      planTemplateId: d.planTemplateId,
      name: d.name,
      sortOrder: d.sortOrder,
      targetCalories: d.targetCalories ?? undefined,
      targetProtein: d.targetProtein ?? undefined,
      targetCarbs: d.targetCarbs ?? undefined,
      targetFat: d.targetFat ?? undefined,
      targetFiber: d.targetFiber ?? undefined,
      meals: d.meals.map((m: any) => ({
        id: m.id,
        templateDayId: m.templateDayId,
        recipeId: m.recipeId,
        ingredientId: m.ingredientId,
        ingredientAmount: m.ingredientAmount,
        ingredient: m.ingredient ? {
            id: m.ingredient.id,
            name: m.ingredient.name,
            unit: m.ingredient.unit,
            macros: {
                protein: m.ingredient.protein,
                carbs: m.ingredient.carbs,
                fat: m.ingredient.fat,
                calories: m.ingredient.calories,
                fiber: m.ingredient.fiber
            },
            purchaseUnit: {
                name: m.ingredient.purchaseUnitName,
                amount: m.ingredient.purchaseUnitAmount
            }
        } : undefined,
        slotName: m.slotName,
        sortOrder: m.sortOrder,
        servings: m.servings,
        recipe: m.recipe ? {
          id: m.recipe.id,
          name: m.recipe.name,
          method: [], // JSON parse if needed, usually simple array
          steps: m.recipe.steps.map((s: any) => ({
             id: s.id,
             description: s.description,
             sortOrder: s.sortOrder,
             ingredients: s.ingredients.map((ri: any) => ({
                ingredientId: ri.ingredientId,
                amount: ri.amount,
                ingredient: {
                    id: ri.ingredient.id,
                    name: ri.ingredient.name,
                    unit: ri.ingredient.unit,
                    macros: {
                        protein: ri.ingredient.protein,
                        carbs: ri.ingredient.carbs,
                        fat: ri.ingredient.fat,
                        calories: ri.ingredient.calories,
                        fiber: ri.ingredient.fiber,
                    },
                    purchaseUnit: {
                        name: ri.ingredient.purchaseUnitName,
                        amount: ri.ingredient.purchaseUnitAmount,
                    },
                    barcodes: []
                }
             })),
             tools: s.tools.map((st: any) => st.tool)
          }))
        } : undefined
      }))
    }))
  }));
}

export async function createPlanTemplate(name: string) {
  await db.planTemplate.create({
    data: { name }
  });
  revalidatePath('/plan');
}

export async function updatePlanTemplate(id: string, name: string) {
  await db.planTemplate.update({
    where: { id },
    data: { name }
  });
  revalidatePath('/plan');
}

export async function deletePlanTemplate(id: string) {
  await db.planTemplate.delete({
    where: { id }
  });
  revalidatePath('/plan');
}

export async function togglePlanActive(id: string, isActive: boolean) {
  await db.planTemplate.update({
    where: { id },
    data: { isActive }
  });
  revalidatePath('/plan');
}

// --- Template Day CRUD ---

export async function addDayToTemplate(templateId: string, name: string = "New Day") {
  const lastDay = await db.templateDay.findFirst({
    where: { planTemplateId: templateId },
    orderBy: { sortOrder: 'desc' }
  });
  
  const sortOrder = lastDay ? lastDay.sortOrder + 1 : 0;

  await db.templateDay.create({
    data: {
      planTemplateId: templateId,
      name,
      sortOrder
    }
  });
  revalidatePath('/plan');
}

export async function updateTemplateDay(dayId: string, data: Partial<TemplateDay>) {
  const { id, planTemplateId, meals, ...updateData } = data as any;
  
  await db.templateDay.update({
    where: { id: dayId },
    data: updateData
  });
  revalidatePath('/plan');
}

export async function removeTemplateDay(dayId: string) {
  await db.templateDay.delete({
    where: { id: dayId }
  });
  revalidatePath('/plan');
}

// --- Template Meal CRUD ---

export async function addMealToTemplateDay(dayId: string, recipeId: string, slotName: string = "Meal") {
   const lastMeal = await db.templateMeal.findFirst({
    where: { templateDayId: dayId },
    orderBy: { sortOrder: 'desc' }
  });
  
  const sortOrder = lastMeal ? lastMeal.sortOrder + 1 : 0;

  await db.templateMeal.create({
    data: {
      templateDayId: dayId,
      recipeId,
      slotName,
      sortOrder
    }
  });
  revalidatePath('/plan');
}

export async function addIngredientToTemplateDay(dayId: string, ingredientId: string, amount: number, slotName: string = "Meal") {
    const lastMeal = await db.templateMeal.findFirst({
     where: { templateDayId: dayId },
     orderBy: { sortOrder: 'desc' }
   });
   
   const sortOrder = lastMeal ? lastMeal.sortOrder + 1 : 0;
 
   await db.templateMeal.create({
     data: {
       templateDayId: dayId,
       ingredientId,
       ingredientAmount: amount,
       slotName,
       sortOrder
     }
   });
   revalidatePath('/plan');
 }

export async function updateTemplateMeal(mealId: string, data: Partial<TemplateMeal>) {
  // Exclude fields that shouldn't be updated directly or need special handling if necessary
  // But for now, simple update is fine.
  // Note: Prisma types vs Our Types mismatch might require 'as any' or selective picking
  const { id, templateDayId, recipe, ingredient, modifications, ...updateData } = data as any;

  await db.templateMeal.update({
    where: { id: mealId },
    data: updateData
  });
  revalidatePath('/plan');
}

export async function removeTemplateMeal(mealId: string) {
  await db.templateMeal.delete({
    where: { id: mealId }
  });
  revalidatePath('/plan');
}

// --- Instantiation (Apply Plan) ---

export async function applyPlanToSchedule(templateId: string, startDateStr: string) {
  const template = await db.planTemplate.findUnique({
    where: { id: templateId },
    include: {
      days: {
        orderBy: { sortOrder: 'asc' },
        include: {
          meals: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      }
    }
  });

  if (!template) throw new Error("Template not found");

  const startDate = new Date(startDateStr);

  await db.$transaction(async (tx) => {
    for (let i = 0; i < template.days.length; i++) {
      const templateDay = template.days[i];
      const currentLoopDate = new Date(startDate);
      currentLoopDate.setDate(startDate.getDate() + i);
      const dateStr = currentLoopDate.toISOString().split('T')[0];
      
      let dayPlan = await tx.dayPlan.findUnique({
        where: { date: dateStr }
      });

      if (!dayPlan) {
        dayPlan = await tx.dayPlan.create({
          data: { date: dateStr }
        });
      }

      const existingMealsCount = await tx.meal.count({
        where: { planId: dayPlan.id }
      });
      
      let currentSortOrder = existingMealsCount;

      for (const tm of templateDay.meals) {
        await tx.meal.create({
          data: {
            planId: dayPlan.id,
            recipeId: tm.recipeId,
            ingredientId: tm.ingredientId,
            ingredientAmount: tm.ingredientAmount,
            slotName: tm.slotName, 
            sortOrder: currentSortOrder++,
            servings: tm.servings,
            modifications: tm.modifications
          } as any
        });
      }
    }
  });
  
  
  
  revalidatePath('/plan');
  
}
  

  
export async function updateMealModifications(mealId: string, modifications: any) {
  
  await db.templateMeal.update({
  
    where: { id: mealId },
  
    data: { 
  
        modifications: JSON.stringify(modifications)
  
    }
  
  });
  
  revalidatePath('/plan');
  
}
  
export async function moveMealInTemplate(
  mealId: string, 
  targetDayId: string, 
  slotName: string, 
  newIndex: number
) {
  await db.$transaction(async (tx) => {
    // 1. Get the meal to check current location
    const meal = await tx.templateMeal.findUnique({ where: { id: mealId } });
    if (!meal) throw new Error("Meal not found");

    // 2. If moving to a different list (Day or Slot changed)
    if (meal.templateDayId !== targetDayId || meal.slotName !== slotName) {
      // Shift items in new list >= newIndex
      await tx.templateMeal.updateMany({
        where: { 
            templateDayId: targetDayId, 
            slotName: slotName, 
            sortOrder: { gte: newIndex } 
        },
        data: { sortOrder: { increment: 1 } }
      });

      // Update the meal
      await tx.templateMeal.update({
        where: { id: mealId },
        data: { 
            templateDayId: targetDayId, 
            slotName: slotName, 
            sortOrder: newIndex 
        }
      });
      
    } else {
        // Same list reorder
        if (meal.sortOrder === newIndex) return;
        
        if (meal.sortOrder < newIndex) {
            // Shift items between old and new index down
             await tx.templateMeal.updateMany({
                where: {
                    templateDayId: targetDayId,
                    slotName: slotName,
                    sortOrder: { gt: meal.sortOrder, lte: newIndex },
                    id: { not: mealId }
                },
                data: { sortOrder: { decrement: 1 } }
             });
        } else {
             // Shift items between new and old index up
             await tx.templateMeal.updateMany({
                where: {
                    templateDayId: targetDayId,
                    slotName: slotName,
                    sortOrder: { gte: newIndex, lt: meal.sortOrder },
                    id: { not: mealId }
                },
                data: { sortOrder: { increment: 1 } }
             });
        }

        await tx.templateMeal.update({
            where: { id: mealId },
            data: { sortOrder: newIndex }
        });
    }
  });
  
  revalidatePath('/plan');
}