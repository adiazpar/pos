import { NextResponse } from 'next/server'
import { db, providers } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().default(true),
})

/**
 * GET /api/businesses/[businessId]/providers
 *
 * List all providers for the specified business.
 */
export const GET = withBusinessAuth(async (request, access) => {
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'

  const providersList = await db
    .select()
    .from(providers)
    .where(eq(providers.businessId, access.businessId))

  const filtered = activeOnly
    ? providersList.filter(p => p.active)
    : providersList

  return NextResponse.json({
    success: true,
    providers: filtered,
  })
})

/**
 * POST /api/businesses/[businessId]/providers
 *
 * Create a new provider.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = createProviderSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { name, phone, email, notes, active } = validation.data

  const providerId = nanoid()
  const now = new Date()

  const [newProvider] = await db.insert(providers).values({
    id: providerId,
    businessId: access.businessId,
    name,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
    active,
    createdAt: now,
    updatedAt: now,
  }).returning()

  return NextResponse.json({
    success: true,
    provider: newProvider,
  })
})
