"use client"

import { useState, useMemo } from "react"
import { useRecipeStore } from "@/store/useRecipeStore"
import { useIngredientStore } from "@/store/useIngredientStore"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { Recipe } from "@/types"
import { Plus, Trash2, Edit2, Utensils } from "lucide-react"
import { calculateRecipeMacros, evaluateRecipeBadges } from "@/lib/badges"

import { ToolsManager } from "@/components/recipes/tools-manager"

export default function RecipesPage() {
  const { recipes, deleteRecipe } = useRecipeStore()
  const { ingredients } = useIngredientStore()
  const [isAdding, setIsAdding] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  const recipesWithBadges = useMemo(() => {
    return recipes.map(recipe => {
      const macros = calculateRecipeMacros(recipe, ingredients)
      const badges = evaluateRecipeBadges(recipe, macros)
      return { ...recipe, macros, badges }
    })
  }, [recipes, ingredients])

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
          <p className="text-muted-foreground">
            Create and manage your recipes with automated macro calculation.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <ToolsManager />
            <Button onClick={() => setIsAdding(true)} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" /> Create Recipe
            </Button>
        </div>
      </div>

      {(isAdding || editingRecipe) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingRecipe ? "Edit Recipe" : "Create New Recipe"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecipeForm
              initialData={editingRecipe || undefined}
              onSuccess={() => {
                setIsAdding(false)
                setEditingRecipe(null)
              }}
            />
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                setIsAdding(false)
                setEditingRecipe(null)
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recipesWithBadges.map((recipe) => (
          <Card key={recipe.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">{recipe.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingRecipe(recipe)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRecipe(recipe.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {recipe.steps.reduce((acc, s) => acc + s.ingredients.length, 0)} ingredients
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex flex-col gap-2">
                {recipe.badges.some(b => b.type === 'success' || b.type === 'info') && (
                    <div className="flex flex-wrap gap-1">
                        {recipe.badges.filter(b => b.type === 'success' || b.type === 'info').map((badge, i) => (
                        <Badge key={i} variant={badge.type} className="text-[10px] px-1.5 py-0 h-5">
                            {badge.label}
                        </Badge>
                        ))}
                    </div>
                )}
                {recipe.badges.some(b => b.type === 'error' || b.type === 'warning') && (
                    <div className="flex flex-wrap gap-1">
                        {recipe.badges.filter(b => b.type === 'error' || b.type === 'warning').map((badge, i) => (
                        <Badge key={i} variant={badge.type} className="text-[10px] px-1.5 py-0 h-5">
                            {badge.label}
                        </Badge>
                        ))}
                    </div>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs border-t pt-4">
                <div>
                  <div className="font-bold">{recipe.macros.calories.toFixed(0)}</div>
                  <div className="text-muted-foreground">Cals</div>
                </div>
                <div>
                  <div className="font-bold">{recipe.macros.protein.toFixed(1)}g</div>
                  <div className="text-muted-foreground">P</div>
                </div>
                <div>
                  <div className="font-bold">{recipe.macros.carbs.toFixed(1)}g</div>
                  <div className="text-muted-foreground">C</div>
                </div>
                <div>
                  <div className="font-bold">{recipe.macros.fat.toFixed(1)}g</div>
                  <div className="text-muted-foreground">F</div>
                </div>
                <div>
                  <div className="font-bold">{recipe.macros.fiber.toFixed(1)}g</div>
                  <div className="text-muted-foreground">Fib</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {recipes.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
            <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No recipes yet</h3>
            <p className="text-muted-foreground">Add your first recipe to get started.</p>
            <Button className="mt-4" onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Recipe
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
