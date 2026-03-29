import { NextResponse } from 'next/server'
import { db, orders, orderItems } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'

const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
})

/**
 * PATCH /api/businesses/[businessId]/orders/[id]
 *
 * Update an order and its items.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Order ID is required')
  }

  // Verify order exists and belongs to business
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, id),
        eq(orders.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!existingOrder) {
    return HttpResponse.notFound('Order not found')
  }

  if (existingOrder.status === 'received') {
    return HttpResponse.badRequest('Cannot edit a received order')
  }

  const formData = await request.formData()
  const totalStr = formData.get('total') as string | null
  const notes = formData.get('notes') as string | null
  const estimatedArrivalStr = formData.get('estimatedArrival') as string | null
  const providerId = formData.get('providerId') as string | null
  const itemsJson = formData.get('items') as string | null

  const updateData: Record<string, unknown> = {}

  if (totalStr !== null) {
    const total = parseFloat(totalStr)
    if (isNaN(total) || total <= 0) {
      return HttpResponse.badRequest('Total must be greater than 0')
    }
    updateData.total = total
  }

  if (notes !== null) {
    updateData.notes = notes || null
  }

  if (estimatedArrivalStr !== null) {
    updateData.estimatedArrival = estimatedArrivalStr ? new Date(estimatedArrivalStr) : null
  }

  if (providerId !== null) {
    updateData.providerId = providerId || null
  }

  updateData.updatedAt = new Date()

  await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, id))

  // Update items if provided
  if (itemsJson) {
    let items: Array<{ productId: string; productName: string; quantity: number }>
    try {
      items = JSON.parse(itemsJson)
      const validation = z.array(orderItemSchema).safeParse(items)
      if (!validation.success) {
        return HttpResponse.badRequest('Invalid items')
      }
    } catch {
      return HttpResponse.badRequest('Invalid items')
    }

    // Delete existing items and insert new ones
    await db.delete(orderItems).where(eq(orderItems.orderId, id))

    const now = new Date()
    if (items.length > 0) {
      await db.insert(orderItems).values(
        items.map(item => ({
          id: nanoid(),
          orderId: id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          createdAt: now,
        }))
      )
    }
  }

  return NextResponse.json({
    success: true,
  })
})

/**
 * DELETE /api/businesses/[businessId]/orders/[id]
 *
 * Delete an order and its items.
 */
export const DELETE = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Order ID is required')
  }

  // Verify order exists and belongs to business
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, id),
        eq(orders.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!existingOrder) {
    return HttpResponse.notFound('Order not found')
  }

  // Delete order (cascade will delete items)
  await db.delete(orders).where(eq(orders.id, id))

  return NextResponse.json({
    success: true,
  })
})
