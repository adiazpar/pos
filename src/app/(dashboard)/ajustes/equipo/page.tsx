'use client'

import { Trash2, Plus, Check, Copy } from 'lucide-react'
import { Spinner, Modal } from '@/components/ui'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { useHeader } from '@/contexts/header-context'
import { useAuth } from '@/contexts/auth-context'
import { useTeamManagement } from '@/hooks'
import {
  RoleSelectionContent,
  CodeGeneratedContent,
  UserDetailsStep,
  PhoneChangeContent,
  PhoneChangeSaveButton,
  PhoneChangeCancelButton,
  RoleChangeContent,
  RoleChangeSaveButton,
  RoleChangeCancelButton,
  GenerateCodeButton,
  ConfirmDeleteCodeButton,
  TeamMemberListItem,
  InviteCodeListItem,
} from '@/components/equipo'

export default function TeamPage() {
  const { user } = useAuth()

  useHeader({
    title: 'Equipo',
    subtitle: 'Gestiona tu equipo de trabajo',
  })

  const {
    // Data
    sortedTeamMembers,
    teamMembers,
    inviteCodes,
    isLoading,
    error,

    // Permission
    canManageTeam,

    // Invite code state
    selectedRole,
    setSelectedRole,
    newCode,
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
  } = useTeamManagement()

  if (isLoading) {
    return (
      <main className="page-content flex items-center justify-center">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-6">
        {error && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          {/* Team Members Card */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {teamMembers.length} {teamMembers.length === 1 ? 'miembro' : 'miembros'}
              </span>
              {canManageTeam && (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              )}
            </div>

            <hr className="border-border" />

            <div className="space-y-2">
              {sortedTeamMembers.map((member) => (
                <TeamMemberListItem
                  key={member.id}
                  member={member}
                  isSelf={member.id === user?.id}
                  onClick={() => handleOpenUserModal(member)}
                />
              ))}
            </div>
          </div>

          {/* Active Invite Codes Card */}
          {canManageTeam && inviteCodes.length > 0 && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {inviteCodes.length} {inviteCodes.length === 1 ? 'codigo activo' : 'codigos activos'}
                </span>
              </div>

              <hr className="border-border" />

              <div className="space-y-2">
                {inviteCodes.map((code) => (
                  <InviteCodeListItem
                    key={code.id}
                    code={code}
                    onClick={() => handleOpenExistingCode(code)}
                  />
                ))}
              </div>
            </div>
          )}
      </main>

      {/* Add Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onExitComplete={handleModalExitComplete}
        initialStep={newCode ? 1 : 0}
      >
        <Modal.Step title="Agregar miembro">
          <RoleSelectionContent
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
          />
          <Modal.Footer>
            <Modal.CancelBackButton />
            <GenerateCodeButton
              isGenerating={isGenerating}
              onGenerate={handleGenerateCode}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Codigo generado" hideBackButton>
          {newCode && (
            <CodeGeneratedContent
              selectedRole={selectedRole}
              newCode={newCode}
              qrDataUrl={qrDataUrl}
              isGenerating={isGenerating}
              onRegenerate={handleRegenerateCode}
            />
          )}
          <Modal.Footer>
            <Modal.GoToStepButton step={2} className="btn btn-secondary">
              <Trash2 className="w-5 h-5" />
            </Modal.GoToStepButton>
            <button
              type="button"
              onClick={() => newCode && handleCopyCode(newCode)}
              className="btn btn-secondary"
              title="Copiar codigo"
            >
              {copyFeedback === newCode ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-primary flex-1"
            >
              Listo
            </button>
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Eliminar codigo" backStep={1}>
          <Modal.Item>
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-subtle flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Eliminar codigo de invitacion
              </h3>
              <p className="text-sm text-text-secondary">
                El codigo <code className="font-bold">{newCode}</code> sera eliminado y ya no podra ser usado para registrarse.
              </p>
            </div>
          </Modal.Item>
          <Modal.Footer>
            <Modal.GoToStepButton step={1} className="btn btn-secondary flex-1" disabled={isDeletingCode}>
              Cancelar
            </Modal.GoToStepButton>
            <ConfirmDeleteCodeButton
              isDeletingCode={isDeletingCode}
              onDelete={handleDeleteCode}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Codigo eliminado" hideBackButton>
          <Modal.Item>
            <div className="flex flex-col items-center text-center py-4">
              <div style={{ width: 160, height: 160 }}>
                {codeDeleted && (
                  <LottiePlayer
                    src="/animations/error.json"
                    loop={false}
                    autoplay={true}
                    delay={500}
                    style={{ width: 160, height: 160 }}
                  />
                )}
              </div>
              <p
                className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                style={{ opacity: codeDeleted ? 1 : 0 }}
              >
                Codigo eliminado
              </p>
              <p
                className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                style={{ opacity: codeDeleted ? 1 : 0 }}
              >
                El codigo de invitacion ha sido eliminado
              </p>
            </div>
          </Modal.Item>
          <Modal.Footer>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-primary flex-1"
            >
              Cerrar
            </button>
          </Modal.Footer>
        </Modal.Step>
      </Modal>

      {/* User Management Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        onExitComplete={handleUserModalExitComplete}
      >
        <Modal.Step
          title={selectedMember?.id === user?.id ? 'Tu perfil' : 'Gestionar miembro'}
          hideBackButton
        >
          {selectedMember && (
            <UserDetailsStep
              member={selectedMember}
              currentUser={user}
              canManageTeam={canManageTeam}
              pinResetLoading={pinResetLoading}
              onToggleStatus={handleToggleUserStatus}
              onResetPin={handleResetPin}
            />
          )}
        </Modal.Step>

        <Modal.Step title="Cambiar telefono" backStep={0}>
          {selectedMember && (
            <PhoneChangeContent
              memberName={selectedMember.name}
              newMemberPhone={newMemberPhone}
              setNewMemberPhone={setNewMemberPhone}
              phoneChangeError={phoneChangeError}
            />
          )}
          <Modal.Footer>
            <PhoneChangeCancelButton disabled={phoneChangeLoading} />
            <PhoneChangeSaveButton
              phoneChangeLoading={phoneChangeLoading}
              onSubmit={handleSubmitPhoneChange}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Cambiar rol" backStep={0}>
          {selectedMember && (
            <RoleChangeContent
              memberName={selectedMember.name}
              newRole={newRole}
              setNewRole={setNewRole}
            />
          )}
          <Modal.Footer>
            <RoleChangeCancelButton disabled={roleChangeLoading} />
            <RoleChangeSaveButton
              roleChangeLoading={roleChangeLoading}
              isDisabled={selectedMember ? newRole === selectedMember.role : false}
              onSubmit={handleSubmitRoleChange}
            />
          </Modal.Footer>
        </Modal.Step>
      </Modal>
    </>
  )
}
