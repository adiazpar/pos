import { NextResponse } from 'next/server'
import { db, orders, orderItems, products } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const receiveOrderSchema = z.object({
  receivedQuantities: z.record(z.number().int().min(0)),
})

/**
 * POST /api/businesses/[businessId]/orders/[id]/receive
 *
 * Receive an order and update product stock.
 */
export const POST = withBusinessAuth(async (request, access, routeParams) => {
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
    return HttpResponse.badRequest('Order has already been received')
  }

  const body = await request.json()
  const validation = receiveOrderSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { receivedQuantities } = validation.data

  // Get order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))

  const now = new Date()

  // Update product stock for each item
  for (const item of items) {
    const receivedQty = receivedQuantities[item.id] ?? item.quantity

    if (receivedQty > 0 && item.productId) {
      // Update product stock
      await db
        .update(products)
        .set({
          stock: sql`${products.stock} + ${receivedQty}`,
          updatedAt: now,
        })
        .where(eq(products.id, item.productId))
    }
  }

  // Update order status
  await db
    .update(orders)
    .set({
      status: 'received',
      receivedDate: now,
      updatedAt: now,
    })
    .where(eq(orders.id, id))

  return NextResponse.json({
    success: true,
  })
})
