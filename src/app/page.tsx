"use client"

import { useMemo, useEffect } from "react"
import Link from "next/link"
import { usePlanStore } from "@/store/usePlanStore"
import { useRecipeStore } from "@/store/useRecipeStore"
import { useIngredientStore } from "@/store/useIngredientStore"
import { useTemplateStore } from "@/store/useTemplateStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { calculateRecipeMacros } from "@/lib/badges"
import { generatePlanInsights } from "@/lib/insight-engine"
import { 
  ArrowRight, 
  LayoutDashboard, 
  Utensils, 
  Beef, 
  Calendar, 
  Zap,
  Lightbulb
} from "lucide-react"

export default function Dashboard() {
  const { plans, fetchPlans } = usePlanStore()
  const { templates, loadTemplates } = useTemplateStore()
  const { recipes } = useRecipeStore()
  const { ingredients } = useIngredientStore()

  useEffect(() => {
    fetchPlans()
    loadTemplates()
  }, [])

  const { stats, insights } = useMemo(() => {
    let totalCals = 0
    let totalMeals = 0
    const activeIngredients = new Set<string>()
    const toolsUsed = new Set<string>()
    const allMeals: any[] = []

    // 1. Process Scheduled Plans
    plans.forEach(plan => {
      plan.meals.forEach(meal => {
        totalMeals++
        allMeals.push({ ...meal, planId: 'scheduled' })
        
        const recipe = recipes.find(r => r.id === meal.recipeId)
        if (recipe) {
          const macros = calculateRecipeMacros(recipe, ingredients)
          totalCals += macros.calories
          recipe.steps.forEach(step => {
             step.ingredients.forEach(ri => activeIngredients.add(ri.ingredientId))
             step.tools.forEach(t => toolsUsed.add(t.id))
          })
        }
      })
    })

    // 2. Process Active Templates (if no scheduled plans, or additive?)
    // User expectation: Active Plan is the "Reality" they are building. 
    // We add them to the stats.
    const activeTemplates = templates.filter(t => t.isActive)
    activeTemplates.forEach(template => {
        template.days.forEach(day => {
            day.meals.forEach(meal => {
                // Check if we are double counting? 
                // Simple heuristic: If we have scheduled plans, maybe we ignore templates?
                // But the user complained about empty dashboard. So likely plans is empty.
                // Let's just add everything for now.
                totalMeals++
                allMeals.push({ ...meal, planId: 'template', id: meal.id + '_temp' }) // ensure unique ID for keying if needed
                
                // For templates, we might have the recipe object embedded, or we look up by ID
                const recipe = recipes.find(r => r.id === meal.recipeId)
                if (recipe) {
                    const macros = calculateRecipeMacros(recipe, ingredients)
                    // Note: Templates are multi-day, "Total Calories" usually implies "Per Day" or "Per Week".
                    // Here we sum EVERYTHING. It's a "Total Planned Volume" metric.
                    totalCals += macros.calories
                    recipe.steps.forEach(step => {
                        step.ingredients.forEach(ri => activeIngredients.add(ri.ingredientId))
                        step.tools.forEach(t => toolsUsed.add(t.id))
                    })
                }
            })
        })
    })

    // Generate real insights
    const fakePlan: any = {
        id: 'dashboard-agg',
        date: new Date().toISOString(),
        meals: allMeals
    }
    const generatedInsights = generatePlanInsights(fakePlan, recipes, ingredients)

    return {
      stats: {
        totalCals,
        totalMeals,
        uniqueIngredients: activeIngredients.size,
        uniqueTools: toolsUsed.size
      },
      insights: generatedInsights
    }
  }, [plans, templates, recipes, ingredients])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Welcome back!
        </h1>
        <p className="text-xl text-muted-foreground">
          Here's what's happening with your meal prep this week.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned Meals</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMeals}</div>
            <p className="text-xs text-muted-foreground">Across all plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calories</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCals.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Estimated total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Ingredients</CardTitle>
            <Beef className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueIngredients}</div>
            <p className="text-xs text-muted-foreground">Efficiency: {stats.totalMeals > 0 ? (stats.uniqueIngredients / stats.totalMeals).toFixed(1) : 0} per meal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tools Required</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueTools}</div>
            <p className="text-xs text-muted-foreground">Different kitchen tools</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with your planning.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/ingredients">
                <Beef className="mr-2 h-4 w-4" /> Add new ingredients
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/recipes">
                <Utensils className="mr-2 h-4 w-4" /> Create a new recipe
              </Link>
            </Button>
            <Button asChild className="justify-start">
              <Link href="/plan">
                <Calendar className="mr-2 h-4 w-4" /> Go to Meal Planner
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Optimization Tips
            </CardTitle>
            <CardDescription>Insights based on your current plans.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.length > 0 ? (
                <div className="grid gap-2">
                    {insights.slice(0, 3).map((insight, i) => (
                        <div key={i} className="rounded-lg bg-muted/50 p-3 text-sm border flex gap-3 items-start">
                           <Badge variant={insight.type} className="mt-0.5 shrink-0">{insight.type.toUpperCase()}</Badge>
                           <div>
                                <span className="font-semibold block">{insight.title}</span>
                                <span className="text-muted-foreground">{insight.message}</span>
                           </div>
                        </div>
                    ))}
                    {insights.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                            + {insights.length - 3} more insights available in the planner.
                        </p>
                    )}
                </div>
              ) : stats.totalMeals > 0 ? (
                <div className="rounded-lg bg-green-50 p-4 text-sm border border-green-100 text-green-800">
                  <p className="font-semibold">Great job!</p>
                  <p>Your meal plan looks balanced and efficient. No critical issues detected.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Start adding meals to your plan to generate insights!
                </p>
              )}
            </div>
            
            <Button asChild variant="link" className="mt-4 p-0">
              <Link href="/plan" className="flex items-center">
                Go to Planner <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}