'use client'

import { MobileNav, Sidebar, TransferBanner, PageHeader } from '@/components/layout'
import { AuthGuard } from '@/components/auth'
import { NavbarProvider } from '@/contexts/navbar-context'
import { HeaderProvider } from '@/contexts/header-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth>
      <NavbarProvider>
        <HeaderProvider>
          <div className="h-full">
            <Sidebar />
            <PageHeader />
            <div className="with-sidebar flex flex-col h-full overflow-y-auto">
              <TransferBanner />
              {children}
            </div>
            <MobileNav />
          </div>
        </HeaderProvider>
      </NavbarProvider>
    </AuthGuard>
  )
}
