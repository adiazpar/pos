/**
 * QR code generation utilities.
 */

import QRCode from 'qrcode'

const QR_CONFIG = {
  width: 160,
  margin: 2,
  color: { dark: '#0F172A', light: '#FFFFFF' },
}

/**
 * Generate a QR code data URL for an invite code.
 * @param inviteCode - The 6-character invite code
 * @returns Promise resolving to a data URL for the QR code image
 */
export async function generateInviteQRCode(inviteCode: string): Promise<string> {
  const registrationUrl = `${window.location.origin}/invite?code=${inviteCode}`
  return QRCode.toDataURL(registrationUrl, QR_CONFIG)
}
