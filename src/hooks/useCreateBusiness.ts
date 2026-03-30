'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost, ApiError, ApiResponse } from '@/lib/api-client'
import { getDefaultsForLocale } from '@/lib/locale-config'

interface CreateBusinessResponse extends ApiResponse {
  business?: {
    id: string
    name: string
  }
}

export type BusinessType = 'food' | 'retail' | 'services' | 'wholesale' | 'manufacturing' | 'other'

export interface BusinessFormData {
  name: string
  type: BusinessType | null
  locale: string
  currency: string
  timezone: string
  icon: string | null
  logoFile: File | null
  logoPreview: string | null
}

export interface UseCreateBusinessReturn {
  // Modal state
  isOpen: boolean
  handleOpen: () => void
  handleClose: () => void
  handleExitComplete: () => void

  // Form data
  formData: BusinessFormData
  setName: (name: string) => void
  setType: (type: BusinessType) => void
  setLocale: (locale: string) => void
  setCurrency: (currency: string) => void
  setTimezone: (timezone: string) => void
  setIcon: (icon: string | null) => void
  setLogoFile: (file: File | null) => void
  clearLogo: () => void

  // Submit state
  isCreating: boolean
  createSuccess: boolean
  error: string | null
  createdBusiness: { id: string; name: string } | null

  // Validation
  isStep1Valid: boolean
  isStep2Valid: boolean

  // Actions
  handleCreateBusiness: () => Promise<boolean>
}

function getInitialFormData(): BusinessFormData {
  return {
    name: '',
    type: null,
    locale: 'en-US',
    currency: 'USD',
    timezone: 'America/New_York',
    icon: null,
    logoFile: null,
    logoPreview: null,
  }
}

export function useCreateBusiness(): UseCreateBusinessReturn {
  const router = useRouter()

  // Modal state
  const [isOpen, setIsOpen] = useState(false)

  // Form data
  const [formData, setFormData] = useState<BusinessFormData>(getInitialFormData)

  // Submit state
  const [isCreating, setIsCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdBusiness, setCreatedBusiness] = useState<{ id: string; name: string } | null>(null)

  // Auto-update currency and timezone when locale changes
  useEffect(() => {
    const defaults = getDefaultsForLocale(formData.locale)
    setFormData(prev => ({
      ...prev,
      currency: defaults.currency,
      timezone: defaults.timezone,
    }))
  }, [formData.locale])

  // Validation
  const isStep1Valid = formData.name.trim().length > 0 && formData.type !== null
  const isStep2Valid = formData.locale.length > 0 && formData.currency.length > 0 && formData.timezone.length > 0

  const resetState = useCallback(() => {
    setFormData(getInitialFormData())
    setError(null)
    setIsCreating(false)
    setCreateSuccess(false)
    setCreatedBusiness(null)
  }, [])

  const handleOpen = useCallback(() => {
    resetState()
    setIsOpen(true)
  }, [resetState])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleExitComplete = useCallback(() => {
    resetState()
  }, [resetState])

  // Form setters
  const setName = useCallback((name: string) => {
    setFormData(prev => ({ ...prev, name }))
  }, [])

  const setType = useCallback((type: BusinessType) => {
    setFormData(prev => ({
      ...prev,
      type,
    }))
  }, [])

  const setLocale = useCallback((locale: string) => {
    setFormData(prev => ({ ...prev, locale }))
    // Currency and timezone will auto-update via useEffect
  }, [])

  const setCurrency = useCallback((currency: string) => {
    setFormData(prev => ({ ...prev, currency }))
  }, [])

  const setTimezone = useCallback((timezone: string) => {
    setFormData(prev => ({ ...prev, timezone }))
  }, [])

  const setIcon = useCallback((icon: string | null) => {
    // When selecting an emoji, clear the logo
    setFormData(prev => ({
      ...prev,
      icon,
      logoFile: null,
      logoPreview: null,
    }))
  }, [])

  const setLogoFile = useCallback((file: File | null) => {
    if (file) {
      // Create preview URL and convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData(prev => ({
          ...prev,
          logoFile: file,
          logoPreview: base64,
          icon: base64, // Store base64 as icon for submission
        }))
      }
      reader.readAsDataURL(file)
    } else {
      setFormData(prev => ({
        ...prev,
        logoFile: null,
        logoPreview: null,
      }))
    }
  }, [])

  const clearLogo = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      logoFile: null,
      logoPreview: null,
      icon: null,
    }))
  }, [])

  const handleCreateBusiness = useCallback(async (): Promise<boolean> => {
    if (!isStep1Valid || !isStep2Valid) {
      setError('Please fill in all required fields')
      return false
    }

    setIsCreating(true)
    setError(null)

    try {
      const data = await apiPost<CreateBusinessResponse>('/api/businesses/create', {
        name: formData.name.trim(),
        type: formData.type,
        locale: formData.locale,
        currency: formData.currency,
        timezone: formData.timezone,
        icon: formData.icon,
      })

      if (data.success && data.business) {
        setCreatedBusiness(data.business)
        setCreateSuccess(true)
        // Redirect to the new business after a brief delay
        setTimeout(() => {
          setIsOpen(false)
          router.push(`/${data.business!.id}/home`)
        }, 1500)
        return true
      } else {
        setError(data.error || 'Failed to create business')
        setIsCreating(false)
        return false
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create business')
      }
      setIsCreating(false)
      return false
    }
  }, [formData, isStep1Valid, isStep2Valid, router])

  return {
    // Modal state
    isOpen,
    handleOpen,
    handleClose,
    handleExitComplete,

    // Form data
    formData,
    setName,
    setType,
    setLocale,
    setCurrency,
    setTimezone,
    setIcon,
    setLogoFile,
    clearLogo,

    // Submit state
    isCreating,
    createSuccess,
    error,
    createdBusiness,

    // Validation
    isStep1Valid,
    isStep2Valid,

    // Actions
    handleCreateBusiness,
  }
}
