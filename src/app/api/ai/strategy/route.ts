import { Ollama } from 'ollama'
import { NextResponse } from 'next/server'

const ollama = new Ollama()
const MODEL_NAME = "llama3.1"

export async function POST(req: Request) {
  try {
    const { context } = await req.json()

    const prompt = `
      You are an expert Executive Chef.
      Create a MASTER PREP GUIDE for this entire meal prep session.
      
      Plan Data:
      ${JSON.stringify(context, null, 2)}

      Task:
      Create a step-by-step strategy to cook ALL these meals efficiently.
      - Group tasks (e.g., "Chop all onions first").
      - Interleave cooking (e.g., "While chicken roasts, boil pasta").
      - Be specific but concise.
      
      Format: Markdown.
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

  } catch (error) {
     console.error("API Error:", error)
     return new NextResponse(JSON.stringify({ error: (error as Error).message }), { status: 500 })
  }
}
