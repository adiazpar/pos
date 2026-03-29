import { NextResponse } from 'next/server'
import { db, cashMovements, cashSessions, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

// Alias users table for multiple joins
const creators = alias(users, 'creators')

const createMovementSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['deposit', 'withdrawal']),
  category: z.enum(['sale', 'bank_withdrawal', 'bank_deposit', 'other']),
  amount: z.number().positive('Amount must be greater than 0'),
  note: z.string().nullable().optional(),
})

/**
 * GET /api/businesses/[businessId]/cash/movements
 *
 * List cash movements for a session.
 */
export const GET = withBusinessAuth(async (request, access) => {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return HttpResponse.badRequest('sessionId is required')
  }

  // Verify session belongs to business
  const [cashSession] = await db
    .select()
    .from(cashSessions)
    .where(
      and(
        eq(cashSessions.id, sessionId),
        eq(cashSessions.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!cashSession) {
    return HttpResponse.notFound('Cash session not found')
  }

  const movementsList = await db
    .select({
      id: cashMovements.id,
      sessionId: cashMovements.sessionId,
      type: cashMovements.type,
      category: cashMovements.category,
      amount: cashMovements.amount,
      note: cashMovements.note,
      saleId: cashMovements.saleId,
      createdBy: cashMovements.createdBy,
      editedBy: cashMovements.editedBy,
      createdAt: cashMovements.createdAt,
      updatedAt: cashMovements.updatedAt,
      creatorName: creators.name,
    })
    .from(cashMovements)
    .leftJoin(creators, eq(cashMovements.createdBy, creators.id))
    .where(eq(cashMovements.sessionId, sessionId))

  return NextResponse.json({
    success: true,
    movements: movementsList.map(m => ({
      ...m,
      creator: m.creatorName ? { name: m.creatorName } : null,
    })),
  })
})

/**
 * POST /api/businesses/[businessId]/cash/movements
 *
 * Create a new cash movement.
 */
export const POST = withBusinessAuth(async (request, access) => {
  const body = await request.json()
  const validation = createMovementSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { sessionId, type, category, amount, note } = validation.data

  // Verify session belongs to business and is open
  const [cashSession] = await db
    .select()
    .from(cashSessions)
    .where(
      and(
        eq(cashSessions.id, sessionId),
        eq(cashSessions.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!cashSession) {
    return HttpResponse.notFound('Cash session not found')
  }

  if (cashSession.closedAt) {
    return HttpResponse.badRequest('Cash session is already closed')
  }

  const movementId = nanoid()
  const now = new Date()

  const [newMovement] = await db.insert(cashMovements).values({
    id: movementId,
    sessionId,
    type,
    category,
    amount,
    note: note || null,
    createdBy: access.userId,
    createdAt: now,
    updatedAt: now,
  }).returning()

  // Fetch creator name separately
  const [creator] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, access.userId))
    .limit(1)

  return NextResponse.json({
    success: true,
    movement: {
      ...newMovement,
      creator: creator ? { name: creator.name } : null,
    },
  })
})
