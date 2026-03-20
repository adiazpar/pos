import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { isValidE164, phoneToAuthEmail } from '@/lib/countries'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * POST /api/admin/change-member-phone
 *
 * Owner-only endpoint to change a team member's phone number.
 * This bypasses OTP verification since the owner is trusted.
 *
 * Body: { userId: "...", newPhoneNumber: "+51987654321" }
 * Response: { success: true, user: User } or { success: false, error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Extract token (supports both "Bearer token" and plain "token" formats)
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader

    const body = await request.json()
    const { userId, newPhoneNumber } = body as {
      userId: string
      newPhoneNumber: string
    }

    // Validate inputs
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    if (!newPhoneNumber || !isValidE164(newPhoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Verify user token and check if they're the owner
    const userPb = new PocketBase(POCKETBASE_URL)
    userPb.authStore.save(token, null)

    let currentUser
    try {
      const authData = await userPb.collection('users').authRefresh()
      currentUser = authData.record
    } catch {
      return NextResponse.json(
        { success: false, error: 'Sesion invalida' },
        { status: 401 }
      )
    }

    // Only owner can change other users' phone numbers
    if (currentUser.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Solo el propietario puede cambiar telefonos de otros usuarios' },
        { status: 403 }
      )
    }

    // Cannot change your own phone this way (use regular phone change flow)
    if (userId === currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'Usa la opcion de configuracion para cambiar tu propio numero' },
        { status: 400 }
      )
    }

    // Connect to PocketBase as admin
    const pb = new PocketBase(POCKETBASE_URL)

    const adminEmail = process.env.PB_ADMIN_EMAIL
    const adminPassword = process.env.PB_ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Error de configuracion del servidor' },
        { status: 500 }
      )
    }

    try {
      await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword)
    } catch (authError) {
      console.error('Admin auth failed:', authError)
      return NextResponse.json(
        { success: false, error: 'Error del servidor' },
        { status: 500 }
      )
    }

    // Verify target user exists
    let targetUser
    try {
      targetUser = await pb.collection('users').getOne(userId)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Cannot change owner's phone (owner should use their own settings)
    if (targetUser.role === 'owner') {
      return NextResponse.json(
        { success: false, error: 'No puedes cambiar el numero del propietario' },
        { status: 403 }
      )
    }

    // Check if new phone is same as current
    if (targetUser.phoneNumber === newPhoneNumber) {
      return NextResponse.json(
        { success: false, error: 'El nuevo numero debe ser diferente al actual' },
        { status: 400 }
      )
    }

    // Check if new phone is already registered by another user
    try {
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `phoneNumber = "${newPhoneNumber}" && id != "${userId}"`,
      })
      if (existingUsers.totalItems > 0) {
        return NextResponse.json(
          { success: false, error: 'Este numero ya esta registrado por otro usuario' },
          { status: 400 }
        )
      }
    } catch {
      console.warn('Could not check for existing phone number')
    }

    // Update user's phone number and email (auth email)
    const newAuthEmail = phoneToAuthEmail(newPhoneNumber)

    const updatedUser = await pb.collection('users').update(userId, {
      phoneNumber: newPhoneNumber,
      email: newAuthEmail,
      phoneVerified: true, // Owner vouches for it
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error changing member phone number:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cambiar el numero de telefono' },
      { status: 500 }
    )
  }
}
