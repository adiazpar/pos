import { NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq, ne, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { uploadProductIcon, validateIconSize, fileToBase64 } from '@/lib/storage'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const createProductSchema = z.object({
  name: Schemas.name(),
  price: Schemas.amount(),
  category: z.enum(['food', 'beverage', 'snack', 'dessert', 'other']).optional(),
  categoryId: Schemas.id().optional(),
  active: Schemas.activeFlag(),
})

/**
 * GET /api/businesses/[businessId]/products
 *
 * List all products for the specified business.
 */
export const GET = withBusinessAuth(async (request, access) => {
  const productsList = await db
    .select()
    .from(products)
    .where(and(eq(products.businessId, access.businessId), ne(products.status, 'archived')))

  return NextResponse.json({
    success: true,
    products: productsList,
  })
})

/**
 * POST /api/businesses/[businessId]/products
 *
 * Create a new product. Accepts FormData with optional icon file.
 */
export const POST = withBusinessAuth(async (request, access) => {
  const formData = await request.formData()
  const name = formData.get('name') as string
  const price = formData.get('price') as string
  const category = formData.get('category') as string | null
  const categoryId = formData.get('categoryId') as string | null
  const active = formData.get('active') as string
  const iconFile = formData.get('icon') as File | null

  const validation = createProductSchema.safeParse({
    name,
    price,
    category: category || undefined,
    categoryId: categoryId || undefined,
    active,
  })

  if (!validation.success) {
    return validationError(validation)
  }

  const { name: validName, price: validPrice, category: validCategory, categoryId: validCategoryId, active: validActive } = validation.data
  const status = validActive ? 'active' : 'inactive'

  const productId = nanoid()

  // Upload icon if provided
  let iconData: string | null = null
  if (iconFile && iconFile.size > 0) {
    try {
      const base64 = await fileToBase64(iconFile)
      const { valid } = validateIconSize(base64)
      if (!valid) {
        return HttpResponse.badRequest('Icon is too large. Maximum size is 100KB.')
      }
      iconData = await uploadProductIcon(iconFile, productId, base64)
    } catch (err) {
      console.error('Error processing icon:', err)
    }
  }

  const now = new Date()

  // Check for an archived product with the same name (case-insensitive)
  const [archivedMatch] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.businessId, access.businessId),
        eq(products.status, 'archived'),
        sql`LOWER(TRIM(${products.name})) = LOWER(TRIM(${validName}))`
      )
    )
    .orderBy(sql`${products.updatedAt} DESC`)
    .limit(1)

  if (archivedMatch) {
    // Reuse the archived product row
    await db
      .update(products)
      .set({
        name: validName,
        price: validPrice,
        category: validCategory,
        categoryId: validCategoryId || null,
        icon: iconData ?? archivedMatch.icon,
        status,
        updatedAt: now,
      })
      .where(eq(products.id, archivedMatch.id))

    const [reusedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, archivedMatch.id))
      .limit(1)

    return NextResponse.json({
      success: true,
      product: reusedProduct,
    })
  }

  const [newProduct] = await db.insert(products).values({
    id: productId,
    businessId: access.businessId,
    name: validName,
    price: validPrice,
    category: validCategory,
    categoryId: validCategoryId || null,
    icon: iconData,
    status,
    stock: 0,
    createdAt: now,
    updatedAt: now,
  }).returning()

  return NextResponse.json({
    success: true,
    product: newProduct,
  })
})
