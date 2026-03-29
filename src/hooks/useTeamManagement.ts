'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useBusiness } from '@/contexts/business-context'
import { fetchDeduped } from '@/lib/fetch'
import {
  generateInviteCode,
  getInviteCodeExpiration,
} from '@/lib/auth'
import { generateInviteQRCode } from '@/lib/qr'
import { isOwner } from '@/lib/business-role'
import type { User, InviteCode, InviteRole, UserRole } from '@/types'

// Team member includes role from business_users table
export interface TeamMember extends User {
  role: UserRole
}

export interface UseTeamManagementOptions {
  businessId: string
}

export interface UseTeamManagementReturn {
  // Data
  teamMembers: TeamMember[]
  sortedTeamMembers: TeamMember[]
  inviteCodes: InviteCode[]
  isLoading: boolean
  error: string

  // Permission
  canManageTeam: boolean

  // Invite code state
  selectedRole: InviteRole
  setSelectedRole: (role: InviteRole) => void
  newCode: string | null
  generatedCodeId: string | null
  qrDataUrl: string | null
  isGenerating: boolean
  copyFeedback: string | null

  // Invite code actions
  handleGenerateCode: () => Promise<void>
  handleRegenerateCode: () => Promise<void>
  handleCopyCode: (code: string) => Promise<void>
  handleDeleteCode: () => Promise<boolean>
  isDeletingCode: boolean
  codeDeleted: boolean

  // Invite modal state
  isModalOpen: boolean
  handleOpenModal: () => void
  handleOpenExistingCode: (code: InviteCode) => Promise<void>
  handleCloseModal: () => void
  handleModalExitComplete: () => void

  // User management state
  selectedMember: TeamMember | null
  isUserModalOpen: boolean
  newRole: 'partner' | 'employee'
  setNewRole: (role: 'partner' | 'employee') => void
  roleChangeLoading: boolean

  // User management actions
  handleOpenUserModal: (member: TeamMember) => void
  handleCloseUserModal: () => void
  handleUserModalExitComplete: () => void
  handleToggleUserStatus: () => Promise<void>
  handleSubmitRoleChange: () => Promise<boolean>
}

