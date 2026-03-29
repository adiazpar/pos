import { NextRequest, NextResponse } from 'next/server'
import { db, cashSessions, cashMovements, users } from '@/db'
import { eq, desc, isNull, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const openSessionSchema = z.object({
  openingBalance: z.number().min(0, 'Opening balance must be 0 or greater'),
})

/**
 * GET /api/businesses/[businessId]/cash/sessions
 *
 * List all cash sessions for the specified business.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Subquery to count movements per session
    const movementCountSubquery = db
      .select({
        sessionId: cashMovements.sessionId,
        count: sql<number>`count(*)`.as('movement_count'),
      })
      .from(cashMovements)
      .groupBy(cashMovements.sessionId)
      .as('movement_counts')

    const sessionsList = await db
      .select({
        id: cashSessions.id,
        businessId: cashSessions.businessId,
        openedBy: cashSessions.openedBy,
        closedBy: cashSessions.closedBy,
        openedAt: cashSessions.openedAt,
        closedAt: cashSessions.closedAt,
        openingBalance: cashSessions.openingBalance,
        closingBalance: cashSessions.closingBalance,
        expectedBalance: cashSessions.expectedBalance,
        discrepancy: cashSessions.discrepancy,
        discrepancyNote: cashSessions.discrepancyNote,
        createdAt: cashSessions.createdAt,
        updatedAt: cashSessions.updatedAt,
        openerName: users.name,
        movementCount: movementCountSubquery.count,
      })
      .from(cashSessions)
      .leftJoin(users, eq(cashSessions.openedBy, users.id))
      .leftJoin(movementCountSubquery, eq(cashSessions.id, movementCountSubquery.sessionId))
      .where(eq(cashSessions.businessId, access.businessId))
      .orderBy(desc(cashSessions.openedAt))

    return NextResponse.json({
      success: true,
      sessions: sessionsList.map(s => ({
        ...s,
        movementCount: s.movementCount ?? 0,
        opener: s.openerName ? { name: s.openerName } : null,
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get cash sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to get cash sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/businesses/[businessId]/cash/sessions
 *
 * Open a new cash drawer session.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Check for existing open session
    const [existingOpen] = await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.businessId, access.businessId),
          isNull(cashSessions.closedAt)
        )
      )
      .limit(1)

    if (existingOpen) {
      return NextResponse.json(
        { error: 'A cash drawer is already open' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = openSessionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { openingBalance } = validation.data

    const sessionId = nanoid()
    const now = new Date()

    const [newSession] = await db.insert(cashSessions).values({
      id: sessionId,
      businessId: access.businessId,
      openedBy: access.userId,
      openedAt: now,
      openingBalance,
      createdAt: now,
      updatedAt: now,
    }).returning()

    // Fetch opener name separately
    const [opener] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, access.userId))
      .limit(1)

    return NextResponse.json({
      success: true,
      session: {
        ...newSession,
        opener: opener ? { name: opener.name } : null,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Open cash session error:', error)
    return NextResponse.json(
      { error: 'Failed to open cash drawer' },
      { status: 500 }
    )
  }
}
