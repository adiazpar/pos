/**
 * usePocketBaseOperation - Encapsulates common CRUD operation patterns
 *
 * Handles:
 * - Loading and error states
 * - Async operation execution
 * - Error handling with custom messages
 * - Success callbacks
 * - Error cleanup
 */

import { useState, useCallback } from 'react'

export interface OperationConfig {
  errorMessage?: string
  onSuccess?: () => void | Promise<void>
}

export interface OperationState {
  isLoading: boolean
  error: string | null
}

interface UsePocketBaseOperationReturn {
  state: OperationState
  execute: <T>(
    operation: () => Promise<T>,
    config?: OperationConfig
  ) => Promise<T | null>
  setError: (error: string) => void
  clearError: () => void
}

/**
 * Hook for managing PocketBase CRUD operations
 *
 * Usage:
 * ```typescript
 * const { state, execute, setError, clearError } = usePocketBaseOperation()
 *
 * const handleSave = async () => {
 *   const result = await execute(
 *     () => pb.collection('providers').update(id, data),
 *     {
 *       errorMessage: 'Error al guardar',
 *       onSuccess: () => loadData()
 *     }
 *   )
 * }
 * ```
 */
export function usePocketBaseOperation(): UsePocketBaseOperationReturn {
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
  })

  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      error,
    }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

  const execute = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      config?: OperationConfig
    ): Promise<T | null> => {
      setState({
        isLoading: true,
        error: null,
      })

      try {
        const result = await operation()

        // Call onSuccess callback if provided
        if (config?.onSuccess) {
          await config.onSuccess()
        }

        setState({
          isLoading: false,
          error: null,
        })

        return result
      } catch (err) {
        const errorMessage =
          config?.errorMessage || 'Ocurrió un error al realizar la operación'

        console.error('Operation error:', err)

        setState({
          isLoading: false,
          error: errorMessage,
        })

        return null
      }
    },
    []
  )

  return {
    state,
    execute,
    setError,
    clearError,
  }
}
