// src/components/ui/modal/ModalButtons.tsx
'use client'

import { useModalContext, useMorphingModal } from './ModalContext'
import type { ModalButtonProps } from './types'

export function ModalBackButton({ children, className = '', disabled, onClick }: ModalButtonProps) {
  const { goBack, isLocked, isTransitioning, isFirstStep } = useMorphingModal()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      goBack()
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-secondary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning || isFirstStep}
    >
      {children || 'Atras'}
    </button>
  )
}

export function ModalNextButton({ children, className = '', disabled, onClick }: ModalButtonProps) {
  const { goNext, isLocked, isTransitioning, isLastStep } = useMorphingModal()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      goNext()
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-primary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning || isLastStep}
    >
      {children || 'Siguiente'}
    </button>
  )
}

interface CancelBackButtonProps extends ModalButtonProps {
  onCancel?: () => void
}

export function ModalCancelBackButton({
  children,
  className = '',
  disabled,
  onCancel,
}: CancelBackButtonProps) {
  const ctx = useModalContext()
  const { goBack, isLocked, isTransitioning, isFirstStep } = ctx

  const handleClick = () => {
    if (isFirstStep) {
      if (onCancel) {
        onCancel()
      } else {
        ctx._onClose()
      }
    } else {
      goBack()
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-secondary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning}
    >
      {children || (isFirstStep ? 'Cancelar' : 'Atras')}
    </button>
  )
}
