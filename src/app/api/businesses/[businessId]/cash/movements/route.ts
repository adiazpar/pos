import { NextRequest, NextResponse } from 'next/server'
import { db, cashMovements, cashSessions, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

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
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Cash session not found' },
        { status: 404 }
      )
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get cash movements error:', error)
    return NextResponse.json(
      { error: 'Failed to get cash movements' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/businesses/[businessId]/cash/movements
 *
 * Create a new cash movement.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    const body = await request.json()
    const validation = createMovementSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Cash session not found' },
        { status: 404 }
      )
    }

    if (cashSession.closedAt) {
      return NextResponse.json(
        { error: 'Cash session is already closed' },
        { status: 400 }
      )
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Create cash movement error:', error)
    return NextResponse.json(
      { error: 'Failed to create cash movement' },
      { status: 500 }
    )
  }
}
