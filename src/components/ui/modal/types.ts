// src/components/ui/modal/types.ts
import { ReactNode } from 'react'

// Phase state machine
export type Phase = 'idle' | 'exiting' | 'transitioning' | 'entering'
export type Direction = 'forward' | 'backward'

// Timing constants (must match CSS variables in globals.css)
// CSS: --duration-fast: 150ms, --duration-normal: 250ms
export const TIMING = {
  STAGGER_DELAY: 40,        // ms between each item animation
  EXIT_DURATION: 150,       // matches --duration-fast
  ENTER_DURATION: 150,      // matches --duration-fast
  HEIGHT_TRANSITION: 250,   // matches --duration-normal
} as const

// Internal state
export interface ModalState {
  currentStep: number
  targetStep: number
  phase: Phase
  direction: Direction
  isLocked: boolean
  stepCount: number
}

// Context value exposed to consumers
export interface ModalContextValue {
  // State
  currentStep: number
  targetStep: number
  stepCount: number
  isFirstStep: boolean
  isLastStep: boolean
  isLocked: boolean
  isTransitioning: boolean
  phase: Phase
  direction: Direction

  // Navigation
  goNext: () => void
  goBack: () => void
  goToStep: (step: number) => void

  // Lock control
  lock: () => void
  unlock: () => void

  // Internal (used by sub-components)
  _registerStep: (index: number) => void
  _unregisterStep: (index: number) => void
  _onClose: () => void
  _initialStep: number
  _currentStepHideBackButton: boolean
  _setCurrentStepHideBackButton: (hide: boolean) => void
  _currentStepBackStep: number | undefined
  _setCurrentStepBackStep: (step: number | undefined) => void
}

// Component props
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
  title?: string
  size?: 'default' | 'large'
  initialStep?: number
  children: ReactNode
}

export interface ModalStepProps {
  title: string
  children: ReactNode
  /** Hide the back button for this step (useful for terminal/completion steps) */
  hideBackButton?: boolean
  /** Override which step the back button navigates to (default: previous step) */
  backStep?: number
  /** Additional CSS class for the step container */
  className?: string
}

export interface ModalItemProps {
  children: ReactNode
  className?: string
}

export interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export interface ModalButtonProps {
  children?: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}
