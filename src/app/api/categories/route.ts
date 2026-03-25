import { NextRequest, NextResponse } from 'next/server'
import { db, productCategories } from '@/db'
import { eq, asc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { DEFAULT_CATEGORIES } from '@/lib/products'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
})

/**
 * GET /api/categories
 *
 * List all product categories for the current business.
 * Creates default categories if none exist.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for existing categories
    let categories = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.businessId, session.businessId))
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))

    // If no categories exist, seed with defaults
    if (categories.length === 0) {
      const now = new Date()
      const newCategories = DEFAULT_CATEGORIES.map((cat) => ({
        id: nanoid(),
        businessId: session.businessId!,
        name: cat.name,
        sortOrder: cat.sortOrder,
        createdAt: now,
        updatedAt: now,
      }))

      await db.insert(productCategories).values(newCategories)

      categories = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.businessId, session.businessId))
        .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))
    }

    return NextResponse.json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Failed to get categories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 *
 * Create a new product category.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and owners can create categories
    if (session.role === 'employee') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createCategorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name } = validation.data

    // Get the highest sort order to place new category at the end
    const existingCategories = await db
      .select({ sortOrder: productCategories.sortOrder })
      .from(productCategories)
      .where(eq(productCategories.businessId, session.businessId))
      .orderBy(asc(productCategories.sortOrder))

    const maxSortOrder = existingCategories.length > 0
      ? Math.max(...existingCategories.map(c => c.sortOrder))
      : 0

    const categoryId = nanoid()
    const now = new Date()

    await db.insert(productCategories).values({
      id: categoryId,
      businessId: session.businessId,
      name: name.trim(),
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    })

    const [newCategory] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, categoryId))
      .limit(1)

    return NextResponse.json({
      success: true,
      category: newCategory,
    })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
