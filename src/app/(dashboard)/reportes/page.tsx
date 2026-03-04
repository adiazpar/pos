'use client'

import { PageHeader } from '@/components/layout'

export default function ReportesPage() {
  return (
    <div className="page-wrapper">
      <PageHeader title="Reportes" subtitle="Analisis de ventas" />
      <main className="page-content">
        <div className="page-body">
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl">
            <p className="text-text-secondary">Proximamente</p>
          </div>
        </div>
      </main>
    </div>
  )
}
