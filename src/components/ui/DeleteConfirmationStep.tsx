'use client'

import { Modal, Spinner, useMorphingModal } from '@/components/ui'

interface DeleteConfirmationStepProps {
  /** Title for the modal step */
  title: string
  /** Name of the item being deleted (shown in bold) */
  itemName: string
  /** Optional warning text (defaults to "This action cannot be undone.") */
  warningText?: string
  /** Step index to go to when Cancel is clicked */
  cancelStep: number
  /** Handler that performs the deletion. Returns true if successful. */
  onConfirm: () => Promise<boolean>
  /** Step index to go to after successful deletion */
  successStep: number
  /** Whether deletion is in progress */
  isDeleting: boolean
}

/**
 * Reusable delete confirmation step for modals.
 *
 * @example
 * <DeleteConfirmationStep
 *   title="Delete product"
 *   itemName={product.name}
 *   cancelStep={1}
 *   onConfirm={handleDelete}
 *   successStep={6}
 *   isDeleting={isDeleting}
 * />
 */
export function DeleteConfirmationStep({
  title,
  itemName,
  warningText = 'This action cannot be undone.',
  cancelStep,
  onConfirm,
  successStep,
  isDeleting,
}: DeleteConfirmationStepProps) {
  return (
    <Modal.Step title={title} backStep={cancelStep}>
      <Modal.Item>
        <p className="text-text-secondary">
          Are you sure you want to delete <strong>{itemName}</strong>? {warningText}
        </p>
      </Modal.Item>

      <Modal.Footer>
        <Modal.GoToStepButton step={cancelStep} className="btn btn-secondary flex-1" disabled={isDeleting}>
          Cancel
        </Modal.GoToStepButton>
        <ConfirmDeleteButton
          onConfirm={onConfirm}
          successStep={successStep}
          isDeleting={isDeleting}
        />
      </Modal.Footer>
    </Modal.Step>
  )
}

interface ConfirmDeleteButtonProps {
  onConfirm: () => Promise<boolean>
  successStep: number
  isDeleting: boolean
}

function ConfirmDeleteButton({ onConfirm, successStep, isDeleting }: ConfirmDeleteButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = () => {
    goToStep(successStep)
    onConfirm()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : 'Delete'}
    </button>
  )
}
