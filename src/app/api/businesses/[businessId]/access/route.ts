import { NextResponse } from 'next/server'
import { withBusinessAuth } from '@/lib/api-middleware'

/**
 * GET /api/businesses/[businessId]/access
 *
 * Validate that the current user has access to the specified business.
 * Returns the user's role and business info.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  return NextResponse.json({
    success: true,
    businessId: access.businessId,
    businessName: access.businessName,
    role: access.role,
  })
})
