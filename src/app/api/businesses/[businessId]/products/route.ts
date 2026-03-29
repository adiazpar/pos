import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'
import { uploadProductIcon, validateIconSize, fileToBase64 } from '@/lib/storage'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  category: z.enum(['food', 'beverage', 'snack', 'dessert', 'other']).optional(),
  categoryId: z.string().optional(),
  active: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
})

/**
 * GET /api/businesses/[businessId]/products
 *
 * List all products for the specified business.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    const productsList = await db
      .select()
      .from(products)
      .where(eq(products.businessId, access.businessId))

    return NextResponse.json({
      success: true,
      products: productsList,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/businesses/[businessId]/products
 *
 * Create a new product. Accepts FormData with optional icon file.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

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
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name: validName, price: validPrice, category: validCategory, categoryId: validCategoryId, active: validActive } = validation.data

    const productId = nanoid()

    // Upload icon if provided
    let iconData: string | null = null
    if (iconFile && iconFile.size > 0) {
      try {
        const base64ForValidation = await fileToBase64(iconFile)
        const { valid } = validateIconSize(base64ForValidation)
        if (!valid) {
          return NextResponse.json(
            { error: 'Icon is too large. Maximum size is 100KB.' },
            { status: 400 }
          )
        }
        iconData = await uploadProductIcon(iconFile, productId)
      } catch (err) {
        console.error('Error processing icon:', err)
      }
    }

    const now = new Date()

    const [newProduct] = await db.insert(products).values({
      id: productId,
      businessId: access.businessId,
      name: validName,
      price: validPrice,
      category: validCategory,
      categoryId: validCategoryId || null,
      icon: iconData,
      active: validActive,
      stock: 0,
      createdAt: now,
      updatedAt: now,
    }).returning()

    return NextResponse.json({
      success: true,
      product: newProduct,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
