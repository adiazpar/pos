import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { uploadProductIcon } from '@/lib/storage'

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  category: z.enum(['food', 'beverage', 'snack', 'dessert', 'other']).optional(),
  active: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
})

/**
 * GET /api/products
 *
 * List all products for the current business.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productsList = await db
      .select()
      .from(products)
      .where(eq(products.businessId, session.businessId))

    return NextResponse.json({
      success: true,
      products: productsList,
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products
 *
 * Create a new product. Accepts FormData with optional icon file.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const price = formData.get('price') as string
    const category = formData.get('category') as string | null
    const active = formData.get('active') as string
    const iconFile = formData.get('icon') as File | null

    const validation = createProductSchema.safeParse({
      name,
      price,
      category: category || undefined,
      active,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name: validName, price: validPrice, category: validCategory, active: validActive } = validation.data

    const productId = nanoid()

    // Upload icon if provided
    let iconUrl: string | null = null
    if (iconFile && iconFile.size > 0) {
      try {
        iconUrl = await uploadProductIcon(iconFile, productId)
      } catch (err) {
        console.error('Error uploading icon:', err)
        // Continue without icon rather than failing the whole request
      }
    }
    const now = new Date()

    await db.insert(products).values({
      id: productId,
      businessId: session.businessId,
      name: validName,
      price: validPrice,
      category: validCategory,
      icon: iconUrl,
      active: validActive,
      stock: 0,
      createdAt: now,
      updatedAt: now,
    })

    const [newProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    return NextResponse.json({
      success: true,
      product: newProduct,
    })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
