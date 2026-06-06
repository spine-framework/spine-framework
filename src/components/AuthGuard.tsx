import React from 'react'
import { useAuth } from '../contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return fallback || <div>Please sign in to continue</div>
  }

  return <>{children}</>
}
