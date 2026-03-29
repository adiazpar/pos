import { NextResponse } from 'next/server'
import { db, productCategories, products, productSettings } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
})

/**
 * PATCH /api/businesses/[businessId]/categories/[id]
 *
 * Update a product category.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Category ID is required')
  }

  // Only partners and owners can update categories
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  // Verify the category belongs to this business
  const [existingCategory] = await db
    .select()
    .from(productCategories)
    .where(and(
      eq(productCategories.id, id),
      eq(productCategories.businessId, access.businessId)
    ))
    .limit(1)

  if (!existingCategory) {
    return HttpResponse.notFound('Category not found')
  }

  const body = await request.json()
  const validation = updateCategorySchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { name } = validation.data
  const now = new Date()

  await db
    .update(productCategories)
    .set({
      name: name.trim(),
      updatedAt: now,
    })
    .where(eq(productCategories.id, id))

  const [updatedCategory] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, id))
    .limit(1)

  return NextResponse.json({
    success: true,
    category: updatedCategory,
  })
})

/**
 * DELETE /api/businesses/[businessId]/categories/[id]
 *
 * Delete a product category.
 * Products with this category will have their categoryId set to null.
 */
export const DELETE = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Category ID is required')
  }

  // Only partners and owners can delete categories
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  // Verify the category belongs to this business
  const [existingCategory] = await db
    .select()
    .from(productCategories)
    .where(and(
      eq(productCategories.id, id),
      eq(productCategories.businessId, access.businessId)
    ))
    .limit(1)

  if (!existingCategory) {
    return HttpResponse.notFound('Category not found')
  }

  // Get count of products using this category for the response
  const productsWithCategory = await db
    .select()
    .from(products)
    .where(eq(products.categoryId, id))

  // Clear categoryId from products
  await db
    .update(products)
    .set({ categoryId: null, updatedAt: new Date() })
    .where(eq(products.categoryId, id))

  // Clear defaultCategoryId from product_settings if this was the default
  await db
    .update(productSettings)
    .set({ defaultCategoryId: null, updatedAt: new Date() })
    .where(eq(productSettings.defaultCategoryId, id))

  // Delete the category
  await db
    .delete(productCategories)
    .where(eq(productCategories.id, id))

  return NextResponse.json({
    success: true,
    affectedProducts: productsWithCategory.length,
  })
})
