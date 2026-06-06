import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { App, AppFilters } from '../types'

interface AppContextValue {
  apps: App[]
  currentApp: App | null
  loading: boolean
  listApps: (filters?: AppFilters) => Promise<App[]>
  installApp: (appSlug: string) => Promise<void>
  uninstallApp: (appSlug: string) => Promise<void>
  setCurrentApp: (app: App | null) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [apps, setApps] = useState<App[]>([])
  const [currentApp, setCurrentApp] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load apps on mount
    loadApps()
  }, [])

  const loadApps = async (_filters?: AppFilters): Promise<App[]> => {
    setLoading(true)
    try {
      // Mock implementation - would call actual API
      const mockApps: App[] = [
        {
          id: 'cortex-app-id',
          slug: 'cortex',
          name: 'Cortex',
          description: 'Unified workspace for CRM, Support, Community, and Knowledge Base',
          version: '1.0.0',
          app_type: 'custom',
          source: 'spine-framework',
          is_active: true,
          is_system: false,
          min_role: 'support',
          config: {},
          nav_items: [],
          route_prefix: '/cortex',
          renderer: 'custom',
          created_at: new Date().toISOString()
        },
        {
          id: 'portal-app-id',
          slug: 'customer-portal',
          name: 'Customer Portal',
          description: 'Self-service portal for customers',
          version: '1.0.0',
          app_type: 'custom',
          source: 'spine-framework',
          is_active: true,
          is_system: false,
          min_role: 'member',
          config: {},
          nav_items: [],
          route_prefix: '/portal',
          renderer: 'custom',
          created_at: new Date().toISOString()
        }
      ]
      setApps(mockApps)
      return mockApps
    } finally {
      setLoading(false)
    }
  }

  const listApps = async (filters?: AppFilters): Promise<App[]> => {
    return loadApps(filters)
  }

  const installApp = async (appSlug: string): Promise<void> => {
    // Implement actual app installation logic
    console.log(`Installing app: ${appSlug}`)
  }

  const uninstallApp = async (appSlug: string): Promise<void> => {
    // Implement actual app uninstallation logic
    console.log(`Uninstalling app: ${appSlug}`)
  }

  const value: AppContextValue = {
    apps,
    currentApp,
    loading,
    listApps,
    installApp,
    uninstallApp,
    setCurrentApp
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApps(): Omit<AppContextValue, 'currentApp' | 'setCurrentApp'> {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApps must be used within an AppProvider')
  }
  return context
}

export function useCurrentApp(): App | null {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useCurrentApp must be used within an AppProvider')
  }
  return context.currentApp
}
