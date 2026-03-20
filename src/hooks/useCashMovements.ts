'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import type { CashMovement, CashMovementType, CashMovementCategory, CashSession } from '@/types'

export interface UseCashMovementsReturn {
  // State
  movements: CashMovement[]
  isLoading: boolean
  newMovementId: string | null
  lastMovementType: 'ingreso' | 'retiro' | null

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
  const { user, pb } = useAuth()

  const [movements, setMovements] = useState<CashMovement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newMovementId, setNewMovementId] = useState<string | null>(null)
  const [lastMovementType, setLastMovementType] = useState<'ingreso' | 'retiro' | null>(null)

  // Load movements for a session
  const loadMovements = useCallback(async (sessionId: string): Promise<void> => {
    setIsLoading(true)
    try {
      // Use simple getList with client-side filtering (workaround for SDK issue)
      const result = await pb.collection('cash_movements').getList<CashMovement>(1, 50, {
        expand: 'employee',
      })
      const movs = result.items.filter(m => m.session === sessionId)
      setMovements(movs)
    } catch (err) {
      console.error('Error loading movements:', err)
    } finally {
      setIsLoading(false)
    }
  }, [pb])

  // Record a new movement
  const recordMovement = useCallback(async (
    session: CashSession,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')

    const newMovement = await pb.collection('cash_movements').create<CashMovement>({
      session: session.id,
      type,
      category,
      amount,
      note: note.trim() || null,
      createdBy: user.id,
      employee: (category === 'prestamo_empleado' || category === 'devolucion_prestamo') ? user.id : null,
    })

    // Add expanded employee data for immediate display
    const movementWithExpand: CashMovement = {
      ...newMovement,
      expand: (category === 'prestamo_empleado' || category === 'devolucion_prestamo')
        ? { employee: user }
        : undefined
    }

    // Update local state
    setMovements(prev => [...prev, movementWithExpand])

    // Trigger balance animation
    setLastMovementType(type)
    setTimeout(() => setLastMovementType(null), 500)

    // Track new movement for inline animation
    setNewMovementId(movementWithExpand.id)

    return movementWithExpand
  }, [user, pb])

  // Update an existing movement
  const updateMovement = useCallback(async (
    movement: CashMovement,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')

    const updatedMovement = await pb.collection('cash_movements').update<CashMovement>(movement.id, {
      type,
      category,
      amount,
      note: note.trim() || null,
      employee: (category === 'prestamo_empleado' || category === 'devolucion_prestamo') ? user.id : null,
      editedBy: user.id,
    })

    // Update local state with expanded employee data
    const movementWithExpand: CashMovement = {
      ...updatedMovement,
      expand: (category === 'prestamo_empleado' || category === 'devolucion_prestamo')
        ? { employee: user }
        : movement.expand
    }

    setMovements(prev => prev.map(m => m.id === movement.id ? movementWithExpand : m))

    return movementWithExpand
  }, [user, pb])

  // Delete a movement
  const deleteMovement = useCallback(async (movementId: string): Promise<void> => {
    await pb.collection('cash_movements').delete(movementId)
    setMovements(prev => prev.filter(m => m.id !== movementId))
  }, [pb])

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
