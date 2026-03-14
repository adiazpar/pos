'use client'

import { MobileNav, Sidebar, TransferBanner } from '@/components/layout'
import { AuthGuard } from '@/components/auth'
import { NavbarProvider } from '@/contexts/navbar-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth>
      <NavbarProvider>
        <div className="h-full">
          {/* Sidebar for desktop */}
          <Sidebar />

          {/* Main content area */}
          <div className="with-sidebar flex flex-col h-full overflow-y-auto">
            {/* Transfer banner for recipients with pending transfers */}
            <TransferBanner />

            {children}
          </div>

          {/* Mobile navigation */}
          <MobileNav />
        </div>
      </NavbarProvider>
    </AuthGuard>
  )
}
