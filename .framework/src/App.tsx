import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { DashboardPage } from './pages/DashboardPage'
import { AppWrapper } from './components/AppWrapper'
import { AppsRegistryProvider, useAppsRegistry } from './contexts/AppContext'
import { CustomAppLoader, getInstalledAppSlugs } from './components/CustomAppLoader'
import { GenericAppShell } from './components/app-shell/GenericAppShell'
import { APIPage } from './pages/spine-framework/APIPage'
import { CLIPage } from './pages/spine-framework/CLIPage'

const AdminApp = lazy(() => import('./apps/admin/index'))

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600">Loading Spine...</p>
        </div>
      </div>
    )
  }

  return (
    <AppsRegistryProvider>
      {!user ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <AuthenticatedRouter />
      )}
    </AppsRegistryProvider>
  )
}

function AuthenticatedRouter() {
  const { routableApps: apps, loading } = useAppsRegistry()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600">Loading apps...</p>
        </div>
      </div>
    )
  }

  // Filter to apps that are physically present in this build (custom renderer only —
  // generic apps have no module to load so they're always allowed through).
  const installedSlugs = getInstalledAppSlugs()

  // Sort: explicit prefixes first, root (/) last
  const sorted = [...apps]
    .filter(app => app.slug !== 'spine-framework' && !app.route_prefix?.startsWith('/spine-framework'))
    .filter(app => app.renderer !== 'custom' || installedSlugs.has(app.slug))
    .sort((a, b) => {
      if (a.route_prefix === '/') return 1
      if (b.route_prefix === '/') return -1
      return (b.route_prefix?.length || 0) - (a.route_prefix?.length || 0)
    })

  // When an app is mounted at root it owns all routes — suppress the
  // framework's own /dashboard and catch-all 404 to avoid conflicts.
  const hasRootApp = sorted.some(app => app.route_prefix === '/')

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <Routes>
        {/* Default redirect — suppressed when a root app is installed */}
        {!hasRootApp && <Route path="/" element={<Navigate to="/dashboard" replace />} />}
        {!hasRootApp && <Route path="/dashboard" element={<DashboardPage />} />}

        {/* Login route for authenticated users (redirects to qualified app) */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Spine Framework namespace (reserved — no custom app may use this path) ── */}
        <Route path="/spine-framework/admin/*" element={<AdminApp />} />
        <Route path="/spine-framework/api" element={<APIPage />} />
        <Route path="/spine-framework/cli" element={<CLIPage />} />

        {/* Dynamic app routes */}
        {sorted.map(app => {
          const prefix = app.route_prefix!
          // React Router v6: path="/*" does NOT work for root — must use path="*"
          const routePath = prefix === '/' ? '*' : `${prefix}/*`

          if (app.renderer === 'custom') {
            return (
              <Route
                key={app.slug}
                path={routePath}
                element={
                  <AppWrapper app={app}>
                    <CustomAppLoader slug={app.slug} />
                  </AppWrapper>
                }
              />
            )
          }

          if (app.renderer === 'generic') {
            return (
              <Route
                key={app.slug}
                path={routePath}
                element={
                  <AppWrapper app={app}>
                    <GenericAppShell app={app} />
                  </AppWrapper>
                }
              />
            )
          }

          return null
        })}

        {/* 404 — suppressed when a root app is installed (it handles its own not-found) */}
        {!hasRootApp && <Route path="*" element={<NotFoundPage />} />}
      </Routes>
    </Suspense>
  )
}

export default App
