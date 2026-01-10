"use client"

import { useEffect } from "react"
import { useIngredientStore } from "@/store/useIngredientStore"
import { useRecipeStore } from "@/store/useRecipeStore"
import { usePlanStore } from "@/store/usePlanStore"

export function StoreHydrator() {
  const fetchIngredients = useIngredientStore((state) => state.fetchIngredients)
  const fetchRecipes = useRecipeStore((state) => state.fetchRecipes)
  const fetchPlans = usePlanStore((state) => state.fetchPlans)

  useEffect(() => {
    fetchIngredients()
    fetchRecipes()
    fetchPlans()
  }, [fetchIngredients, fetchRecipes, fetchPlans])

  return null
}
