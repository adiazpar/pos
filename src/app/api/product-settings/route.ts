import { NextRequest, NextResponse } from 'next/server'
import { db, productSettings, productCategories } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const sortPreferenceValues = ['name_asc', 'name_desc', 'price_asc', 'price_desc', 'category', 'stock_asc', 'stock_desc'] as const

const updateSettingsSchema = z.object({
  defaultCategoryId: z.string().nullable().optional(),
  sortPreference: z.enum(sortPreferenceValues).optional(),
})

/**
 * GET /api/product-settings
 *
 * Get product settings for the current business.
 * Creates default settings if none exist.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get existing settings
    let [settings] = await db
      .select()
      .from(productSettings)
      .where(eq(productSettings.businessId, session.businessId))
      .limit(1)

    // If no settings exist, create defaults
    if (!settings) {
      const settingsId = nanoid()
      const now = new Date()

      await db.insert(productSettings).values({
        id: settingsId,
        businessId: session.businessId,
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
  } catch (error) {
    console.error('Get product settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get product settings' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/product-settings
 *
 * Update product settings.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and owners can update settings
    if (session.role === 'employee') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = updateSettingsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
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
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 400 }
        )
      }
    }

    // Check if settings exist
    let [settings] = await db
      .select()
      .from(productSettings)
      .where(eq(productSettings.businessId, session.businessId))
      .limit(1)

    const now = new Date()

    if (!settings) {
      // Create settings if they don't exist
      const settingsId = nanoid()

      await db.insert(productSettings).values({
        id: settingsId,
        businessId: session.businessId,
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
        .where(eq(productSettings.businessId, session.businessId))

      ;[settings] = await db
        .select()
        .from(productSettings)
        .where(eq(productSettings.businessId, session.businessId))
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
  } catch (error) {
    console.error('Update product settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update product settings' },
      { status: 500 }
    )
  }
}
