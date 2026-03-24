'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useTransfer } from '@/contexts/transfer-context'

// ============================================
// TYPES
// ============================================

type Theme = 'light' | 'dark' | 'system'

export interface PendingTransfer {
  code: string
  toEmail: string
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
    label: 'Light',
    description: 'Light mode enabled',
  },
  dark: {
    label: 'Dark',
    description: 'Dark mode enabled',
  },
  system: {
    label: 'System',
    description: 'Automatically adjusts based on your device',
  },
} as const

// ============================================
// HELPERS
// ============================================

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem('theme') as Theme | null
  return saved || 'system'
}

export function formatTimeRemaining(expiresAt: string): string {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }
  return `${minutes}m remaining`
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
  transferEmail: string
  setTransferEmail: (email: string) => void
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
  handleConfirmTransfer: (password: string) => Promise<void>
  handleShowTransferLink: () => void
  handleAcceptIncomingTransfer: () => Promise<void>
}

// ============================================
// HOOK
// ============================================

export function useSettings(): UseSettingsReturn {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  // Get transfer data from shared context (fetched once in layout)
  const {
    pendingTransfer,
    incomingTransfer,
    isLoading: isLoadingTransfer,
    setPendingTransfer,
    setIncomingTransfer,
  } = useTransfer()

  // Theme state
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const isInitialMount = useRef(true)

  // Local transfer UI state
  const [acceptingTransfer, setAcceptingTransfer] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferStep, setTransferStep] = useState(0)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferLink, setTransferLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  // ============================================
  // EFFECTS
  // ============================================

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
    setTransferEmail('')
    setTransferError('')
    setIsTransferModalOpen(true)
  }, [])

  const handleCloseTransferModal = useCallback(() => {
    setIsTransferModalOpen(false)
  }, [])

  const handleTransferModalExitComplete = useCallback(() => {
    setTransferStep(0)
    setTransferEmail('')
    setTransferError('')
    setTransferLink('')
    setLinkCopied(false)
  }, [])

  const handleInitiateTransfer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError('')

    // Validate email
    if (!transferEmail || !transferEmail.includes('@')) {
      setTransferError('Enter a valid email')
      return
    }

    setTransferLoading(true)

    try {
      // TODO: Call /api/transfer/initiate with Drizzle
      const response = await fetch('/api/transfer/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: transferEmail }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setTransferError(data.error || 'Failed to initiate transfer')
        setTransferLoading(false)
        return
      }

      // Generate transfer link for manual sharing
      const link = `${window.location.origin}/transfer?code=${data.code}`
      setTransferLink(link)

      // Update pending transfer
      setPendingTransfer({
        code: data.code,
        toEmail: transferEmail,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      setTransferEmail('')
      setTransferStep(1) // Go to link step
    } catch (err) {
      console.error('Transfer initiate error:', err)
      setTransferError('Connection error')
    } finally {
      setTransferLoading(false)
    }
  }, [transferEmail])

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
      const response = await fetch('/api/transfer/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }, [pendingTransfer])

  const handleConfirmTransfer = useCallback(async (password: string) => {
    if (!pendingTransfer) return

    setTransferLoading(true)

    try {
      const response = await fetch('/api/transfer/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pendingTransfer.code, password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setTransferError(data.error || 'Failed to confirm transfer')
        setTransferLoading(false)
        return
      }

      // Transfer complete - reload page to reflect new role
      window.location.reload()
    } catch (err) {
      console.error('Confirm transfer error:', err)
      setTransferError('Connection error')
    } finally {
      setTransferLoading(false)
    }
  }, [pendingTransfer])

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
      const response = await fetch('/api/transfer/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }, [incomingTransfer])

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
    isLoadingIncoming: isLoadingTransfer, // Same loading state from context
    acceptingTransfer,

    // Transfer modal state
    isTransferModalOpen,
    transferStep,
    setTransferStep,
    transferEmail,
    setTransferEmail,
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
  }
}
