// src/components/ui/modal/Modal.tsx
'use client'

import React, { useState, useEffect, Children, isValidElement, ReactElement } from 'react'
import { IconClose, IconArrowLeft } from '@/components/icons'
import { ModalProvider, useModalContext } from './ModalContext'
import { ModalStep } from './ModalStep'
import { ModalItem } from './ModalItem'
import { ModalFooter } from './ModalFooter'
import { ModalBackButton, ModalNextButton, ModalCancelBackButton } from './ModalButtons'
import type { ModalProps, ModalStepProps } from './types'

// Internal header component (needs context)
function ModalHeader({ title, singleStepTitle }: { title?: string; singleStepTitle?: string }) {
  const ctx = useModalContext()
  const { isFirstStep, isLocked, isTransitioning, goBack, _onClose, _currentStepHideBackButton } = ctx

  // For single-step modals, use the prop title
  // For multi-step, find the current step's title from DOM (set via data attribute)
  const displayTitle = singleStepTitle || title || ''

  // Show back button if: multi-step modal, not first step, and step doesn't hide it
  const showBackIcon = !singleStepTitle && !isFirstStep && !_currentStepHideBackButton

  return (
    <div className="modal-header">
      <div className={`modal-back-container ${showBackIcon ? 'modal-back-visible' : 'modal-back-hidden'}`}>
        <button
          type="button"
          onClick={goBack}
          className="modal-back"
          aria-label="Volver"
          disabled={isLocked || isTransitioning || !showBackIcon}
          tabIndex={showBackIcon ? 0 : -1}
        >
          <IconArrowLeft className="w-5 h-5" />
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
        <IconClose className="w-5 h-5" />
      </button>
    </div>
  )
}

// Internal body component that handles step title extraction
function ModalBody({
  children,
  isSingleStep,
  setCurrentTitle,
}: {
  children: React.ReactNode
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
}) {
  const { currentStep } = useModalContext()

  // Extract titles from Step children
  useEffect(() => {
    if (isSingleStep) return

    const steps = Children.toArray(children).filter(
      (child): child is ReactElement<ModalStepProps> =>
        isValidElement(child) && (child.type as any)._isModalStep
    )

    if (steps[currentStep]) {
      setCurrentTitle(steps[currentStep].props.title)
    }
  }, [children, currentStep, isSingleStep, setCurrentTitle])

  if (isSingleStep) {
    // Single-step: wrap content in morph classes for consistency
    return (
      <div className="modal-body">
        <div className="morph-panel morph-panel-visible">
          <div className="morph-panel-inner">
            <div className="morph-content">
              {children}
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
        // Clone with internal _index prop
        return (
          <ModalStep key={index} {...step.props} _index={index}>
            {injectItemIndices(step.props.children)}
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
}: {
  children: React.ReactNode
  closing: boolean
  size: 'default' | 'large'
  title?: string
  singleStepTitle?: string
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
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
        <ModalBody isSingleStep={isSingleStep} setCurrentTitle={setCurrentTitle}>
          {children}
        </ModalBody>
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
})
