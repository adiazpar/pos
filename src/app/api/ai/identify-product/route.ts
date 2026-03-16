import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai/identify-product
 *
 * Analyzes a product image using GPT-4o Mini Vision to extract:
 * - Product name (in Spanish)
 * - Brief description for emoji generation (in English, 5-10 words)
 *
 * Request body:
 * { image: string } // base64 encoded image
 *
 * Response:
 * { success: true, data: { name: string, description: string } }
 * { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Se requiere una imagen' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API de OpenAI no configurada' },
        { status: 500 }
      )
    }

    // Call OpenAI GPT-4o Mini Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a product identification assistant for a Peruvian snack business.

Analyze the product image and identify:
1. Product name in Spanish (be specific about flavor/variant if visible on label)

Respond ONLY with valid JSON:
{"name": "Product Name in Spanish"}

Examples:
- Bag of plantain chips with chicken flavor: {"name": "Chifles Sabor Pollo"}
- Honey jar: {"name": "Miel de Abeja"}
- Carob syrup bottle: {"name": "Algarrobina"}`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Identify this product. Return only JSON.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
                  detail: 'low', // Use low detail for faster/cheaper processing
                },
              },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0.3, // Low temperature for more consistent output
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', errorData)
      return NextResponse.json(
        { success: false, error: 'Error al analizar la imagen' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el producto' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    try {
      // Clean up potential markdown code blocks
      const cleanContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()

      const result = JSON.parse(cleanContent)

      if (!result.name) {
        throw new Error('Invalid response structure')
      }

      console.log('[identify-product] GPT-4o Mini extracted:', result)

      return NextResponse.json({
        success: true,
        data: {
          name: result.name,
        },
      })
    } catch {
      console.error('Failed to parse GPT response:', content)
      return NextResponse.json(
        { success: false, error: 'No se pudo procesar la respuesta' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in identify-product:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
