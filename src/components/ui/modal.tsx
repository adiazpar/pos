'use client'

import { useState, useEffect } from 'react'
import { IconClose } from '@/components/icons'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'large'
}

export function Modal({
  isOpen,
  onClose,
  onExitComplete,
  title,
  children,
  footer,
  size = 'default',
}: ModalProps) {
  const [render, setRender] = useState(false)
  const [closing, setClosing] = useState(false)

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
  }, [isOpen, onExitComplete])

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
    >
      <div
        className={`modal ${size === 'large' ? 'modal-lg' : ''} ${closing ? 'modal-exit' : 'modal-animated'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
