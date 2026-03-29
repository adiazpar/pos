import { NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const createInviteSchema = z.object({
  code: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.string().datetime(),
})

/**
 * POST /api/businesses/[businessId]/invite/create
 *
 * Create a new invite code.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = createInviteSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { code, role, expiresAt } = validation.data

  const inviteId = nanoid()
  const now = new Date()

  await db.insert(inviteCodes).values({
    id: inviteId,
    businessId: access.businessId,
    code,
    role,
    createdBy: access.userId,
    expiresAt: new Date(expiresAt),
    used: false,
    createdAt: now,
  })

  return NextResponse.json({
    success: true,
    id: inviteId,
    code,
  })
})
