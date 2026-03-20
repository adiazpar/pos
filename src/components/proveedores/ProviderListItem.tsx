'use client'

import { ChevronRight } from 'lucide-react'
import { formatPhoneForDisplay } from '@/lib/countries'
import type { Provider } from '@/types'

function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export interface ProviderListItemProps {
  provider: Provider
  onClick: () => void
}

export function ProviderListItem({ provider, onClick }: ProviderListItemProps) {
  return (
    <div
      className="list-item-clickable list-item-flat"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
    >
      <div className="sidebar-user-avatar">
        {getProviderInitials(provider.name)}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">{provider.name}</span>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {provider.phone ? formatPhoneForDisplay(provider.phone) : 'Sin telefono'}
          <span className="mx-1.5">·</span>
          <span className={provider.active ? 'text-success' : 'text-error'}>
            {provider.active ? 'Activo' : 'Inactivo'}
          </span>
        </span>
      </div>
      <div className="text-text-tertiary">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
}
