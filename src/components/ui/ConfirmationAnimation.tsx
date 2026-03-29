'use client'

import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'

interface ConfirmationAnimationProps {
  type: 'success' | 'error'
  triggered: boolean
  title: string
  subtitle?: string
}

/**
 * Animated confirmation feedback for modal success/error steps.
 *
 * Uses Lottie animations with delayed start to sync with modal transitions.
 * Text fades in with the animation.
 *
 * @example
 * ```tsx
 * <ConfirmationAnimation
 *   type="success"
 *   triggered={productSaved}
 *   title="Product saved!"
 *   subtitle="The product has been updated successfully"
 * />
 * ```
 */
export function ConfirmationAnimation({
  type,
  triggered,
  title,
  subtitle,
}: ConfirmationAnimationProps) {
  const animationSrc = type === 'success'
    ? '/animations/success.json'
    : '/animations/error.json'

  return (
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {triggered && (
          <LottiePlayer
            src={animationSrc}
            loop={false}
            autoplay={true}
            delay={500}
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
        style={{ opacity: triggered ? 1 : 0 }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
          style={{ opacity: triggered ? 1 : 0 }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
