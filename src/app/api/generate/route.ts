import { Ollama } from 'ollama'
import { NextResponse } from 'next/server'

const ollama = new Ollama()
const MODEL_NAME = "llama3.1"

export async function POST(req: Request) {
  try {
    const { context } = await req.json()

    if (!context) {
      return new NextResponse('Missing context', { status: 400 })
    }

    const prompt = `
      You are an expert Meal Prep Chef.
      Analyze the following meal plan for one day.
      
      Plan Data:
      ${JSON.stringify(context, null, 2)}

      Task:
      1. Provide a "Chef's Analysis" identifying conflicts, efficiency tips, or nutritional notes.
      2. Provide a "Cooking Strategy" (Step-by-step) to cook these meals efficiently (multitasking).
      
      Format:
      Use clear Markdown. 
      - Use **bold** for key items.
      - Use bullet points for lists.
      - Be concise and professional.
      
      Start directly with the analysis.
    `

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await ollama.chat({
            model: MODEL_NAME,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          })

          for await (const part of response) {
            controller.enqueue(new TextEncoder().encode(part.message.content))
          }
          controller.close()
        } catch (error) {
          console.error("Stream Error:", error)
          controller.error(error)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })

  } catch (error: any) {
     console.error("API Error:", error)
     return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
