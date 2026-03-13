'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Spinner, Modal } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { IconAdd, IconChevronRight } from '@/components/icons'
import { PhoneInput } from '@/components/auth/phone-input'
import { useAuth } from '@/contexts/auth-context'
import { isPartnerOrOwner } from '@/lib/auth'
import { formatPhoneForDisplay } from '@/lib/countries'
import type { Provider } from '@/types'

function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function ProveedoresPage() {
  const { user, pb } = useAuth()

  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)

  // Check if current user can manage providers
  const canManage = isPartnerOrOwner(user)

  // Load providers
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const providersList = await pb.collection('providers').getFullList<Provider>({
          sort: 'name',
          requestKey: null,
        })
        if (cancelled) return
        setProviders(providersList)
      } catch (err) {
        if (cancelled) return
        console.error('Error loading providers:', err)
        setError('Error al cargar los proveedores')
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
  }, [pb])

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
    resetForm()
  }, [resetForm])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const data = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        active,
      }

      if (editingProvider) {
        // Update existing provider
        await pb.collection('providers').update(editingProvider.id, data)
      } else {
        // Create new provider
        await pb.collection('providers').create(data)
      }

      // Reload providers
      const providersList = await pb.collection('providers').getFullList<Provider>({
        sort: 'name',
        requestKey: null,
      })
      setProviders(providersList)

      handleCloseModal()
    } catch (err) {
      console.error('Error saving provider:', err)
      setError('Error al guardar el proveedor')
    } finally {
      setIsSaving(false)
    }
  }, [name, phone, email, notes, active, editingProvider, pb, handleCloseModal])

  if (isLoading) {
    return (
      <>
        <PageHeader title="Proveedores" />
        <main className="page-loading">
          <Spinner className="spinner-lg" />
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Proveedores" subtitle="Gestiona tus proveedores" />

      <main className="main-content space-y-6">
        {error && !isModalOpen && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {/* Provider count and add button */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {providers.length} {providers.length === 1 ? 'proveedor' : 'proveedores'}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="btn btn-primary btn-sm"
            >
              <IconAdd className="w-4 h-4" />
              Agregar
            </button>
          )}
        </div>

        {/* Providers list */}
        <div className="space-y-1">
          {sortedProviders.map(provider => (
            <div
              key={provider.id}
              className="list-item-clickable"
              onClick={() => handleOpenModal(provider)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleOpenModal(provider)
                }
              }}
              tabIndex={0}
              role="button"
            >
              <div className="sidebar-user-avatar">
                {getProviderInitials(provider.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{provider.name}</span>
                </div>
                <div className="text-xs text-text-tertiary mt-0.5">
                  {provider.phone ? formatPhoneForDisplay(provider.phone) : 'Sin telefono'}
                  <span className="mx-1.5">·</span>
                  <span className={provider.active ? 'text-success' : 'text-error'}>
                    {provider.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Chevron indicator */}
              <div className="text-text-secondary">
                <IconChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {providers.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            No hay proveedores registrados
          </div>
        )}
      </main>

      {/* Add/Edit Provider Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProvider ? 'Editar proveedor' : 'Agregar proveedor'}
      >
        <form id="provider-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="provider-name" className="label">Nombre <span className="text-error">*</span></label>
            <input
              id="provider-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Nombre del proveedor"
              required
            />
          </div>

          {/* Phone */}
          <PhoneInput
            label="Telefono (opcional)"
            value={phone}
            onChange={setPhone}
          />

          {/* Email */}
          <div>
            <label htmlFor="provider-email" className="label">Email (opcional)</label>
            <input
              id="provider-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="email@ejemplo.com"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="provider-notes" className="label">Notas (opcional)</label>
            <textarea
              id="provider-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Notas sobre el proveedor..."
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="label mb-0">Activo</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                Mostrar en la lista de proveedores
              </p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="toggle"
            />
          </div>
        </form>
        <Modal.Footer>
          <button
            type="button"
            onClick={handleCloseModal}
            className="btn btn-secondary flex-1"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="provider-form"
            className="btn btn-primary flex-1"
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? <Spinner /> : 'Guardar'}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
