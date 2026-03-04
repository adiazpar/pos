'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PageHeader } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { FirebasePhoneVerify } from '@/components/auth/firebase-phone-verify'
import { PinPad } from '@/components/auth/pin-pad'
import { IconPalette, IconInfo, IconSun, IconMoon, IconMonitor, IconTransfer, IconClock, IconClose, IconPhone, IconCopy, IconCheck } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { formatPhoneForDisplay, isValidE164 } from '@/lib/countries'

type Theme = 'light' | 'dark' | 'system'

const THEME_CONFIG = {
  light: {
    label: 'Claro',
    icon: IconSun,
    preview: 'theme-option-preview-light',
    description: 'Modo claro activado',
  },
  dark: {
    label: 'Oscuro',
    icon: IconMoon,
    preview: 'theme-option-preview-dark',
    description: 'Modo oscuro activado',
  },
  system: {
    label: 'Sistema',
    icon: IconMonitor,
    preview: 'theme-option-preview-system',
    description: 'Se ajusta automaticamente segun tu dispositivo',
  },
}

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

interface PendingTransfer {
  code: string
  toPhone: string
  status: 'pending' | 'accepted'
  expiresAt: string
  toUser?: {
    id: string
    name: string
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem('theme') as Theme | null
  return saved || 'system'
}

export default function SettingsPage() {
  const { user, pb, changePhoneNumber } = useAuth()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const isInitialMount = useRef(true)

  // Transfer state (for owner)
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null)
  const [isLoadingTransfer, setIsLoadingTransfer] = useState(false)

