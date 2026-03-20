/**
 * Cash drawer constants and helpers
 */

import type { CashMovementCategory, CashMovementType, CashMovement, CashSession } from '@/types'

// ============================================
// CONSTANTS
// ============================================

export const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  venta: 'Venta',
  prestamo_empleado: 'Prestamo',
  retiro_banco: 'Retiro de banco',
  devolucion_prestamo: 'Devolucion',
  deposito_banco: 'Deposito a banco',
  otro: 'Otro',
}

export const INGRESO_CATEGORIES: CashMovementCategory[] = [
  'prestamo_empleado',
  'retiro_banco',
  'otro'
]

export const EGRESO_CATEGORIES: CashMovementCategory[] = [
  'devolucion_prestamo',
  'deposito_banco',
  'otro'
]

// ============================================
// HELPERS
// ============================================

/**
 * Calculate the expected balance from a session and its movements
 */
export function calculateExpectedBalance(
  session: CashSession | null,
  movements: CashMovement[]
): number {
  if (!session) return 0

  let balance = session.openingBalance

  for (const mov of movements) {
    if (mov.type === 'ingreso') {
      balance += mov.amount
    } else {
      balance -= mov.amount
    }
  }

  return balance
}

/**
 * Calculate outstanding employee loans from movements
 */
export function calculateOutstandingLoans(
  movements: CashMovement[]
): Map<string, { name: string; amount: number }> {
  const loans = new Map<string, { name: string; amount: number }>()

  for (const mov of movements) {
    if (mov.category === 'prestamo_empleado' && mov.employee) {
      const employeeName = mov.expand?.employee?.name || 'Empleado'
      const current = loans.get(mov.employee) || { name: employeeName, amount: 0 }
      if (mov.expand?.employee?.name) {
        current.name = mov.expand.employee.name
      }
      current.amount += mov.amount
      loans.set(mov.employee, current)
    } else if (mov.category === 'devolucion_prestamo' && mov.employee) {
      const employeeName = mov.expand?.employee?.name || 'Empleado'
      const current = loans.get(mov.employee) || { name: employeeName, amount: 0 }
      if (mov.expand?.employee?.name) {
        current.name = mov.expand.employee.name
      }
      current.amount -= mov.amount
      loans.set(mov.employee, current)
    }
  }

  // Filter out zero balances
  for (const [key, value] of loans) {
    if (value.amount <= 0) {
      loans.delete(key)
    }
  }

  return loans
}

/**
 * Get categories for a movement type
 */
export function getCategoriesForType(type: CashMovementType): CashMovementCategory[] {
  return type === 'ingreso' ? INGRESO_CATEGORIES : EGRESO_CATEGORIES
}

/**
 * Sort movements by created time (newest first)
 */
export function sortMovementsByDate(movements: CashMovement[]): CashMovement[] {
  return [...movements].sort((a, b) => {
    if (a.created && b.created) {
      const timeA = new Date(a.created).getTime()
      const timeB = new Date(b.created).getTime()
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA
      }
    }
    // Fallback: compare IDs (PocketBase IDs are lexicographically sortable)
    return b.id.localeCompare(a.id)
  })
}

/**
 * Format datetime for display (es-PE locale)
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
}

/**
 * Format time for display (es-PE locale)
 */
export function formatMovementTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Ahora'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Ahora'
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
}
