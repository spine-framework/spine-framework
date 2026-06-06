import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { User, AuthResult } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    // This would be implemented with actual Supabase auth
    setLoading(false)
  }, [])

  const signIn = async (email: string, _password: string): Promise<AuthResult> => {
    // Implement actual sign in logic
    const mockUser: User = {
      id: 'mock-user-id',
      email,
      name: 'Mock User',
      account_id: 'mock-account-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setUser(mockUser)
    return {
      user: mockUser,
      session: { /* mock session */ }
    }
  }

  const signUp = async (email: string, _password: string, name?: string): Promise<AuthResult> => {
    // Implement actual sign up logic
    const mockUser: User = {
      id: 'mock-user-id',
      email,
      name: name || 'Mock User',
      account_id: 'mock-account-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setUser(mockUser)
    return {
      user: mockUser,
      session: { /* mock session */ }
    }
  }

  const signOut = async (): Promise<void> => {
    setUser(null)
  }

  const value: AuthContextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
