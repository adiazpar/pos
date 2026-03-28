import type { IconProps } from './types'

export function CopyIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      {/* SVG content will be pasted here */}
    </svg>
  )
}
