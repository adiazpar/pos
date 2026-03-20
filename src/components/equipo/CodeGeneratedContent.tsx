'use client'

import { RefreshCw } from 'lucide-react'
import { Badge, Spinner, Modal } from '@/components/ui'
import { getInviteRoleLabel } from '@/lib/auth'
import type { InviteRole } from '@/types'

export interface CodeGeneratedContentProps {
  selectedRole: InviteRole
  newCode: string
  qrDataUrl: string | null
  isGenerating: boolean
  onRegenerate: () => Promise<void>
}

export function CodeGeneratedContent({
  selectedRole,
  newCode,
  qrDataUrl,
  isGenerating,
  onRegenerate,
}: CodeGeneratedContentProps) {
  return (
    <Modal.Item>
      <div className="invite-success-compact">
        {/* Role badge and expiry */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <Badge variant="brand">{getInviteRoleLabel(selectedRole)}</Badge>
          <span className="text-xs text-text-tertiary">Valido por 7 dias</span>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex justify-center mb-3">
            <div className="invite-qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element -- Data URL for QR code, no optimization benefit */}
              <img src={qrDataUrl} alt="Codigo QR para registro" />
            </div>
          </div>
        )}

        {/* Large readable code */}
        <div className="text-center mb-1">
          <code className="text-3xl font-display font-bold tracking-[0.3em] -mr-[0.3em] text-text-primary">
            {newCode}
          </code>
        </div>

        {/* Regenerate button */}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="invite-regenerate"
        >
          {isGenerating ? (
            <>
              <Spinner />
              <span>Regenerando...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerar codigo</span>
            </>
          )}
        </button>
      </div>
    </Modal.Item>
  )
}
