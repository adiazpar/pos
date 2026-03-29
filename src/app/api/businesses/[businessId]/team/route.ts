import { NextResponse } from 'next/server'
import { db, businessUsers, users, inviteCodes } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth } from '@/lib/api-middleware'

/**
 * GET /api/businesses/[businessId]/team
 *
 * Get team members and active invite codes for the business.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  // Get all team members for this business via business_users join
  const teamMembers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: businessUsers.role,
      status: businessUsers.status,
      createdAt: users.createdAt,
      joinedAt: businessUsers.joinedAt,
    })
    .from(businessUsers)
    .innerJoin(users, eq(businessUsers.userId, users.id))
    .where(eq(businessUsers.businessId, access.businessId))

  // Get active (unused, non-expired) invite codes if user is owner
  let activeInviteCodes: Array<{
    id: string
    code: string
    role: 'partner' | 'employee'
    expiresAt: Date
    createdAt: Date
  }> = []

  if (isOwner(access.role)) {
    const now = new Date()
    activeInviteCodes = await db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        role: inviteCodes.role,
        expiresAt: inviteCodes.expiresAt,
        createdAt: inviteCodes.createdAt,
      })
      .from(inviteCodes)
      .where(
        and(
          eq(inviteCodes.businessId, access.businessId),
          eq(inviteCodes.used, false),
          gt(inviteCodes.expiresAt, now)
        )
      )
  }

  return NextResponse.json({
    teamMembers,
    inviteCodes: activeInviteCodes,
  })
})
