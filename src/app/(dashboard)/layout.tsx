'use client'

import { MobileNav, Sidebar, PageHeader } from '@/components/layout'
import { ContentGuard } from '@/components/auth'
import { NavbarProvider } from '@/contexts/navbar-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavbarProvider>
      <div className="h-full">
        <Sidebar />
        <PageHeader />
        <div className="with-sidebar flex flex-col h-full overflow-y-auto">
          <ContentGuard>
            {children}
          </ContentGuard>
        </div>
        <MobileNav />
      </div>
    </NavbarProvider>
  )
}
