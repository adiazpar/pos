'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { isValidE164 } from '@/lib/countries'
import { transitionModals } from '@/lib/modal-utils'

// ============================================
// TYPES
// ============================================

type Theme = 'light' | 'dark' | 'system'

export interface PendingTransfer {
  code: string
  toPhone: string
  status: 'pending' | 'accepted'
  expiresAt: string
  toUser?: {
    id: string
    name: string
  }
}

export interface IncomingTransfer {
  code: string
  fromUser: { id: string; name: string } | null
  status: 'pending' | 'accepted'
  expiresAt: string
}

export const THEME_CONFIG = {
  light: {
    label: 'Claro',
    description: 'Modo claro activado',
  },
  dark: {
    label: 'Oscuro',
    description: 'Modo oscuro activado',
  },
  system: {
    label: 'Sistema',
    description: 'Se ajusta automaticamente segun tu dispositivo',
  },
} as const

// ============================================
// HELPERS
// ============================================

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem('theme') as Theme | null
  return saved || 'system'
}

export function formatTimeRemaining(expiresAt: string): string {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return 'Expirado'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m restantes`
  }
  return `${minutes}m restantes`
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseSettingsReturn {
  // User
  user: ReturnType<typeof useAuth>['user']
  isOwner: boolean

  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void
  themeDescription: string

  // Transfer state (owner)
  pendingTransfer: PendingTransfer | null
  isLoadingTransfer: boolean

  // Incoming transfer state (non-owner)
  incomingTransfer: IncomingTransfer | null
  isLoadingIncoming: boolean
  acceptingTransfer: boolean

  // Transfer modal state
  isTransferModalOpen: boolean
  transferStep: number
  setTransferStep: (step: number) => void
  transferPhone: string
  setTransferPhone: (phone: string) => void
  transferLink: string
  transferError: string
  transferLoading: boolean
  linkCopied: boolean

  // Transfer actions
  handleOpenTransferModal: () => void
  handleCloseTransferModal: () => void
  handleTransferModalExitComplete: () => void
  handleInitiateTransfer: (e: React.FormEvent) => Promise<void>
  handleCopyTransferLink: () => Promise<void>
  handleCancelTransfer: () => Promise<void>
  handleConfirmTransfer: (pin: string) => Promise<void>
  handleShowTransferLink: () => void
  handleAcceptIncomingTransfer: () => Promise<void>

  // Phone change state
  isPhoneModalOpen: boolean
  phoneChangeStep: 'phone' | 'verify'
  newPhone: string
  setNewPhone: (phone: string) => void
  phoneChangeError: string
  phoneChangeLoading: boolean

  // Phone change actions
  handleOpenPhoneModal: () => void
  handleClosePhoneModal: () => void
  handlePhoneModalExitComplete: () => void
  handlePhoneSubmit: (e: React.FormEvent) => void
  handlePhoneVerified: (idToken: string) => Promise<void>
}

// ============================================
// HOOK
// ============================================

export function useSettings(): UseSettingsReturn {
  const { user, pb, changePhoneNumber } = useAuth()
  const isOwner = user?.role === 'owner'

  // Theme state
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const isInitialMount = useRef(true)

  // Transfer state (for owner)
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null)
  const [isLoadingTransfer, setIsLoadingTransfer] = useState(false)

  // Incoming transfer state (for non-owner recipients)
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransfer | null>(null)
  const [isLoadingIncoming, setIsLoadingIncoming] = useState(false)
  const [acceptingTransfer, setAcceptingTransfer] = useState(false)

  // Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferStep, setTransferStep] = useState(0)
  const [transferPhone, setTransferPhone] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferLink, setTransferLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  // Phone change state
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [phoneChangeStep, setPhoneChangeStep] = useState<'phone' | 'verify'>('phone')
  const [newPhone, setNewPhone] = useState('')
  const [phoneChangeError, setPhoneChangeError] = useState('')
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false)

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch pending transfer on mount (owner only)
  useEffect(() => {
    if (!isOwner) return

    const fetchPendingTransfer = async () => {
      setIsLoadingTransfer(true)
      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/pending`, {
          headers: {
            'Authorization': pb.authStore.token,
          },
        })
        const data = await response.json()
        setPendingTransfer(data.transfer || null)
      } catch (err) {
        console.error('Error fetching pending transfer:', err)
      } finally {
        setIsLoadingTransfer(false)
      }
    }

    fetchPendingTransfer()
  }, [isOwner, pb])

  // Fetch incoming transfer for non-owners
  useEffect(() => {
    if (isOwner) return

    const fetchIncomingTransfer = async () => {
      setIsLoadingIncoming(true)
      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/incoming`, {
          headers: {
            'Authorization': pb.authStore.token,
          },
        })
        const data = await response.json()
        setIncomingTransfer(data.transfer || null)
      } catch (err) {
        console.error('Error fetching incoming transfer:', err)
      } finally {
        setIsLoadingIncoming(false)
      }
    }

    fetchIncomingTransfer()
  }, [isOwner, pb])

  // Apply theme changes only when user changes theme (not on mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const root = document.documentElement

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      localStorage.removeItem('theme')
    } else {
      root.classList.toggle('dark', theme === 'dark')
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  // ============================================
  // TRANSFER HANDLERS
  // ============================================

  const handleOpenTransferModal = useCallback(() => {
    setTransferStep(0)
    setTransferPhone('')
    setTransferError('')
    setIsTransferModalOpen(true)
  }, [])

  const handleCloseTransferModal = useCallback(() => {
    setIsTransferModalOpen(false)
  }, [])

  const handleTransferModalExitComplete = useCallback(() => {
    setTransferStep(0)
    setTransferPhone('')
    setTransferError('')
    setTransferLink('')
    setLinkCopied(false)
  }, [])

  const handleInitiateTransfer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError('')

    if (!transferPhone || !isValidE164(transferPhone)) {
      setTransferError('Ingresa un numero de telefono valido')
      return
    }

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ toPhone: transferPhone }),
      })

      const data = await response.json()

      if (!data.success) {
        setTransferError(data.error || 'Error al iniciar transferencia')
        setTransferLoading(false)
        return
      }

      // Generate transfer link for manual sharing
      const link = `${window.location.origin}/transfer?code=${data.code}`
      setTransferLink(link)

      // Update pending transfer
      setPendingTransfer({
        code: data.code,
        toPhone: transferPhone,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      setTransferPhone('')
      setTransferStep(1) // Go to link step
    } catch (err) {
      console.error('Transfer initiate error:', err)
      setTransferError('Error de conexion')
    } finally {
      setTransferLoading(false)
    }
  }, [transferPhone, pb])

  const handleCopyTransferLink = useCallback(async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(transferLink)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = transferLink
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [transferLink])

  const handleCancelTransfer = useCallback(async () => {
    if (!pendingTransfer) return

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: pendingTransfer.code }),
      })

      const data = await response.json()

      if (data.success) {
        setPendingTransfer(null)
      }
    } catch (err) {
      console.error('Cancel transfer error:', err)
    } finally {
      setTransferLoading(false)
    }
  }, [pendingTransfer, pb])

  const handleConfirmTransfer = useCallback(async (pin: string) => {
    if (!pendingTransfer) return

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: pendingTransfer.code, pin }),
      })

      const data = await response.json()

      if (!data.success) {
        setTransferError(data.error || 'Error al confirmar transferencia')
        setTransferLoading(false)
        return
      }

      // Transfer complete - reload page to reflect new role
      window.location.reload()
    } catch (err) {
      console.error('Confirm transfer error:', err)
      setTransferError('Error de conexion')
    } finally {
      setTransferLoading(false)
    }
  }, [pendingTransfer, pb])

  const handleShowTransferLink = useCallback(() => {
    if (pendingTransfer) {
      setTransferLink(`${window.location.origin}/transfer?code=${pendingTransfer.code}`)
      setTransferStep(1)
      setIsTransferModalOpen(true)
    }
  }, [pendingTransfer])

  const handleAcceptIncomingTransfer = useCallback(async () => {
    if (!incomingTransfer) return

    setAcceptingTransfer(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: incomingTransfer.code }),
      })

      const result = await response.json()

      if (result.success) {
        window.location.reload()
      }
    } catch (err) {
      console.error('Accept incoming transfer error:', err)
    } finally {
      setAcceptingTransfer(false)
    }
  }, [incomingTransfer, pb])

  // ============================================
  // PHONE CHANGE HANDLERS
  // ============================================

  const handleOpenPhoneModal = useCallback(() => {
    setPhoneChangeStep('phone')
    setNewPhone('')
    setPhoneChangeError('')
    setIsPhoneModalOpen(true)
  }, [])

  const handleClosePhoneModal = useCallback(() => {
    setIsPhoneModalOpen(false)
  }, [])

  const handlePhoneModalExitComplete = useCallback(() => {
    setPhoneChangeStep('phone')
    setNewPhone('')
    setPhoneChangeError('')
  }, [])

  const handlePhoneSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setPhoneChangeError('')

    if (!newPhone || !isValidE164(newPhone)) {
      setPhoneChangeError('Ingresa un numero de telefono valido')
      return
    }

    if (user?.phoneNumber === newPhone) {
      setPhoneChangeError('El nuevo numero debe ser diferente al actual')
      return
    }

    setPhoneChangeStep('verify')
  }, [newPhone, user?.phoneNumber])

  const handlePhoneVerified = useCallback(async (idToken: string) => {
    setPhoneChangeLoading(true)
    setPhoneChangeError('')

    try {
      const result = await changePhoneNumber(newPhone, idToken)

      if (!result.success) {
        setPhoneChangeError(result.error || 'Error al cambiar el numero')
        setPhoneChangeLoading(false)
        return
      }

      handleClosePhoneModal()
    } catch {
      setPhoneChangeError('Error de conexion')
    } finally {
      setPhoneChangeLoading(false)
    }
  }, [newPhone, changePhoneNumber, handleClosePhoneModal])

  // ============================================
  // RETURN
  // ============================================

  return {
    // User
    user,
    isOwner,

    // Theme
    theme,
    setTheme,
    themeDescription: THEME_CONFIG[theme].description,

    // Transfer state (owner)
    pendingTransfer,
    isLoadingTransfer,

    // Incoming transfer state (non-owner)
    incomingTransfer,
    isLoadingIncoming,
    acceptingTransfer,

    // Transfer modal state
    isTransferModalOpen,
    transferStep,
    setTransferStep,
    transferPhone,
    setTransferPhone,
    transferLink,
    transferError,
    transferLoading,
    linkCopied,

    // Transfer actions
    handleOpenTransferModal,
    handleCloseTransferModal,
    handleTransferModalExitComplete,
    handleInitiateTransfer,
    handleCopyTransferLink,
    handleCancelTransfer,
    handleConfirmTransfer,
    handleShowTransferLink,
    handleAcceptIncomingTransfer,

    // Phone change state
    isPhoneModalOpen,
    phoneChangeStep,
    newPhone,
    setNewPhone,
    phoneChangeError,
    phoneChangeLoading,

    // Phone change actions
    handleOpenPhoneModal,
    handleClosePhoneModal,
    handlePhoneModalExitComplete,
    handlePhoneSubmit,
    handlePhoneVerified,
  }
}
