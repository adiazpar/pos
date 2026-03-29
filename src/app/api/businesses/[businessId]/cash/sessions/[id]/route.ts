import { NextResponse } from 'next/server'
import { db, cashSessions } from '@/db'
import { eq, and } from 'drizzle-orm'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'

/**
 * GET /api/businesses/[businessId]/cash/sessions/[id]
 *
 * Get a specific cash session.
 */
export const GET = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Session ID is required')
  }

  const [cashSession] = await db
    .select()
    .from(cashSessions)
    .where(
      and(
        eq(cashSessions.id, id),
        eq(cashSessions.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!cashSession) {
    return HttpResponse.notFound('Cash session not found')
  }

  return NextResponse.json({
    success: true,
    session: cashSession,
  })
})
