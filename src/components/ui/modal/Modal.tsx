// src/components/ui/modal/Modal.tsx
//
// IMPORTANT: Modal.Footer Placement Rule
// =======================================
// Modal.Footer MUST be a DIRECT child of Modal.Step for proper extraction.
//
// The separateFooter() function scans step.props.children looking for Modal.Footer.
// It can only detect Modal.Footer when it's a direct child - NOT when it's returned
// from a sub-component, because React hasn't rendered the sub-component yet at
// scan time.
//
// CORRECT - Footer is direct child, gets extracted and rendered outside modal-body:
// ```tsx
// <Modal.Step title="Example">
//   <MyContentComponent />        // Returns only Modal.Item elements
//   <Modal.Footer>                // Direct child - EXTRACTED properly
//     <button>Save</button>
//   </Modal.Footer>
// </Modal.Step>
// ```
//
// WRONG - Footer inside sub-component, stays in modal-body with extra padding:
// ```tsx
// <Modal.Step title="Example">
//   <MyStepComponent />           // Returns <><Modal.Item>...</Modal.Item><Modal.Footer>...</Modal.Footer></>
// </Modal.Step>                   // Footer NOT extracted - renders inside modal-body!
// ```
//
// When creating multi-step modals with reusable content:
// 1. Create content-only components that return ONLY Modal.Item elements
// 2. If footer buttons need useMorphingModal(), create separate button components
// 3. Place Modal.Footer as direct child of Modal.Step in the modal JSX
//
// See: src/app/(dashboard)/ajustes/equipo/page.tsx for examples
//
'use client'

import React, { useState, useEffect, Children, isValidElement, ReactElement } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import { ModalProvider, useModalContext } from './ModalContext'
import { ModalStep } from './ModalStep'
import { ModalItem } from './ModalItem'
import { ModalFooter } from './ModalFooter'
import { ModalBackButton, ModalNextButton, ModalCancelBackButton, ModalGoToStepButton } from './ModalButtons'
import type { ModalProps, ModalStepProps } from './types'

// Animated footer wrapper that syncs with step transitions
function AnimatedFooter({ children }: { children: React.ReactNode }) {
  const { phase, direction } = useModalContext()

  // Determine animation class based on phase and direction
  const getAnimationClass = () => {
    if (phase === 'exiting') {
      return direction === 'forward' ? 'morph-footer-exit' : 'morph-footer-exit-back'
    }
    if (phase === 'entering') {
      return direction === 'forward' ? 'morph-footer-enter' : 'morph-footer-enter-back'
    }
    // During transitioning phase, hide footer (content faded out, height animating)
    if (phase === 'transitioning') {
      return 'morph-footer-hidden'
    }
    return ''
  }

  return (
    <div className={`morph-footer-wrapper ${getAnimationClass()}`}>
      {children}
    </div>
  )
}

