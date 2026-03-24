import { NextRequest, NextResponse } from 'next/server'
import { db, cashSessions, cashMovements, users } from '@/db'
import { eq, desc, isNull, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const openSessionSchema = z.object({
  openingBalance: z.number().min(0, 'Opening balance must be 0 or greater'),
})

/**
 * GET /api/cash/sessions
 *
 * List all cash sessions for the current business.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      .where(eq(cashSessions.businessId, session.businessId))
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
    console.error('Get cash sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to get cash sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cash/sessions
 *
 * Open a new cash drawer session.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for existing open session
    const [existingOpen] = await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.businessId, session.businessId),
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

    await db.insert(cashSessions).values({
      id: sessionId,
      businessId: session.businessId,
      openedBy: session.userId,
      openedAt: now,
      openingBalance,
      createdAt: now,
      updatedAt: now,
    })

    // Fetch the created session with opener info
    const [newSession] = await db
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
      })
      .from(cashSessions)
      .leftJoin(users, eq(cashSessions.openedBy, users.id))
      .where(eq(cashSessions.id, sessionId))
      .limit(1)

    return NextResponse.json({
      success: true,
      session: {
        ...newSession,
        opener: newSession.openerName ? { name: newSession.openerName } : null,
      },
    })
  } catch (error) {
    console.error('Open cash session error:', error)
    return NextResponse.json(
      { error: 'Failed to open cash drawer' },
      { status: 500 }
    )
  }
}
