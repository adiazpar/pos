import { NextResponse } from 'next/server'
import { db, orders, orderItems, providers, products } from '@/db'
import { eq, desc, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const orderItemSchema = z.object({
  productId: Schemas.id(),
  productName: Schemas.name(),
  quantity: z.number().int().positive(),
})

/**
 * GET /api/businesses/[businessId]/orders
 *
 * List all orders for the business with their items.
 */
export const GET = withBusinessAuth(async (request, access) => {
  // Get all orders for this business
  const ordersList = await db
    .select()
    .from(orders)
    .where(eq(orders.businessId, access.businessId))
    .orderBy(desc(orders.date))

  const orderIds = ordersList.map(o => o.id)

  // Early return if no orders
  if (orderIds.length === 0) {
    return NextResponse.json({
      success: true,
      orders: [],
    })
  }

  // Get order items only for these orders (not all items in DB)
  const allItems = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      unitCost: orderItems.unitCost,
      subtotal: orderItems.subtotal,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))

  // Get unique product IDs from items
  const productIds = [...new Set(allItems.map(i => i.productId).filter(Boolean))] as string[]

  // Fetch only needed product fields (NO icons - major bandwidth savings)
  const productsList = productIds.length > 0
    ? await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          costPrice: products.costPrice,
          stock: products.stock,
          status: products.status,
        })
        .from(products)
        .where(inArray(products.id, productIds))
    : []

  const productsMap = new Map(productsList.map(p => [p.id, p]))

  // Get providers for this business
  const providersList = await db
    .select()
    .from(providers)
    .where(eq(providers.businessId, access.businessId))

  const providersMap = new Map(providersList.map(p => [p.id, p]))

  // Group items by orderId for efficient lookup
  const itemsByOrderId = new Map<string, typeof allItems>()
  for (const item of allItems) {
    const existing = itemsByOrderId.get(item.orderId) || []
    existing.push(item)
    itemsByOrderId.set(item.orderId, existing)
  }

  // Build expanded orders
  const expandedOrders = ordersList.map(order => {
    const items = itemsByOrderId.get(order.id) || []
    return {
      ...order,
      providerId: order.providerId,
      expand: {
        provider: order.providerId ? providersMap.get(order.providerId) || null : null,
        'order_items(order)': items.map(item => ({
          ...item,
          expand: {
            product: item.productId ? productsMap.get(item.productId) || null : null,
          },
        })),
      },
    }
  })

  return NextResponse.json({
    success: true,
    orders: expandedOrders,
  })
})

/**
 * POST /api/businesses/[businessId]/orders
 *
 * Create a new order with items.
 */
export const POST = withBusinessAuth(async (request, access) => {
  const formData = await request.formData()
  const dateStr = formData.get('date') as string
  const totalStr = formData.get('total') as string
  const status = formData.get('status') as string
  const notes = formData.get('notes') as string | null
  const estimatedArrivalStr = formData.get('estimatedArrival') as string | null
  const providerId = formData.get('providerId') as string | null
  const itemsJson = formData.get('items') as string

  // Parse and validate items
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

  const totalValidation = Schemas.positiveAmount().safeParse(totalStr)
  if (!totalValidation.success) {
    return HttpResponse.badRequest(totalValidation.error.errors[0]?.message || 'Invalid total')
  }
  const total = totalValidation.data

  const orderId = nanoid()
  const now = new Date()
  const orderDate = new Date(dateStr)
  const orderStatus = status === 'received' ? 'received' : 'pending'
  const estimatedArrival = estimatedArrivalStr ? new Date(estimatedArrivalStr) : null

  // Batch insert order + items in a single transaction
  const itemValues = items.map(item => ({
    id: nanoid(),
    orderId,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    createdAt: now,
  }))

  await db.batch([
    db.insert(orders).values({
      id: orderId,
      businessId: access.businessId,
      providerId: providerId || null,
      date: orderDate,
      total,
      status: orderStatus,
      estimatedArrival,
      receipt: null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    }),
    ...(itemValues.length > 0
      ? [db.insert(orderItems).values(itemValues)]
      : []),
  ])

  // Look up provider if needed
  let provider = null
  if (providerId) {
    provider = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId))
      .get() || null
  }

  // Return full expanded order so client can append without refetching
  return NextResponse.json({
    success: true,
    order: {
      id: orderId,
      businessId: access.businessId,
      providerId: providerId || null,
      date: orderDate,
      total,
      status: orderStatus,
      estimatedArrival,
      receipt: null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
      expand: {
        provider,
        'order_items(order)': itemValues.map(item => ({
          ...item,
          unitCost: null,
          subtotal: null,
          expand: { product: null },
        })),
      },
    },
  })
})
