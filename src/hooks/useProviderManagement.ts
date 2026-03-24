'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { isPartnerOrOwner } from '@/lib/auth'
import { fetchDeduped } from '@/lib/fetch'
import type { Provider } from '@/types'

export interface UseProviderManagementReturn {
  // Data
  providers: Provider[]
  sortedProviders: Provider[]
  isLoading: boolean
  error: string

  // Permissions
  canManage: boolean

  // Modal state
  isModalOpen: boolean
  editingProvider: Provider | null
  isSaving: boolean
  isDeleting: boolean
  providerSaved: boolean
  providerDeleted: boolean

  // Form state
  name: string
  setName: (name: string) => void
  phone: string
  setPhone: (phone: string) => void
  email: string
  setEmail: (email: string) => void
  notes: string
  setNotes: (notes: string) => void
  active: boolean
  setActive: (active: boolean) => void

  // Actions
  handleOpenModal: (provider?: Provider) => void
  handleCloseModal: () => void
  handleModalExitComplete: () => void
  handleSubmit: () => Promise<boolean>
  handleDelete: () => Promise<boolean>
  setError: (error: string) => void
}

export function useProviderManagement(): UseProviderManagementReturn {
  const { user } = useAuth()

  // Data state
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [providerSaved, setProviderSaved] = useState(false)
  const [providerDeleted, setProviderDeleted] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)

  // Check if current user can manage providers
  const canManage = isPartnerOrOwner(user)

  // Load providers
  // TODO: Implement with Drizzle API routes
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const response = await fetchDeduped('/api/providers')
        const data = await response.json()

        if (cancelled) return

        if (response.ok && data.success) {
          setProviders(data.providers)
        } else {
          setError('Failed to load providers')
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error loading providers:', err)
        setError('Failed to load providers')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  // Sort providers: active first, then by name
  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      // Active first
      if (a.active && !b.active) return -1
      if (!a.active && b.active) return 1
      // Then by name
      return a.name.localeCompare(b.name)
    })
  }, [providers])

  const resetForm = useCallback(() => {
    setName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setActive(true)
    setEditingProvider(null)
    setError('')
    setProviderSaved(false)
    setProviderDeleted(false)
  }, [])

  const handleOpenModal = useCallback((provider?: Provider) => {
    if (provider) {
      setEditingProvider(provider)
      setName(provider.name)
      setPhone(provider.phone || '')
      setEmail(provider.email || '')
      setNotes(provider.notes || '')
      setActive(provider.active)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }, [resetForm])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleModalExitComplete = useCallback(() => {
    resetForm()
  }, [resetForm])

  // TODO: Implement with Drizzle API routes
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!name.trim()) {
      setError('Name is required')
      return false
    }

    setIsSaving(true)
    setError('')

    try {
      const providerData = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        active,
      }

      const url = editingProvider
        ? `/api/providers/${editingProvider.id}`
        : '/api/providers'
      const method = editingProvider ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to save provider')
        return false
      }

      // Reload providers
      const listResponse = await fetch('/api/providers')
      const listData = await listResponse.json()

      if (listResponse.ok && listData.success) {
        setProviders(listData.providers)
      }

      setProviderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving provider:', err)
      setError('Failed to save provider')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [name, phone, email, notes, active, editingProvider])

  // TODO: Implement with Drizzle API routes
  const handleDelete = useCallback(async (): Promise<boolean> => {
    if (!editingProvider) return false

    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/providers/${editingProvider.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete provider')
        return false
      }

      // Reload providers
      const listResponse = await fetch('/api/providers')
      const listData = await listResponse.json()

      if (listResponse.ok && listData.success) {
        setProviders(listData.providers)
      }

      setProviderDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting provider:', err)
      setError('Failed to delete provider')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [editingProvider])

  return {
    // Data
    providers,
    sortedProviders,
    isLoading,
    error,

    // Permissions
    canManage,

    // Modal state
    isModalOpen,
    editingProvider,
    isSaving,
    isDeleting,
    providerSaved,
    providerDeleted,

    // Form state
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    notes,
    setNotes,
    active,
    setActive,

    // Actions
    handleOpenModal,
    handleCloseModal,
    handleModalExitComplete,
    handleSubmit,
    handleDelete,
    setError,
  }
}
