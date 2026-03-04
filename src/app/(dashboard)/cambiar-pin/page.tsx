'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { hashPin, verifyPin } from '@/lib/auth'
import { IconCircleCheck } from '@/components/icons'

type Step = 'verify' | 'new' | 'confirm' | 'success'

const STEP_CONFIG = {
  verify: {
    title: 'Ingresa tu PIN actual',
    subtitle: 'Verifica tu identidad',
    indicator: 1,
  },
  new: {
    title: 'Crea tu nuevo PIN',
    subtitle: '4 digitos',
    indicator: 2,
  },
  confirm: {
    title: 'Confirma tu nuevo PIN',
    subtitle: 'Ingresa el mismo PIN',
    indicator: 3,
  },
  success: {
    title: 'PIN actualizado',
    subtitle: 'Tu PIN ha sido cambiado exitosamente',
    indicator: 4,
  },
}

export default function ChangePinPage() {
  const router = useRouter()
  const { user, pb } = useAuth()

  const [step, setStep] = useState<Step>('verify')
  const [error, setError] = useState('')
  const [newPin, setNewPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleVerifyCurrentPin = useCallback(async (pin: string) => {
    if (!user?.pin) {
      setError('No se encontro PIN actual')
      return
    }

    setError('')

    try {
      const isValid = await verifyPin(pin, user.pin)
      if (isValid) {
        setStep('new')
      } else {
        setError('PIN incorrecto')
      }
    } catch {
      setError('Error al verificar PIN')
    }
  }, [user])

  const handleNewPin = useCallback((pin: string) => {
    setError('')
    setNewPin(pin)
    setStep('confirm')
  }, [])

  const handleConfirmPin = useCallback(async (pin: string) => {
    if (!user) return

    setError('')

    if (pin !== newPin) {
      setError('Los PINs no coinciden')
      setNewPin('')
      setStep('new')
      return
    }

    setIsSubmitting(true)

    try {
      const pinHash = await hashPin(pin)
      await pb.collection('users').update(user.id, { pin: pinHash })
      setStep('success')
    } catch {
      setError('Error al actualizar PIN')
      setIsSubmitting(false)
    }
  }, [user, newPin, pb])

  const handleInputClear = useCallback(() => {
    if (error) {
      setError('')
    }
  }, [error])

  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  const handlePreviousStep = useCallback(() => {
    if (step === 'confirm') {
      setNewPin('')
      setStep('new')
    } else {
      setStep('verify')
    }
    setError('')
  }, [step])

  const config = STEP_CONFIG[step]

  return (
    <div className="page-wrapper">
      <PageHeader title="Cambiar PIN" subtitle="Actualiza tu codigo de acceso" />

      <main className="change-pin-container">
        <div className="change-pin-content">
          {step === 'success' ? (
            <div className="change-pin-success">
              <div className="change-pin-success-icon">
                <IconCircleCheck className="w-10 h-10" />
              </div>
              <div className="change-pin-header">
                <h2 className="change-pin-title">{config.title}</h2>
                <p className="change-pin-subtitle">{config.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={handleGoBack}
                className="btn btn-primary"
              >
                Volver
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="change-pin-header">
                <h2 className="change-pin-title">{config.title}</h2>
                <p className="change-pin-subtitle">{config.subtitle}</p>
              </div>

              {/* PinPad */}
              <PinPad
                key={step}
                onComplete={
                  step === 'verify'
                    ? handleVerifyCurrentPin
                    : step === 'new'
                    ? handleNewPin
                    : handleConfirmPin
                }
                onInput={handleInputClear}
                disabled={isSubmitting}
                error={error}
              />

              {/* Footer: Step dots + Back link */}
              <div className="change-pin-footer">
                <div className="change-pin-dots">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`change-pin-dot ${
                        num < config.indicator
                          ? 'completed'
                          : num === config.indicator
                          ? 'active'
                          : ''
                      }`}
                    />
                  ))}
                </div>

                {step !== 'verify' && (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="change-pin-back"
                    disabled={isSubmitting}
                  >
                    Paso anterior
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
