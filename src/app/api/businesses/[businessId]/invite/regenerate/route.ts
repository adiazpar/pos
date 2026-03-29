import { NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const regenerateInviteSchema = z.object({
  oldCodeId: z.string().min(1),
  newCode: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.string().datetime(),
})

/**
 * POST /api/businesses/[businessId]/invite/regenerate
 *
 * Delete old invite code and create a new one.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = regenerateInviteSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { oldCodeId, newCode, role, expiresAt } = validation.data

  // Delete old code
  await db
    .delete(inviteCodes)
    .where(
      and(
        eq(inviteCodes.id, oldCodeId),
        eq(inviteCodes.businessId, access.businessId)
      )
    )

  // Create new code
  const newCodeId = nanoid()
  const now = new Date()

  await db.insert(inviteCodes).values({
    id: newCodeId,
    businessId: access.businessId,
    code: newCode,
    role,
    createdBy: access.userId,
    expiresAt: new Date(expiresAt),
    used: false,
    createdAt: now,
  })

  return NextResponse.json({
    success: true,
    id: newCodeId,
    code: newCode,
  })
})
