'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { fetchDeduped } from '@/lib/fetch'
import type { CashMovement, CashMovementType, CashMovementCategory, CashSession } from '@/types'

export interface UseCashMovementsReturn {
  // State
  movements: CashMovement[]
  isLoading: boolean
  newMovementId: string | null
  lastMovementType: 'deposit' | 'withdrawal' | null

  // Actions
  loadMovements: (sessionId: string) => Promise<void>
  setMovements: (movements: CashMovement[]) => void
  recordMovement: (
    session: CashSession,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ) => Promise<CashMovement>
  updateMovement: (
    movement: CashMovement,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ) => Promise<CashMovement>
  deleteMovement: (movementId: string) => Promise<void>
  clearNewMovementId: () => void
}

export function useCashMovements(): UseCashMovementsReturn {
  const { user } = useAuth()

  const [movements, setMovements] = useState<CashMovement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newMovementId, setNewMovementId] = useState<string | null>(null)
  const [lastMovementType, setLastMovementType] = useState<'deposit' | 'withdrawal' | null>(null)

  // Load movements for a session
  // TODO: Implement with Drizzle API routes
  const loadMovements = useCallback(async (sessionId: string): Promise<void> => {
    setIsLoading(true)
    try {
      const response = await fetchDeduped(`/api/cash/movements?sessionId=${sessionId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setMovements(data.movements)
      }
    } catch (err) {
      console.error('Error loading movements:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Record a new movement
  // TODO: Implement with Drizzle API routes
  const recordMovement = useCallback(async (
    session: CashSession,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')

    const response = await fetch('/api/cash/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        type,
        category,
        amount,
        note: note.trim() || null,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error recording movement')
    }

    const newMovement: CashMovement = data.movement

    // Update local state
    setMovements(prev => [...prev, newMovement])

    // Trigger balance animation
    setLastMovementType(type)
    setTimeout(() => setLastMovementType(null), 500)

    // Track new movement for inline animation
    setNewMovementId(newMovement.id)

    return newMovement
  }, [user])

  // Update an existing movement
  // TODO: Implement with Drizzle API routes
  const updateMovement = useCallback(async (
    movement: CashMovement,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`/api/cash/movements/${movement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        category,
        amount,
        note: note.trim() || null,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error updating movement')
    }

    const updatedMovement: CashMovement = data.movement

    setMovements(prev => prev.map(m => m.id === movement.id ? updatedMovement : m))

    return updatedMovement
  }, [user])

  // Delete a movement
  // TODO: Implement with Drizzle API routes
  const deleteMovement = useCallback(async (movementId: string): Promise<void> => {
    const response = await fetch(`/api/cash/movements/${movementId}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error deleting movement')
    }

    setMovements(prev => prev.filter(m => m.id !== movementId))
  }, [])

  // Clear new movement ID (used after animation completes)
  const clearNewMovementId = useCallback(() => {
    setNewMovementId(null)
  }, [])

  return {
    movements,
    isLoading,
    newMovementId,
    lastMovementType,
    loadMovements,
    setMovements,
    recordMovement,
    updateMovement,
    deleteMovement,
    clearNewMovementId,
  }
}
