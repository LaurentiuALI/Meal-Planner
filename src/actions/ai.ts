'use server'

import { Ollama } from 'ollama'
import { DayPlan, Recipe, Ingredient } from '@/types'

// Initialize Ollama client (defaults to localhost:11434)
const ollama = new Ollama()
const MODEL_NAME = "llama3.1" // The 8B model is the default 'llama3.1' tag

export async function generateAIInsights(
  plan: DayPlan,
  recipes: Recipe[],
  allIngredients: Ingredient[]
) {
  // Prepare context
  const mealDetails = plan.meals.map(meal => {
    const recipe = recipes.find(r => r.id === meal.recipeId)
    if (!recipe) return null
    
    // Flatten steps to get all tools and ingredients
    const tools = recipe.steps.flatMap(s => s.tools)
    const ingredients = recipe.steps.flatMap(s => s.ingredients).map(ri => {
        const ing = allIngredients.find(i => i.id === ri.ingredientId)
        return ing ? `${ri.amount}${ing.unit} ${ing.name}` : null
    }).filter(Boolean)

    return {
      slot: meal.slotName,
      name: recipe.name,
      tools,
      method: recipe.method,
      ingredients
    }
  }).filter(Boolean)

  if (mealDetails.length === 0) {
    return { insights: [], strategy: [] }
  }

  // Schema for structured output (Ollama JSON mode)
  const schema = {
    type: "object",
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["warning", "info", "success"] },
            title: { type: "string" },
            message: { type: "string" }
          },
          required: ["type", "title", "message"]
        }
      },
      strategy: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["insights", "strategy"]
  }

  const prompt = `
    You are an expert Meal Prep Chef. 
    Analyze the following meal plan for one day.
    
    Data:
    ${JSON.stringify(mealDetails, null, 2)}

    Task:
    1. Identify critical issues (conflicting tools, high complexity, nutritional gaps).
    2. Create a time-saving, multitasking cooking strategy (e.g. "While X bakes, chop Y").
    
    IMPORTANT: Respond ONLY with a valid JSON object matching the requested format.
  `

  try {
    const response = await ollama.chat({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      format: 'json', // Enforces JSON output
      stream: false,
    })

    const jsonStr = response.message.content
    return JSON.parse(jsonStr)

  } catch (error: any) {
    console.error("Ollama Generation Error:", error)
    
    // Friendly error handling for connection issues
    if (error.cause?.code === 'ECONNREFUSED') {
      return {
        insights: [{
          type: 'warning',
          title: 'Ollama Not Connected',
          message: 'Could not connect to Ollama. Please ensure Ollama is installed and running (ollama serve).'
        }],
        strategy: []
      }
    }

    // Handle missing model
    if (error.message?.includes('not found')) {
      return {
        insights: [{
          type: 'warning',
          title: 'Model Not Found',
          message: `Please run "ollama pull ${MODEL_NAME}" in your terminal to download the model.`
        }],
        strategy: []
      }
    }

    return {
      insights: [{
        type: 'warning',
        title: 'AI Generation Failed',
        message: 'Something went wrong while generating insights.'
      }],
      strategy: []
    }
  }
}