'use server'

import { db } from '@/lib/db'
import { DayPlan, Meal, Settings } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getPlans(): Promise<DayPlan[]> {
  const data = await db.dayPlan.findMany({
    include: {
      meals: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  })

  return data.map(p => ({
    id: p.id,
    date: p.date,
    meals: p.meals.map(m => ({
      id: m.id,
      sortOrder: m.sortOrder,
      slotName: m.slotName,
      recipeId: m.recipeId,
      servings: m.servings
    }))
  }))
}

export async function getSettings(): Promise<Settings> {
  if (!db.settings) {
    throw new Error("Database client is out of sync with schema. Please restart your development server to apply changes.")
  }
  const settings = await db.settings.findUnique({
    where: { id: 'global' }
  })
  
  if (!settings) {
    // Return defaults if not found
    return {
      calorieTarget: 2000,
      proteinTarget: 150,
      carbsTarget: 200,
      fatTarget: 60,
      fiberTarget: 30
    }
  }

  return {
    calorieTarget: settings.calorieTarget,
    proteinTarget: settings.proteinTarget,
    carbsTarget: settings.carbsTarget,
    fatTarget: settings.fatTarget,
    fiberTarget: settings.fiberTarget
  }
}

export async function updateSettings(newSettings: Settings) {
  await db.settings.upsert({
    where: { id: 'global' },
    create: { id: 'global', ...newSettings },
    update: { ...newSettings }
  })
  revalidatePath('/plan')
}

export async function addDay(date: string) {
  await db.dayPlan.upsert({
    where: { date },
    create: { date },
    update: {}
  })
  revalidatePath('/plan')
}

export async function removeDay(date: string) {
  await db.dayPlan.delete({ where: { date } })
  revalidatePath('/plan')
}

export async function setMeal(date: string, meal: Omit<Meal, 'id' | 'sortOrder'>, mealIndex: number) {
  const plan = await db.dayPlan.upsert({
    where: { date },
    create: { date },
    update: {}
  })

  const existingMeal = await db.meal.findFirst({
    where: {
      planId: plan.id,
      sortOrder: mealIndex
    }
  })

  if (existingMeal) {
    await db.meal.update({
      where: { id: existingMeal.id },
      data: {
        recipeId: meal.recipeId,
        servings: meal.servings,
        slotName: meal.slotName
      }
    })
  } else {
    await db.meal.create({
      data: {
        planId: plan.id,
        recipeId: meal.recipeId,
        servings: meal.servings,
        sortOrder: mealIndex,
        slotName: meal.slotName
      }
    })
  }
  
  revalidatePath('/plan')
}

export async function removeMeal(mealId: string) {
  await db.meal.delete({ where: { id: mealId } })
  revalidatePath('/plan')
}

export async function resetPlan() {
  await db.meal.deleteMany({})
  await db.dayPlan.deleteMany({})
  revalidatePath('/plan')
}
