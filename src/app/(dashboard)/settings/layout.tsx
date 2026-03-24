'use client'

import { TransferProvider } from '@/contexts/transfer-context'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TransferProvider>{children}</TransferProvider>
}
