// src/components/ui/modal/ModalContext.tsx
'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import type { ModalContextValue, Phase, Direction } from './types'
import { TIMING } from './types'

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModalContext(): ModalContextValue {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('Modal compound components must be used within a Modal')
  }
  return context
}

export function useMorphingModal(): Omit<ModalContextValue, '_registerStep' | '_unregisterStep' | '_onClose'> {
  const ctx = useModalContext()
  const { _registerStep, _unregisterStep, _onClose, ...publicApi } = ctx
  return publicApi
}

interface ModalProviderProps {
  children: ReactNode
  initialStep: number
  onClose: () => void
  isOpen: boolean
}

export function ModalProvider({ children, initialStep, onClose, isOpen }: ModalProviderProps) {
  // Track registered steps
  const stepsRef = useRef<Set<number>>(new Set())
  const [stepCount, setStepCount] = useState(0)

  // Core state
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [_targetStep, setTargetStep] = useState(initialStep)
  const [phase, setPhase] = useState<Phase>('idle')
  const [direction, setDirection] = useState<Direction>('forward')
  const [isLocked, setIsLocked] = useState(false)

  // Track timeout IDs for cleanup
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([])

  // Reset state when modal opens (Fix #3: moved from render to useEffect)
  const prevIsOpen = useRef(isOpen)
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // Modal just opened - reset to initial state
      setCurrentStep(initialStep)
      setTargetStep(initialStep)
      setPhase('idle')
      setDirection('forward')
      setIsLocked(false)
    }
    prevIsOpen.current = isOpen
  }, [isOpen, initialStep])

  // Cleanup timeouts on unmount (Fix #1: prevent memory leaks)
  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current
    return () => {
      timeoutIds.forEach(id => clearTimeout(id))
    }
  }, [])

  // Step registration (called by Modal.Step)
  const _registerStep = useCallback((index: number) => {
    stepsRef.current.add(index)
    setStepCount(stepsRef.current.size)
  }, [])

  const _unregisterStep = useCallback((index: number) => {
    stepsRef.current.delete(index)
    setStepCount(stepsRef.current.size)
  }, [])

  // Navigation (Fix #2: inline timing calculations, remove getExitDuration/getEnterDuration from deps)
  const goToStep = useCallback((step: number) => {
    if (isLocked || phase !== 'idle') return

    // Clamp to valid range
    const clampedStep = Math.max(0, Math.min(step, stepCount - 1))
    if (clampedStep === currentStep) return

    const newDirection: Direction = clampedStep > currentStep ? 'forward' : 'backward'
    setDirection(newDirection)
    setTargetStep(clampedStep)
    setPhase('exiting')

    // Calculate timing inline (assume ~4 items average)
    const itemCount = 4
    const exitDuration = TIMING.EXIT_DURATION + (itemCount - 1) * TIMING.STAGGER_DELAY
    const enterDuration = TIMING.ENTER_DURATION + (itemCount - 1) * TIMING.STAGGER_DELAY

    // Phase transitions with timeout tracking (Fix #1: store timeout IDs for cleanup)
    const t1 = setTimeout(() => {
      setPhase('transitioning')

      const t2 = setTimeout(() => {
        setCurrentStep(clampedStep)
        setPhase('entering')

        const t3 = setTimeout(() => {
          setPhase('idle')
        }, enterDuration)
        timeoutIdsRef.current.push(t3)
      }, TIMING.HEIGHT_TRANSITION)
      timeoutIdsRef.current.push(t2)
    }, exitDuration)
    timeoutIdsRef.current.push(t1)
  }, [isLocked, phase, stepCount, currentStep])

  const goNext = useCallback(() => {
    if (currentStep < stepCount - 1) {
      goToStep(currentStep + 1)
    }
  }, [currentStep, stepCount, goToStep])

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }, [currentStep, goToStep])

  // Lock control
  const lock = useCallback(() => setIsLocked(true), [])
  const unlock = useCallback(() => setIsLocked(false), [])

  // Close handler
  const _onClose = useCallback(() => {
    if (isLocked || phase !== 'idle') return
    onClose()
  }, [isLocked, phase, onClose])

  const value: ModalContextValue = {
    currentStep,
    stepCount,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === stepCount - 1,
    isLocked,
    isTransitioning: phase !== 'idle',
    phase,
    direction,
    goNext,
    goBack,
    goToStep,
    lock,
    unlock,
    _registerStep,
    _unregisterStep,
    _onClose,
  }

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  )
}
