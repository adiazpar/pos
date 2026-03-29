import { NextResponse } from 'next/server'
import { db, productSettings, productCategories } from '@/db'
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
  // Try to get existing settings
  let [settings] = await db
    .select()
    .from(productSettings)
    .where(eq(productSettings.businessId, access.businessId))
    .limit(1)

  // If no settings exist, create defaults
  if (!settings) {
    const settingsId = nanoid()
    const now = new Date()

    await db.insert(productSettings).values({
      id: settingsId,
      businessId: access.businessId,
      defaultCategoryId: null,
      sortPreference: 'name_asc',
      createdAt: now,
      updatedAt: now,
    })

    ;[settings] = await db
      .select()
      .from(productSettings)
      .where(eq(productSettings.id, settingsId))
      .limit(1)
  }

  // Get the default category if one is set
  let defaultCategory = null
  if (settings.defaultCategoryId) {
    const [category] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, settings.defaultCategoryId))
      .limit(1)
    defaultCategory = category || null
  }

  return NextResponse.json({
    success: true,
    settings: {
      ...settings,
      defaultCategory,
    },
  })
})

/**
 * PATCH /api/businesses/[businessId]/product-settings
 *
 * Update product settings.
 */
export const PATCH = withBusinessAuth(async (request, access) => {
  // Only partners and owners can update settings
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = updateSettingsSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { defaultCategoryId, sortPreference } = validation.data

  // Verify the category exists if one is provided
  if (defaultCategoryId !== undefined && defaultCategoryId !== null) {
    const [category] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, defaultCategoryId))
      .limit(1)

    if (!category) {
      return HttpResponse.badRequest('Category not found')
    }
  }

  // Check if settings exist
  let [settings] = await db
    .select()
    .from(productSettings)
    .where(eq(productSettings.businessId, access.businessId))
    .limit(1)

  const now = new Date()

  if (!settings) {
    // Create settings if they don't exist
    const settingsId = nanoid()

    await db.insert(productSettings).values({
      id: settingsId,
      businessId: access.businessId,
      defaultCategoryId: defaultCategoryId ?? null,
      sortPreference: sortPreference || 'name_asc',
      createdAt: now,
      updatedAt: now,
    })

    ;[settings] = await db
      .select()
      .from(productSettings)
      .where(eq(productSettings.id, settingsId))
      .limit(1)
  } else {
    // Update existing settings
    const updateData: Record<string, unknown> = { updatedAt: now }

    if (defaultCategoryId !== undefined) {
      updateData.defaultCategoryId = defaultCategoryId
    }
    if (sortPreference !== undefined) {
      updateData.sortPreference = sortPreference
    }

    await db
      .update(productSettings)
      .set(updateData)
      .where(eq(productSettings.businessId, access.businessId))

    ;[settings] = await db
      .select()
      .from(productSettings)
      .where(eq(productSettings.businessId, access.businessId))
      .limit(1)
  }

  // Get the default category if one is set
  let defaultCategory = null
  if (settings.defaultCategoryId) {
    const [category] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, settings.defaultCategoryId))
      .limit(1)
    defaultCategory = category || null
  }

  return NextResponse.json({
    success: true,
    settings: {
      ...settings,
      defaultCategory,
    },
  })
})
