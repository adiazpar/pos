'use client'

import { Plus, Van } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useProviderManagement } from '@/hooks'
import { ProviderListItem, ProviderModal } from '@/components/providers'

export default function ProveedoresPage() {
  const {
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
  } = useProviderManagement()

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-6">
        {error && !isModalOpen && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          {/* Providers Card - only show when providers exist */}
          {providers.length > 0 && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {providers.length} {providers.length === 1 ? 'provider' : 'providers'}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                )}
              </div>

              <hr className="border-border" />

              <div className="space-y-2">
                {sortedProviders.map((provider) => (
                  <ProviderListItem
                    key={provider.id}
                    provider={provider}
                    onClick={() => handleOpenModal(provider)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state - no providers at all */}
          {providers.length === 0 && (
            <div className="empty-state-fill">
              <Van className="empty-state-icon" />
              <h3 className="empty-state-title">No providers</h3>
              <p className="empty-state-description">
                Add your first provider to get started
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="btn btn-primary mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Add provider
                </button>
              )}
            </div>
          )}
      </main>

      {/* Provider Modal */}
      <ProviderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onExitComplete={handleModalExitComplete}
        name={name}
        onNameChange={setName}
        phone={phone}
        onPhoneChange={setPhone}
        email={email}
        onEmailChange={setEmail}
        notes={notes}
        onNotesChange={setNotes}
        active={active}
        onActiveChange={setActive}
        editingProvider={editingProvider}
        isSaving={isSaving}
        isDeleting={isDeleting}
        error={error}
        providerSaved={providerSaved}
        providerDeleted={providerDeleted}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        canDelete={canManage}
      />
    </>
  )
}
