import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('[convert-heic] Converting file:', file.name, 'size:', file.size)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    let jpegBuffer: Buffer

    try {
      // Try heic-convert first (works on all platforms including Vercel)
      const convert = (await import('heic-convert')).default

      const outputBuffer = await convert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.9,
      })

      jpegBuffer = Buffer.from(outputBuffer)
      console.log('[convert-heic] Converted with heic-convert, output size:', jpegBuffer.length)
    } catch (heicError) {
      console.log('[convert-heic] heic-convert failed, trying sips fallback...')

      // Fallback to macOS sips command (uses execFile for security)
      const { writeFile, unlink, readFile } = await import('fs/promises')
      const { tmpdir } = await import('os')
      const { join } = await import('path')
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')

      const execFileAsync = promisify(execFile)

      const tempInput = join(tmpdir(), `heic-${Date.now()}.heic`)
      const tempOutput = join(tmpdir(), `heic-${Date.now()}.jpg`)

      await writeFile(tempInput, inputBuffer)

      try {
        // Using execFile (not exec) to prevent shell injection
        await execFileAsync('sips', [
          '-s', 'format', 'jpeg',
          '-s', 'formatOptions', '90',
          tempInput,
          '--out', tempOutput
        ])

        jpegBuffer = await readFile(tempOutput)
        console.log('[convert-heic] Converted with sips, output size:', jpegBuffer.length)

        // Cleanup
        await unlink(tempInput).catch(() => {})
        await unlink(tempOutput).catch(() => {})
      } catch (sipsError) {
        await unlink(tempInput).catch(() => {})
        await unlink(tempOutput).catch(() => {})
        throw new Error('Both heic-convert and sips failed')
      }
    }

    // Convert to base64 data URL
    const base64 = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`

    return NextResponse.json({
      success: true,
      data: {
        image: base64,
      },
    })
  } catch (error) {
    console.error('[convert-heic] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to convert image' },
      { status: 500 }
    )
  }
}
