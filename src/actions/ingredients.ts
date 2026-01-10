'use server'

import { db } from '@/lib/db'
import { Ingredient } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getIngredients(): Promise<Ingredient[]> {
  const data = await db.ingredient.findMany({
    include: { barcodes: true }
  })
  return data.map(ing => ({
    id: ing.id,
    name: ing.name,
    unit: ing.unit,
    macros: {
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
      calories: ing.calories,
      fiber: ing.fiber,
    },
    purchaseUnit: {
      name: ing.purchaseUnitName,
      amount: ing.purchaseUnitAmount,
    },
    barcodes: ing.barcodes.map(b => b.code)
  }))
}

export async function createIngredient(data: Omit<Ingredient, 'id'>) {
  const ing = await db.ingredient.create({
    data: {
      name: data.name,
      unit: data.unit,
      protein: data.macros.protein,
      carbs: data.macros.carbs,
      fat: data.macros.fat,
      calories: data.macros.calories,
      fiber: data.macros.fiber,
      purchaseUnitName: data.purchaseUnit.name,
      purchaseUnitAmount: data.purchaseUnit.amount,
      barcodes: {
        create: data.barcodes?.map(code => ({ code })) || []
      }
    },
    include: { barcodes: true }
  })
  
  revalidatePath('/ingredients')
  
  return {
    id: ing.id,
    name: ing.name,
    unit: ing.unit,
    macros: {
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
      calories: ing.calories,
      fiber: ing.fiber,
    },
    purchaseUnit: {
      name: ing.purchaseUnitName,
      amount: ing.purchaseUnitAmount,
    },
    barcodes: ing.barcodes.map(b => b.code)
  }
}

export async function updateIngredient(id: string, data: Partial<Ingredient>) {
  // Map partial nested structures to flat DB structure
  const updateData: any = {}
  if (data.name) updateData.name = data.name
  if (data.unit) updateData.unit = data.unit
  if (data.macros) {
    if (data.macros.protein !== undefined) updateData.protein = data.macros.protein
    if (data.macros.carbs !== undefined) updateData.carbs = data.macros.carbs
    if (data.macros.fat !== undefined) updateData.fat = data.macros.fat
    if (data.macros.calories !== undefined) updateData.calories = data.macros.calories
    if (data.macros.fiber !== undefined) updateData.fiber = data.macros.fiber
  }
  if (data.purchaseUnit) {
    if (data.purchaseUnit.name) updateData.purchaseUnitName = data.purchaseUnit.name
    if (data.purchaseUnit.amount) updateData.purchaseUnitAmount = data.purchaseUnit.amount
  }

  // Handle barcode updates if present
  if (data.barcodes) {
    updateData.barcodes = {
      deleteMany: {}, // Delete all existing
      create: data.barcodes.map(code => ({ code })) // Create new ones
    }
  }

  await db.ingredient.update({
    where: { id },
    data: updateData,
  })
  revalidatePath('/ingredients')
}

export async function deleteIngredient(id: string) {
  await db.ingredient.delete({ where: { id } })
  revalidatePath('/ingredients')
}

export async function getIngredientByBarcode(code: string): Promise<Ingredient | null> {
  const barcode = await db.barcode.findUnique({
    where: { code },
    include: { ingredient: { include: { barcodes: true } } }
  })

  if (!barcode || !barcode.ingredient) return null;

  const ing = barcode.ingredient;
  return {
    id: ing.id,
    name: ing.name,
    unit: ing.unit,
    macros: {
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
      calories: ing.calories,
      fiber: ing.fiber,
    },
    purchaseUnit: {
      name: ing.purchaseUnitName,
      amount: ing.purchaseUnitAmount,
    },
    barcodes: ing.barcodes.map(b => b.code)
  }
}
