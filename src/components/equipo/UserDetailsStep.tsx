'use client'

import Link from 'next/link'
import { Phone } from 'lucide-react'
import { Modal, useMorphingModal, Spinner } from '@/components/ui'
import { getRoleLabel, getUserInitials } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { formatPhoneForDisplay } from '@/lib/countries'
import type { User } from '@/types'

export interface UserDetailsStepProps {
  member: User
  currentUser: User | null
  canManageTeam: boolean
  pinResetLoading: boolean
  onToggleStatus: () => void
  onResetPin: () => void
}

export function UserDetailsStep({
  member,
  currentUser,
  canManageTeam,
  pinResetLoading,
  onToggleStatus,
  onResetPin,
}: UserDetailsStepProps) {
  const { goToStep } = useMorphingModal()
  const isSelf = member.id === currentUser?.id
  const isManageable = canManageTeam && !isSelf && member.role !== 'owner'

  return (
    <>
      <Modal.Item>
        {/* Member header */}
        <div className="flex items-center gap-3">
          <div className="sidebar-user-avatar w-11 h-11 text-sm">
            {getUserInitials(member.name)}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">{member.name}</h3>
            <div className="text-xs text-text-tertiary mt-0.5">
              {getRoleLabel(member.role)}
              <span className="mx-1.5">·</span>
              <span className={member.status === 'active' ? 'text-success' : 'text-error'}>
                {member.status === 'active' ? 'Activo' : 'Deshabilitado'}
              </span>
            </div>
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        {/* Member details */}
        <div className="space-y-3 p-4 bg-bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Telefono</span>
            <span className="text-sm font-medium">
              {isSelf
                ? formatPhoneForDisplay(member.phoneNumber)
                : `****${member.phoneNumber.slice(-4)}`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Miembro desde</span>
            <span className="text-sm font-medium">
              {formatDate(member.created)}
            </span>
          </div>
        </div>
      </Modal.Item>

      {isManageable && (
        <Modal.Item>
          <div className="space-y-3">
            {/* Change phone button */}
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="btn btn-secondary w-full justify-start gap-3"
            >
              <Phone className="w-5 h-5" />
              <span>Cambiar numero de telefono</span>
            </button>

            {/* Change role button */}
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="btn btn-secondary w-full justify-start gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Cambiar rol</span>
            </button>

            {/* Reset PIN button */}
            <button
              type="button"
              onClick={onResetPin}
              disabled={pinResetLoading || member.pinResetRequired}
              className="btn btn-secondary w-full justify-start gap-3"
            >
              {pinResetLoading ? (
                <Spinner />
              ) : member.pinResetRequired ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 16.5854C13.5 17.4138 12.8284 18.0854 12 18.0854C11.1716 18.0854 10.5 17.4138 10.5 16.5854C10.5 15.7569 11.1716 15.0854 12 15.0854C12.8284 15.0854 13.5 15.7569 13.5 16.5854Z" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.33367 10C6.20971 9.64407 6.09518 9.27081 5.99836 8.88671C5.69532 7.68444 5.54485 6.29432 5.89748 4.97439C6.26228 3.60888 7.14664 2.39739 8.74323 1.59523C10.3398 0.793061 11.8397 0.806642 13.153 1.32902C14.4225 1.83396 15.448 2.78443 16.2317 3.7452C16.4302 3.98851 16.6166 4.23669 16.7907 4.48449C17.0806 4.89706 16.9784 5.45918 16.5823 5.7713C16.112 6.14195 15.4266 6.01135 15.0768 5.52533C14.9514 5.35112 14.8197 5.17831 14.6819 5.0094C14.0088 4.18414 13.2423 3.51693 12.4138 3.18741C11.6292 2.87533 10.7252 2.83767 9.64112 3.38234C8.55703 3.92702 8.04765 4.6748 7.82971 5.49059C7.5996 6.35195 7.6774 7.36518 7.93771 8.39788C8.07953 8.96054 8.26936 9.50489 8.47135 10H18C19.6569 10 21 11.3431 21 13V20C21 21.6569 19.6569 23 18 23H6C4.34315 23 3 21.6569 3 20V13C3 11.3431 4.34315 10 6 10H6.33367ZM19 13C19 12.4477 18.5523 12 18 12H6C5.44772 12 5 12.4477 5 13V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V13Z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 16.5854C13.5 17.4138 12.8284 18.0854 12 18.0854C11.1716 18.0854 10.5 17.4138 10.5 16.5854C10.5 15.7569 11.1716 15.0854 12 15.0854C12.8284 15.0854 13.5 15.7569 13.5 16.5854Z" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.94209 10.0005C5.93921 9.87333 5.9375 9.73733 5.9375 9.59375C5.9375 8.70739 6.00254 7.50382 6.27381 6.28307C6.54278 5.07271 7.03242 3.76302 7.94009 2.74189C8.8791 1.6855 10.2132 1 12 1C13.7868 1 15.1209 1.6855 16.0599 2.74189C16.9676 3.76302 17.4572 5.07271 17.7262 6.28307C17.9975 7.50382 18.0625 8.70739 18.0625 9.59375C18.0625 9.73733 18.0608 9.87333 18.0579 10.0005C19.688 10.0314 21 11.3625 21 13V20C21 21.6569 19.6569 23 18 23H6C4.34315 23 3 21.6569 3 20V13C3 11.3625 4.31196 10.0314 5.94209 10.0005ZM16.0573 10C16.0605 9.87465 16.0625 9.73868 16.0625 9.59375C16.0625 8.79261 16.0025 7.74618 15.7738 6.71693C15.5428 5.67729 15.1574 4.73698 14.5651 4.07061C14.0041 3.4395 13.2132 3 12 3C10.7868 3 9.9959 3.4395 9.43491 4.07061C8.84258 4.73698 8.45722 5.67729 8.22619 6.71693C7.99747 7.74618 7.9375 8.79261 7.9375 9.59375C7.9375 9.73868 7.93946 9.87465 7.94265 10H16.0573ZM19 13C19 12.4477 18.5523 12 18 12H6C5.44772 12 5 12.4477 5 13V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V13Z" />
                </svg>
              )}
              <span>{member.pinResetRequired ? 'PIN reset pendiente' : 'Forzar reset de PIN'}</span>
            </button>

            {/* PIN reset explanation */}
            {member.pinResetRequired && (
              <p className="text-xs text-text-tertiary">
                El usuario debera crear un nuevo PIN la proxima vez que inicie sesion.
              </p>
            )}

            {/* Toggle status button */}
            <button
              type="button"
              onClick={onToggleStatus}
              className={`btn w-full justify-start gap-3 ${
                member.status === 'active'
                  ? 'btn-ghost text-error hover:bg-error-subtle'
                  : 'btn-secondary'
              }`}
            >
              {member.status === 'active' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>Deshabilitar cuenta</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Habilitar cuenta</span>
                </>
              )}
            </button>

            {/* Status explanation */}
            {member.status === 'disabled' && (
              <p className="text-xs text-text-tertiary">
                Este usuario no puede iniciar sesion mientras su cuenta este deshabilitada.
              </p>
            )}
          </div>
        </Modal.Item>
      )}

      {/* Self view hint */}
      {isSelf && (
        <Modal.Item>
          <p className="text-xs text-text-tertiary text-center">
            Para cambiar tu numero de telefono, ve a{' '}
            <Link href="/ajustes" className="text-brand hover:underline">
              Configuracion
            </Link>.
          </p>
        </Modal.Item>
      )}
    </>
  )
}
