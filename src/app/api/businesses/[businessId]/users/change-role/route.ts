import { NextResponse } from 'next/server'
import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner, invalidateAccessCache } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const changeRoleSchema = z.object({
  userId: Schemas.id(),
  role: Schemas.role().exclude(['owner']),
})

/**
 * POST /api/businesses/[businessId]/users/change-role
 *
 * Change user role (partner/employee).
 * Only owners can change roles, and they can't change another owner's role.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = changeRoleSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { userId, role } = validation.data

  // Can't change own role
  if (userId === access.userId) {
    return HttpResponse.badRequest('Cannot change your own role')
  }

  // Get target user's business membership
  const [targetMembership] = await db
    .select()
    .from(businessUsers)
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!targetMembership) {
    return HttpResponse.notFound('User not found in this business')
  }

  if (targetMembership.role === 'owner') {
    return HttpResponse.badRequest("Cannot change the owner's role")
  }

  // Update user role in business_users
  const now = new Date()
  await db
    .update(businessUsers)
    .set({
      role,
      updatedAt: now,
    })
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )

  invalidateAccessCache(userId, access.businessId)

  return NextResponse.json({
    success: true,
  })
})
