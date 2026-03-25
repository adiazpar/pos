/**
 * Hook for managing product settings and categories
 */

import { useState, useCallback, useEffect } from 'react'
import { fetchDeduped } from '@/lib/fetch'
import type { ProductCategory, ProductSettings, SortPreference } from '@/types'

// ============================================
// SESSION CACHE
// ============================================

const CATEGORIES_CACHE_KEY = 'product_categories_cache'
const SETTINGS_CACHE_KEY = 'product_settings_cache'

function getCachedCategories(): ProductCategory[] | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(CATEGORIES_CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function setCachedCategories(categories: ProductCategory[]): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories))
  } catch {
    // Storage error, ignore
  }
}

function getCachedSettings(): ProductSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(SETTINGS_CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function setCachedSettings(settings: ProductSettings): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
  } catch {
    // Storage error, ignore
  }
}

// ============================================
// HOOK INTERFACE
// ============================================

export interface UseProductSettingsReturn {
  // Categories
  categories: ProductCategory[]
  isLoadingCategories: boolean
  createCategory: (name: string) => Promise<ProductCategory | null>
  updateCategory: (id: string, name: string) => Promise<ProductCategory | null>
  deleteCategory: (id: string) => Promise<boolean>
  reorderCategories: (categoryIds: string[]) => Promise<boolean>

  // Settings
  settings: ProductSettings | null
  isLoadingSettings: boolean
  updateSettings: (updates: { defaultCategoryId?: string | null; sortPreference?: SortPreference }) => Promise<ProductSettings | null>

  // Error handling
  error: string
  clearError: () => void

  // Operation states
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isSavingSettings: boolean

  // Refresh data
  refreshCategories: () => Promise<void>
  refreshSettings: () => Promise<void>
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useProductSettings(): UseProductSettingsReturn {
  // State
  const [categories, setCategoriesState] = useState<ProductCategory[]>(() => getCachedCategories() || [])
  const [settings, setSettingsState] = useState<ProductSettings | null>(() => getCachedSettings())
  const [isLoadingCategories, setIsLoadingCategories] = useState(() => !getCachedCategories())
  const [isLoadingSettings, setIsLoadingSettings] = useState(() => !getCachedSettings())
  const [error, setError] = useState('')

  // Operation states
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Wrapper functions that update both state and cache
  const setCategories = useCallback((updater: ProductCategory[] | ((prev: ProductCategory[]) => ProductCategory[])) => {
    setCategoriesState(prev => {
      const newCategories = typeof updater === 'function' ? updater(prev) : updater
      setCachedCategories(newCategories)
      return newCategories
    })
  }, [])

  const setSettings = useCallback((updater: ProductSettings | null | ((prev: ProductSettings | null) => ProductSettings | null)) => {
    setSettingsState(prev => {
      const newSettings = typeof updater === 'function' ? updater(prev) : updater
      if (newSettings) {
        setCachedSettings(newSettings)
      }
      return newSettings
    })
  }, [])

  // Load categories on mount if not cached
  const refreshCategories = useCallback(async () => {
    setIsLoadingCategories(true)
    try {
      const response = await fetchDeduped('/api/categories')
      const data = await response.json()

      if (response.ok && data.success) {
        setCategories(data.categories)
      } else {
        setError(data.error || 'Failed to load categories')
      }
    } catch (err) {
      console.error('Error loading categories:', err)
      setError('Failed to load categories')
    } finally {
      setIsLoadingCategories(false)
    }
  }, [setCategories])

  // Load settings on mount if not cached
  const refreshSettings = useCallback(async () => {
    setIsLoadingSettings(true)
    try {
      const response = await fetchDeduped('/api/product-settings')
      const data = await response.json()

      if (response.ok && data.success) {
        setSettings(data.settings)
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Failed to load settings')
    } finally {
      setIsLoadingSettings(false)
    }
  }, [setSettings])

  // Initial load
  useEffect(() => {
    if (!getCachedCategories()) {
      refreshCategories()
    }
  }, [refreshCategories])

  useEffect(() => {
    if (!getCachedSettings()) {
      refreshSettings()
    }
  }, [refreshSettings])

  // Create category
  const createCategory = useCallback(async (name: string): Promise<ProductCategory | null> => {
    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to create category')
        return null
      }

      setCategories(prev => [...prev, data.category])
      return data.category
    } catch (err) {
      console.error('Error creating category:', err)
      setError('Failed to create category')
      return null
    } finally {
      setIsCreating(false)
    }
  }, [setCategories])

  // Update category
  const updateCategory = useCallback(async (id: string, name: string): Promise<ProductCategory | null> => {
    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to update category')
        return null
      }

      setCategories(prev => prev.map(c => c.id === id ? data.category : c))
      return data.category
    } catch (err) {
      console.error('Error updating category:', err)
      setError('Failed to update category')
      return null
    } finally {
      setIsUpdating(false)
    }
  }, [setCategories])

  // Delete category
  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete category')
        return false
      }

      setCategories(prev => prev.filter(c => c.id !== id))

      // Clear default category if this was the default
      if (settings?.defaultCategoryId === id) {
        setSettings(prev => prev ? { ...prev, defaultCategoryId: null, defaultCategory: null } : null)
      }

      return true
    } catch (err) {
      console.error('Error deleting category:', err)
      setError('Failed to delete category')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [setCategories, setSettings, settings?.defaultCategoryId])

  // Reorder categories
  const reorderCategories = useCallback(async (categoryIds: string[]): Promise<boolean> => {
    setIsUpdating(true)
    setError('')

    // Optimistic update
    const previousCategories = categories
    const reorderedCategories = categoryIds
      .map((id, index) => {
        const cat = categories.find(c => c.id === id)
        return cat ? { ...cat, sortOrder: index + 1 } : null
      })
      .filter((c): c is ProductCategory => c !== null)
    setCategories(reorderedCategories)

    try {
      const response = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        // Rollback on failure
        setCategories(previousCategories)
        setError(data.error || 'Failed to reorder categories')
        return false
      }

      return true
    } catch (err) {
      console.error('Error reordering categories:', err)
      // Rollback on error
      setCategories(previousCategories)
      setError('Failed to reorder categories')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [categories, setCategories])

  // Update settings
  const updateSettings = useCallback(async (updates: { defaultCategoryId?: string | null; sortPreference?: SortPreference }): Promise<ProductSettings | null> => {
    setIsSavingSettings(true)
    setError('')

    try {
      const response = await fetch('/api/product-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to update settings')
        return null
      }

      setSettings(data.settings)
      return data.settings
    } catch (err) {
      console.error('Error updating settings:', err)
      setError('Failed to update settings')
      return null
    } finally {
      setIsSavingSettings(false)
    }
  }, [setSettings])

  // Clear error
  const clearError = useCallback(() => setError(''), [])

  return {
    categories,
    isLoadingCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    settings,
    isLoadingSettings,
    updateSettings,
    error,
    clearError,
    isCreating,
    isUpdating,
    isDeleting,
    isSavingSettings,
    refreshCategories,
    refreshSettings,
  }
}
