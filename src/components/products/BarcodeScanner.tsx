'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScan: (value: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const scanner = new Html5Qrcode('barcode-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
      },
      (decodedText) => {
        onScan(decodedText)
        scanner.stop().catch(() => {})
      },
      () => {} // Ignore scan failures (happens every frame until a code is found)
    ).catch((err) => {
      setError('Unable to access camera. Please allow camera permissions.')
      console.error('Scanner error:', err)
    })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-bg-surface rounded-xl overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <span className="font-medium">Scan Barcode</span>
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
          <div id="barcode-reader" className="w-full" />
          {error && (
            <div className="p-4 text-center text-error text-sm">
              {error}
            </div>
          )}
          <div className="p-4 text-center text-text-tertiary text-xs">
            Point your camera at a barcode or QR code
          </div>
        </div>
      </div>
    </div>
  )
}
