import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/**
 * Storage utility for product icons
 * - Development: saves to public/media/products/ (served by Next.js)
 * - Production: uploads to Cloudflare R2
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const LOCAL_MEDIA_DIR = path.join(process.cwd(), 'public', 'media', 'products')

// R2 configuration (production only)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'pos-media'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL // e.g., https://media.yourdomain.com

/**
 * Generate a unique filename for an icon
 */
function generateFilename(productId: string, originalName?: string): string {
  const ext = originalName?.split('.').pop() || 'png'
  const timestamp = Date.now()
  return `${productId}-${timestamp}.${ext}`
}

/**
 * Save a file to local storage (development)
 */
async function saveLocal(file: File, filename: string): Promise<string> {
  // Ensure directory exists
  if (!existsSync(LOCAL_MEDIA_DIR)) {
    await mkdir(LOCAL_MEDIA_DIR, { recursive: true })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const filepath = path.join(LOCAL_MEDIA_DIR, filename)
  await writeFile(filepath, buffer)

  // Return URL path (served by Next.js from public/)
  return `/media/products/${filename}`
}

/**
 * Delete a file from local storage (development)
 */
async function deleteLocal(url: string): Promise<void> {
  if (!url.startsWith('/media/products/')) return

  const filename = url.replace('/media/products/', '')
  const filepath = path.join(LOCAL_MEDIA_DIR, filename)

  try {
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  } catch (err) {
    console.error('Error deleting local file:', err)
  }
}

/**
 * Upload a file to R2 (production)
 */
async function uploadToR2(file: File, filename: string): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured')
  }

  // Use S3-compatible API for R2
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = `products/${filename}`

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'image/png',
    })
  )

  // Return public URL
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`
  }

  // Fallback to R2.dev URL (if public access enabled on bucket)
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`
}

/**
 * Delete a file from R2 (production)
 */
async function deleteFromR2(url: string): Promise<void> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('R2 credentials not configured, cannot delete')
    return
  }

  // Extract key from URL
  const key = url.split('/').slice(-2).join('/') // "products/filename.png"

  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    )
  } catch (err) {
    console.error('Error deleting from R2:', err)
  }
}

/**
 * Upload a product icon
 * Returns the URL to access the icon
 */
export async function uploadProductIcon(
  file: File,
  productId: string
): Promise<string> {
  const filename = generateFilename(productId, file.name)

  if (IS_PRODUCTION) {
    return uploadToR2(file, filename)
  }

  return saveLocal(file, filename)
}

/**
 * Delete a product icon
 */
export async function deleteProductIcon(url: string | null): Promise<void> {
  if (!url) return

  if (IS_PRODUCTION) {
    await deleteFromR2(url)
  } else {
    await deleteLocal(url)
  }
}

/**
 * Check if storage is properly configured
 */
export function isStorageConfigured(): boolean {
  if (IS_PRODUCTION) {
    return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)
  }
  return true // Local storage always works
}
