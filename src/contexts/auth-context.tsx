'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import PocketBase from 'pocketbase'
import type { User } from '@/types'
import {
  hashPin,
  verifyPin,
} from '@/lib/auth'
import { POCKETBASE_URL } from '@/lib/pocketbase'
import {
  REMEMBERED_PHONE_KEY,
  REMEMBERED_NAME_KEY,
  PIN_VERIFIED_KEY,
  PRODUCT_FILTERS_KEY,
} from '@/lib/constants'
import { phoneToAuthEmail } from '@/lib/countries'

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  deviceTrusted: boolean
  requiresPinVerification: boolean // true if logged in but hasn't entered PIN this session
  requiresPinReset: boolean // true if user must reset PIN before continuing

  // Setup state (for first-time setup flow)
  setupComplete: boolean
  isCheckingSetup: boolean

  // Auth methods (now phone-based)
  loginWithPassword: (phoneNumber: string, password: string) => Promise<void>
  verifyPinForSession: (pin: string) => Promise<boolean>
  resetPin: (newPin: string) => Promise<{ success: boolean; error?: string }> // Reset PIN and clear pinResetRequired
  logout: (clearDevice?: boolean) => void

  // Firebase phone verification
  verifyFirebaseToken: (phoneNumber: string, idToken: string, purpose?: 'registration' | 'phone-change') => Promise<{ valid: boolean; error?: string }>

  // Phone change
  changePhoneNumber: (newPhone: string, firebaseToken: string) => Promise<{ success: boolean; error?: string }>

  // Registration (phone-based)
  registerOwner: (data: {
    phoneNumber: string
    password: string
    name: string
    pin: string
  }) => Promise<void>
  registerWithInvite: (data: {
    inviteCode: string
    phoneNumber: string
    password: string
    name: string
    pin: string
  }) => Promise<void>

  // Device trust (now phone-based)
  getRememberedPhone: () => string | null
  clearRememberedPhone: () => void
  trustDevice: (phoneNumber: string, name: string) => void
  getRememberedName: () => string | null

  // PocketBase instance for direct access if needed
  pb: PocketBase
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null)

// ============================================
// PROVIDER
// ============================================


// ============================================
// REMEMBERED USER HELPERS
// ============================================

function getRememberedPhone(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REMEMBERED_PHONE_KEY)
}

function getRememberedName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REMEMBERED_NAME_KEY)
}

function setRememberedUser(phoneNumber: string, name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(REMEMBERED_PHONE_KEY, phoneNumber)
  localStorage.setItem(REMEMBERED_NAME_KEY, name)
}

function clearRememberedUserStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBERED_PHONE_KEY)
  localStorage.removeItem(REMEMBERED_NAME_KEY)
}

function isPinVerifiedThisSession(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(PIN_VERIFIED_KEY) === 'true'
}

function setPinVerifiedThisSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PIN_VERIFIED_KEY, 'true')
}

function clearPinVerifiedThisSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PIN_VERIFIED_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pb] = useState(() => new PocketBase(POCKETBASE_URL))
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deviceTrusted, setDeviceTrusted] = useState(false)
  const [pinVerified, setPinVerified] = useState(() => isPinVerifiedThisSession())

  // Setup state - tracks whether owner account has been created
  const [setupComplete, setSetupComplete] = useState(true) // Default true to avoid flash
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)

  // Check setup state on mount - verify if owner exists
  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Use server-side API to check if owner exists
        // This avoids client-side auth restrictions
        const response = await fetch('/api/setup-status')
        const data = await response.json()
        setSetupComplete(data.ownerExists === true)
      } catch (error) {
        console.error('Error checking setup state:', error)
        // On error, assume setup is complete to avoid blocking existing users
        setSetupComplete(true)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkSetup()
  }, [])

  // Hydrate auth state from PocketBase on mount and validate with server
  useEffect(() => {
    const validateAuth = async () => {
      // Check if we have a stored token
      if (pb.authStore.model && pb.authStore.isValid) {
        try {
          // Validate token with server - this will fail if user was deleted
          const authData = await pb.collection('users').authRefresh()
          const refreshedUser = authData.record as unknown as User

          // Check if user has been disabled - log them out
          if (refreshedUser.status === 'disabled') {
            console.warn('User account has been disabled, logging out')
            pb.authStore.clear()
            setUser(null)
            clearRememberedUserStorage()
            setDeviceTrusted(false)
            return
          }

          setUser(refreshedUser)

          // Update remembered user info to keep in sync with server
          const rememberedPhone = getRememberedPhone()
          if (rememberedPhone) {
            setRememberedUser(rememberedPhone, refreshedUser.name)
          }
        } catch {
          // Token is invalid or user was deleted - clear auth state
          console.warn('Auth token invalid or user deleted, clearing session')
          pb.authStore.clear()
          setUser(null)
          clearRememberedUserStorage()
          setDeviceTrusted(false)
        }
      }

      // Check if this device is trusted (has remembered phone)
      const rememberedPhone = getRememberedPhone()
      setDeviceTrusted(!!rememberedPhone && pb.authStore.isValid)

      setIsLoading(false)
    }

    validateAuth()

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model as User | null)
    })

    return () => {
      unsubscribe()
    }
  }, [pb])

  // Periodically check if user has been disabled (every 30 seconds)
  useEffect(() => {
    if (!user) return

    const checkUserStatus = async () => {
      try {
        // Refresh user data to check current status
        const freshUser = await pb.collection('users').getOne<User>(user.id)
        if (freshUser.status === 'disabled') {
          console.warn('User account has been disabled, logging out')
          pb.authStore.clear()
          setUser(null)
          clearRememberedUserStorage()
          setDeviceTrusted(false)
        }
      } catch {
        // Ignore errors - user might have been deleted
      }
    }

    const interval = setInterval(checkUserStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [pb, user])

  // ============================================
  // AUTH METHODS
  // ============================================

  /**
   * Login with phone number and password (for new devices or expired sessions)
   * This is the primary authentication method
   */
  const loginWithPassword = useCallback(async (phoneNumber: string, password: string): Promise<void> => {
    try {
      // Convert phone to auth email format for PocketBase
      const authEmail = phoneToAuthEmail(phoneNumber)
      const authData = await pb.collection('users').authWithPassword(authEmail, password)
      const authUser = authData.record as unknown as User
      setUser(authUser)
      setRememberedUser(phoneNumber, authUser.name) // Trust this device after successful password login
      setDeviceTrusted(true)
      setPinVerified(true)
      setPinVerifiedThisSession()
    } catch (error) {
      // Don't log expected errors (disabled account, wrong password) as errors
      const pbError = error as { status?: number; message?: string }
      if (pbError.message?.includes('deshabilitada')) {
        console.warn('Login blocked: account disabled')
      } else {
        console.warn('Login failed:', pbError.status || 'unknown')
      }
      throw error
    }
  }, [pb])

  /**
   * Verify PIN for this browser session
   * Used when user is already authenticated but needs to confirm identity
   */
  const verifyPinForSession = useCallback(async (pin: string): Promise<boolean> => {
    if (!user?.pin) return false

    try {
      const isValid = await verifyPin(pin, user.pin)
      if (isValid) {
        setPinVerified(true)
        setPinVerifiedThisSession()
        return true
      }
      return false
    } catch {
      return false
    }
  }, [user])

  /**
   * Reset PIN for current user
   * Used when pinResetRequired is true
   */
  const resetPin = useCallback(async (newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No autorizado' }

    try {
      const pinHash = await hashPin(newPin)

      // Update user's PIN and clear the reset flag
      await pb.collection('users').update(user.id, {
        pin: pinHash,
        pinResetRequired: false,
      })

      // Update local user state
      setUser(prev => prev ? { ...prev, pin: pinHash, pinResetRequired: false } : null)

      // Mark PIN as verified for this session
      setPinVerified(true)
      setPinVerifiedThisSession()

      return { success: true }
    } catch (err) {
      console.error('Error resetting PIN:', err)
      return { success: false, error: 'Error al cambiar el PIN' }
    }
  }, [user, pb])

  const logout = useCallback((clearDevice = true) => {
    pb.authStore.clear()
    setUser(null)
    setPinVerified(false)
    clearPinVerifiedThisSession()
    // Clear user preferences stored in localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PRODUCT_FILTERS_KEY)
    }
    if (clearDevice) {
      clearRememberedUserStorage()
      setDeviceTrusted(false)
    }
  }, [pb])

  // ============================================
  // FIREBASE VERIFICATION
  // ============================================

  /**
   * Verify a Firebase ID token with our server
   * This confirms the phone was verified by Firebase
   */
  const verifyFirebaseToken = useCallback(async (
    phoneNumber: string,
    idToken: string,
    purpose?: 'registration' | 'phone-change'
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, idToken, purpose }),
      })

      const data = await response.json()
      return { valid: data.valid, error: data.error }
    } catch {
      return { valid: false, error: 'Error de conexion' }
    }
  }, [])

  /**
   * Change phone number after Firebase verification
   */
  const changePhoneNumber = useCallback(async (
    newPhone: string,
    firebaseToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/phone/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ newPhoneNumber: newPhone, firebaseToken }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        // Update local user state with new data
        setUser(data.user)

        // Update remembered phone if device is trusted
        const rememberedPhone = getRememberedPhone()
        if (rememberedPhone) {
          setRememberedUser(newPhone, data.user.name)
        }
      }

      return { success: data.success, error: data.error }
    } catch {
      return { success: false, error: 'Error de conexion' }
    }
  }, [pb])

  // ============================================
  // REGISTRATION METHODS
  // ============================================

  const registerOwner = useCallback(async (data: {
    phoneNumber: string
    password: string
    name: string
    pin: string
  }) => {
    // Check if setup is already complete (owner exists)
    if (setupComplete) {
      throw new Error('Ya existe un propietario registrado')
    }

    const pinHash = await hashPin(data.pin)
    const authEmail = phoneToAuthEmail(data.phoneNumber)

    try {
      // Create user with owner role using phone as auth email
      const newUser = await pb.collection('users').create({
        email: authEmail,               // Phone formatted as email for PocketBase auth
        emailVisibility: false,
        password: data.password,
        passwordConfirm: data.password,
        name: data.name,
        phoneNumber: data.phoneNumber,  // Actual phone number for display/WhatsApp
        phoneVerified: true,            // Verified via OTP before registration
        pin: pinHash,
        role: 'owner',
        status: 'active',
      })

      // Log in with auth email
      await pb.collection('users').authWithPassword(authEmail, data.password)
      setUser(newUser as unknown as User)

      // Mark setup as complete
      try {
        const configs = await pb.collection('app_config').getList(1, 1)
        if (configs.items.length > 0) {
          await pb.collection('app_config').update(configs.items[0].id, {
            setupComplete: true,
            ownerPhone: data.phoneNumber,
          })
        } else {
          // Create config record if none exists
          await pb.collection('app_config').create({
            setupComplete: true,
            ownerPhone: data.phoneNumber,
          })
        }
        setSetupComplete(true)
      } catch (configError) {
        console.error('Failed to update app config:', configError)
        // Don't fail registration if config update fails
      }

      // Trust this device and mark PIN as verified (they just set it)
      setRememberedUser(data.phoneNumber, data.name)
      setDeviceTrusted(true)
      setPinVerified(true)
      setPinVerifiedThisSession()
    } catch (error) {
      console.error('Registration failed:', error)
      // Extract PocketBase error message if available
      if (error && typeof error === 'object' && 'response' in error) {
        const pbError = error as { response?: { data?: Record<string, { message?: string }>, message?: string } }
        // Check for phone already exists error (email field in PocketBase)
        if (pbError.response?.data?.email?.message) {
          throw new Error('Ya existe una cuenta con este numero')
        }
        if (pbError.response?.data?.phoneNumber?.message) {
          throw new Error(pbError.response.data.phoneNumber.message)
        }
        throw new Error(pbError.response?.message || 'Error de registro')
      }
      throw error
    }
  }, [pb, setupComplete])

  const registerWithInvite = useCallback(async (data: {
    inviteCode: string
    phoneNumber: string
    password: string
    name: string
    pin: string
  }) => {
    try {
      // Validate invite code using server-side endpoint (rate-limited)
      const response = await fetch(`${POCKETBASE_URL}/api/validate-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.inviteCode }),
      })

      const validation = await response.json()

      if (response.status === 429) {
        throw new Error(validation.error || 'Demasiados intentos')
      }

      if (!validation.valid) {
        throw new Error('Codigo de invitacion invalido o expirado')
      }

      const pinHash = await hashPin(data.pin)
      const authEmail = phoneToAuthEmail(data.phoneNumber)

      // Create user with role from invite using phone as auth email
      const newUser = await pb.collection('users').create({
        email: authEmail,               // Phone formatted as email for PocketBase auth
        emailVisibility: false,
        password: data.password,
        passwordConfirm: data.password,
        name: data.name,
        phoneNumber: data.phoneNumber,  // Actual phone number for display/WhatsApp
        phoneVerified: true,            // Verified via OTP before registration
        pin: pinHash,
        role: validation.role,
        status: 'active',
      })

      // Log in with auth email
      await pb.collection('users').authWithPassword(authEmail, data.password)

      // Mark invite as used via server-side endpoint (now we're authenticated)
      try {
        await fetch(`${POCKETBASE_URL}/api/use-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token,
          },
          body: JSON.stringify({ code: data.inviteCode }),
        })
      } catch (updateError) {
        // Non-critical - invite marking as used can fail without breaking registration
        console.error('Failed to mark invite as used:', updateError)
      }

      setUser(newUser as unknown as User)

      // Trust this device and mark PIN as verified (they just set it)
      setRememberedUser(data.phoneNumber, data.name)
      setDeviceTrusted(true)
      setPinVerified(true)
      setPinVerifiedThisSession()
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }, [pb])

  // ============================================
  // DEVICE TRUST
  // ============================================

  const trustDevice = useCallback((phoneNumber: string, name: string) => {
    setRememberedUser(phoneNumber, name)
    setDeviceTrusted(true)
  }, [])

  const clearRememberedPhone = useCallback(() => {
    clearRememberedUserStorage()
    setDeviceTrusted(false)
  }, [])

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    deviceTrusted,
    requiresPinVerification: !!user && !pinVerified,
    requiresPinReset: !!user?.pinResetRequired,

    // Setup state
    setupComplete,
    isCheckingSetup,

    loginWithPassword,
    verifyPinForSession,
    resetPin,
    logout,

    verifyFirebaseToken,
    changePhoneNumber,

    registerOwner,
    registerWithInvite,

    getRememberedPhone,
    getRememberedName,
    clearRememberedPhone,
    trustDevice,

    pb,
  }), [
    user,
    isLoading,
    deviceTrusted,
    pinVerified,
    setupComplete,
    isCheckingSetup,
    loginWithPassword,
    verifyPinForSession,
    resetPin,
    logout,
    verifyFirebaseToken,
    changePhoneNumber,
    registerOwner,
    registerWithInvite,
    clearRememberedPhone,
    trustDevice,
    pb,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ============================================
// HELPER HOOKS
// ============================================

export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
