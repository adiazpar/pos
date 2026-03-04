'use client'

import { PageHeader } from '@/components/layout'

export default function InventarioPage() {
  return (
    <div className="page-wrapper">
      <PageHeader title="Inventario" subtitle="Control de stock" />
      <main className="page-content">
        <div className="page-body">
          <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
            <p className="text-text-secondary">Proximamente</p>
          </div>
        </div>
      </main>
    </div>
  )
}
