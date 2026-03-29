'use client'

import { useState, useCallback } from 'react'

interface UseFormModalOptions {
  onClose: () => void
  onReset?: () => void
}

interface UseFormModalReturn {
  isSaving: boolean
  setIsSaving: (saving: boolean) => void
  error: string
  setError: (error: string) => void
  handleClose: () => void
  clearError: () => void
}

/**
 * Hook for managing common modal form state.
 *
 * Handles:
 * - isSaving state to prevent closing during save
 * - error state for displaying errors
 * - handleClose that checks isSaving and resets form
 *
 * @example
 * ```tsx
 * const { isSaving, setIsSaving, error, setError, handleClose } = useFormModal({
 *   onClose,
 *   onReset: resetForm,
 * })
 * ```
 */
export function useFormModal({
  onClose,
  onReset,
}: UseFormModalOptions): UseFormModalReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const clearError = useCallback(() => setError(''), [])

  const handleClose = useCallback(() => {
    if (!isSaving) {
      onReset?.()
      onClose()
    }
  }, [isSaving, onReset, onClose])

  return {
    isSaving,
    setIsSaving,
    error,
    setError,
    handleClose,
    clearError,
  }
}
