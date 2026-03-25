import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { uploadProductIcon, deleteProductIcon } from '@/lib/storage'

/**
 * PATCH /api/products/[id]
 *
 * Update a product. Accepts FormData with optional icon file.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify product exists and belongs to business
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const name = formData.get('name') as string | null
    const price = formData.get('price') as string | null
    const category = formData.get('category') as string | null
    const categoryId = formData.get('categoryId') as string | null
    const active = formData.get('active') as string | null
    const iconFile = formData.get('icon') as File | null

    const updateData: Record<string, unknown> = {}

    if (name !== null) {
      const nameValidation = z.string().min(1).safeParse(name)
      if (!nameValidation.success) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        )
      }
      updateData.name = nameValidation.data
    }

    if (price !== null) {
      const priceValidation = z.coerce.number().min(0).safeParse(price)
      if (!priceValidation.success) {
        return NextResponse.json(
          { error: 'Price must be 0 or greater' },
          { status: 400 }
        )
      }
      updateData.price = priceValidation.data
    }

    if (category !== null) {
      if (category === '') {
        updateData.category = null
      } else {
        const categoryValidation = z.enum(['food', 'beverage', 'snack', 'dessert', 'other']).safeParse(category)
        if (!categoryValidation.success) {
          return NextResponse.json(
            { error: 'Invalid category' },
            { status: 400 }
          )
        }
        updateData.category = categoryValidation.data
      }
    }

    // Handle categoryId (new custom categories)
    if (categoryId !== null) {
      if (categoryId === '') {
        updateData.categoryId = null
      } else {
        updateData.categoryId = categoryId
      }
    }

    if (active !== null) {
      updateData.active = active === 'true'
    }

    // Upload new icon if provided
    if (iconFile && iconFile.size > 0) {
      try {
        // Delete old icon if exists
        if (existingProduct.icon) {
          await deleteProductIcon(existingProduct.icon)
        }
        // Upload new icon
        updateData.icon = await uploadProductIcon(iconFile, id)
      } catch (err) {
        console.error('Error uploading icon:', err)
        // Continue without updating icon rather than failing
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No data to update' },
        { status: 400 }
      )
    }

    updateData.updatedAt = new Date()

    await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))

    const [updatedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]
 *
 * Delete a product.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify product exists and belongs to business
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Delete icon from storage if exists
    if (existingProduct.icon) {
      try {
        await deleteProductIcon(existingProduct.icon)
      } catch (err) {
        console.error('Error deleting icon:', err)
        // Continue with product deletion even if icon delete fails
      }
    }

    await db
      .delete(products)
      .where(eq(products.id, id))

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
