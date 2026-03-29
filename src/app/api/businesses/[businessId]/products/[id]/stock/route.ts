import { NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const stockSchema = z.object({
  stock: z.number().int().min(0, 'Stock must be 0 or greater'),
})

/**
 * PATCH /api/businesses/[businessId]/products/[id]/stock
 *
 * Adjust product stock.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
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

  const body = await request.json()
  const validation = stockSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { stock } = validation.data

  await db
    .update(products)
    .set({
      stock,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))

  return NextResponse.json({
    success: true,
    stock,
  })
})
