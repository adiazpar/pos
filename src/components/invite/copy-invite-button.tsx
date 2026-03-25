'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import type { InviteRole } from '@/types'

interface CopyInviteButtonProps {
  code: string
  role: InviteRole
  variant?: 'code' | 'text'
}

/**
 * Copies invite code or formatted invite text to clipboard
 *
 * variant="code" - Copies just the code (ABC123)
 * variant="text" - Copies formatted message with code and link
 */
export function CopyInviteButton({
  code,
  role,
  variant = 'text',
}: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const roleLabel = role === 'partner' ? 'Partner' : 'Employee'
    const appUrl = window.location.origin

    const textToCopy =
      variant === 'code'
        ? code
        : `I invite you to Kasero as ${roleLabel}.\n\nYour code: ${code}\n\nRegister here: ${appUrl}/invite?code=${code}`

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(textToCopy)
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [code, role, variant])

  if (variant === 'code') {
    // Inline icon button (used next to code display)
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="p-2 rounded-lg text-text-secondary hover:text-brand hover:bg-brand-subtle transition-colors"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-5 h-5 text-success" />
        ) : (
          <Copy className="w-5 h-5" />
        )}
      </button>
    )
  }

  // Full button with label
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-secondary w-full flex items-center justify-center gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-success" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Copy invitation</span>
        </>
      )}
    </button>
  )
}