// Internal header component (needs context)
function ModalHeader({ title, singleStepTitle }: { title?: string; singleStepTitle?: string }) {
  const ctx = useModalContext()
  const { isFirstStep, isLocked, isTransitioning, goBack, goToStep, _onClose, _currentStepHideBackButton, _currentStepBackStep, _currentStepOnBackStep } = ctx

  // For single-step modals, use the prop title
  // For multi-step, find the current step's title from DOM (set via data attribute)
  const displayTitle = singleStepTitle || title || ''

  // Show back button if: multi-step modal, not first step, and step doesn't hide it
  // Back button animates AFTER height transition (when currentStep updates during 'entering' phase)
  const showBackIcon = !singleStepTitle && !isFirstStep && !_currentStepHideBackButton

  // Handle back navigation - call onBackStep callback first, then navigate
  const handleBack = () => {
    // Call the step's onBackStep callback before navigating (e.g., to cancel operations)
    _currentStepOnBackStep?.()

    if (_currentStepBackStep !== undefined) {
      goToStep(_currentStepBackStep)
    } else {
      goBack()
    }
  }

  return (
    <div className="modal-header">
      <div className={`modal-back-container ${showBackIcon ? 'modal-back-visible' : 'modal-back-hidden'}`}>
        <button
          type="button"
          onClick={handleBack}
          className="modal-back"
          aria-label="Volver"
          disabled={isLocked || isTransitioning || !showBackIcon}
          tabIndex={showBackIcon ? 0 : -1}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <h2 className="modal-title">{displayTitle}</h2>
      <button
        type="button"
        onClick={_onClose}
        className="modal-close"
        aria-label="Cerrar"
        disabled={isLocked || isTransitioning}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

// Helper to separate footer from other children
function separateFooter(children: React.ReactNode): { content: React.ReactNode; footer: React.ReactNode } {
  let footer: React.ReactNode = null
  const content: React.ReactNode[] = []

  Children.forEach(children, (child) => {
    if (isValidElement(child) && (child.type as any)._isModalFooter) {
      footer = child
    } else {
      content.push(child)
    }
  })

  return { content, footer }
}

// Internal body component that handles step title extraction
function ModalBody({
  children,
  isSingleStep,
  setCurrentTitle,
  setCurrentFooter,
}: {
  children: React.ReactNode
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
  setCurrentFooter: (footer: React.ReactNode) => void
}) {
  const { currentStep } = useModalContext()

  // Extract titles and footers from Step children
  useEffect(() => {
    if (isSingleStep) {
      // For single-step, extract footer from direct children
      const { footer } = separateFooter(children)
      setCurrentFooter(footer)
      return
    }

    const steps = Children.toArray(children).filter(
      (child): child is ReactElement<ModalStepProps> =>
        isValidElement(child) && (child.type as any)._isModalStep
    )

    if (steps[currentStep]) {
      setCurrentTitle(steps[currentStep].props.title)
      // Extract footer from current step's children
      const { footer } = separateFooter(steps[currentStep].props.children)
      setCurrentFooter(footer)
    }
  }, [children, currentStep, isSingleStep, setCurrentTitle, setCurrentFooter])

  if (isSingleStep) {
    // Single-step: wrap content in morph classes for consistency (without footer)
    const { content } = separateFooter(children)
    return (
      <div className="modal-body">
        <div className="morph-panel morph-panel-visible">
          <div className="morph-panel-inner">
            <div className="morph-content">
              {content}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Multi-step: children are Modal.Step components
  const steps = Children.toArray(children).filter(
    (child): child is ReactElement<ModalStepProps> =>
      isValidElement(child) && (child.type as any)._isModalStep
  )

  return (
    <div className="modal-body">
      {steps.map((step, index) => {
        // Separate footer from step children - footer renders outside body
        const { content } = separateFooter(step.props.children)
        // Clone with internal _index prop, passing only non-footer content
        return (
          <ModalStep key={index} {...step.props} _index={index}>
            {injectItemIndices(content)}
          </ModalStep>
        )
      })}
    </div>
  )
}

// Helper to inject _index into ModalItem children
function injectItemIndices(children: React.ReactNode): React.ReactNode {
  let itemIndex = 0

  return Children.map(children, (child) => {
    if (isValidElement(child)) {
      // Check if it's a ModalItem - use React.cloneElement for proper cloning
      if ((child.type as any)._isModalItem) {
        const cloned = React.cloneElement(child, { _index: itemIndex })
        itemIndex++
        return cloned
      }
      // ModalFooter passes through unchanged
      if ((child.type as any)._isModalFooter) {
        return child
      }
    }
    return child
  })
}

// Main Modal component
function ModalRoot({
  isOpen,
  onClose,
  onExitComplete,
  title,
  size = 'default',
  initialStep = 0,
  children,
}: ModalProps) {
  const [render, setRender] = useState(false)
  const [closing, setClosing] = useState(false)
  const [currentTitle, setCurrentTitle] = useState('')
  const [currentFooter, setCurrentFooter] = useState<React.ReactNode>(null)

  // Check if this is a single-step modal (no Modal.Step children)
  const steps = Children.toArray(children).filter(
    (child): child is ReactElement<ModalStepProps> =>
      isValidElement(child) && (child.type as any)._isModalStep
  )
  const isSingleStep = steps.length === 0

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setRender(true)
      setClosing(false)
    } else if (render) {
      setClosing(true)
      const timer = setTimeout(() => {
        setRender(false)
        setClosing(false)
        onExitComplete?.()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen, render, onExitComplete])

  if (!render) return null

  return (
    <ModalProvider initialStep={initialStep} onClose={onClose} isOpen={isOpen}>
      <div
        className={`modal-backdrop ${closing ? 'modal-backdrop-exit' : 'modal-backdrop-animated'}`}
        role="dialog"
        aria-modal="true"
      >
        <ModalInner
          closing={closing}
          size={size}
          title={isSingleStep ? title : currentTitle}
          singleStepTitle={isSingleStep ? title : undefined}
          isSingleStep={isSingleStep}
          setCurrentTitle={setCurrentTitle}
          currentFooter={currentFooter}
          setCurrentFooter={setCurrentFooter}
        >
          {children}
        </ModalInner>
      </div>
    </ModalProvider>
  )
}

// Inner component that has access to context
function ModalInner({
  children,
  closing,
  size,
  title,
  singleStepTitle,
  isSingleStep,
  setCurrentTitle,
  currentFooter,
  setCurrentFooter,
}: {
  children: React.ReactNode
  closing: boolean
  size: 'default' | 'large'
  title?: string
  singleStepTitle?: string
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
  currentFooter: React.ReactNode
  setCurrentFooter: (footer: React.ReactNode) => void
}) {
  const ctx = useModalContext()

  // Handle backdrop click
  const handleBackdropClick = () => {
    ctx._onClose()
  }

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ctx._onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [ctx])

  return (
    <>
      {/* Invisible backdrop click handler */}
      <div
        className="absolute inset-0"
        onClick={handleBackdropClick}
      />
      <div
        className={`modal ${size === 'large' ? 'modal-lg' : ''} ${closing ? 'modal-exit' : 'modal-animated'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title={title} singleStepTitle={singleStepTitle} />
        <ModalBody isSingleStep={isSingleStep} setCurrentTitle={setCurrentTitle} setCurrentFooter={setCurrentFooter}>
          {children}
        </ModalBody>
        {/* Footer rendered outside modal-body for sticky positioning */}
        {currentFooter && (
          <AnimatedFooter>
            {currentFooter}
          </AnimatedFooter>
        )}
      </div>
    </>
  )
}

// Mark sub-components for identification
const ModalStepWithMarker = ModalStep as typeof ModalStep & { _isModalStep: boolean }
ModalStepWithMarker._isModalStep = true

const ModalItemWithMarker = ModalItem as typeof ModalItem & { _isModalItem: boolean }
ModalItemWithMarker._isModalItem = true

const ModalFooterWithMarker = ModalFooter as typeof ModalFooter & { _isModalFooter: boolean }
ModalFooterWithMarker._isModalFooter = true

// Compound component exports
export const Modal = Object.assign(ModalRoot, {
  Step: ModalStepWithMarker,
  Item: ModalItemWithMarker,
  Footer: ModalFooterWithMarker,
  BackButton: ModalBackButton,
  NextButton: ModalNextButton,
  CancelBackButton: ModalCancelBackButton,
  GoToStepButton: ModalGoToStepButton,
})
