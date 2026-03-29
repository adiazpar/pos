import { NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and, or } from 'drizzle-orm'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth } from '@/lib/api-middleware'

/**
 * GET /api/businesses/[businessId]/transfer/pending
 *
 * Get the current user's pending outgoing transfer (for owners).
 * Returns the transfer with recipient info if they've accepted.
 */
export const GET = withBusinessAuth(async (request, access) => {
  // Only owners have outgoing transfers
  if (!isOwner(access.role)) {
    return NextResponse.json({
      success: true,
      transfer: null,
    })
  }

  // Find pending or accepted transfer from this user
  const [transfer] = await db
    .select()
    .from(ownershipTransfers)
    .where(
      and(
        eq(ownershipTransfers.fromUser, access.userId),
        or(
          eq(ownershipTransfers.status, 'pending'),
          eq(ownershipTransfers.status, 'accepted')
        )
      )
    )
    .limit(1)

  if (!transfer) {
    return NextResponse.json({
      success: true,
      transfer: null,
    })
  }

  // Check if expired
  if (transfer.status === 'pending' && new Date(transfer.expiresAt) < new Date()) {
    // Mark as expired
    await db
      .update(ownershipTransfers)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(eq(ownershipTransfers.id, transfer.id))

    return NextResponse.json({
      success: true,
      transfer: null,
    })
  }

  // Get recipient user info if they've accepted
  let toUser = null
  if (transfer.toUser) {
    const [recipient] = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, transfer.toUser))
      .limit(1)

    toUser = recipient || null
  }

  return NextResponse.json({
    success: true,
    transfer: {
      code: transfer.code,
      toEmail: transfer.toEmail,
      status: transfer.status,
      expiresAt: transfer.expiresAt instanceof Date
        ? transfer.expiresAt.toISOString()
        : transfer.expiresAt,
      toUser,
    },
  })
})
