import { NextResponse } from 'next/server'
import { db, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const cancelSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

/**
 * POST /api/businesses/[businessId]/transfer/cancel
 *
 * Cancel a pending ownership transfer.
 * Only the owner who initiated the transfer can cancel it.
 */
export const POST = withBusinessAuth(async (request, access) => {
  // Only owners can cancel transfers
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = cancelSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { code } = validation.data

  // Find the transfer
  const [transfer] = await db
    .select()
    .from(ownershipTransfers)
    .where(
      and(
        eq(ownershipTransfers.code, code),
        eq(ownershipTransfers.fromUser, access.userId)
      )
    )
    .limit(1)

  if (!transfer) {
    return HttpResponse.notFound('Transfer not found')
  }

  // Can only cancel pending or accepted transfers
  if (transfer.status !== 'pending' && transfer.status !== 'accepted') {
    return HttpResponse.badRequest('This transfer cannot be cancelled')
  }

  // Update to cancelled
  await db
    .update(ownershipTransfers)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(ownershipTransfers.id, transfer.id))

  return NextResponse.json({ success: true })
})
