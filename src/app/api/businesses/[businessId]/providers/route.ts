import { NextRequest, NextResponse } from 'next/server'
import { db, providers } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess, canManageBusiness } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

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
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Get active query param
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const query = db
      .select()
      .from(providers)
      .where(eq(providers.businessId, access.businessId))

    const providersList = await query

    // Filter active if requested
    const filtered = activeOnly
      ? providersList.filter(p => p.active)
      : providersList

    return NextResponse.json({
      success: true,
      providers: filtered,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get providers error:', error)
    return NextResponse.json(
      { error: 'Failed to get providers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/businesses/[businessId]/providers
 *
 * Create a new provider.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only partners and owners can create providers
    if (!canManageBusiness(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createProviderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Create provider error:', error)
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    )
  }
}
