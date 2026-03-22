'use client'

import Link from 'next/link'
import { ArrowLeftRight, Phone, Lock, Palette, Info } from 'lucide-react'
import { Spinner, Modal, Stagger } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useSettings } from '@/hooks'
import { formatPhoneForDisplay } from '@/lib/countries'
import {
  PendingTransferCard,
  IncomingTransferCard,
  ThemeSelector,
  TransferInitiateContent,
  TransferInitiateButton,
  TransferLinkContent,
  TransferLinkDoneButton,
  TransferConfirmContent,
  PhoneChangeInputContent,
  PhoneChangeContinueButton,
  PhoneVerifyContent,
} from '@/components/ajustes'

export default function SettingsPage() {
  useHeader({
    title: 'Configuracion',
    subtitle: 'Personaliza tu experiencia',
  })

  const {
    // User
    user,
    isOwner,

    // Theme
    theme,
    setTheme,
    themeDescription,

    // Transfer state (owner)
    pendingTransfer,
    isLoadingTransfer,

    // Incoming transfer state (non-owner)
    incomingTransfer,
    isLoadingIncoming,
    acceptingTransfer,

    // Transfer modal state
    isTransferModalOpen,
    transferStep,
    setTransferStep,
    transferPhone,
    setTransferPhone,
    transferLink,
    transferError,
    transferLoading,
    linkCopied,

    // Transfer actions
    handleOpenTransferModal,
    handleCloseTransferModal,
    handleTransferModalExitComplete,
    handleInitiateTransfer,
    handleCopyTransferLink,
    handleCancelTransfer,
    handleConfirmTransfer,
    handleShowTransferLink,
    handleAcceptIncomingTransfer,

    // Phone change state
    isPhoneModalOpen,
    phoneChangeStep,
    newPhone,
    setNewPhone,
    phoneChangeError,
    phoneChangeLoading,

    // Phone change actions
    handleOpenPhoneModal,
    handleClosePhoneModal,
    handlePhoneModalExitComplete,
    handlePhoneSubmit,
    handlePhoneVerified,
  } = useSettings()

  return (
    <>
      <main className="page-content space-y-6">
        <Stagger delayMs={80} maxDelayMs={300}>
          {/* Transfer Section - Owner Only */}
          {isOwner && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <span className="font-medium text-text-primary block">Transferir propiedad</span>
                  <span className="text-xs text-text-tertiary">Transfiere el negocio a otra persona</span>
                </div>
              </div>

              <hr className="border-border" />

              {isLoadingTransfer ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              ) : pendingTransfer ? (
                <PendingTransferCard
                  transfer={pendingTransfer}
                  transferLoading={transferLoading}
                  onShowLink={handleShowTransferLink}
                  onConfirm={() => setTransferStep(2)}
                  onCancel={handleCancelTransfer}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-text-tertiary">
                    Transfiere la propiedad del negocio a otra persona. Tu cuenta se convertira en socio.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenTransferModal}
                    className="btn btn-secondary"
                  >
                    Iniciar transferencia
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Incoming Transfer Section - Non-owners with pending transfer */}
          {!isOwner && (isLoadingIncoming || incomingTransfer) && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <span className="font-medium text-text-primary block">Transferencia pendiente</span>
                  <span className="text-xs text-text-tertiary">Tienes una transferencia de propiedad</span>
                </div>
              </div>

              <hr className="border-border" />

              {isLoadingIncoming ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              ) : incomingTransfer ? (
                <IncomingTransferCard
                  transfer={incomingTransfer}
                  acceptingTransfer={acceptingTransfer}
                  onAccept={handleAcceptIncomingTransfer}
                />
              ) : null}
            </div>
          )}

          {/* Account Section */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                <Phone className="w-5 h-5 text-brand" />
              </div>
              <div>
                <span className="font-medium text-text-primary block">Cuenta</span>
                <span className="text-xs text-text-tertiary">Tu informacion de cuenta</span>
              </div>
            </div>

            <hr className="border-border" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Telefono</span>
              <span className="text-sm font-medium text-text-primary">
                {user?.phoneNumber ? formatPhoneForDisplay(user.phoneNumber) : '-'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenPhoneModal}
              className="btn btn-secondary"
            >
              Cambiar numero
            </button>
          </div>

          {/* Security Section */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                <Lock className="w-5 h-5 text-brand" />
              </div>
              <div>
                <span className="font-medium text-text-primary block">Seguridad</span>
                <span className="text-xs text-text-tertiary">Protege tu cuenta</span>
              </div>
            </div>

            <hr className="border-border" />

            <p className="text-sm text-text-tertiary">
              Tu PIN se usa para confirmar acciones importantes y cerrar sesion.
            </p>
            <Link href="/cambiar-pin" className="btn btn-secondary">
              Cambiar PIN
            </Link>
          </div>

          {/* Appearance Section */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                <Palette className="w-5 h-5 text-brand" />
              </div>
              <div>
                <span className="font-medium text-text-primary block">Apariencia</span>
                <span className="text-xs text-text-tertiary">Personaliza el aspecto</span>
              </div>
            </div>

            <hr className="border-border" />

            <ThemeSelector
              theme={theme}
              onThemeChange={setTheme}
              description={themeDescription}
            />
          </div>

          {/* About Section */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                <Info className="w-5 h-5 text-brand" />
              </div>
              <div>
                <span className="font-medium text-text-primary block">Acerca de</span>
                <span className="text-xs text-text-tertiary">Informacion de la app</span>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Version</span>
                <span className="text-sm font-medium text-text-primary">0.1.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Desarrollado por</span>
                <span className="text-sm font-medium text-text-primary">Feria POS</span>
              </div>
            </div>
          </div>
        </Stagger>
      </main>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={handleCloseTransferModal}
        onExitComplete={handleTransferModalExitComplete}
        initialStep={transferStep}
      >
        <Modal.Step title="Transferir propiedad">
          <TransferInitiateContent
            transferPhone={transferPhone}
            setTransferPhone={setTransferPhone}
            transferError={transferError}
          />
          <Modal.Footer>
            <Modal.CancelBackButton />
            <TransferInitiateButton
              transferLoading={transferLoading}
              onSubmit={handleInitiateTransfer}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Enlace de transferencia" hideBackButton>
          <TransferLinkContent
            transferLink={transferLink}
            linkCopied={linkCopied}
            onCopy={handleCopyTransferLink}
          />
          <Modal.Footer>
            <TransferLinkDoneButton />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Confirmar transferencia" hideBackButton>
          <TransferConfirmContent
            pendingTransfer={pendingTransfer}
            transferError={transferError}
            transferLoading={transferLoading}
            onConfirm={handleConfirmTransfer}
          />
        </Modal.Step>
      </Modal>

      {/* Phone Change Modal */}
      <Modal
        isOpen={isPhoneModalOpen}
        onClose={handleClosePhoneModal}
        onExitComplete={handlePhoneModalExitComplete}
        initialStep={phoneChangeStep === 'verify' ? 1 : 0}
      >
        <Modal.Step title="Cambiar numero">
          <PhoneChangeInputContent
            newPhone={newPhone}
            setNewPhone={setNewPhone}
            phoneChangeError={phoneChangeError}
          />
          <Modal.Footer>
            <Modal.CancelBackButton />
            <PhoneChangeContinueButton
              phoneChangeLoading={phoneChangeLoading}
              onSubmit={handlePhoneSubmit}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Verificar numero" backStep={0}>
          <PhoneVerifyContent
            newPhone={newPhone}
            phoneChangeError={phoneChangeError}
            onVerified={handlePhoneVerified}
            onBack={() => {}}
          />
        </Modal.Step>
      </Modal>
    </>
  )
}
