import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai/generate-icon
 *
 * Generates an emoji-style icon from a background-removed image.
 * Background removal is done client-side using @imgly/background-removal (FREE).
 *
 * Uses OpenAI GPT Image 1 Mini (~$0.005 per image)
 *
 * Request body:
 * { image: string } // base64 encoded image with background removed (data URL)
 *
 * Response:
 * { success: true, data: { icon: string } } // base64 PNG image
 * { success: false, error: string }
 */

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Se requiere una imagen' },
        { status: 400 }
      )
    }

    const openaiApiKey = process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'API de OpenAI no configurada' },
        { status: 500 }
      )
    }

    // ========================================
    // Generate emoji icon using OpenAI GPT Image 1 Mini
    // Input: bg-removed image (done client-side)
    // Cost: ~$0.005 per image
    // ========================================
    console.log('[generate-icon] Generating emoji icon with GPT Image 1 Mini...')

    // Convert base64 data URL to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Create a File object with a name (required by gpt-image models)
    const imageFile = new File([imageBuffer], 'product.png', { type: 'image/png' })

    // Create FormData for OpenAI image edit API
    // Note: gpt-image models automatically return base64 (don't use response_format)
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('prompt', 'Transform this into a clean Apple iOS emoji style icon. Simple centered single object, vibrant saturated colors, pure white background, stylized like an official Apple emoji. No shadows, no gradients on background.')
    formData.append('model', 'gpt-image-1-mini')
    formData.append('size', '1024x1024')
    formData.append('n', '1')

    console.log('[generate-icon] Calling OpenAI /v1/images/edits with gpt-image-1-mini...')

    const iconResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!iconResponse.ok) {
      const errorData = await iconResponse.json().catch(() => ({}))
      console.error('OpenAI icon generation error:', JSON.stringify(errorData, null, 2))

      // Check for rate limit
      if (iconResponse.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Limite de velocidad alcanzado. Intenta de nuevo en unos segundos.' },
          { status: 429 }
        )
      }

      // Provide more detailed error for debugging
      const errorMsg = errorData?.error?.message || 'Error al generar el icono'
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: iconResponse.status }
      )
    }

    const iconResult = await iconResponse.json()
    console.log('[generate-icon] OpenAI response received, data count:', iconResult.data?.length)

    // gpt-image models return base64 in data[0].b64_json automatically
    const generatedImage = iconResult.data?.[0]
    if (!generatedImage) {
      console.error('No image in OpenAI response:', JSON.stringify(iconResult, null, 2))
      return NextResponse.json(
        { success: false, error: 'No se genero ninguna imagen' },
        { status: 500 }
      )
    }

    let dataUrl: string
    if (generatedImage.b64_json) {
      // gpt-image models return base64 directly
      dataUrl = `data:image/png;base64,${generatedImage.b64_json}`
      console.log('[generate-icon] Success! Got base64 image directly')
    } else if (generatedImage.url) {
      // Fallback: fetch from URL if returned
      console.log('[generate-icon] Success! Fetching from URL:', generatedImage.url)
      const imageResponse = await fetch(generatedImage.url)
      if (!imageResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'Error al descargar el icono' },
          { status: 500 }
        )
      }
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64 = Buffer.from(imageBuffer).toString('base64')
      dataUrl = `data:image/png;base64,${base64}`
    } else {
      console.error('Unknown OpenAI response format:', JSON.stringify(iconResult, null, 2))
      return NextResponse.json(
        { success: false, error: 'Formato de respuesta desconocido' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        icon: dataUrl,
      },
    })
  } catch (error) {
    console.error('Error in generate-icon:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
