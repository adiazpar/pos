'use client'

import { useEffect, useState } from 'react'
import { IconClose } from '@/components/icons'
import { LottiePlayer } from './LottiePlayer'

interface CelebrationOverlayProps {
  isVisible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  stats?: Array<{ label: string; value: string }>
}

export function CelebrationOverlay({
  isVisible,
  onClose,
  title,
  subtitle,
  stats
}: CelebrationOverlayProps) {
  const [render, setRender] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setRender(true)
      setClosing(false)
      // Delay animation to let modal fully render first
      const animTimer = setTimeout(() => setShowAnimation(true), 100)
      return () => clearTimeout(animTimer)
    } else if (render) {
      setShowAnimation(false)
      setClosing(true)
      const timer = setTimeout(() => {
        setRender(false)
        setClosing(false)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isVisible, render])

  useEffect(() => {
    if (!render) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [render, onClose])

  if (!render) return null

  return (
    <div
      className={`modal-backdrop ${closing ? 'modal-backdrop-exit' : 'modal-backdrop-animated'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      <div
        className={`modal ${closing ? 'modal-exit' : 'modal-animated'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title" id="celebration-title">{title}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col items-center text-center">
            {/* Lottie animation */}
            <div className="mb-6" style={{ width: 200, height: 200 }}>
              {showAnimation && (
                <LottiePlayer
                  src="/animations/trophy.lottie"
                  loop={false}
                  autoplay={true}
                  style={{ width: 200, height: 200 }}
                />
              )}
            </div>

            {(subtitle || (stats && stats.length > 0)) && (
              <div className="w-full p-4 bg-bg-muted rounded-lg">
                {subtitle && (
                  <p className="text-text-secondary text-center mb-4">
                    {subtitle}
                  </p>
                )}
                {stats && stats.length > 0 && (
                  <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)` }}
                  >
                    {stats.map((stat, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-xl font-bold font-display text-text-primary">
                          {stat.value}
                        </div>
                        <div className="text-sm text-text-secondary mt-1">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-primary flex-1"
            onClick={onClose}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
