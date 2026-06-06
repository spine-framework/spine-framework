import React from 'react'
import { useAuth } from '../contexts/AuthContext'

interface RoleGuardProps {
  children: React.ReactNode
  roles: string | string[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, roles, fallback }: RoleGuardProps) {
  const { user } = useAuth()
  
  const requiredRoles = Array.isArray(roles) ? roles : [roles]
  const userRoles = user?.role ? [user.role] : []
  
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))

  if (!hasRequiredRole) {
    return fallback || <div>Access denied</div>
  }

  return <>{children}</>
}
