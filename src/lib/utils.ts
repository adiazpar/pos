/**
 * Format currency in US Dollars
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date in US format (MM/DD/YYYY)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'America/New_York',
  }).format(d)
}

/**
 * Format time in 12-hour format
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).format(d)
}

/**
 * Get time-of-day greeting
 * 6am-12pm: Good morning
 * 12pm-6pm: Good afternoon
 * 6pm-6am: Good evening
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Combine CSS class names
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ============================================
// PRODUCT UTILITIES
// ============================================

/**
 * Get product icon from a product
 * The icon is stored as a base64 data URL (data:image/png;base64,...)
 *
 * @param product - Product with optional icon
 * @returns The icon data URL or null
 */
export function getProductIconUrl(
  product: { icon?: string | null },
): string | null {
  if (!product.icon) return null
  return product.icon
}

/**
 * Check if a string is a base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/')
}
