'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

const ANIMATION_DURATION = 200 // matches --transition-normal

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Track if component is mounted (for portal)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle open/close state
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsClosing(false)
    } else if (isVisible) {
      // Start closing animation
      setIsClosing(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsClosing(false)
      }, ANIMATION_DURATION)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isVisible])

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible, onClose])

  // Handle touch events for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
    const delta = currentY.current - startY.current

    // Only allow swiping down
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  const handleTouchEnd = () => {
    const delta = currentY.current - startY.current

    // If swiped more than 100px, close the sheet
    if (delta > 100) {
      onClose()
    } else if (sheetRef.current) {
      // Reset position
      sheetRef.current.style.transform = ''
    }

    startY.current = 0
    currentY.current = 0
  }

  // Don't render if not visible or not mounted (SSR safety)
  if (!isVisible || !mounted) return null

  // Use portal to escape parent stacking contexts (fixes z-index issues with fixed navbars)
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`bottom-sheet-backdrop${isClosing ? ' bottom-sheet-backdrop-closing' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`bottom-sheet${isClosing ? ' bottom-sheet-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar for swipe gesture indicator */}
        <div className="bottom-sheet-handle">
          <div className="bottom-sheet-handle-bar" />
        </div>

        {/* Header */}
        {title && (
          <div className="bottom-sheet-header">
            <h3 className="bottom-sheet-title">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="bottom-sheet-close"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
