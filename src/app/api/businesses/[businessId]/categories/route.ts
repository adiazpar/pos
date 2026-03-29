import { NextRequest, NextResponse } from 'next/server'
import { db, productCategories } from '@/db'
import { eq, asc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess, canManageBusiness } from '@/lib/business-auth'
import { DEFAULT_CATEGORIES } from '@/lib/products'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
})

/**
 * GET /api/businesses/[businessId]/categories
 *
 * List all product categories for the business.
 * Creates default categories if none exist.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Check for existing categories
    let categories = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.businessId, access.businessId))
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))

    // If no categories exist, seed with defaults
    if (categories.length === 0) {
      const now = new Date()
      const newCategories = DEFAULT_CATEGORIES.map((cat) => ({
        id: nanoid(),
        businessId: access.businessId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        createdAt: now,
        updatedAt: now,
      }))

      await db.insert(productCategories).values(newCategories)

      categories = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.businessId, access.businessId))
        .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))
    }

    return NextResponse.json({
      success: true,
      categories,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Failed to get categories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/businesses/[businessId]/categories
 *
 * Create a new product category.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only partners and owners can create categories
    if (!canManageBusiness(access.role)) {
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
      .where(eq(productCategories.businessId, access.businessId))
      .orderBy(asc(productCategories.sortOrder))

    const maxSortOrder = existingCategories.length > 0
      ? Math.max(...existingCategories.map(c => c.sortOrder))
      : 0

    const categoryId = nanoid()
    const now = new Date()

    const [newCategory] = await db.insert(productCategories).values({
      id: categoryId,
      businessId: access.businessId,
      name: name.trim(),
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    }).returning()

    return NextResponse.json({
      success: true,
      category: newCategory,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
