'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface HeaderConfig {
  title: string
  subtitle?: string
  actions?: ReactNode
  showBackButton?: boolean
  onBack?: () => void
  isReturning?: boolean
}

interface HeaderContextType {
  config: HeaderConfig
  setHeader: (config: HeaderConfig) => void
  resetHeader: () => void
}

const defaultConfig: HeaderConfig = {
  title: '',
  subtitle: undefined,
  actions: undefined,
  showBackButton: false,
  onBack: undefined,
  isReturning: false,
}

const HeaderContext = createContext<HeaderContextType | null>(null)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>(defaultConfig)

  const setHeader = useCallback((newConfig: HeaderConfig) => {
    setConfig(newConfig)
  }, [])

  const resetHeader = useCallback(() => {
    setConfig(defaultConfig)
  }, [])

  return (
    <HeaderContext.Provider value={{ config, setHeader, resetHeader }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeaderContext() {
  const context = useContext(HeaderContext)
  if (!context) {
    throw new Error('useHeaderContext must be used within a HeaderProvider')
  }
  return context
}

/**
 * Hook to set the page header configuration.
 * Call this in your page component to set the header title, subtitle, etc.
 * The header will automatically reset when the component unmounts.
 */
export function useHeader(config: HeaderConfig) {
  const { setHeader, resetHeader } = useHeaderContext()

  const { title, subtitle, showBackButton, isReturning, actions, onBack } = config

  useEffect(() => {
    setHeader({ title, subtitle, showBackButton, isReturning, actions, onBack })
    return () => resetHeader()
  }, [title, subtitle, showBackButton, isReturning, actions, onBack, setHeader, resetHeader])
}
