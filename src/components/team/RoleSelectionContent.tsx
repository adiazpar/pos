'use client'

import { User as UserIcon, UserCircle } from 'lucide-react'
import { Modal } from '@/components/ui'
import { RoleCard } from './RoleCard'
import type { InviteRole } from '@/types'

export interface RoleSelectionContentProps {
  selectedRole: InviteRole
  setSelectedRole: (role: InviteRole) => void
}

export function RoleSelectionContent({
  selectedRole,
  setSelectedRole,
}: RoleSelectionContentProps) {
  return (
    <Modal.Item>
      <label className="label">New member role</label>
      <div className="space-y-3">
        <RoleCard
          icon={<UserIcon className="w-5 h-5" />}
          title="Employee"
          description="Can register sales and view daily summary"
          selected={selectedRole === 'employee'}
          onClick={() => setSelectedRole('employee')}
        />
        <RoleCard
          icon={<UserCircle className="w-5 h-5" />}
          title="Partner"
          description="Full access to management, inventory, and settings"
          selected={selectedRole === 'partner'}
          onClick={() => setSelectedRole('partner')}
        />
      </div>
    </Modal.Item>
  )
}
