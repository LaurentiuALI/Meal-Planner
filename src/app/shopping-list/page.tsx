"use client"

import { useMemo, useEffect } from "react"
import { useTemplateStore } from "@/store/useTemplateStore"
import { useRecipeStore } from "@/store/useRecipeStore"
import { useIngredientStore } from "@/store/useIngredientStore"
import { useShoppingListStore } from "@/store/useShoppingListStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingBasket, CheckCircle2, AlertTriangle, Check, Trash2 } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function ShoppingListPage() {
  const { templates, loadTemplates } = useTemplateStore()
  const { recipes } = useRecipeStore()
  const { ingredients } = useIngredientStore()
  const { checkedItems, toggleItem, clearChecked } = useShoppingListStore()

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

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
    }).filter(Boolean).sort((a: any, b: any) => {
        // Sort by checked state (unchecked first)
        const aChecked = checkedItems[a.id] ? 1 : 0
        const bChecked = checkedItems[b.id] ? 1 : 0
        if (aChecked !== bChecked) return aChecked - bChecked
        
        // Then by name
        return a.name.localeCompare(b.name)
    })
  }, [activePlans, recipes, ingredients, checkedItems])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
          <p className="text-muted-foreground">
            Optimized grocery list based on your <strong>{activePlans.length} active plan(s)</strong>.
          </p>
        </div>
        {Object.values(checkedItems).some(Boolean) && (
            <Button variant="outline" size="sm" onClick={clearChecked} className="text-muted-foreground">
                <Trash2 className="w-4 h-4 mr-2" /> Clear Checked
            </Button>
        )}
      </div>

      {activePlans.length === 0 && (
           <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
               <AlertTriangle className="h-4 w-4 text-yellow-800" />
               <AlertTitle>No Active Plans</AlertTitle>
                          <AlertDescription>
                              You don&apos;t have any active meal plans. Go to the <strong>Meal Planner</strong> and mark a plan as &quot;Active&quot; to generate your list.
                          </AlertDescription>           </Alert>
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
          <div className="space-y-2">
            {shoppingList.length > 0 ? (
              shoppingList.map((item: any) => {
                const isChecked = checkedItems[item.id];
                return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "flex items-center justify-between border rounded-lg p-3 transition-all cursor-pointer select-none",
                    isChecked ? "bg-muted/50 border-muted opacity-60" : "bg-card hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                        "h-5 w-5 rounded border flex items-center justify-center transition-colors shrink-0",
                        isChecked ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background"
                    )}>
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                    </div>
                    
                    <div className={cn("flex-1 min-w-0", isChecked && "line-through text-muted-foreground decoration-muted-foreground/50")}>
                        <div className="font-semibold text-lg leading-none truncate">{item.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                        Need: {item.needed.toFixed(0)}
                        {item.unit}
                        </div>
                    </div>
                  </div>
                  
                  <div className={cn("text-right pl-2", isChecked && "opacity-50")}>
                    <Badge variant={isChecked ? "outline" : "secondary"} className="text-sm px-3 py-1 whitespace-nowrap">
                      {item.purchaseUnitsNeeded} × {item.purchaseUnitName}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Total: {item.totalPurchasedAmount}
                      {item.unit}
                    </div>
                  </div>
                </div>
              )})
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