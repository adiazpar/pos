/**
 * Cash drawer constants and helpers
 */

import type { CashMovementCategory, CashMovementType, CashMovement, CashSession } from '@/types'

// ============================================
// CONSTANTS
// ============================================

export const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  sale: 'Sale',
  bank_withdrawal: 'Bank Withdrawal',
  bank_deposit: 'Bank Deposit',
  other: 'Other',
}

export const DEPOSIT_CATEGORIES: CashMovementCategory[] = [
  'bank_withdrawal',
  'other'
]

export const WITHDRAWAL_CATEGORIES: CashMovementCategory[] = [
  'bank_deposit',
  'other'
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
    if (mov.type === 'deposit') {
      balance += mov.amount
    } else {
      balance -= mov.amount
    }
  }

  return balance
}

/**
 * Get categories for a movement type
 */
export function getCategoriesForType(type: CashMovementType): CashMovementCategory[] {
  return type === 'deposit' ? DEPOSIT_CATEGORIES : WITHDRAWAL_CATEGORIES
}

/**
 * Sort movements by created time (newest first)
 */
export function sortMovementsByDate(movements: CashMovement[]): CashMovement[] {
  return [...movements].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA
      }
    }
    // Fallback: compare IDs (lexicographically sortable)
    return b.id.localeCompare(a.id)
  })
}

/**
 * Format datetime for display (en-US locale)
 */
export function formatDateTime(dateStr: Date | string): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

/**
 * Format time for display (en-US locale)
 */
export function formatMovementTime(dateStr: Date | string | undefined | null): string {
  if (!dateStr) return 'Now'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return 'Now'
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}
