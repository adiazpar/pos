'use client'

import { useEffect, useState, useCallback } from 'react'
import { LottiePlayer } from './LottiePlayer'
import { formatCurrency } from '@/lib/utils'

interface SuccessOverlayProps {
  isVisible: boolean
  onClose: () => void
  type: 'ingreso' | 'retiro'
  amount: number
  message?: string
  autoDismissDelay?: number // ms to wait after animation before auto-dismiss
}

export function SuccessOverlay({
  isVisible,
  onClose,
  type,
  amount,
  message,
  autoDismissDelay = 800
}: SuccessOverlayProps) {
  const [showContent, setShowContent] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)

  const handleAnimationComplete = useCallback(() => {
    setAnimationComplete(true)
  }, [])

  // Auto-dismiss after animation completes
  useEffect(() => {
    if (animationComplete && isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, autoDismissDelay)
      return () => clearTimeout(timer)
    }
  }, [animationComplete, isVisible, autoDismissDelay, onClose])

  useEffect(() => {
    if (isVisible) {
      // Show content immediately for snappy feel
      setShowContent(true)
    } else {
      setShowContent(false)
      setAnimationComplete(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  const isIngreso = type === 'ingreso'
  const colorClass = isIngreso ? 'text-success' : 'text-error'
  const bgColorClass = isIngreso ? 'bg-success-subtle' : 'bg-error-subtle'
  const sign = isIngreso ? '+' : '-'
  const defaultMessage = isIngreso ? 'Ingreso registrado' : 'Retiro registrado'

  return (
    <div
      className="success-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="success-title"
      onClick={onClose}
    >
      {showContent && (
        <div
          className="success-overlay-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Checkmark animation */}
          <div
            className={`success-overlay-icon ${bgColorClass}`}
            aria-hidden="true"
          >
            <LottiePlayer
              src="/animations/success-checkmark.json"
              loop={false}
              autoplay={true}
              speed={1.2}
              style={{ width: '80px', height: '80px' }}
              onComplete={handleAnimationComplete}
            />
          </div>

          {/* Message */}
          <h2
            id="success-title"
            className="success-overlay-title"
          >
            {message || defaultMessage}
          </h2>

          {/* Amount */}
          <div className={`success-overlay-amount ${colorClass}`}>
            {sign}{formatCurrency(amount)}
          </div>

          {/* Tap to dismiss hint */}
          <p className="success-overlay-hint">
            Toca para continuar
          </p>
        </div>
      )}
    </div>
  )
}
