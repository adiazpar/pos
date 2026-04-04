import { NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { uploadProductIcon, deleteProductIcon, validateIconSize, fileToBase64 } from '@/lib/storage'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'
import { canManageBusiness } from '@/lib/business-auth'
import { Schemas } from '@/lib/schemas'

/**
 * PATCH /api/businesses/[businessId]/products/[id]
 *
 * Update a product. Accepts FormData with optional icon file.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can modify products
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden('Only partners and owners can modify products')
  }

  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Product ID is required')
  }

  // Verify product exists and belongs to business
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, id),
        eq(products.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!existingProduct) {
    return HttpResponse.notFound('Product not found')
  }

  const formData = await request.formData()
  const name = formData.get('name') as string | null
  const price = formData.get('price') as string | null
  const category = formData.get('category') as string | null
  const categoryId = formData.get('categoryId') as string | null
  const active = formData.get('active') as string | null
  const iconFile = formData.get('icon') as File | null

  const updateData: Record<string, unknown> = {}

  if (name !== null) {
    const nameValidation = Schemas.name().safeParse(name)
    if (!nameValidation.success) {
      return HttpResponse.badRequest(nameValidation.error.errors[0]?.message || 'Invalid name')
    }
    updateData.name = nameValidation.data
  }

  if (price !== null) {
    const priceValidation = Schemas.amount().safeParse(price)
    if (!priceValidation.success) {
      return HttpResponse.badRequest(priceValidation.error.errors[0]?.message || 'Invalid price')
    }
    updateData.price = priceValidation.data
  }

  if (category !== null) {
    if (category === '') {
      updateData.category = null
    } else {
      const categoryValidation = z.enum(['food', 'beverage', 'snack', 'dessert', 'other']).safeParse(category)
      if (!categoryValidation.success) {
        return HttpResponse.badRequest('Invalid category')
      }
      updateData.category = categoryValidation.data
    }
  }

  if (categoryId !== null) {
    if (categoryId === '') {
      updateData.categoryId = null
    } else {
      updateData.categoryId = categoryId
    }
  }

  if (active !== null) {
    updateData.status = active === 'true' ? 'active' : 'inactive'
  }

  // Upload new icon if provided
  if (iconFile && iconFile.size > 0) {
    try {
      const base64ForValidation = await fileToBase64(iconFile)
      const { valid } = validateIconSize(base64ForValidation)
      if (!valid) {
        return HttpResponse.badRequest('Icon is too large. Maximum size is 100KB.')
      }
      if (existingProduct.icon) {
        await deleteProductIcon(existingProduct.icon, id)
      }
      updateData.icon = await uploadProductIcon(iconFile, id)
    } catch (err) {
      console.error('Error uploading icon:', err)
    }
  }

  if (Object.keys(updateData).length === 0) {
    return HttpResponse.badRequest('No data to update')
  }

  updateData.updatedAt = new Date()

  await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))

  const [updatedProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  return NextResponse.json({
    success: true,
    product: updatedProduct,
  })
})

/**
 * DELETE /api/businesses/[businessId]/products/[id]
 *
 * Delete a product.
 */
export const DELETE = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can delete products
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden('Only partners and owners can delete products')
  }

  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Product ID is required')
  }

  // Verify product exists and belongs to business
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, id),
        eq(products.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!existingProduct) {
    return HttpResponse.notFound('Product not found')
  }

  // Archive instead of hard delete — preserve icon for historical rendering
  await db
    .update(products)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))

  return NextResponse.json({
    success: true,
  })
})
