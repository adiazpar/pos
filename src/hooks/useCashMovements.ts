'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { apiRequest, apiPost, apiPatch, apiDelete, ApiError, ApiResponse } from '@/lib/api-client'
import type { CashMovement, CashMovementType, CashMovementCategory, CashSession } from '@/types'

interface MovementsResponse extends ApiResponse {
  movements: CashMovement[]
}

interface MovementResponse extends ApiResponse {
  movement: CashMovement
}

type DeleteResponse = ApiResponse

export interface UseCashMovementsOptions {
  businessId: string | null
}

export interface UseCashMovementsReturn {
  // State
  movements: CashMovement[]
  isLoading: boolean
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
}

export function useCashMovements({ businessId }: UseCashMovementsOptions): UseCashMovementsReturn {
  const { user } = useAuth()

  const [movements, setMovements] = useState<CashMovement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastMovementType, setLastMovementType] = useState<'deposit' | 'withdrawal' | null>(null)

  // Load movements for a session
  const loadMovements = useCallback(async (sessionId: string): Promise<void> => {
    if (!businessId) return
    setIsLoading(true)
    try {
      const data = await apiRequest<MovementsResponse>(
        `/api/businesses/${businessId}/cash/movements?sessionId=${sessionId}`
      )
      setMovements(data.movements)
    } catch (err) {
      if (err instanceof ApiError) {
        console.error('Error loading movements:', err.message)
      } else {
        console.error('Error loading movements:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  // Record a new movement
  const recordMovement = useCallback(async (
    session: CashSession,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')
    if (!businessId) throw new Error('No business context')

    try {
      const data = await apiPost<MovementResponse>(
        `/api/businesses/${businessId}/cash/movements`,
        {
          sessionId: session.id,
          type,
          category,
          amount,
          note: note.trim() || null,
        }
      )

      const newMovement = data.movement

      // Update local state
      setMovements(prev => [...prev, newMovement])

      // Trigger balance animation
      setLastMovementType(type)
      setTimeout(() => setLastMovementType(null), 500)

      return newMovement
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      }
      throw err
    }
  }, [user, businessId])

  // Update an existing movement
  const updateMovement = useCallback(async (
    movement: CashMovement,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')
    if (!businessId) throw new Error('No business context')

    try {
      const data = await apiPatch<MovementResponse>(
        `/api/businesses/${businessId}/cash/movements/${movement.id}`,
        {
          type,
          category,
          amount,
          note: note.trim() || null,
        }
      )

      const updatedMovement = data.movement

      setMovements(prev => prev.map(m => m.id === movement.id ? updatedMovement : m))

      return updatedMovement
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      }
      throw err
    }
  }, [user, businessId])

  // Delete a movement
  const deleteMovement = useCallback(async (movementId: string): Promise<void> => {
    if (!businessId) throw new Error('No business context')

    try {
      await apiDelete<DeleteResponse>(
        `/api/businesses/${businessId}/cash/movements/${movementId}`
      )

      setMovements(prev => prev.filter(m => m.id !== movementId))
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      }
      throw err
    }
  }, [businessId])

  return {
    movements,
    isLoading,
    lastMovementType,
    loadMovements,
    setMovements,
    recordMovement,
    updateMovement,
    deleteMovement,
  }
}
