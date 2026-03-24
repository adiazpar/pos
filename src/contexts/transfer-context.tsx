'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import { fetchDeduped } from '@/lib/fetch'

// ============================================
// TYPES
// ============================================

interface IncomingTransfer {
  code: string
  fromUser: {
    id: string
    name: string
  } | null
  status: 'pending' | 'accepted'
  expiresAt: string
}

interface PendingTransfer {
  code: string
  toEmail: string
  status: 'pending' | 'accepted'
  expiresAt: string
  toUser?: {
    id: string
    name: string
  }
}

interface TransferContextType {
  // Data
  pendingTransfer: PendingTransfer | null
  incomingTransfer: IncomingTransfer | null
  isLoading: boolean

  // Actions
  setPendingTransfer: (transfer: PendingTransfer | null) => void
  setIncomingTransfer: (transfer: IncomingTransfer | null) => void
  refresh: () => Promise<void>
}

// ============================================
// CONTEXT
// ============================================

const TransferContext = createContext<TransferContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

export function TransferProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null)
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isOwner = user?.role === 'owner'

  const fetchTransferData = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      if (isOwner) {
        const response = await fetchDeduped('/api/transfer/pending')
        const data = await response.json()
        if (response.ok && data.success) {
          setPendingTransfer(data.transfer || null)
        } else {
          setPendingTransfer(null)
        }
      } else {
        const response = await fetchDeduped('/api/transfer/incoming')
        const data = await response.json()
        if (response.ok && data.success) {
          setIncomingTransfer(data.transfer || null)
        } else {
          setIncomingTransfer(null)
        }
      }
    } catch (err) {
      console.error('Error fetching transfer:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, isOwner])

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchTransferData()
  }, [fetchTransferData])

  const value = useMemo<TransferContextType>(() => ({
    pendingTransfer,
    incomingTransfer,
    isLoading,
    setPendingTransfer,
    setIncomingTransfer,
    refresh: fetchTransferData,
  }), [pendingTransfer, incomingTransfer, isLoading, fetchTransferData])

  return (
    <TransferContext.Provider value={value}>
      {children}
    </TransferContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useTransfer(): TransferContextType {
  const context = useContext(TransferContext)
  if (!context) {
    throw new Error('useTransfer must be used within a TransferProvider')
  }
  return context
}
