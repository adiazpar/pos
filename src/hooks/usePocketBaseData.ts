'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

/**
 * Options for configuring PocketBase data loading
 */
export interface UsePocketBaseDataOptions {
  sort?: string
  expand?: string
  filter?: string
  requestKey?: string | null
}

/**
 * Return type for the usePocketBaseData hook
 */
export interface UsePocketBaseDataResult<T> {
  data: T[]
  isLoading: boolean
  error: string
  refetch: () => void
}

/**
 * Reusable hook for loading data from PocketBase collections with cancellation support
 *
 * Features:
 * - Automatic cancellation on component unmount
 * - Error handling and state management
 * - Loading state tracking
 * - Refetch capability
 * - Dependency tracking for automatic reloads
 *
 * @template T - The type of data being loaded
 * @param collectionName - The PocketBase collection to load from
 * @param options - Optional PocketBase query options (sort, expand, filter, requestKey)
 * @returns Object containing data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data: users, isLoading, error, refetch } = usePocketBaseData<User>(
 *   'users',
 *   { sort: '-created', expand: 'role' }
 * )
 * ```
 */
export function usePocketBaseData<T>(
  collectionName: string,
  options?: UsePocketBaseDataOptions
): UsePocketBaseDataResult<T> {
  const { pb } = useAuth()

  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Refetch counter to trigger reload
  const [refetchCount, setRefetchCount] = useState(0)

  const refetch = useCallback(() => {
    setRefetchCount(prev => prev + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      setError('')

      try {
        const records = await pb
          .collection(collectionName)
          .getFullList<T>({
            sort: options?.sort,
            expand: options?.expand,
            filter: options?.filter,
            requestKey: options?.requestKey ?? null,
          })

        // Only update state if request wasn't cancelled
        if (cancelled) return

        setData(records)
      } catch (err) {
        // Only update state if request wasn't cancelled
        if (cancelled) return

        console.error(`Error loading ${collectionName}:`, err)

        // Extract error message from PocketBase error
        let errorMessage = `Error al cargar los datos de ${collectionName}`
        if (err && typeof err === 'object' && 'message' in err) {
          errorMessage = (err as { message: string }).message
        }

        setError(errorMessage)
      } finally {
        // Only update loading state if request wasn't cancelled
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    // Cleanup: Set cancelled flag on unmount or dependency change
    return () => {
      cancelled = true
    }
  }, [pb, collectionName, options?.sort, options?.expand, options?.filter, options?.requestKey, refetchCount])

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
