import { NextResponse } from 'next/server'
import { db, productCategories } from '@/db'
import { eq, asc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'
import { DEFAULT_CATEGORIES } from '@/lib/products'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
})

/**
 * GET /api/businesses/[businessId]/categories
 *
 * List all product categories for the business.
 * Creates default categories if none exist.
 */
export const GET = withBusinessAuth(async (_request, access) => {
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
})

/**
 * POST /api/businesses/[businessId]/categories
 *
 * Create a new product category.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = createCategorySchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
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
})
