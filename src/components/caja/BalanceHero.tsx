'use client'

import { useEffect, useState, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

interface BalanceHeroProps {
  balance: number
  label?: string
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    amount: number
  }
  lastMovementType?: 'ingreso' | 'retiro' | null
}

export function BalanceHero({
  balance,
  label = 'Saldo actual',
  trend,
  lastMovementType
}: BalanceHeroProps) {
  // Start from 0 for initial count-up animation
  const [displayBalance, setDisplayBalance] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pulseClass, setPulseClass] = useState('')
  const prevBalanceRef = useRef<number | null>(null)
  const hasAnimatedInitial = useRef(false)

  // Animate balance - both initial load and changes
  useEffect(() => {
    // Skip if balance is the same as previous (and we've already animated)
    if (hasAnimatedInitial.current && balance === prevBalanceRef.current) {
      return
    }

    setIsUpdating(true)

    // Trigger pulse effect based on movement type (only for changes, not initial)
    if (hasAnimatedInitial.current && lastMovementType) {
      setPulseClass(lastMovementType)
      setTimeout(() => setPulseClass(''), 400)
    }

    // Animate the number
    const startValue = hasAnimatedInitial.current ? (prevBalanceRef.current ?? 0) : 0
    const endValue = balance
    const duration = hasAnimatedInitial.current ? 300 : 800 // Longer duration for initial
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * eased

      setDisplayBalance(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayBalance(endValue)
        setIsUpdating(false)
        hasAnimatedInitial.current = true
      }
    }

    requestAnimationFrame(animate)
    prevBalanceRef.current = balance
  }, [balance, lastMovementType])

  const formattedBalance = formatCurrency(displayBalance)
  // Extract just the numeric amount (remove S/ prefix)
  const amount = formattedBalance.replace('S/', '').trim()

  return (
    <div className="balance-hero-container">
      {/* Animated background glow */}
      <div className="balance-glow" />

      {/* Main balance display */}
      <div className={`balance-pulse ${pulseClass}`}>
        <div className={`balance-hero ${isUpdating ? 'updating' : ''}`}>
          <span style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginRight: 'var(--space-2)'
          }}>
            S/
          </span>
          <span>
            {amount}
          </span>
        </div>
      </div>

      {/* Label and trend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'var(--space-3)'
      }}>
        <span style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)'
        }}>
          {label}
        </span>

        {trend && trend.direction !== 'neutral' && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: trend.direction === 'up'
              ? 'var(--color-success)'
              : 'var(--color-error)'
          }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{
                transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none'
              }}
            >
              <path d="M7 14l5-5 5 5z" />
            </svg>
            {formatCurrency(Math.abs(trend.amount))} hoy
          </span>
        )}
      </div>
    </div>
  )
}
