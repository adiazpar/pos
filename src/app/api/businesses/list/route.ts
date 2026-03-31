import { NextResponse } from 'next/server'
import { db, businesses, businessUsers } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'

/**
 * GET /api/businesses/list
 *
 * List all businesses the current user belongs to.
 * Uses the business_users join table for multi-business support.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query business_users joined with businesses for this user
    const memberships = await db
      .select({
        businessId: businessUsers.businessId,
        role: businessUsers.role,
        status: businessUsers.status,
        joinedAt: businessUsers.joinedAt,
        businessName: businesses.name,
        businessOwnerId: businesses.ownerId,
        businessCreatedAt: businesses.createdAt,
        businessType: businesses.type,
        businessIcon: businesses.icon,
      })
      .from(businessUsers)
      .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
      .where(eq(businessUsers.userId, session.userId))

    // Get active memberships
    const activeMemberships = memberships.filter(m => m.status === 'active')

    // Get member counts for each business
    const businessIds = activeMemberships.map(m => m.businessId)
    const memberCounts: Record<string, number> = {}

    if (businessIds.length > 0) {
      const counts = await db
        .select({
          businessId: businessUsers.businessId,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(businessUsers)
        .where(and(
          sql`${businessUsers.businessId} IN (${sql.join(businessIds.map(id => sql`${id}`), sql`, `)})`,
          eq(businessUsers.status, 'active')
        ))
        .groupBy(businessUsers.businessId)

      for (const row of counts) {
        memberCounts[row.businessId] = Number(row.count)
      }
    }

    return NextResponse.json({
      success: true,
      businesses: activeMemberships.map(m => ({
        id: m.businessId,
        name: m.businessName,
        role: m.role,
        isOwner: m.businessOwnerId === session.userId,
        memberCount: memberCounts[m.businessId] || 1,
        type: m.businessType,
        icon: m.businessIcon,
      })),
    })
  } catch (error) {
    console.error('List businesses error:', error)
    return NextResponse.json(
      { error: 'Failed to list businesses' },
      { status: 500 }
    )
  }
}
