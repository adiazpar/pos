'use client'

import { User as UserIcon, UserCircle } from 'lucide-react'
import { Modal, useMorphingModal, Spinner } from '@/components/ui'
import { RoleCard } from './RoleCard'

export interface RoleChangeContentProps {
  memberName: string
  newRole: 'partner' | 'employee'
  setNewRole: (role: 'partner' | 'employee') => void
}

export function RoleChangeContent({
  memberName,
  newRole,
  setNewRole,
}: RoleChangeContentProps) {
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary">
          Select the new role for {memberName}.
        </p>
      </Modal.Item>

      <Modal.Item>
        <div className="space-y-3">
          <RoleCard
            icon={<UserIcon className="w-5 h-5" />}
            title="Employee"
            description="Can register sales and view daily summary"
            selected={newRole === 'employee'}
            onClick={() => setNewRole('employee')}
          />
          <RoleCard
            icon={<UserCircle className="w-5 h-5" />}
            title="Partner"
            description="Full access to reports, inventory, and settings"
            selected={newRole === 'partner'}
            onClick={() => setNewRole('partner')}
          />
        </div>
      </Modal.Item>
    </>
  )
}

// Footer button for role change that handles navigation
export interface RoleChangeSaveButtonProps {
  roleChangeLoading: boolean
  isDisabled: boolean
  onSubmit: () => Promise<boolean>
}

export function RoleChangeSaveButton({
  roleChangeLoading,
  isDisabled,
  onSubmit,
}: RoleChangeSaveButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleSubmit = () => {
    goToStep(0)
    onSubmit()
  }

  return (
    <button
      type="button"
      onClick={handleSubmit}
      className="btn btn-primary flex-1"
      disabled={roleChangeLoading || isDisabled}
    >
      {roleChangeLoading ? <Spinner /> : 'Save'}
    </button>
  )
}

// Footer button for cancel/back navigation
export interface RoleChangeCancelButtonProps {
  disabled: boolean
}

export function RoleChangeCancelButton({ disabled }: RoleChangeCancelButtonProps) {
  const { goToStep } = useMorphingModal()

  return (
    <button
      type="button"
      onClick={() => goToStep(0)}
      className="btn btn-secondary flex-1"
      disabled={disabled}
    >
      Cancel
    </button>
  )
}
