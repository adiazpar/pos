'use client'

import { useRef, useState, useEffect } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'

interface LottiePlayerProps {
  src: string
  loop?: boolean
  autoplay?: boolean
  speed?: number
  delay?: number // Delay in ms before playing (useful for modal transitions)
  className?: string
  style?: React.CSSProperties
  onComplete?: () => void
}

export function LottiePlayer({
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  delay = 0,
  className,
  style,
  onComplete
}: LottiePlayerProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const hasCalledComplete = useRef(false)
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [shouldPlay, setShouldPlay] = useState(delay === 0)

  // Convert .lottie paths to .json paths and fetch the data
  const jsonPath = src.replace(/\.lottie$/, '.json')

  useEffect(() => {
    let cancelled = false

    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setAnimationData(data)
        }
      })
      .catch(err => {
        console.error('Failed to load Lottie animation:', err)
      })

    return () => {
      cancelled = true
    }
  }, [jsonPath])

  // Handle delayed autoplay
  useEffect(() => {
    if (delay > 0 && autoplay) {
      const timer = setTimeout(() => {
        setShouldPlay(true)
        // Manually trigger play after delay
        if (lottieRef.current) {
          lottieRef.current.play()
        }
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, autoplay])

  useEffect(() => {
    if (lottieRef.current && speed !== 1) {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed, animationData])

  const handleComplete = () => {
    if (hasCalledComplete.current) return
    hasCalledComplete.current = true
    onComplete?.()
  }

  if (!animationData) {
    return null
  }

  // If delay is set and we haven't reached the play time yet, don't autoplay
  const effectiveAutoplay = autoplay && shouldPlay

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={effectiveAutoplay}
      className={className}
      style={style}
      onComplete={handleComplete}
      rendererSettings={{
        preserveAspectRatio: 'xMidYMid slice'
      }}
    />
  )
}
