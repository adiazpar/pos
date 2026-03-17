// src/components/ui/modal/ModalButtons.tsx
'use client'

import { useModalContext, useMorphingModal } from './ModalContext'
import type { ModalButtonProps } from './types'

export function ModalBackButton({ children, className = '', disabled, onClick }: ModalButtonProps) {
  const ctx = useModalContext()
  const { goBack, goToStep, isLocked, isTransitioning, isFirstStep, _currentStepBackStep } = ctx

  const handleClick = () => {
    onClick?.()
    // Respect the step's backStep prop if defined
    if (_currentStepBackStep !== undefined) {
      goToStep(_currentStepBackStep)
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
    onClick?.()
    goNext()
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

interface GoToStepButtonProps extends ModalButtonProps {
  step: number
  title?: string
}

export function ModalGoToStepButton({ children, className = '', disabled, step, onClick, title }: GoToStepButtonProps) {
  const { goToStep, isLocked, isTransitioning } = useMorphingModal()

  const handleClick = () => {
    onClick?.()
    goToStep(step)
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning}
      title={title}
    >
      {children}
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
  const { goBack, goToStep, isLocked, isTransitioning, isFirstStep, _currentStepBackStep } = ctx

  const handleClick = () => {
    if (isFirstStep) {
      if (onCancel) {
        onCancel()
      } else {
        ctx._onClose()
      }
    } else {
      // Respect the step's backStep prop if defined
      if (_currentStepBackStep !== undefined) {
        goToStep(_currentStepBackStep)
      } else {
        goBack()
      }
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
