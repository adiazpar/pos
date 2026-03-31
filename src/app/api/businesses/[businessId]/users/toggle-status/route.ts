import { NextResponse } from 'next/server'
import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner, invalidateAccessCache } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const toggleStatusSchema = z.object({
  userId: Schemas.id(),
  status: z.enum(['active', 'disabled']),
})

/**
 * POST /api/businesses/[businessId]/users/toggle-status
 *
 * Toggle user active/disabled status.
 * Only owners can toggle status, and they can't toggle their own status.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = toggleStatusSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { userId, status } = validation.data

  // Can't toggle own status
  if (userId === access.userId) {
    return HttpResponse.badRequest('Cannot change your own status')
  }

  // Update user status in business_users
  const now = new Date()
  await db
    .update(businessUsers)
    .set({
      status,
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
