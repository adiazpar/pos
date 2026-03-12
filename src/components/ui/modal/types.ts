// src/components/ui/modal/types.ts
import { ReactNode } from 'react'

// Phase state machine
export type Phase = 'idle' | 'exiting' | 'transitioning' | 'entering'
export type Direction = 'forward' | 'backward'

// Timing constants (centralized per spec reviewer recommendation)
export const TIMING = {
  STAGGER_DELAY: 40,        // ms between each item animation
  EXIT_DURATION: 120,       // base exit animation duration
  ENTER_DURATION: 120,      // base enter animation duration
  HEIGHT_TRANSITION: 300,   // height collapse/expand duration
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
