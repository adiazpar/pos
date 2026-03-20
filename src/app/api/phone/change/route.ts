import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { isValidE164, phoneToAuthEmail } from '@/lib/countries'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

// Firebase project ID from environment
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

/**
 * Verify a Firebase ID token
 * This is a lightweight verification that checks the token structure and claims.
 */
async function verifyFirebaseToken(idToken: string): Promise<{
  valid: boolean
  phoneNumber?: string
  error?: string
}> {
  try {
    // Decode the JWT (base64) to get the payload
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: 'Token invalido' }
    }

    // Decode payload (middle part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    )

    // Basic validation
    const now = Math.floor(Date.now() / 1000)

    // Check expiration
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expirado' }
    }

    // Check issued at (not in the future)
    if (payload.iat && payload.iat > now + 60) {
      return { valid: false, error: 'Token invalido' }
    }

    // Check issuer matches our Firebase project
    const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
    if (payload.iss !== expectedIssuer) {
      return { valid: false, error: 'Token invalido' }
    }

    // Check audience matches our Firebase project
    if (payload.aud !== FIREBASE_PROJECT_ID) {
      return { valid: false, error: 'Token invalido' }
    }

    // Check phone number is present
    if (!payload.phone_number) {
      return { valid: false, error: 'Token no contiene numero de telefono' }
    }

    return {
      valid: true,
      phoneNumber: payload.phone_number,
    }
  } catch (error) {
    console.error('Error verifying Firebase token:', error)
    return { valid: false, error: 'Error al verificar token' }
  }
}

/**
 * POST /api/phone/change
 *
 * Update user's phone number after Firebase verification.
 * Requires authentication via Authorization header.
 *
 * Body: { newPhoneNumber: "+51987654321", firebaseToken: "firebase_id_token" }
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
    const { newPhoneNumber, firebaseToken } = body as {
      newPhoneNumber: string
      firebaseToken: string
    }

    // Validate new phone number format
    if (!newPhoneNumber || !isValidE164(newPhoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Validate Firebase token is provided
    if (!firebaseToken) {
      return NextResponse.json(
        { success: false, error: 'Token de verificacion requerido' },
        { status: 400 }
      )
    }

    // Check if Firebase is configured
    if (!FIREBASE_PROJECT_ID) {
      console.error('Firebase project ID not configured')
      return NextResponse.json(
        { success: false, error: 'Error de configuracion del servidor' },
        { status: 500 }
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

    // Verify user token is valid by checking user exists
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

    // Verify the Firebase ID token
    const verification = await verifyFirebaseToken(firebaseToken)

    if (!verification.valid) {
      return NextResponse.json({
        success: false,
        error: verification.error || 'Token invalido',
      })
    }

    // Check that the phone number in the token matches the new phone number
    if (verification.phoneNumber !== newPhoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'El numero verificado no coincide',
      })
    }

    // Check if new phone is already registered by another user
    try {
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `phoneNumber = "${newPhoneNumber}" && id != "${currentUser.id}"`,
      })
      if (existingUsers.totalItems > 0) {
        return NextResponse.json(
          { success: false, error: 'Este numero ya esta registrado' },
          { status: 400 }
        )
      }
    } catch {
      console.warn('Could not check for existing phone number')
    }

    // Update user's phone number and email (auth email)
    const newAuthEmail = phoneToAuthEmail(newPhoneNumber)

    const updatedUser = await pb.collection('users').update(currentUser.id, {
      phoneNumber: newPhoneNumber,
      email: newAuthEmail,
      phoneVerified: true,
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error changing phone number:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cambiar el numero de telefono' },
      { status: 500 }
    )
  }
}
