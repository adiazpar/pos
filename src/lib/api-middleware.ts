/**
 * API route middleware utilities.
 *
 * Provides wrappers and helpers to reduce boilerplate in API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireBusinessAccess, type BusinessAccess } from './business-auth'

// ============================================
// ROUTE PARAMETER TYPES
// ============================================

/**
 * Standard route params for business-scoped routes.
 */
export interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

/**
 * Route params for routes with an additional ID parameter.
 */
export interface RouteParamsWithId {
  params: Promise<{
    businessId: string
    id: string
  }>
}

// ============================================
// BUSINESS AUTH WRAPPER
// ============================================

type BusinessRouteHandler = (
  request: NextRequest,
  access: BusinessAccess,
  params: Record<string, string>
) => Promise<NextResponse>

/**
 * Wraps an API route handler with business authentication.
 *
 * Handles:
 * - Extracting and validating businessId from route params
 * - Calling requireBusinessAccess for authorization
 * - Standard error responses for Unauthorized/Not found/Server errors
 *
 * @example
 * ```typescript
 * // Before: 20+ lines
 * export async function GET(request: NextRequest, { params }: RouteParams) {
 *   try {
 *     const { businessId } = await params
 *     const access = await requireBusinessAccess(businessId)
 *     const products = await db.select()...
 *     return NextResponse.json({ products })
 *   } catch (error) { ... }
 * }
 *
 * // After: 5 lines
 * export const GET = withBusinessAuth(async (request, access) => {
 *   const products = await db.select()
 *     .from(productsTable)
 *     .where(eq(productsTable.businessId, access.businessId))
 *   return NextResponse.json({ success: true, products })
 * })
 * ```
 */
export function withBusinessAuth(handler: BusinessRouteHandler) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const resolvedParams = await params
      const { businessId, ...restParams } = resolvedParams
      const access = await requireBusinessAccess(businessId)
      return await handler(request, access, restParams)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      if (error instanceof Error && error.message.includes('Not found')) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      console.error('API Error:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Creates a validation error response from a Zod parse result.
 *
 * @example
 * ```typescript
 * const validation = schema.safeParse(body)
 * if (!validation.success) {
 *   return validationError(validation)
 * }
 * ```
 */
export function validationError(
  result: z.SafeParseReturnType<unknown, unknown>
): NextResponse {
  const errors = (result as z.SafeParseError<unknown>).error?.errors || []
  const message = errors[0]?.message || 'Validation failed'
  return NextResponse.json({ error: message }, { status: 400 })
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Standard HTTP error responses.
 */
export const HttpResponse = {
  badRequest: (message: string) =>
    NextResponse.json({ error: message }, { status: 400 }),

  unauthorized: (message = 'Authentication required') =>
    NextResponse.json({ error: message }, { status: 401 }),

  forbidden: (message = 'Permission denied') =>
    NextResponse.json({ error: message }, { status: 403 }),

  notFound: (message = 'Resource not found') =>
    NextResponse.json({ error: message }, { status: 404 }),

  serverError: (message = 'Internal server error') =>
    NextResponse.json({ error: message }, { status: 500 }),
}

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationParams {
  limit: number
  offset: number
}

/**
 * Extract pagination parameters from URL search params.
 *
 * @param searchParams - URL search params
 * @param defaultLimit - Default limit if not specified (default: 50)
 * @param maxLimit - Maximum allowed limit (default: 500)
 *
 * @example
 * ```typescript
 * const { limit, offset } = getPaginationParams(request.nextUrl.searchParams)
 * const items = await db.select().from(table).limit(limit).offset(offset)
 * ```
 */
export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 50,
  maxLimit = 500
): PaginationParams {
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(defaultLimit)),
    maxLimit
  )
  const offset = parseInt(searchParams.get('offset') || '0')
  return { limit: isNaN(limit) ? defaultLimit : limit, offset: isNaN(offset) ? 0 : offset }
}
