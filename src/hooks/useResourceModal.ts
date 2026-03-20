'use client'

import { useState, useCallback } from 'react'

/**
 * Generic hook for managing modal state across CRUD operations
 * Encapsulates the common pattern of modal state management used in pages like:
 * - ajustes/equipo (team member management)
 * - productos (product management)
 *
 * @template T - The type of resource being managed (User, Product, etc.)
 *
 * @example
 * const { isOpen, editing, isSaving, error, open, close, setError, clearError } = useResourceModal<Product>()
 *
 * // Open modal to create new resource
 * open()
 *
 * // Open modal to edit existing resource
 * open(product)
 *
 * // Handle save with loading state
 * try {
 *   setSaving(true)
 *   await saveResource(editing)
 * } catch (err) {
 *   setError(err.message)
 * } finally {
 *   setSaving(false)
 * }
 */
export interface UseResourceModalState<T> {
  isOpen: boolean
  isLoading: boolean
  isSaving: boolean
  error: string
  editing: T | null
}

export interface UseResourceModalActions<T> {
  open: (item?: T) => void
  close: () => void
  setError: (error: string) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setEditing: (item: T | null) => void
}

export type UseResourceModalReturn<T> = UseResourceModalState<T> & UseResourceModalActions<T>

/**
 * Generic modal state management hook
 * @returns Object with state and handler functions
 */
export function useResourceModal<T>(): UseResourceModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<T | null>(null)

  const open = useCallback((item?: T) => {
    setEditing(item || null)
    setError('')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSetError = useCallback((err: string) => {
    setError(err)
  }, [])

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const handleSetLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const handleSetSaving = useCallback((saving: boolean) => {
    setIsSaving(saving)
  }, [])

  const handleSetEditing = useCallback((item: T | null) => {
    setEditing(item)
  }, [])

  return {
    isOpen,
    isLoading,
    isSaving,
    error,
    editing,
    open,
    close,
    setError: handleSetError,
    clearError,
    setLoading: handleSetLoading,
    setSaving: handleSetSaving,
    setEditing: handleSetEditing,
  }
}
