import { NextResponse } from 'next/server'
import { db, productSettings } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const sortPreferenceValues = ['name_asc', 'name_desc', 'price_asc', 'price_desc', 'category', 'stock_asc', 'stock_desc'] as const

const updateSettingsSchema = z.object({
  defaultCategoryId: z.string().nullable().optional(),
  sortPreference: z.enum(sortPreferenceValues).optional(),
})

/**
 * GET /api/businesses/[businessId]/product-settings
 *
 * Get product settings for the business.
 * Creates default settings if none exist.
 */
export const GET = withBusinessAuth(async (request, access) => {
  let [settings] = await db
    .select()
    .from(productSettings)
    .where(eq(productSettings.businessId, access.businessId))
    .limit(1)

  if (!settings) {
    const now = new Date()
    const settingsId = nanoid()

    await db.insert(productSettings).values({
      id: settingsId,
      businessId: access.businessId,
      defaultCategoryId: null,
      sortPreference: 'name_asc',
      createdAt: now,
      updatedAt: now,
    })

    settings = {
      id: settingsId,
      businessId: access.businessId,
      defaultCategoryId: null,
      sortPreference: 'name_asc',
      createdAt: now,
      updatedAt: now,
    }
  }

  return NextResponse.json({
    success: true,
    settings,
  })
})

/**
 * PATCH /api/businesses/[businessId]/product-settings
 *
 * Update product settings. Single query - no re-fetch needed.
 */
export const PATCH = withBusinessAuth(async (request, access) => {
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = updateSettingsSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { defaultCategoryId, sortPreference } = validation.data

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (defaultCategoryId !== undefined) {
    updateData.defaultCategoryId = defaultCategoryId
  }
  if (sortPreference !== undefined) {
    updateData.sortPreference = sortPreference
  }

  // Single update query - settings always exist (created on first GET)
  await db
    .update(productSettings)
    .set(updateData)
    .where(eq(productSettings.businessId, access.businessId))

  return NextResponse.json({
    success: true,
    settings: {
      defaultCategoryId: defaultCategoryId ?? null,
      sortPreference: sortPreference ?? null,
    },
  })
})
