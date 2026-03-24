'use client'

import { ArrowLeftRight, Mail, Palette, Info } from 'lucide-react'
import { Spinner, Modal } from '@/components/ui'
import { useSettings } from '@/hooks'
import {
  PendingTransferCard,
  IncomingTransferCard,
  ThemeSelector,
  TransferInitiateContent,
  TransferInitiateButton,
  TransferLinkContent,
  TransferLinkDoneButton,
  TransferConfirmContent,
} from '@/components/settings'

export default function SettingsPage() {
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
    transferEmail,
    setTransferEmail,
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
  } = useSettings()

  return (
    <>
      <main className="page-content space-y-6">
        {/* Transfer Section - Owner Only */}
          {isOwner && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <span className="font-medium text-text-primary block">Transfer ownership</span>
                  <span className="text-xs text-text-tertiary">Transfer the business to another person</span>
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
                    Transfer business ownership to another person. Your account will become a partner.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenTransferModal}
                    className="btn btn-secondary"
                  >
                    Start transfer
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
                  <span className="font-medium text-text-primary block">Pending transfer</span>
                  <span className="text-xs text-text-tertiary">You have a pending ownership transfer</span>
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
                <Mail className="w-5 h-5 text-brand" />
              </div>
              <div>
                <span className="font-medium text-text-primary block">Account</span>
                <span className="text-xs text-text-tertiary">Your account information</span>
              </div>
            </div>

            <hr className="border-border" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Email</span>
              <span className="text-sm font-medium text-text-primary">
                {user?.email || '-'}
              </span>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                <Palette className="w-5 h-5 text-brand" />
              </div>
              <div>
                <span className="font-medium text-text-primary block">Appearance</span>
                <span className="text-xs text-text-tertiary">Customize the look</span>
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
                <span className="font-medium text-text-primary block">About</span>
                <span className="text-xs text-text-tertiary">App information</span>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Version</span>
                <span className="text-sm font-medium text-text-primary">0.1.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Developed by</span>
                <span className="text-sm font-medium text-text-primary">Feria POS</span>
              </div>
            </div>
        </div>
      </main>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={handleCloseTransferModal}
        onExitComplete={handleTransferModalExitComplete}
        initialStep={transferStep}
      >
        <Modal.Step title="Transfer ownership">
          <TransferInitiateContent
            transferEmail={transferEmail}
            setTransferEmail={setTransferEmail}
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

        <Modal.Step title="Transfer link" hideBackButton>
          <TransferLinkContent
            transferLink={transferLink}
            linkCopied={linkCopied}
            onCopy={handleCopyTransferLink}
          />
          <Modal.Footer>
            <TransferLinkDoneButton onClose={handleCloseTransferModal} />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title="Confirm transfer" hideBackButton>
          <TransferConfirmContent
            pendingTransfer={pendingTransfer}
            transferError={transferError}
            transferLoading={transferLoading}
            onConfirm={handleConfirmTransfer}
          />
        </Modal.Step>
      </Modal>
    </>
  )
}
