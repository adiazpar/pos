'use client'

import { ChevronRight } from 'lucide-react'
import { getInviteRoleLabel } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import type { InviteCode } from '@/types'

export interface InviteCodeListItemProps {
  code: InviteCode
  onClick: () => void
}

export function InviteCodeListItem({ code, onClick }: InviteCodeListItemProps) {
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
      {/* Info */}
      <div className="flex-1 min-w-0">
        <code className="font-display font-bold tracking-widest">
          {code.code}
        </code>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {getInviteRoleLabel(code.role)} · Expira {formatDate(code.expiresAt)}
        </span>
      </div>

      {/* Chevron */}
      <div className="text-text-tertiary ml-2">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
}
