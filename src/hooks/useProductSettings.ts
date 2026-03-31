/**
 * Hook for managing product settings and categories
 */

import { useState, useCallback, useEffect } from 'react'
import { apiRequest, apiPost, apiPatch, apiDelete, ApiError, type ApiResponse } from '@/lib/api-client'
import type { ProductCategory, ProductSettings, SortPreference } from '@/types'

// ============================================
// SESSION CACHE
// ============================================

function categoriesCacheKey(businessId: string) {
  return `product_categories_cache_${businessId}`
}

function settingsCacheKey(businessId: string) {
  return `product_settings_cache_${businessId}`
}

function getCachedCategories(businessId: string): ProductCategory[] | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(categoriesCacheKey(businessId))
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function setCachedCategories(businessId: string, categories: ProductCategory[]): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(categoriesCacheKey(businessId), JSON.stringify(categories))
  } catch {
    // Storage error, ignore
  }
}

function getCachedSettings(businessId: string): ProductSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(settingsCacheKey(businessId))
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function setCachedSettings(businessId: string, settings: ProductSettings): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(settingsCacheKey(businessId), JSON.stringify(settings))
  } catch {
    // Storage error, ignore
  }
}

// ============================================
// API RESPONSE TYPES
// ============================================

type CategoriesResponse = ApiResponse & {
  categories: ProductCategory[]
}

type CategoryResponse = ApiResponse & {
  category: ProductCategory
}

type SettingsResponse = ApiResponse & {
  settings: ProductSettings
}

type DeleteResponse = ApiResponse

type ReorderResponse = ApiResponse

// ============================================
// HOOK INTERFACE
// ============================================

export interface UseProductSettingsOptions {
  businessId: string
}

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

export function useProductSettings({ businessId }: UseProductSettingsOptions): UseProductSettingsReturn {
  // State
  const [categories, setCategoriesState] = useState<ProductCategory[]>(() => getCachedCategories(businessId) || [])
  const [settings, setSettingsState] = useState<ProductSettings | null>(() => getCachedSettings(businessId))
  const [isLoadingCategories, setIsLoadingCategories] = useState(() => !getCachedCategories(businessId))
  const [isLoadingSettings, setIsLoadingSettings] = useState(() => !getCachedSettings(businessId))
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
      setCachedCategories(businessId, newCategories)
      return newCategories
    })
  }, [businessId])

  const setSettings = useCallback((updater: ProductSettings | null | ((prev: ProductSettings | null) => ProductSettings | null)) => {
    setSettingsState(prev => {
      const newSettings = typeof updater === 'function' ? updater(prev) : updater
      if (newSettings) {
        setCachedSettings(businessId, newSettings)
      }
      return newSettings
    })
  }, [businessId])

  // Load categories on mount if not cached
  const refreshCategories = useCallback(async () => {
    setIsLoadingCategories(true)
    try {
      const data = await apiRequest<CategoriesResponse>(`/api/businesses/${businessId}/categories`)
      setCategories(data.categories)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Error loading categories:', err)
        setError('Failed to load categories')
      }
    } finally {
      setIsLoadingCategories(false)
    }
  }, [businessId, setCategories])

  // Load settings on mount if not cached
  const refreshSettings = useCallback(async () => {
    setIsLoadingSettings(true)
    try {
      const data = await apiRequest<SettingsResponse>(`/api/businesses/${businessId}/product-settings`)
      setSettings(data.settings)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Error loading settings:', err)
        setError('Failed to load settings')
      }
    } finally {
      setIsLoadingSettings(false)
    }
  }, [businessId, setSettings])

  // Initial load
  useEffect(() => {
    if (!getCachedCategories(businessId)) {
      refreshCategories()
    }
  }, [businessId, refreshCategories])

  useEffect(() => {
    if (!getCachedSettings(businessId)) {
      refreshSettings()
    }
  }, [businessId, refreshSettings])

  // Create category
  const createCategory = useCallback(async (name: string): Promise<ProductCategory | null> => {
    setIsCreating(true)
    setError('')

    try {
      const data = await apiPost<CategoryResponse>(`/api/businesses/${businessId}/categories`, { name })
      setCategories(prev => [...prev, data.category])
      return data.category
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Error creating category:', err)
        setError('Failed to create category')
      }
      return null
    } finally {
      setIsCreating(false)
    }
  }, [businessId, setCategories])

  // Update category
  const updateCategory = useCallback(async (id: string, name: string): Promise<ProductCategory | null> => {
    setIsUpdating(true)
    setError('')

    try {
      const data = await apiPatch<CategoryResponse>(`/api/businesses/${businessId}/categories/${id}`, { name })
      setCategories(prev => prev.map(c => c.id === id ? data.category : c))
      return data.category
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Error updating category:', err)
        setError('Failed to update category')
      }
      return null
    } finally {
      setIsUpdating(false)
    }
  }, [businessId, setCategories])

  // Delete category
  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true)
    setError('')

    try {
      await apiDelete<DeleteResponse>(`/api/businesses/${businessId}/categories/${id}`)
      setCategories(prev => prev.filter(c => c.id !== id))

      // Clear default category if this was the default
      if (settings?.defaultCategoryId === id) {
        setSettings(prev => prev ? { ...prev, defaultCategoryId: null, defaultCategory: null } : null)
      }

      return true
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Error deleting category:', err)
        setError('Failed to delete category')
      }
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [businessId, setCategories, setSettings, settings?.defaultCategoryId])

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
      await apiPost<ReorderResponse>(`/api/businesses/${businessId}/categories/reorder`, { categoryIds })
      return true
    } catch (err) {
      // Rollback on error
      setCategories(previousCategories)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Error reordering categories:', err)
        setError('Failed to reorder categories')
      }
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [businessId, categories, setCategories])

  // Update settings
  const updateSettings = useCallback(async (updates: { defaultCategoryId?: string | null; sortPreference?: SortPreference }): Promise<ProductSettings | null> => {
    setIsSavingSettings(true)
    setError('')

    try {
      const data = await apiPatch<SettingsResponse>(`/api/businesses/${businessId}/product-settings`, updates)
      setSettings(data.settings)
      return data.settings
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Error updating settings:', err)
        setError('Failed to update settings')
      }
      return null
    } finally {
      setIsSavingSettings(false)
    }
  }, [businessId, setSettings])

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
