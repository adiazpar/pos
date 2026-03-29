'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'

/**
 * Join page - redirects to hub with code param.
 *
 * This page exists to support QR code deep linking.
 * When a user scans a QR code with /join?code=ABC123:
 * 1. Middleware ensures they're authenticated (redirects to login if not)
 * 2. This page redirects to /?code=ABC123
 * 3. Hub layout's JoinBusinessProvider detects the code and opens the modal
 */
function JoinRedirectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const code = searchParams.get('code')

    if (code) {
      // Redirect to hub with code param
      router.replace(`/?code=${encodeURIComponent(code)}`)
    } else {
      // No code - just go to hub
      router.replace('/')
    }
  }, [searchParams, router])

  return (
    <main className="page-loading">
      <Spinner className="spinner-lg" />
    </main>
  )
}

export default function JoinRedirectPage() {
  return (
    <Suspense fallback={
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    }>
      <JoinRedirectContent />
    </Suspense>
  )
}