export function useTeamManagement({ businessId }: UseTeamManagementOptions): UseTeamManagementReturn {
  const { user } = useAuth()
  const { role } = useBusiness()

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedRole, setSelectedRole] = useState<InviteRole>('employee')
  const [newCode, setNewCode] = useState<string | null>(null)
  const [generatedCodeId, setGeneratedCodeId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const copyFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Code delete state
  const [isDeletingCode, setIsDeletingCode] = useState(false)
  const [codeDeleted, setCodeDeleted] = useState(false)

  // User management modal state
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)

  // Role change state
  const [newRole, setNewRole] = useState<'partner' | 'employee'>('employee')
  const [roleChangeLoading, setRoleChangeLoading] = useState(false)

  // Check if current user is owner
  const canManageTeam = isOwner(role)

  // Load team members and invite codes
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const response = await fetchDeduped(`/api/businesses/${businessId}/team`)
        if (!response.ok) {
          throw new Error('Failed to load team data')
        }
        const data = await response.json()
        setTeamMembers(data.teamMembers || [])
        setInviteCodes(data.inviteCodes || [])
      } catch (err) {
        console.error('Error loading team data:', err)
        setError('Failed to load team')
      } finally {
        setIsLoading(false)
      }
    }

    loadTeamData()
  }, [businessId])

  // Sort team members: owner first, then partners, then employees
  const sortedTeamMembers = useMemo(() => {
    const roleOrder: Record<string, number> = {
      owner: 0,
      partner: 1,
      employee: 2,
    }
    return [...teamMembers].sort((a, b) => {
      const orderA = roleOrder[a.role] ?? 99
      const orderB = roleOrder[b.role] ?? 99
      return orderA - orderB
    })
  }, [teamMembers])

  const handleGenerateCode = useCallback(async () => {
    if (!user) return

    setIsGenerating(true)
    setError('')
    setNewCode(null)

    try {
      const code = generateInviteCode()
      const expiresAt = getInviteCodeExpiration()

      const response = await fetch(`/api/businesses/${businessId}/invite/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          role: selectedRole,
          expiresAt: expiresAt.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to generate code')
        setIsGenerating(false)
        return
      }

      setGeneratedCodeId(data.id)
      setNewCode(code)

      // Generate QR code
      const qr = await generateInviteQRCode(code)
      setQrDataUrl(qr)

      // Add new code to the list
      const newInviteCode: InviteCode = {
        id: data.id,
        code,
        role: selectedRole,
        createdBy: user.id,
        expiresAt: expiresAt.toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      }
      setInviteCodes(prev => [...prev, newInviteCode])
    } catch (err) {
      console.error('Error generating invite code:', err)
      setError('Failed to generate code')
    } finally {
      setIsGenerating(false)
    }
  }, [user, selectedRole, businessId])

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      // Check if clipboard API is available (requires secure context - HTTPS)
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(code)
      } else {
        // Fallback for non-secure contexts (HTTP on mobile)
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      // Clear any existing timer before setting a new one
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current)
      }
      setCopyFeedback(code)
      copyFeedbackTimerRef.current = setTimeout(() => setCopyFeedback(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Show the code in an alert as last resort
      alert(`Codigo: ${code}`)
    }
  }, [])

  const handleRegenerateCode = useCallback(async () => {
    if (!user || !generatedCodeId) return

    setIsGenerating(true)

    try {
      // Delete old code and create new one
      const code = generateInviteCode()
      const expiresAt = getInviteCodeExpiration()

      const response = await fetch(`/api/businesses/${businessId}/invite/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldCodeId: generatedCodeId,
          newCode: code,
          role: selectedRole,
          expiresAt: expiresAt.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to regenerate code')
        setIsGenerating(false)
        return
      }

      const oldCodeId = generatedCodeId
      setGeneratedCodeId(data.id)
      setNewCode(code)

      // Generate new QR
      const qr = await generateInviteQRCode(code)
      setQrDataUrl(qr)

      // Update invite codes list: remove old, add new
      const newInviteCode: InviteCode = {
        id: data.id,
        code,
        role: selectedRole,
        createdBy: user.id,
        expiresAt: expiresAt.toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      }
      setInviteCodes(prev => [...prev.filter(c => c.id !== oldCodeId), newInviteCode])
    } catch (err) {
      console.error('Error regenerating code:', err)
      setError('Failed to regenerate code')
    } finally {
      setIsGenerating(false)
    }
  }, [user, generatedCodeId, selectedRole, businessId])

  const handleDeleteCode = useCallback(async (): Promise<boolean> => {
    if (!generatedCodeId) return false

    setIsDeletingCode(true)

    try {
      const response = await fetch(`/api/businesses/${businessId}/invite/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: generatedCodeId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return false
      }

      setInviteCodes(prev => prev.filter(c => c.id !== generatedCodeId))
      setCodeDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting code:', err)
      return false
    } finally {
      setIsDeletingCode(false)
    }
  }, [generatedCodeId, businessId])

  const handleOpenModal = useCallback(() => {
    // Close user modal if open (mutual exclusivity)
    setIsUserModalOpen(false)
    // Reset and open add member modal
    setNewCode(null)
    setGeneratedCodeId(null)
    setQrDataUrl(null)
    setSelectedRole('employee')
    setError('')
    setIsModalOpen(true)
  }, [])

  const handleOpenExistingCode = useCallback(async (code: InviteCode) => {
    // Close user modal if open (mutual exclusivity)
    setIsUserModalOpen(false)
    // Open existing code modal
    setSelectedRole(code.role)
    setGeneratedCodeId(code.id)
    setNewCode(code.code)
    setError('')
    setIsModalOpen(true)

    // Generate QR code for existing invite
    try {
      const qr = await generateInviteQRCode(code.code)
      setQrDataUrl(qr)
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }, [])

  const handleCloseModal = useCallback(() => {
    // Only close the modal - state cleanup happens in onExitComplete
    setIsModalOpen(false)
  }, [])

  // Called after modal close animation completes
  const handleModalExitComplete = useCallback(() => {
    setNewCode(null)
    setGeneratedCodeId(null)
    setQrDataUrl(null)
    setError('')
    setSelectedRole('employee')
    setCodeDeleted(false)
    // Clear copy feedback timer and state
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = null
    }
    setCopyFeedback(null)
  }, [])

  // User management modal handlers
  const handleOpenUserModal = useCallback((member: TeamMember) => {
    // Close add member modal if open (mutual exclusivity)
    setIsModalOpen(false)
    // Open user modal
    setSelectedMember(member)
    setIsUserModalOpen(true)
    // Reset form state when opening
    setNewRole(member.role === 'partner' ? 'partner' : 'employee')
  }, [])

  const handleCloseUserModal = useCallback(() => {
    // Only close the modal - state cleanup happens in onExitComplete
    setIsUserModalOpen(false)
  }, [])

  // Called after user modal close animation completes
  const handleUserModalExitComplete = useCallback(() => {
    setSelectedMember(null)
  }, [])

  const handleToggleUserStatus = useCallback(async () => {
    if (!selectedMember) return
    const newStatus = selectedMember.status === 'active' ? 'disabled' : 'active'
    try {
      const response = await fetch(`/api/businesses/${businessId}/users/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedMember.id, status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('Error updating user status:', data.error)
        return
      }

      const updatedMember = { ...selectedMember, status: newStatus as TeamMember['status'] }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )
    } catch (err) {
      console.error('Error updating user status:', err)
    }
  }, [selectedMember, businessId])

  const handleSubmitRoleChange = useCallback(async (): Promise<boolean> => {
    if (!selectedMember) return false

    setRoleChangeLoading(true)

    try {
      const response = await fetch(`/api/businesses/${businessId}/users/change-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedMember.id, role: newRole }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('Error changing role:', data.error)
        return false
      }

      // Update local state
      const updatedMember = { ...selectedMember, role: newRole }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )

      return true
    } catch (err) {
      console.error('Error changing role:', err)
      return false
    } finally {
      setRoleChangeLoading(false)
    }
  }, [selectedMember, newRole, businessId])

  return {
    // Data
    teamMembers,
    sortedTeamMembers,
    inviteCodes,
    isLoading,
    error,

    // Permission
    canManageTeam,

    // Invite code state
    selectedRole,
    setSelectedRole,
    newCode,
    generatedCodeId,
    qrDataUrl,
    isGenerating,
    copyFeedback,

    // Invite code actions
    handleGenerateCode,
    handleRegenerateCode,
    handleCopyCode,
    handleDeleteCode,
    isDeletingCode,
    codeDeleted,

    // Invite modal state
    isModalOpen,
    handleOpenModal,
    handleOpenExistingCode,
    handleCloseModal,
    handleModalExitComplete,

    // User management state
    selectedMember,
    isUserModalOpen,
    newRole,
    setNewRole,
    roleChangeLoading,

    // User management actions
    handleOpenUserModal,
    handleCloseUserModal,
    handleUserModalExitComplete,
    handleToggleUserStatus,
    handleSubmitRoleChange,
  }
}
