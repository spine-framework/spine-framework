import React, { createContext, useContext, ReactNode } from 'react'
import { SpineClient, SpineConfig } from '../types'

interface SpineContextValue {
  client: SpineClient | null
  config: SpineConfig | null
  loading: boolean
}

const SpineContext = createContext<SpineContextValue | undefined>(undefined)

interface SpineProviderProps {
  children: ReactNode
  config: SpineConfig
}

export function SpineProvider({ children, config }: SpineProviderProps) {
  const [client] = React.useState<SpineClient | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    // Initialize client
    // This would be implemented with actual Supabase client setup
    setLoading(false)
  }, [config])

  const value: SpineContextValue = {
    client,
    config,
    loading
  }

  return (
    <SpineContext.Provider value={value}>
      {children}
    </SpineContext.Provider>
  )
}

export function useSpine(): SpineContextValue {
  const context = useContext(SpineContext)
  if (context === undefined) {
    throw new Error('useSpine must be used within a SpineProvider')
  }
  return context
}
