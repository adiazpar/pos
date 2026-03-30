/**
 * Locale configuration for business settings
 * Maps locales to their default currency and timezone
 */

export interface LocaleConfig {
  code: string // Locale code (e.g., 'en-US')
  name: string // Display name
  country: string // Country name for grouping
  currency: string // ISO 4217 currency code
  timezone: string // Primary IANA timezone
  flag: string // Flag emoji for visual identification
}

export interface CurrencyConfig {
  code: string // ISO 4217 code
  symbol: string // Currency symbol
  name: string // Display name
  decimals: number // Decimal places
  symbolPosition: 'before' | 'after' // Symbol position relative to amount
}

export interface BusinessTypeConfig {
  value: string
  label: string
}

// Business types
export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  { value: 'food', label: 'Culinary' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Services' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'other', label: 'Other' },
]

// Supported locales with their defaults
export const LOCALES: LocaleConfig[] = [
  // North America
  { code: 'en-US', name: 'English (US)', country: 'United States', currency: 'USD', timezone: 'America/New_York', flag: '🇺🇸' },
  { code: 'en-CA', name: 'English (Canada)', country: 'Canada', currency: 'CAD', timezone: 'America/Toronto', flag: '🇨🇦' },
  { code: 'fr-CA', name: 'French (Canada)', country: 'Canada', currency: 'CAD', timezone: 'America/Toronto', flag: '🇨🇦' },
  { code: 'es-MX', name: 'Spanish (Mexico)', country: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City', flag: '🇲🇽' },

  // Central America
  { code: 'es-GT', name: 'Spanish (Guatemala)', country: 'Guatemala', currency: 'GTQ', timezone: 'America/Guatemala', flag: '🇬🇹' },
  { code: 'es-SV', name: 'Spanish (El Salvador)', country: 'El Salvador', currency: 'USD', timezone: 'America/El_Salvador', flag: '🇸🇻' },
  { code: 'es-HN', name: 'Spanish (Honduras)', country: 'Honduras', currency: 'HNL', timezone: 'America/Tegucigalpa', flag: '🇭🇳' },
  { code: 'es-NI', name: 'Spanish (Nicaragua)', country: 'Nicaragua', currency: 'NIO', timezone: 'America/Managua', flag: '🇳🇮' },
  { code: 'es-CR', name: 'Spanish (Costa Rica)', country: 'Costa Rica', currency: 'CRC', timezone: 'America/Costa_Rica', flag: '🇨🇷' },
  { code: 'es-PA', name: 'Spanish (Panama)', country: 'Panama', currency: 'USD', timezone: 'America/Panama', flag: '🇵🇦' },

  // South America
  { code: 'es-CO', name: 'Spanish (Colombia)', country: 'Colombia', currency: 'COP', timezone: 'America/Bogota', flag: '🇨🇴' },
  { code: 'es-VE', name: 'Spanish (Venezuela)', country: 'Venezuela', currency: 'VES', timezone: 'America/Caracas', flag: '🇻🇪' },
  { code: 'es-EC', name: 'Spanish (Ecuador)', country: 'Ecuador', currency: 'USD', timezone: 'America/Guayaquil', flag: '🇪🇨' },
  { code: 'es-PE', name: 'Spanish (Peru)', country: 'Peru', currency: 'PEN', timezone: 'America/Lima', flag: '🇵🇪' },
  { code: 'es-BO', name: 'Spanish (Bolivia)', country: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', flag: '🇧🇴' },
  { code: 'es-CL', name: 'Spanish (Chile)', country: 'Chile', currency: 'CLP', timezone: 'America/Santiago', flag: '🇨🇱' },
  { code: 'es-AR', name: 'Spanish (Argentina)', country: 'Argentina', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
  { code: 'es-UY', name: 'Spanish (Uruguay)', country: 'Uruguay', currency: 'UYU', timezone: 'America/Montevideo', flag: '🇺🇾' },
  { code: 'es-PY', name: 'Spanish (Paraguay)', country: 'Paraguay', currency: 'PYG', timezone: 'America/Asuncion', flag: '🇵🇾' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', country: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },

  // Caribbean
  { code: 'es-DO', name: 'Spanish (Dominican Republic)', country: 'Dominican Republic', currency: 'DOP', timezone: 'America/Santo_Domingo', flag: '🇩🇴' },
  { code: 'es-PR', name: 'Spanish (Puerto Rico)', country: 'Puerto Rico', currency: 'USD', timezone: 'America/Puerto_Rico', flag: '🇵🇷' },
  { code: 'es-CU', name: 'Spanish (Cuba)', country: 'Cuba', currency: 'CUP', timezone: 'America/Havana', flag: '🇨🇺' },

  // Europe
  { code: 'en-GB', name: 'English (UK)', country: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Spanish (Spain)', country: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French (France)', country: 'France', currency: 'EUR', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German (Germany)', country: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian (Italy)', country: 'Italy', currency: 'EUR', timezone: 'Europe/Rome', flag: '🇮🇹' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', country: 'Portugal', currency: 'EUR', timezone: 'Europe/Lisbon', flag: '🇵🇹' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)', country: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
]

// Currency configurations
export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, symbolPosition: 'before' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, symbolPosition: 'before' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimals: 2, symbolPosition: 'before' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, symbolPosition: 'before' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, symbolPosition: 'before' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2, symbolPosition: 'before' },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimals: 2, symbolPosition: 'before' },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimals: 0, symbolPosition: 'before' },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', decimals: 0, symbolPosition: 'before' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2, symbolPosition: 'before' },
  GTQ: { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', decimals: 2, symbolPosition: 'before' },
  HNL: { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', decimals: 2, symbolPosition: 'before' },
  NIO: { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Cordoba', decimals: 2, symbolPosition: 'before' },
  CRC: { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon', decimals: 0, symbolPosition: 'before' },
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', decimals: 2, symbolPosition: 'before' },
  CUP: { code: 'CUP', symbol: '$', name: 'Cuban Peso', decimals: 2, symbolPosition: 'before' },
  BOB: { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano', decimals: 2, symbolPosition: 'before' },
  UYU: { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', decimals: 2, symbolPosition: 'before' },
  PYG: { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani', decimals: 0, symbolPosition: 'before' },
  VES: { code: 'VES', symbol: 'Bs', name: 'Venezuelan Bolivar', decimals: 2, symbolPosition: 'before' },
}

// Helper functions
export function getLocaleConfig(localeCode: string): LocaleConfig | undefined {
  return LOCALES.find(l => l.code === localeCode)
}

export function getCurrencyConfig(currencyCode: string): CurrencyConfig | undefined {
  return CURRENCIES[currencyCode]
}

export function getDefaultsForLocale(localeCode: string): { currency: string; timezone: string } {
  const locale = getLocaleConfig(localeCode)
  if (locale) {
    return { currency: locale.currency, timezone: locale.timezone }
  }
  // Fallback to US defaults
  return { currency: 'USD', timezone: 'America/New_York' }
}

export function getBusinessTypeConfig(typeValue: string): BusinessTypeConfig | undefined {
  return BUSINESS_TYPES.find(t => t.value === typeValue)
}

// Get unique currencies for dropdown
export function getAvailableCurrencies(): CurrencyConfig[] {
  const uniqueCodes = [...new Set(LOCALES.map(l => l.currency))]
  return uniqueCodes.map(code => CURRENCIES[code]).filter(Boolean)
}

// Common timezones grouped by region (for override selection)
export const COMMON_TIMEZONES = [
  // US
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  // Mexico
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Tijuana', label: 'Tijuana (Pacific)' },
  // Central America
  { value: 'America/Guatemala', label: 'Guatemala' },
  { value: 'America/El_Salvador', label: 'El Salvador' },
  { value: 'America/Tegucigalpa', label: 'Honduras' },
  { value: 'America/Managua', label: 'Nicaragua' },
  { value: 'America/Costa_Rica', label: 'Costa Rica' },
  { value: 'America/Panama', label: 'Panama' },
  // South America
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Lima', label: 'Peru' },
  { value: 'America/Guayaquil', label: 'Ecuador' },
  { value: 'America/Caracas', label: 'Venezuela' },
  { value: 'America/La_Paz', label: 'Bolivia' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Sao_Paulo', label: 'Brazil (Sao Paulo)' },
  { value: 'America/Montevideo', label: 'Uruguay' },
  { value: 'America/Asuncion', label: 'Paraguay' },
  // Caribbean
  { value: 'America/Santo_Domingo', label: 'Dominican Republic' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico' },
  { value: 'America/Havana', label: 'Cuba' },
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Lisbon', label: 'Lisbon (WET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
]
