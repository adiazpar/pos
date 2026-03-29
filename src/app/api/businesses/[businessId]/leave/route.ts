import { NextResponse } from 'next/server'
import { isOwner } from '@/lib/business-auth'
import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'

/**
 * POST /api/businesses/[businessId]/leave
 *
 * Leave a business (remove membership).
 * Owners cannot leave - they must transfer ownership or delete the business.
 */
export const POST = withBusinessAuth(async (_request, access) => {
  if (isOwner(access.role)) {
    return HttpResponse.badRequest(
      'Owners cannot leave a business. Transfer ownership or delete the business instead.'
    )
  }

  // Remove membership
  await db
    .delete(businessUsers)
    .where(
      and(
        eq(businessUsers.userId, access.userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )

  return NextResponse.json({
    success: true,
    message: 'You have left the business',
  })
})
