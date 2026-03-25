import { NextRequest, NextResponse } from 'next/server'
import { db, productCategories } from '@/db'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const reorderSchema = z.object({
  categoryIds: z.array(z.string()).min(1, 'At least one category is required'),
})

/**
 * POST /api/categories/reorder
 *
 * Update the sort order of categories.
 * The order in the array determines the new sort order.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and owners can reorder categories
    if (session.role === 'employee') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = reorderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { categoryIds } = validation.data

    // Verify all categories belong to this business
    const existingCategories = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(and(
        inArray(productCategories.id, categoryIds),
        eq(productCategories.businessId, session.businessId)
      ))

    if (existingCategories.length !== categoryIds.length) {
      return NextResponse.json(
        { error: 'Some categories not found or do not belong to this business' },
        { status: 400 }
      )
    }

    // Update sort order for each category
    const now = new Date()
    await Promise.all(
      categoryIds.map((id, index) =>
        db
          .update(productCategories)
          .set({
            sortOrder: index + 1,
            updatedAt: now,
          })
          .where(eq(productCategories.id, id))
      )
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Reorder categories error:', error)
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    )
  }
}
