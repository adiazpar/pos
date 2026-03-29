import { NextResponse } from 'next/server'
import { db, cashSessions } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const closeSessionSchema = z.object({
  closingBalance: z.number().min(0),
  expectedBalance: z.number(),
  discrepancy: z.number(),
  discrepancyNote: z.string().nullable().optional(),
})

/**
 * POST /api/businesses/[businessId]/cash/sessions/[id]/close
 *
 * Close a cash session.
 */
export const POST = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Session ID is required')
  }

  // Verify session exists, belongs to business, and is open
  const [cashSession] = await db
    .select()
    .from(cashSessions)
    .where(
      and(
        eq(cashSessions.id, id),
        eq(cashSessions.businessId, access.businessId),
        isNull(cashSessions.closedAt)
      )
    )
    .limit(1)

  if (!cashSession) {
    return HttpResponse.notFound('Cash session not found or already closed')
  }

  const body = await request.json()
  const validation = closeSessionSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { closingBalance, expectedBalance, discrepancy, discrepancyNote } = validation.data

  const now = new Date()

  await db
    .update(cashSessions)
    .set({
      closedBy: access.userId,
      closedAt: now,
      closingBalance,
      expectedBalance,
      discrepancy,
      discrepancyNote: discrepancyNote || null,
      updatedAt: now,
    })
    .where(eq(cashSessions.id, id))

  const [closedSession] = await db
    .select()
    .from(cashSessions)
    .where(eq(cashSessions.id, id))
    .limit(1)

  return NextResponse.json({
    success: true,
    session: closedSession,
  })
})
