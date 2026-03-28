import { NextResponse } from 'next/server'
import { db, businesses, businessUsers } from '@/db'
import { eq } from 'drizzle-orm'
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
      })
      .from(businessUsers)
      .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
      .where(eq(businessUsers.userId, session.userId))

    return NextResponse.json({
      success: true,
      businesses: memberships
        .filter(m => m.status === 'active')
        .map(m => ({
          id: m.businessId,
          name: m.businessName,
          role: m.role,
          isOwner: m.businessOwnerId === session.userId,
          createdAt: m.businessCreatedAt,
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
