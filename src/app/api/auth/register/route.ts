import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { hashPassword, createToken, setAuthCookie } from '@/lib/simple-auth'

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

/**
 * POST /api/auth/register
 *
 * Register a new user account.
 * Creates user only - no business. User creates/joins business from hub.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, name } = validation.data

    // Check if email already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    const now = new Date()
    const userId = nanoid()

    // Create user account
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email: email.toLowerCase(),
        password: passwordHash,
        name,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    // Create JWT token
    const token = await createToken({
      userId: newUser.id,
      email: newUser.email,
    })

    // Set auth cookie
    await setAuthCookie(token)

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
