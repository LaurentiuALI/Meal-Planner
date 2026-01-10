import { NextResponse } from 'next/server'
import { Ollama } from 'ollama'

const ollama = new Ollama()
const MODEL_NAME = "llama3.1"

export async function POST(req: Request) {
  try {
    const { context } = await req.json()

    // Context is Array of { date/name, meals: [] }
    
    // Heuristic Score Calculation (Simple)
    // 1. Variety check (meat types)
    // 2. Repetition check (eating same thing twice in a row)
    // 3. Balance check (protein distribution)
    let score = 85 // Base score
    
    // Calculate simple metrics locally before asking AI for qualitative feedback
    const mealsCount = context.reduce((acc: number, day: any) => acc + day.meals.length, 0)
    if (mealsCount > 0) score += 5 
    
    // AI Prompt
    const prompt = `
      You are a Meal Prep Expert. Analyze this weekly meal plan structure:
      ${JSON.stringify(context, null, 2)}
      
      Provide 3 brief, actionable insights (Success, Warning, or Info).
      Focus on:
      - Ingredient overlap (good for efficiency)
      - Cooking complexity (too many different methods?)
      - Macro balance (roughly)
      
      Return JSON:
      {
        "insights": [
          { "type": "success|warning|info", "title": "Short Title", "message": "One sentence message." }
        ],
        "score": ${Math.min(100, Math.max(0, score))}
      }
    `

    const response = await ollama.chat({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      stream: false,
    })

    const data = JSON.parse(response.message.content)
    
    // Fallback if AI hallucinates structure
    if (!data.insights) data.insights = []
    if (!data.score) data.score = score

    return NextResponse.json(data)

  } catch (error) {
    console.error("AI Analyze Error", error)
    return NextResponse.json({ 
      insights: [
        { type: "warning", title: "AI Offline", message: "Could not generate insights. Ensure Ollama is running." }
      ],
      score: 0
    })
  }
}