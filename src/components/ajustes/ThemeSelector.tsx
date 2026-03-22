'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { THEME_CONFIG } from '@/hooks'

type Theme = 'light' | 'dark' | 'system'

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

const THEME_PREVIEW_CLASSES = {
  light: 'theme-option-preview-light',
  dark: 'theme-option-preview-dark',
  system: 'theme-option-preview-system',
} as const

export interface ThemeSelectorProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
  description: string
}

export function ThemeSelector({
  theme,
  onThemeChange,
  description,
}: ThemeSelectorProps) {
  return (
    <div className="space-y-3">
      <span className="text-sm font-medium text-text-secondary block">Tema</span>
      <div className="theme-options">
        {(Object.keys(THEME_CONFIG) as Theme[]).map((key) => {
          const config = THEME_CONFIG[key]
          const Icon = THEME_ICONS[key]
          const isActive = theme === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onThemeChange(key)}
              className={`theme-option ${isActive ? 'theme-option-active' : ''}`}
              aria-pressed={isActive}
            >
              <div className={`theme-option-preview ${THEME_PREVIEW_CLASSES[key]}`}>
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
      <p className="text-xs text-text-tertiary">{description}</p>
    </div>
  )
}
