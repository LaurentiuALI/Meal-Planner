"use client"

import { useState, useMemo } from "react"
import { useRecipeStore } from "@/store/useRecipeStore"
import { useIngredientStore } from "@/store/useIngredientStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Recipe, RecipeIngredient } from "@/types"
import { Calculator, Plus } from "lucide-react"
import { calculateRecipeMacros, evaluateRecipeBadges } from "@/lib/badges"
import { RecipeStepEditor, FormStep } from "./recipe-step-editor"
import { useToolStore } from "@/store/useToolStore"

interface RecipeFormProps {
  initialData?: Recipe
  onSuccess?: () => void
}

export function RecipeForm({ initialData, onSuccess }: RecipeFormProps) {
  const { addRecipe, updateRecipe } = useRecipeStore()
  const { ingredients: allIngredients } = useIngredientStore()
  const { tools: allTools } = useToolStore()

  const [name, setName] = useState(initialData?.name || "")
  const [method, setMethod] = useState(initialData?.method.join(", ") || "")
  
  // Transform initial steps or create default
  const [steps, setSteps] = useState<FormStep[]>(() => {
    if (initialData?.steps && initialData.steps.length > 0) {
      return initialData.steps.map(s => ({
        id: s.id,
        description: s.description,
        ingredients: [...s.ingredients, { ingredientId: "", amount: 0 }],
        toolIds: s.tools.map(t => t.id)
      }))
    }
    return [{ description: "", ingredients: [{ ingredientId: "", amount: 0 }], toolIds: [] }]
  })

  // Live Analysis
  const analysis = useMemo(() => {
    // Reconstruct a temporary Recipe object for macro calculation
    const tempRecipe: any = {
      steps: steps.map(s => ({
        ingredients: s.ingredients.filter(ri => ri.ingredientId),
        tools: s.toolIds.map(id => allTools.find(t => t.id === id)).filter(Boolean)
      })),
      method: method.split(",").map(m => m.trim()).filter(Boolean)
    }
    
    const macros = calculateRecipeMacros(tempRecipe, allIngredients)
    const badges = evaluateRecipeBadges(tempRecipe, macros)
    return { macros, badges }
  }, [steps, method, allIngredients, allTools])

  const handleStepChange = (index: number, updates: Partial<FormStep>) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[index] = { ...newSteps[index], ...updates }
      return newSteps
    })
  }

  const addStep = () => {
    setSteps(prev => [...prev, { description: "", ingredients: [{ ingredientId: "", amount: 0 }], toolIds: [] }])
  }

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index))
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= steps.length) return;
    setSteps(prev => {
        const newSteps = [...prev];
        const temp = newSteps[index];
        newSteps[index] = newSteps[index + direction];
        newSteps[index + direction] = temp;
        return newSteps;
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate steps
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const validIngredients = step.ingredients.filter(ri => ri.ingredientId);
        if (validIngredients.length === 0) {
            alert(`Step ${i + 1} must have at least one ingredient.`);
            return;
        }
    }

    const recipeData = {
      name,
      method: method.split(",").map(m => m.trim()).filter(Boolean),
      steps: steps.map(s => ({
        description: s.description,
        ingredients: s.ingredients.filter(ri => ri.ingredientId), // Remove ghosts
        tools: s.toolIds.map(id => ({ id })) // Map to object with ID
      }))
    }

    if (initialData) {
      updateRecipe(initialData.id, recipeData as any)
    } else {
      addRecipe(recipeData as any)
    }

    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="name">Recipe Name</Label>
            <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="method">Method (comma separated)</Label>
            <Input
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="one pot, baking..."
            />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <Label className="text-lg">Preparation Steps</Label>
        </div>
        
        {steps.map((step, index) => (
            <RecipeStepEditor
                key={index} // Index key is safe here as we manage order manually
                index={index}
                step={step}
                onChange={(updates) => handleStepChange(index, updates)}
                onRemove={() => removeStep(index)}
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                onMoveUp={() => moveStep(index, -1)}
                onMoveDown={() => moveStep(index, 1)}
            />
        ))}

        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addStep}>
            <Plus className="mr-2 h-4 w-4" /> Add Step
        </Button>
      </div>

      <Card className="bg-muted/50">
        <CardHeader className="py-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Live Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-4">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div>
              <div className="font-bold">{analysis.macros.calories.toFixed(0)}</div>
              <div className="text-muted-foreground">Cals</div>
            </div>
            <div>
              <div className="font-bold">{analysis.macros.protein.toFixed(1)}g</div>
              <div className="text-muted-foreground">P</div>
            </div>
            <div>
              <div className="font-bold">{analysis.macros.carbs.toFixed(1)}g</div>
              <div className="text-muted-foreground">C</div>
            </div>
            <div>
              <div className="font-bold">{analysis.macros.fat.toFixed(1)}g</div>
              <div className="text-muted-foreground">F</div>
            </div>
            <div>
              <div className="font-bold">{analysis.macros.fiber.toFixed(1)}g</div>
              <div className="text-muted-foreground">Fiber</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {analysis.badges.some(b => b.type === 'success' || b.type === 'info') && (
                <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-semibold text-green-600 mr-2 self-center">PROS:</span>
                    {analysis.badges.filter(b => b.type === 'success' || b.type === 'info').map((badge, i) => (
                    <Badge key={i} variant={badge.type}>
                        {badge.label}
                    </Badge>
                    ))}
                </div>
            )}
            {analysis.badges.some(b => b.type === 'error' || b.type === 'warning') && (
                <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-semibold text-red-600 mr-2 self-center">CONS:</span>
                    {analysis.badges.filter(b => b.type === 'error' || b.type === 'warning').map((badge, i) => (
                    <Badge key={i} variant={badge.type}>
                        {badge.label}
                    </Badge>
                    ))}
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full">
        {initialData ? "Update Recipe" : "Save Recipe"}
      </Button>
    </form>
  )
}
