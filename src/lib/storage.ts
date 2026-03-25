/**
 * Storage utility for product icons
 *
 * Local dev: Files stored in public/media/products/ directory
 * Production: Base64 strings stored directly in the database
 */

import fs from 'fs/promises'
import path from 'path'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const MEDIA_DIR = path.join(process.cwd(), 'public', 'media', 'products')

/**
 * Convert a File to a base64 data URL string
 * Returns format: data:image/png;base64,iVBORw0KGgo...
 */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = file.type || 'image/png'
  return `data:${mimeType};base64,${base64}`
}

/**
 * Convert a Blob to a base64 data URL string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = blob.type || 'image/png'
  return `data:${mimeType};base64,${base64}`
}

/**
 * Check if a string is a valid base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/')
}

/**
 * Get the approximate size in bytes of a base64 string
 * Useful for validation/limits
 */
export function getBase64Size(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
  // Base64 encodes 3 bytes into 4 characters
  return Math.ceil((base64Data.length * 3) / 4)
}

/**
 * Maximum icon size in bytes (100KB)
 * Base64 adds ~33% overhead, so this allows ~75KB original images
 */
export const MAX_ICON_SIZE = 100 * 1024

/**
 * Validate that an icon is within size limits
 */
export function validateIconSize(base64: string): { valid: boolean; size: number } {
  const size = getBase64Size(base64)
  return {
    valid: size <= MAX_ICON_SIZE,
    size,
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return extensions[mimeType] || 'png'
}

/**
 * Ensure media directory exists (local dev only)
 */
async function ensureMediaDir(): Promise<void> {
  try {
    await fs.access(MEDIA_DIR)
  } catch {
    await fs.mkdir(MEDIA_DIR, { recursive: true })
  }
}

/**
 * Upload a product icon
 *
 * Local dev: Saves file to public/media/products/<productId>.<ext>
 * Production: Returns base64 data URL
 *
 * @returns The icon URL or data URL to store in the database
 */
export async function uploadProductIcon(file: File, productId: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'image/png'

  if (IS_PRODUCTION) {
    // Production: return base64 data URL
    const base64 = buffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
  } else {
    // Local dev: save to file system
    await ensureMediaDir()
    const ext = getExtensionFromMimeType(mimeType)
    const filename = `${productId}.${ext}`
    const filepath = path.join(MEDIA_DIR, filename)

    // Delete any existing files for this product (different extensions)
    await deleteProductIconFiles(productId)

    await fs.writeFile(filepath, buffer)
    return `/media/products/${filename}`
  }
}

/**
 * Delete product icon files (local dev only)
 * Removes all files matching the productId regardless of extension
 */
async function deleteProductIconFiles(productId: string): Promise<void> {
  try {
    await ensureMediaDir()
    const files = await fs.readdir(MEDIA_DIR)
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']

    for (const ext of extensions) {
      const filename = `${productId}.${ext}`
      if (files.includes(filename)) {
        await fs.unlink(path.join(MEDIA_DIR, filename))
      }
    }
  } catch (err) {
    // Ignore errors - file might not exist
    console.error('Error deleting icon files:', err)
  }
}

/**
 * Delete a product icon
 *
 * Local dev: Deletes file from public/media/products/
 * Production: No-op (base64 is deleted with the database row)
 */
export async function deleteProductIcon(iconUrl: string | null, productId?: string): Promise<void> {
  if (!iconUrl) return

  // If it's a base64 URL, nothing to delete (data is in the DB)
  if (isBase64DataUrl(iconUrl)) {
    return
  }

  // Local dev: delete file
  if (!IS_PRODUCTION && productId) {
    await deleteProductIconFiles(productId)
  } else if (!IS_PRODUCTION && iconUrl.startsWith('/media/products/')) {
    // Extract filename and delete
    const filename = iconUrl.replace('/media/products/', '')
    try {
      await fs.unlink(path.join(MEDIA_DIR, filename))
    } catch (err) {
      console.error('Error deleting icon file:', err)
    }
  }
}
