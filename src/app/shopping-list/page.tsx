"use client"

import { useMemo, useEffect } from "react"
import { useTemplateStore } from "@/store/useTemplateStore"
import { useRecipeStore } from "@/store/useRecipeStore"
import { useIngredientStore } from "@/store/useIngredientStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingBasket, CheckCircle2, AlertTriangle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function ShoppingListPage() {
  const { templates, loadTemplates } = useTemplateStore()
  const { recipes } = useRecipeStore()
  const { ingredients } = useIngredientStore()

  useEffect(() => {
    loadTemplates()
  }, [])

  const activePlans = templates.filter(t => t.isActive);

  const shoppingList = useMemo(() => {
    const aggregates: Record<string, number> = {}

    // 1. Aggregate all ingredient amounts from ACTIVE templates
    activePlans.forEach((plan) => {
      plan.days.forEach((day) => {
          day.meals.forEach((meal) => {
             // We need to resolve recipe. If it's included in template, use it.
             // Our getTemplates includes recipe data.
             const recipe = meal.recipe; // This works because of our mapping in getTemplates
             
             if (recipe) {
                recipe.steps.forEach(step => {
                   step.ingredients.forEach((ri) => {
                      const amount = ri.amount * (meal.servings || 1)
                      aggregates[ri.ingredientId] = (aggregates[ri.ingredientId] || 0) + amount
                   })
                });
             } else {
                 // Fallback if recipe not populated in template object (should be)
                 // Try looking up in recipe store?
                 const r = recipes.find(x => x.id === meal.recipeId);
                 if (r) {
                      r.steps.forEach(step => {
                        step.ingredients.forEach((ri) => {
                          const amount = ri.amount * (meal.servings || 1)
                          aggregates[ri.ingredientId] = (aggregates[ri.ingredientId] || 0) + amount
                        })
                      })
                 }
             }
          })
      })
    })

    // 2. Map to final list with purchase unit logic
    return Object.entries(aggregates).map(([id, totalAmount]) => {
      const ingredient = ingredients.find((ing) => ing.id === id)
      if (!ingredient) return null

      const { name, unit, purchaseUnit } = ingredient
      // purchaseUnit might be undefined if not populated in store?
      // Ingredients store populates it.
      
      const pName = purchaseUnit?.name || 'unit';
      const pAmount = purchaseUnit?.amount || 1;

      const unitsNeeded = Math.ceil(totalAmount / pAmount)
      const totalPurchasedAmount = unitsNeeded * pAmount

      return {
        id,
        name,
        needed: totalAmount,
        unit,
        purchaseUnitName: pName,
        purchaseUnitsNeeded: unitsNeeded,
        totalPurchasedAmount,
      }
    }).filter(Boolean)
  }, [activePlans, recipes, ingredients])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
        <p className="text-muted-foreground">
          Optimized grocery list based on your <strong>{activePlans.length} active plan(s)</strong>.
        </p>
      </div>

      {activePlans.length === 0 && (
           <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
               <AlertTriangle className="h-4 w-4 text-yellow-800" />
               <AlertTitle>No Active Plans</AlertTitle>
               <AlertDescription>
                   You don't have any active meal plans. Go to the <strong>Meal Planner</strong> and mark a plan as "Active" to generate your list.
               </AlertDescription>
           </Alert>
      )}

      {activePlans.length > 1 && (
           <Alert variant="destructive">
               <AlertTriangle className="h-4 w-4" />
               <AlertTitle>Multiple Active Plans</AlertTitle>
               <AlertDescription>
                   This list combines ingredients from: {activePlans.map(p => p.name).join(', ')}.
               </AlertDescription>
           </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5" /> Ingredients to Buy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shoppingList.length > 0 ? (
              shoppingList.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-semibold text-lg">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Need: {item.needed.toFixed(0)}
                      {item.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {item.purchaseUnitsNeeded} × {item.purchaseUnitName}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Total: {item.totalPurchasedAmount}
                      {item.unit}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                {activePlans.length > 0 ? (
                    <>
                        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 opacity-20" />
                        <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
                        Your active plans have no ingredients?
                        </h3>
                    </>
                ) : (
                     <div className="opacity-50">Select a plan to start.</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}