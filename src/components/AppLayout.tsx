import React from 'react'
import { useCurrentApp } from '../contexts/AppContext'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const app = useCurrentApp()

  return (
    <div className="spine-app-layout">
      <header className="spine-app-header">
        <h1>{app?.name || 'Spine App'}</h1>
      </header>
      <main className="spine-app-main">
        {children}
      </main>
    </div>
  )
}