  // Incoming transfer state (for non-owner recipients)
  interface IncomingTransfer {
    code: string
    fromUser: { id: string; name: string } | null
    status: 'pending' | 'accepted'
    expiresAt: string
  }
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransfer | null>(null)
  const [isLoadingIncoming, setIsLoadingIncoming] = useState(false)
  const [acceptingTransfer, setAcceptingTransfer] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showTransferLinkModal, setShowTransferLinkModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [transferPhone, setTransferPhone] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferLink, setTransferLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  // Phone change state
  const [showPhoneChangeModal, setShowPhoneChangeModal] = useState(false)
  const [phoneChangeStep, setPhoneChangeStep] = useState<'phone' | 'verify'>('phone')
  const [newPhone, setNewPhone] = useState('')
  const [phoneChangeError, setPhoneChangeError] = useState('')
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false)

  const isOwner = user?.role === 'owner'

  // Fetch pending transfer on mount
  useEffect(() => {
    if (!isOwner) return

    const fetchPendingTransfer = async () => {
      setIsLoadingTransfer(true)
      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/pending`, {
          headers: {
            'Authorization': pb.authStore.token,
          },
        })
        const data = await response.json()
        setPendingTransfer(data.transfer || null)
      } catch (err) {
        console.error('Error fetching pending transfer:', err)
      } finally {
        setIsLoadingTransfer(false)
      }
    }

    fetchPendingTransfer()
  }, [isOwner, pb])

  // Fetch incoming transfer for non-owners
  useEffect(() => {
    if (isOwner) return

    const fetchIncomingTransfer = async () => {
      setIsLoadingIncoming(true)
      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/incoming`, {
          headers: {
            'Authorization': pb.authStore.token,
          },
        })
        const data = await response.json()
        setIncomingTransfer(data.transfer || null)
      } catch (err) {
        console.error('Error fetching incoming transfer:', err)
      } finally {
        setIsLoadingIncoming(false)
      }
    }

    fetchIncomingTransfer()
  }, [isOwner, pb])

  // Apply theme changes only when user changes theme (not on mount)
  useEffect(() => {
    // Skip the initial mount - the inline script already applied the theme
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const root = document.documentElement

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      localStorage.removeItem('theme')
    } else {
      root.classList.toggle('dark', theme === 'dark')
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const handleInitiateTransfer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError('')

    if (!transferPhone || !isValidE164(transferPhone)) {
      setTransferError('Ingresa un numero de telefono valido')
      return
    }

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ toPhone: transferPhone }),
      })

      const data = await response.json()

      if (!data.success) {
        setTransferError(data.error || 'Error al iniciar transferencia')
        setTransferLoading(false)
        return
      }

      // Generate transfer link for manual sharing
      const link = `${window.location.origin}/transfer?code=${data.code}`
      setTransferLink(link)

      // Update pending transfer
      setPendingTransfer({
        code: data.code,
        toPhone: transferPhone,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      setShowTransferModal(false)
      setShowTransferLinkModal(true)
      setTransferPhone('')
    } catch (err) {
      console.error('Transfer initiate error:', err)
      setTransferError('Error de conexion')
    } finally {
      setTransferLoading(false)
    }
  }, [transferPhone, pb])

  const handleCopyTransferLink = useCallback(async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(transferLink)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = transferLink
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [transferLink])

  const handleCancelTransfer = useCallback(async () => {
    if (!pendingTransfer) return

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: pendingTransfer.code }),
      })

      const data = await response.json()

      if (data.success) {
        setPendingTransfer(null)
      }
    } catch (err) {
      console.error('Cancel transfer error:', err)
    } finally {
      setTransferLoading(false)
    }
  }, [pendingTransfer, pb])

  const handleConfirmTransfer = useCallback(async (pin: string) => {
    if (!pendingTransfer) return

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: pendingTransfer.code, pin }),
      })

      const data = await response.json()

      if (!data.success) {
        setTransferError(data.error || 'Error al confirmar transferencia')
        setTransferLoading(false)
        return
      }

      // Transfer complete - reload page to reflect new role
      window.location.reload()
    } catch (err) {
      console.error('Confirm transfer error:', err)
      setTransferError('Error de conexion')
    } finally {
      setTransferLoading(false)
    }
  }, [pendingTransfer, pb])

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expirado'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m restantes`
    }
    return `${minutes}m restantes`
  }

  const handleAcceptIncomingTransfer = useCallback(async () => {
    if (!incomingTransfer) return

    setAcceptingTransfer(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: incomingTransfer.code }),
      })

      const result = await response.json()

      if (result.success) {
        // Reload to show updated state
        window.location.reload()
      }
    } catch (err) {
      console.error('Accept incoming transfer error:', err)
    } finally {
      setAcceptingTransfer(false)
    }
  }, [incomingTransfer, pb])

  const handleClosePhoneChangeModal = useCallback(() => {
    setShowPhoneChangeModal(false)
    setPhoneChangeStep('phone')
    setNewPhone('')
    setPhoneChangeError('')
  }, [])

  const handlePhoneSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setPhoneChangeError('')

    if (!newPhone || !isValidE164(newPhone)) {
      setPhoneChangeError('Ingresa un numero de telefono valido')
      return
    }

    // Check if new phone is same as current
    if (user?.phoneNumber === newPhone) {
      setPhoneChangeError('El nuevo numero debe ser diferente al actual')
      return
    }

    // Move to verification step
    setPhoneChangeStep('verify')
  }, [newPhone, user?.phoneNumber])

  const handlePhoneVerified = useCallback(async (idToken: string) => {
    setPhoneChangeLoading(true)
    setPhoneChangeError('')

    try {
      const result = await changePhoneNumber(newPhone, idToken)

      if (!result.success) {
        setPhoneChangeError(result.error || 'Error al cambiar el numero')
        setPhoneChangeLoading(false)
        return
      }

      // Success - close modal
      handleClosePhoneChangeModal()
    } catch {
      setPhoneChangeError('Error de conexion')
    } finally {
      setPhoneChangeLoading(false)
    }
  }, [newPhone, changePhoneNumber, handleClosePhoneChangeModal])

  const currentConfig = THEME_CONFIG[theme]

  return (
    <div className="page-wrapper">
      <PageHeader title="Configuracion" subtitle="Personaliza tu experiencia" />

      <main className="settings-container">
        {/* Transfer Section - Owner Only */}
        {isOwner && (
          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <IconTransfer width={20} height={20} />
              </div>
              <h2 className="settings-section-title">Transferir propiedad</h2>
            </div>
            <div className="settings-section-body">
              {isLoadingTransfer ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              ) : pendingTransfer ? (
                <div className="space-y-4">
                  {/* Pending/Accepted Transfer Card */}
                  <div className={`p-4 rounded-lg border ${pendingTransfer.status === 'accepted' ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${pendingTransfer.status === 'accepted' ? 'bg-success text-white' : 'bg-warning text-white'}`}>
                        {pendingTransfer.status === 'accepted' ? 'Aceptada' : 'Pendiente'}
                      </span>
                      <div className="flex items-center text-xs text-text-tertiary">
                        <IconClock width={14} height={14} className="mr-1" />
                        {formatTimeRemaining(pendingTransfer.expiresAt)}
                      </div>
                    </div>

                    <p className="text-sm text-text-secondary mb-1">
                      Transferencia a:
                    </p>
                    <p className="font-medium text-text-primary">
                      {pendingTransfer.toUser?.name || formatPhoneForDisplay(pendingTransfer.toPhone)}
                    </p>

                    <p className="text-xs text-text-tertiary mt-2">
                      Codigo: <span className="font-mono">{pendingTransfer.code}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {pendingTransfer.status === 'accepted' ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="btn btn-primary flex-1"
                        disabled={transferLoading}
                      >
                        {transferLoading ? <Spinner /> : 'Confirmar transferencia'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTransferLink(`${window.location.origin}/transfer?code=${pendingTransfer.code}`)
                          setShowTransferLinkModal(true)
                        }}
                        className="btn btn-secondary flex-1"
                      >
                        <IconCopy width={16} height={16} />
                        <span>Copiar enlace</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelTransfer}
                    className="text-sm text-error hover:underline"
                    disabled={transferLoading}
                  >
                    Cancelar transferencia
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-text-tertiary">
                    Transfiere la propiedad del negocio a otra persona. Tu cuenta se convertira en socio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="btn btn-secondary"
                  >
                    Iniciar transferencia
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Incoming Transfer Section - Non-owners with pending transfer */}
        {!isOwner && (isLoadingIncoming || incomingTransfer) && (
          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <IconTransfer width={20} height={20} />
              </div>
              <h2 className="settings-section-title">Transferencia pendiente</h2>
            </div>
            <div className="settings-section-body">
              {isLoadingIncoming ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              ) : incomingTransfer ? (
                <div className="space-y-4">
                  {incomingTransfer.status === 'accepted' ? (
                    /* Already accepted - waiting for owner to confirm */
                    <div className="p-4 rounded-lg border border-warning bg-warning-subtle">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-warning text-white">
                          Esperando confirmacion
                        </span>
                        <div className="flex items-center text-xs text-text-tertiary">
                          <IconClock width={14} height={14} className="mr-1" />
                          {formatTimeRemaining(incomingTransfer.expiresAt)}
                        </div>
                      </div>

                      <p className="text-sm text-text-secondary mb-3">
                        De: <span className="font-medium text-text-primary">{incomingTransfer.fromUser?.name || 'Propietario'}</span>
                      </p>

                      <p className="text-sm text-text-secondary">
                        Ya aceptaste la transferencia. Esperando a que <strong>{incomingTransfer.fromUser?.name || 'el propietario'}</strong> confirme para completar el proceso.
                      </p>
                    </div>
                  ) : (
                    /* Pending - needs to accept */
                    <>
                      <div className="p-4 rounded-lg border border-brand bg-brand-subtle">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand text-white">
                            Nueva
                          </span>
                          <div className="flex items-center text-xs text-text-tertiary">
                            <IconClock width={14} height={14} className="mr-1" />
                            {formatTimeRemaining(incomingTransfer.expiresAt)}
                          </div>
                        </div>

                        <p className="text-sm text-text-secondary mb-3">
                          De: <span className="font-medium text-text-primary">{incomingTransfer.fromUser?.name || 'Propietario'}</span>
                        </p>

                        <p className="text-sm text-text-secondary">
                          El propietario quiere transferirte la propiedad del negocio. Al aceptar, te convertiras en el nuevo propietario cuando el actual confirme la transferencia.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAcceptIncomingTransfer}
                        className="btn btn-primary w-full"
                        disabled={acceptingTransfer}
                      >
                        {acceptingTransfer ? <Spinner /> : 'Aceptar transferencia'}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Account Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <IconPhone width={20} height={20} />
            </div>
            <h2 className="settings-section-title">Cuenta</h2>
          </div>
          <div className="settings-section-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Telefono</span>
              <span className="settings-info-value">
                {user?.phoneNumber ? formatPhoneForDisplay(user.phoneNumber) : '-'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPhoneChangeModal(true)}
              className="btn btn-secondary mt-3"
            >
              Cambiar numero
            </button>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <IconPalette width={20} height={20} />
            </div>
            <h2 className="settings-section-title">Apariencia</h2>
          </div>
          <div className="settings-section-body">
            <span className="settings-label">Tema</span>
            <div className="theme-options">
              {(Object.keys(THEME_CONFIG) as Theme[]).map((key) => {
                const config = THEME_CONFIG[key]
                const Icon = config.icon
                const isActive = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`theme-option ${isActive ? 'theme-option-active' : ''}`}
                    aria-pressed={isActive}
                  >
                    <div className={`theme-option-preview ${config.preview}`}>
                      <Icon
                        width={20}
                        height={20}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: key === 'dark' ? '#F8FAFC' : key === 'system' ? '#64748B' : '#334155',
                        }}
                      />
                    </div>
                    <span className="theme-option-label">{config.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="settings-hint">{currentConfig.description}</p>
          </div>
        </section>

        {/* About Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <IconInfo width={20} height={20} />
            </div>
            <h2 className="settings-section-title">Acerca de</h2>
          </div>
          <div className="settings-section-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Version</span>
              <span className="settings-info-value">0.1.0</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Desarrollado por</span>
              <span className="settings-info-value">Mr. Chifles</span>
            </div>
          </div>
        </section>
      </main>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-backdrop" onClick={() => setShowTransferModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Transferir propiedad</h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="modal-close"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>

            <form onSubmit={handleInitiateTransfer} className="modal-body">
              <div className="mb-4 p-3 bg-warning-subtle rounded-lg">
                <p className="text-sm text-warning font-medium mb-1">Importante</p>
                <p className="text-xs text-text-secondary">
                  Al confirmar la transferencia, perderas el rol de propietario y te convertiras en socio.
                  Esta accion es irreversible.
                </p>
              </div>

              {transferError && (
                <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
                  {transferError}
                </div>
              )}

              <PhoneInput
                label="Numero del nuevo propietario"
                value={transferPhone}
                onChange={setTransferPhone}
                autoFocus
              />

              <p className="text-xs text-text-tertiary mt-2 mb-4">
                Se generara un enlace que debes compartir con esta persona.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={transferLoading}
                >
                  {transferLoading ? <Spinner /> : 'Generar enlace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Link Modal */}
      {showTransferLinkModal && (
        <div className="modal-backdrop" onClick={() => setShowTransferLinkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Enlace de transferencia</h3>
              <button
                type="button"
                onClick={() => setShowTransferLinkModal(false)}
                className="modal-close"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-text-secondary mb-4">
                Comparte este enlace con el nuevo propietario para que acepte la transferencia.
              </p>

              <button
                type="button"
                onClick={handleCopyTransferLink}
                className="w-full p-4 bg-bg-muted rounded-lg border border-border flex items-center justify-between hover:border-brand transition-colors"
              >
                <span className="text-sm font-mono truncate pr-2">{transferLink}</span>
                {linkCopied ? (
                  <IconCheck className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <IconCopy className="w-5 h-5 text-text-secondary flex-shrink-0" />
                )}
              </button>

              <p className="text-xs text-text-tertiary mt-3">
                El enlace es valido por 24 horas.
              </p>

              <button
                type="button"
                onClick={() => setShowTransferLinkModal(false)}
                className="btn btn-primary w-full mt-4"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Transfer Modal (PIN) */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirmar transferencia</h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="modal-close"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="mb-4 p-3 bg-error-subtle rounded-lg">
                <p className="text-sm text-error font-medium mb-1">Accion irreversible</p>
                <p className="text-xs text-text-secondary">
                  Al confirmar, {pendingTransfer?.toUser?.name || 'el destinatario'} se convertira en el nuevo propietario
                  y tu cuenta pasara a ser socio.
                </p>
              </div>

              {transferError && (
                <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
                  {transferError}
                </div>
              )}

              <p className="text-center text-sm text-text-secondary mb-4">
                Ingresa tu PIN para confirmar
              </p>

              {transferLoading ? (
                <div className="flex flex-col items-center py-8">
                  <Spinner className="spinner-lg" />
                  <p className="text-text-secondary mt-4">Procesando...</p>
                </div>
              ) : (
                <PinPad
                  onComplete={handleConfirmTransfer}
                  disabled={transferLoading}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phone Change Modal */}
      {showPhoneChangeModal && (
        <div className="modal-backdrop" onClick={handleClosePhoneChangeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {phoneChangeStep === 'phone' ? 'Cambiar numero' : 'Verificar numero'}
              </h3>
              <button
                type="button"
                onClick={handleClosePhoneChangeModal}
                className="modal-close"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>

            {phoneChangeStep === 'phone' ? (
              <form onSubmit={handlePhoneSubmit} className="modal-body">
                <div className="mb-4 p-3 bg-warning-subtle rounded-lg">
                  <p className="text-sm text-warning font-medium mb-1">Atencion</p>
                  <p className="text-xs text-text-secondary">
                    Se enviara un codigo de verificacion via SMS al nuevo numero.
                    Asegurate de tener acceso a ese telefono.
                  </p>
                </div>

                {phoneChangeError && (
                  <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
                    {phoneChangeError}
                  </div>
                )}

                <PhoneInput
                  label="Nuevo numero de telefono"
                  value={newPhone}
                  onChange={setNewPhone}
                  autoFocus
                />

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleClosePhoneChangeModal}
                    className="btn btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={phoneChangeLoading}
                  >
                    Continuar
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-body">
                {phoneChangeError && (
                  <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
                    {phoneChangeError}
                  </div>
                )}

                <FirebasePhoneVerify
                  phoneNumber={newPhone}
                  onVerified={handlePhoneVerified}
                  onBack={() => setPhoneChangeStep('phone')}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
