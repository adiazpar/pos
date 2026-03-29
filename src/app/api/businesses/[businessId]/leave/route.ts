import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/simple-auth'
import { validateBusinessAccess, isOwner } from '@/lib/business-auth'
import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

/**
 * POST /api/businesses/[businessId]/leave
 *
 * Leave a business (remove membership).
 * Owners cannot leave - they must transfer ownership or delete the business.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params

    const access = await validateBusinessAccess(session.userId, businessId)

    if (!access) {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      )
    }

    if (isOwner(access.role)) {
      return NextResponse.json(
        { error: 'Owners cannot leave a business. Transfer ownership or delete the business instead.' },
        { status: 400 }
      )
    }

    // Remove membership
    await db
      .delete(businessUsers)
      .where(
        and(
          eq(businessUsers.userId, session.userId),
          eq(businessUsers.businessId, businessId)
        )
      )

    return NextResponse.json({
      success: true,
      message: 'You have left the business',
    })
  } catch (error) {
    console.error('Leave business error:', error)
    return NextResponse.json(
      { error: 'Failed to leave business' },
      { status: 500 }
    )
  }
}
