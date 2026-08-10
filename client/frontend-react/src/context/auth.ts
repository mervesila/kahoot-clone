import { createContext, useContext } from 'react'
import type { AuthResult } from '@/lib/types'

export interface AuthContextValue {
  user: AuthResult | null
  isAuthenticated: boolean
  login: (registrationNumber: string, password: string) => Promise<void>
  register: (data: {
    registrationNumber: string
    password: string
    firstName: string
    lastName: string
    department: string
  }) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function readUser(): AuthResult | null {
  const raw = localStorage.getItem('tki_admin_user')
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as AuthResult
  } catch {
    return null
  }
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.')
  }
  return context
}
