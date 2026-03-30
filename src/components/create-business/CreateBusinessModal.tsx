'use client'

import { useCallback, useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronDown, Check, Upload, X } from 'lucide-react'
import { Modal, Spinner, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import {
  BUSINESS_TYPES,
  LOCALES,
  CURRENCIES,
  COMMON_TIMEZONES,
  getCurrencyConfig,
} from '@/lib/locale-config'
import { FoodBeverageIcon, ServicesIcon, RetailIcon, WholesaleIcon, ManufacturingIcon, OtherBusinessIcon } from '@/components/icons'
import type { UseCreateBusinessReturn, BusinessType } from '@/hooks'

interface CreateBusinessModalProps {
  createBusiness: UseCreateBusinessReturn
}

export function CreateBusinessModal({ createBusiness }: CreateBusinessModalProps) {
  const {
    isOpen,
    handleClose,
    handleExitComplete,
    formData,
    setName,
    setType,
    setLocale,
    setCurrency,
    setTimezone,
    setLogoFile,
    clearLogo,
    isCreating,
    createSuccess,
    error,
    createdBusiness,
    isStep1Valid,
    handleCreateBusiness,
  } = createBusiness

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onExitComplete={handleExitComplete}
    >
      {/* Step 0: Business Name & Type */}
      <Modal.Step title="Create Business" hideBackButton>
        <NameAndTypeContent
          name={formData.name}
          setName={setName}
          type={formData.type}
          setType={setType}
        />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <NextStepButton disabled={!isStep1Valid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Locale & Settings */}
      <Modal.Step title="Location & Currency">
        <LocaleContent
          locale={formData.locale}
          setLocale={setLocale}
          currency={formData.currency}
          setCurrency={setCurrency}
          timezone={formData.timezone}
          setTimezone={setTimezone}
        />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <NextStepButton />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Logo Upload */}
      <Modal.Step title="Business Logo">
        <LogoUploadContent
          businessType={formData.type}
          logoPreview={formData.logoPreview}
          setLogoFile={setLogoFile}
          clearLogo={clearLogo}
        />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <CreateButton
            isCreating={isCreating}
            onCreate={handleCreateBusiness}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Success */}
      <Modal.Step title="Business Created" hideBackButton>
        <Modal.Item>
          <SuccessContent
            createdBusiness={createdBusiness}
            createSuccess={createSuccess}
            icon={formData.icon}
          />
        </Modal.Item>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg text-center">
              {error}
            </div>
          </Modal.Item>
        )}
      </Modal.Step>
    </Modal>
  )
}

// ============================================
// STEP 0: NAME AND TYPE
// ============================================

interface NameAndTypeContentProps {
  name: string
  setName: (name: string) => void
  type: BusinessType | null
  setType: (type: BusinessType) => void
}

// Custom icon components for business types (takes precedence over emojis)
const BUSINESS_TYPE_ICONS: Partial<Record<string, React.ComponentType<{ className?: string }>>> = {
  food: FoodBeverageIcon,
  retail: RetailIcon,
  services: ServicesIcon,
  wholesale: WholesaleIcon,
  manufacturing: ManufacturingIcon,
  other: OtherBusinessIcon,
}

// Fallback emojis for types without custom icons
const FALLBACK_EMOJIS: Record<string, string> = {
  food: '🍽️',
  retail: '🛍️',
  services: '✂️',
  wholesale: '📦',
  manufacturing: '🏭',
  other: '💼',
}

function getBusinessTypeIcon(typeValue: string, isSelected: boolean) {
  const IconComponent = BUSINESS_TYPE_ICONS[typeValue]
  if (IconComponent) {
    return (
      <IconComponent
        className={`w-8 h-8 ${isSelected ? 'text-brand' : 'text-text-secondary'}`}
      />
    )
  }
  return <span className="text-2xl">{FALLBACK_EMOJIS[typeValue] || '💼'}</span>
}

