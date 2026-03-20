'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '@/contexts/auth-context'
import {
  generateInviteCode,
  getInviteCodeExpiration,
  isOwner,
} from '@/lib/auth'
import { isValidE164 } from '@/lib/countries'
import type { User, InviteCode, InviteRole } from '@/types'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

export interface UseTeamManagementReturn {
  // Data
  teamMembers: User[]
  sortedTeamMembers: User[]
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
  selectedMember: User | null
  isUserModalOpen: boolean
  newMemberPhone: string
  setNewMemberPhone: (phone: string) => void
  phoneChangeError: string
  phoneChangeLoading: boolean
  newRole: 'partner' | 'employee'
  setNewRole: (role: 'partner' | 'employee') => void
  roleChangeLoading: boolean
  pinResetLoading: boolean

  // User management actions
  handleOpenUserModal: (member: User) => void
  handleCloseUserModal: () => void
  handleUserModalExitComplete: () => void
  handleToggleUserStatus: () => Promise<void>
  handleSubmitPhoneChange: (e: React.FormEvent) => Promise<boolean>
  handleSubmitRoleChange: () => Promise<boolean>
  handleResetPin: () => Promise<void>
}

export function useTeamManagement(): UseTeamManagementReturn {
  const { user, pb } = useAuth()

  const [teamMembers, setTeamMembers] = useState<User[]>([])
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
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [phoneChangeError, setPhoneChangeError] = useState('')
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false)

  // Role change state
  const [newRole, setNewRole] = useState<'partner' | 'employee'>('employee')
  const [roleChangeLoading, setRoleChangeLoading] = useState(false)

  // PIN reset state
  const [pinResetLoading, setPinResetLoading] = useState(false)

  // Check if current user is owner
  const canManageTeam = isOwner(user)

  // Load team members and invite codes
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        // Load all users (disable auto-cancellation to avoid StrictMode issues)
        const users = await pb.collection('users').getFullList<User>({
          sort: '-created',
          requestKey: null,
        })
        if (cancelled) return
        setTeamMembers(users)

        // Load active invite codes (owner only)
        if (canManageTeam) {
          const codes = await pb.collection('invite_codes').getFullList<InviteCode>({
            filter: 'used = false && expiresAt > @now',
            sort: '-created',
            expand: 'createdBy',
            requestKey: null,
          })
          if (cancelled) return
          setInviteCodes(codes)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error loading team data:', err)
        setError('Error al cargar los datos del equipo')
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
  }, [pb, canManageTeam])

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

      const record = await pb.collection('invite_codes').create({
        code,
        role: selectedRole,
        createdBy: user.id,
        expiresAt: expiresAt.toISOString(),
        used: false,
      })

      setGeneratedCodeId(record.id)
      setNewCode(code)

      // Generate QR code
      const registrationUrl = `${window.location.origin}/invite?code=${code}`
      const qr = await QRCode.toDataURL(registrationUrl, {
        width: 160,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      setQrDataUrl(qr)

      // Refresh invite codes list
      const codes = await pb.collection('invite_codes').getFullList<InviteCode>({
        filter: 'used = false && expiresAt > @now',
        sort: '-created',
      })
      setInviteCodes(codes)
    } catch (err) {
      console.error('Error generating invite code:', err)
      setError('Error al generar el codigo')
    } finally {
      setIsGenerating(false)
    }
  }, [user, selectedRole, pb])

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
      // Delete old code
      await pb.collection('invite_codes').delete(generatedCodeId)

      // Generate new code with SAME role (selectedRole is locked)
      const code = generateInviteCode()
      const expiresAt = getInviteCodeExpiration()

      const record = await pb.collection('invite_codes').create({
        code,
        role: selectedRole,
        createdBy: user.id,
        expiresAt: expiresAt.toISOString(),
        used: false,
      })

      setGeneratedCodeId(record.id)
      setNewCode(code)

      // Generate new QR
      const registrationUrl = `${window.location.origin}/invite?code=${code}`
      const qr = await QRCode.toDataURL(registrationUrl, {
        width: 160,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      setQrDataUrl(qr)

      // Refresh list
      const codes = await pb.collection('invite_codes').getFullList<InviteCode>({
        filter: 'used = false && expiresAt > @now',
        sort: '-created',
      })
      setInviteCodes(codes)
    } catch (err) {
      console.error('Error regenerating code:', err)
      setError('Error al regenerar el codigo')
    } finally {
      setIsGenerating(false)
    }
  }, [user, generatedCodeId, selectedRole, pb])

  const handleDeleteCode = useCallback(async (): Promise<boolean> => {
    if (!generatedCodeId) return false

    setIsDeletingCode(true)

    try {
      await pb.collection('invite_codes').delete(generatedCodeId)
      setInviteCodes(prev => prev.filter(c => c.id !== generatedCodeId))
      setCodeDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting code:', err)
      return false
    } finally {
      setIsDeletingCode(false)
    }
  }, [generatedCodeId, pb])

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
      const registrationUrl = `${window.location.origin}/invite?code=${code.code}`
      const qr = await QRCode.toDataURL(registrationUrl, {
        width: 160,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
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
  const handleOpenUserModal = useCallback((member: User) => {
    // Close add member modal if open (mutual exclusivity)
    setIsModalOpen(false)
    // Open user modal
    setSelectedMember(member)
    setIsUserModalOpen(true)
    // Reset form state when opening
    setNewMemberPhone('')
    setPhoneChangeError('')
    setNewRole(member.role === 'partner' ? 'partner' : 'employee')
  }, [])

  const handleCloseUserModal = useCallback(() => {
    // Only close the modal - state cleanup happens in onExitComplete
    setIsUserModalOpen(false)
  }, [])

  // Called after user modal close animation completes
  const handleUserModalExitComplete = useCallback(() => {
    setSelectedMember(null)
    // Reset form state when closing
    setNewMemberPhone('')
    setPhoneChangeError('')
  }, [])

  const handleToggleUserStatus = useCallback(async () => {
    if (!selectedMember) return
    const newStatus = selectedMember.status === 'active' ? 'disabled' : 'active'
    try {
      await pb.collection('users').update(selectedMember.id, { status: newStatus })
      const updatedMember = { ...selectedMember, status: newStatus as User['status'] }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )
    } catch (err) {
      console.error('Error updating user status:', err)
    }
  }, [selectedMember, pb])

  const handleSubmitPhoneChange = useCallback(async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    if (!selectedMember) return false

    setPhoneChangeError('')

    if (!newMemberPhone || !isValidE164(newMemberPhone)) {
      setPhoneChangeError('Ingresa un numero de telefono valido')
      return false
    }

    if (newMemberPhone === selectedMember.phoneNumber) {
      setPhoneChangeError('El nuevo numero debe ser diferente al actual')
      return false
    }

    setPhoneChangeLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/admin/change-member-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({
          userId: selectedMember.id,
          newPhoneNumber: newMemberPhone,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setPhoneChangeError(data.error || 'Error al cambiar el numero')
        setPhoneChangeLoading(false)
        return false
      }

      // Update local state
      const updatedMember = { ...selectedMember, phoneNumber: newMemberPhone }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )

      // Clear form state on success
      setNewMemberPhone('')
      return true
    } catch {
      setPhoneChangeError('Error de conexion')
      return false
    } finally {
      setPhoneChangeLoading(false)
    }
  }, [selectedMember, newMemberPhone, pb])

  const handleSubmitRoleChange = useCallback(async (): Promise<boolean> => {
    if (!selectedMember) return false

    setRoleChangeLoading(true)

    try {
      await pb.collection('users').update(selectedMember.id, { role: newRole })

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
  }, [selectedMember, newRole, pb])

  // PIN reset handler
  const handleResetPin = useCallback(async () => {
    if (!selectedMember) return

    setPinResetLoading(true)

    try {
      await pb.collection('users').update(selectedMember.id, {
        pinResetRequired: true,
      })

      // Update local state
      const updatedMember = { ...selectedMember, pinResetRequired: true }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )
    } catch (err) {
      console.error('Error resetting PIN:', err)
    } finally {
      setPinResetLoading(false)
    }
  }, [selectedMember, pb])

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
    newMemberPhone,
    setNewMemberPhone,
    phoneChangeError,
    phoneChangeLoading,
    newRole,
    setNewRole,
    roleChangeLoading,
    pinResetLoading,

    // User management actions
    handleOpenUserModal,
    handleCloseUserModal,
    handleUserModalExitComplete,
    handleToggleUserStatus,
    handleSubmitPhoneChange,
    handleSubmitRoleChange,
    handleResetPin,
  }
}
