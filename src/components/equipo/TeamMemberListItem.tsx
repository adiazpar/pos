'use client'

import { ChevronRight } from 'lucide-react'
import { getRoleLabel, getUserInitials } from '@/lib/auth'
import type { User } from '@/types'

export interface TeamMemberListItemProps {
  member: User
  isSelf: boolean
  onClick: () => void
}

export function TeamMemberListItem({ member, isSelf, onClick }: TeamMemberListItemProps) {
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
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-brand">
          {getUserInitials(member.name)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{member.name}</span>
          {isSelf && (
            <span className="text-xs text-text-tertiary">(Tu)</span>
          )}
        </div>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {getRoleLabel(member.role)}
        </span>
      </div>

      {/* Status */}
      <div className="text-right">
        <span className={`text-xs font-medium ${member.status === 'active' ? 'text-success' : 'text-error'}`}>
          {member.status === 'active' ? 'Activo' : 'Deshabilitado'}
        </span>
      </div>

      {/* Chevron */}
      <div className="text-text-tertiary ml-2">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
}