function NameAndTypeContent({ name, setName, type, setType }: NameAndTypeContentProps) {
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center">
          Enter your business name and select a type
        </p>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Business Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Business"
          maxLength={100}
          className="input"
          autoFocus
          autoComplete="off"
        />
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Business Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_TYPES.map((bt) => (
            <button
              key={bt.value}
              type="button"
              onClick={() => setType(bt.value as BusinessType)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                type === bt.value
                  ? 'border-brand bg-brand-subtle'
                  : 'border-border hover:border-brand-300'
              }`}
            >
              {getBusinessTypeIcon(bt.value, type === bt.value)}
              <span className="text-sm font-medium text-text-primary">{bt.label}</span>
            </button>
          ))}
        </div>
      </Modal.Item>
    </>
  )
}

// ============================================
// STEP 1: LOCALE CONTENT
// ============================================

interface LocaleContentProps {
  locale: string
  setLocale: (locale: string) => void
  currency: string
  setCurrency: (currency: string) => void
  timezone: string
  setTimezone: (timezone: string) => void
}

function LocaleContent({
  locale,
  setLocale,
  currency,
  setCurrency,
  timezone,
  setTimezone,
}: LocaleContentProps) {
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)

  const selectedCurrency = getCurrencyConfig(currency)

  // Get unique currencies
  const uniqueCurrencies = Object.values(CURRENCIES)

  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center mb-2">
          Select your location to set currency and timezone
        </p>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Location
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="input"
        >
          {LOCALES.map((loc) => (
            <option key={loc.code} value={loc.code}>
              {loc.flag} {loc.country} ({loc.name})
            </option>
          ))}
        </select>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Currency
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
            className="input w-full flex items-center justify-between"
          >
            <span>
              {selectedCurrency?.symbol} {selectedCurrency?.name} ({currency})
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
          {showCurrencyDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {uniqueCurrencies.map((cur) => (
                <button
                  key={cur.code}
                  type="button"
                  onClick={() => {
                    setCurrency(cur.code)
                    setShowCurrencyDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-surface-secondary flex items-center justify-between ${
                    currency === cur.code ? 'bg-brand-subtle' : ''
                  }`}
                >
                  <span>{cur.symbol} {cur.name}</span>
                  {currency === cur.code && <Check className="w-4 h-4 text-brand" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Timezone
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
            className="input w-full flex items-center justify-between"
          >
            <span>
              {COMMON_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
          {showTimezoneDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {COMMON_TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  type="button"
                  onClick={() => {
                    setTimezone(tz.value)
                    setShowTimezoneDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-surface-secondary flex items-center justify-between ${
                    timezone === tz.value ? 'bg-brand-subtle' : ''
                  }`}
                >
                  <span>{tz.label}</span>
                  {timezone === tz.value && <Check className="w-4 h-4 text-brand" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal.Item>
    </>
  )
}

// ============================================
// STEP 2: LOGO UPLOAD
// ============================================

interface LogoUploadContentProps {
  businessType: BusinessType | null
  logoPreview: string | null
  setLogoFile: (file: File | null) => void
  clearLogo: () => void
}

function getDefaultIconForType(businessType: BusinessType | null) {
  if (!businessType) return <span className="text-5xl">💼</span>

  const IconComponent = BUSINESS_TYPE_ICONS[businessType]
  if (IconComponent) {
    return <IconComponent className="w-14 h-14 text-brand" />
  }

  return <span className="text-5xl">{FALLBACK_EMOJIS[businessType] || '💼'}</span>
}

function LogoUploadContent({
  businessType,
  logoPreview,
  setLogoFile,
  clearLogo,
}: LogoUploadContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        return
      }
      setLogoFile(file)
    }
  }

  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center">
          Upload your business logo (optional)
        </p>
      </Modal.Item>
      <Modal.Item>
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-brand-subtle flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Business logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                getDefaultIconForType(businessType)
              )}
            </div>
            {logoPreview && (
              <button
                type="button"
                onClick={clearLogo}
                className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-error-hover transition-colors"
                aria-label="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-brand hover:bg-brand-subtle transition-all text-text-secondary hover:text-brand"
        >
          <Upload className="w-5 h-5" />
          <span className="text-sm font-medium">
            {logoPreview ? 'Change Logo' : 'Upload Logo'}
          </span>
        </button>
        <p className="text-xs text-text-tertiary text-center mt-2">
          PNG, JPG up to 2MB
        </p>
      </Modal.Item>
    </>
  )
}

// ============================================
// NAVIGATION BUTTONS
// ============================================

function NextStepButton({ disabled = false }: { disabled?: boolean }) {
  const { goNext } = useMorphingModal()

  return (
    <button
      type="button"
      onClick={goNext}
      disabled={disabled}
      className="btn btn-primary flex-1"
    >
      Continue
    </button>
  )
}

interface CreateButtonProps {
  isCreating: boolean
  onCreate: () => Promise<boolean>
}

function CreateButton({ isCreating, onCreate }: CreateButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = useCallback(async () => {
    const success = await onCreate()
    if (success) {
      goToStep(3)
    }
  }, [onCreate, goToStep])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isCreating}
      className="btn btn-primary flex-1"
    >
      {isCreating ? <Spinner size="sm" /> : "Let's Go!"}
    </button>
  )
}

// ============================================
// SUCCESS CONTENT
// ============================================

interface SuccessContentProps {
  createdBusiness: { id: string; name: string } | null
  createSuccess: boolean
  icon: string | null
}

function SuccessContent({ createdBusiness, createSuccess, icon }: SuccessContentProps) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {createSuccess && (
          <LottiePlayer
            src="/animations/success.json"
            loop={false}
            autoplay={true}
            delay={500}
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        Business Created
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {createdBusiness?.name || 'Your business'} is ready to use
      </p>
      <p
        className="text-xs text-text-tertiary mt-3 transition-opacity duration-500 delay-300"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        Redirecting...
      </p>
    </div>
  )
}
