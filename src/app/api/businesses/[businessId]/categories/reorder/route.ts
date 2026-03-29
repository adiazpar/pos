import { NextResponse } from 'next/server'
import { db, productCategories } from '@/db'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const reorderSchema = z.object({
  categoryIds: z.array(z.string()).min(1, 'At least one category is required'),
})

/**
 * POST /api/businesses/[businessId]/categories/reorder
 *
 * Update the sort order of categories.
 * The order in the array determines the new sort order.
 */
export const POST = withBusinessAuth(async (request, access) => {
  // Only partners and owners can reorder categories
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = reorderSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { categoryIds } = validation.data

  // Verify all categories belong to this business
  const existingCategories = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(and(
      inArray(productCategories.id, categoryIds),
      eq(productCategories.businessId, access.businessId)
    ))

  if (existingCategories.length !== categoryIds.length) {
    return HttpResponse.badRequest('Some categories not found or do not belong to this business')
  }

  // Update sort order for each category
  const now = new Date()
  await Promise.all(
    categoryIds.map((id, index) =>
      db
        .update(productCategories)
        .set({
          sortOrder: index + 1,
          updatedAt: now,
        })
        .where(eq(productCategories.id, id))
    )
  )

  return NextResponse.json({
    success: true,
  })
})
