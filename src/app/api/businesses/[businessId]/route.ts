import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/simple-auth'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'
import type { RouteParams } from '@/lib/api-middleware'
import {
  db,
  businesses,
  businessUsers,
  businessArchives,
  products,
  productCategories,
  productSettings,
  sales,
  saleItems,
  providers,
  orders,
  orderItems,
  cashSessions,
  cashMovements,
  inviteCodes,
  ownershipTransfers,
} from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

/**
 * DELETE /api/businesses/[businessId]
 *
 * Delete a business and archive all its data for potential recovery.
 * Only the owner can delete a business.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params

    let access
    try {
      access = await requireBusinessAccess(businessId)
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      )
    }

    if (!isOwner(access.role)) {
      return NextResponse.json(
        { error: 'Only the owner can delete a business' },
        { status: 403 }
      )
    }

    // Collect all business data for archiving
    const [
      businessData,
      membersData,
      productsData,
      categoriesData,
      settingsData,
      salesData,
      saleItemsData,
      providersData,
      ordersData,
      orderItemsData,
      cashSessionsData,
      cashMovementsData,
      inviteCodesData,
      transfersData,
    ] = await Promise.all([
      db.select().from(businesses).where(eq(businesses.id, businessId)).get(),
      db.select().from(businessUsers).where(eq(businessUsers.businessId, businessId)),
      db.select().from(products).where(eq(products.businessId, businessId)),
      db.select().from(productCategories).where(eq(productCategories.businessId, businessId)),
      db.select().from(productSettings).where(eq(productSettings.businessId, businessId)).get(),
      db.select().from(sales).where(eq(sales.businessId, businessId)),
      // Sale items need to be fetched via sales
      db
        .select()
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(eq(sales.businessId, businessId)),
      db.select().from(providers).where(eq(providers.businessId, businessId)),
      db.select().from(orders).where(eq(orders.businessId, businessId)),
      // Order items need to be fetched via orders
      db
        .select()
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orders.businessId, businessId)),
      db.select().from(cashSessions).where(eq(cashSessions.businessId, businessId)),
      // Cash movements need to be fetched via sessions
      db
        .select()
        .from(cashMovements)
        .innerJoin(cashSessions, eq(cashMovements.sessionId, cashSessions.id))
        .where(eq(cashSessions.businessId, businessId)),
      db.select().from(inviteCodes).where(eq(inviteCodes.businessId, businessId)),
      db.select().from(ownershipTransfers).where(eq(ownershipTransfers.businessId, businessId)),
    ])

    if (!businessData) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Create archive JSON
    const archiveData = JSON.stringify({
      business: businessData,
      members: membersData,
      products: productsData,
      categories: categoriesData,
      settings: settingsData,
      sales: salesData,
      saleItems: saleItemsData.map(row => row.sale_items),
      providers: providersData,
      orders: ordersData,
      orderItems: orderItemsData.map(row => row.order_items),
      cashSessions: cashSessionsData,
      cashMovements: cashMovementsData.map(row => row.cash_movements),
      inviteCodes: inviteCodesData,
      ownershipTransfers: transfersData,
      deletedAt: new Date().toISOString(),
      deletedBy: session.userId,
    })

    const now = new Date()

    // Insert archive record
    await db.insert(businessArchives).values({
      id: nanoid(),
      businessId,
      businessName: businessData.name,
      deletedBy: session.userId,
      archiveData,
      createdAt: now,
    })

    // Delete business (cascades to related tables via foreign keys)
    await db.delete(businesses).where(eq(businesses.id, businessId))

    return NextResponse.json({
      success: true,
      message: 'Business deleted and archived successfully',
    })
  } catch (error) {
    console.error('Business deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    )
  }
}
