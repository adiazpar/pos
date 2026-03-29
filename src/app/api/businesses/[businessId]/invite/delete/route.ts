import { NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const deleteInviteSchema = z.object({
  id: z.string().min(1),
})

/**
 * POST /api/businesses/[businessId]/invite/delete
 *
 * Delete an invite code.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = deleteInviteSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { id } = validation.data

  // Delete the invite code (only if it belongs to the same business)
  await db
    .delete(inviteCodes)
    .where(
      and(
        eq(inviteCodes.id, id),
        eq(inviteCodes.businessId, access.businessId)
      )
    )

  return NextResponse.json({
    success: true,
  })
})
