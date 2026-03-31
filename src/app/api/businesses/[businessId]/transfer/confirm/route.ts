import { NextResponse } from 'next/server'
import { db, ownershipTransfers, users, businesses, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner, invalidateAccessCache } from '@/lib/business-auth'
import { verifyPassword } from '@/lib/simple-auth'
import { nanoid } from 'nanoid'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const confirmSchema = z.object({
  code: Schemas.code(),
  password: Schemas.password(),
})

/**
 * POST /api/businesses/[businessId]/transfer/confirm
 *
 * Confirm and complete an ownership transfer.
 * The owner must verify their password to complete the transfer.
 * This is the final step after the recipient has accepted.
 */
export const POST = withBusinessAuth(async (request, access) => {
  // Only owners can confirm transfers
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden('Only the owner can confirm the transfer')
  }

  const body = await request.json()
  const validation = confirmSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { code, password } = validation.data

  // Get current user to verify password
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, access.userId))
    .limit(1)

  if (!currentUser) {
    return HttpResponse.notFound('User not found')
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, currentUser.password)
  if (!isValidPassword) {
    return NextResponse.json(
      { error: 'Incorrect password' },
      { status: 401 }
    )
  }

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

  // Must be in accepted status
  if (transfer.status !== 'accepted') {
    return HttpResponse.badRequest('The recipient has not yet accepted the transfer')
  }

  // Must have a toUser (recipient)
  if (!transfer.toUser) {
    return HttpResponse.badRequest('No recipient for this transfer')
  }

  const now = new Date()

  // Perform the ownership transfer
  // 1. Update the old owner's role to 'partner' in business_users
  await db
    .update(businessUsers)
    .set({
      role: 'partner',
      updatedAt: now,
    })
    .where(
      and(
        eq(businessUsers.userId, access.userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )

  // 2. Check if new owner already has a business_users entry
  const [existingMembership] = await db
    .select()
    .from(businessUsers)
    .where(
      and(
        eq(businessUsers.userId, transfer.toUser),
        eq(businessUsers.businessId, access.businessId)
      )
    )
    .limit(1)

  if (existingMembership) {
    // Update existing membership to owner
    await db
      .update(businessUsers)
      .set({
        role: 'owner',
        updatedAt: now,
      })
      .where(eq(businessUsers.id, existingMembership.id))
  } else {
    // Create new business_users entry for new owner
    await db.insert(businessUsers).values({
      id: nanoid(),
      userId: transfer.toUser,
      businessId: access.businessId,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }

  // 3. Update business owner
  await db
    .update(businesses)
    .set({
      ownerId: transfer.toUser,
      updatedAt: now,
    })
    .where(eq(businesses.id, access.businessId))

  // 4. Mark transfer as completed
  await db
    .update(ownershipTransfers)
    .set({
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(ownershipTransfers.id, transfer.id))

  // Invalidate cached access for both users
  invalidateAccessCache(access.userId, access.businessId)
  invalidateAccessCache(transfer.toUser, access.businessId)

  return NextResponse.json({ success: true })
})
