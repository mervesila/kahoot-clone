import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setToken } from '@/lib/api'
import { AuthContext, readUser, type AuthContextValue } from '@/context/auth'
import type { AuthResult } from '@/lib/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResult | null>(readUser)

  useEffect(() => {
    setUser(readUser())
  }, [])

  const applyAuth = useCallback((result: AuthResult) => {
    setToken(result.token)
    localStorage.setItem('tki_admin_user', JSON.stringify(result))
    setUser(result)
  }, [])

  const login = useCallback(
    async (registrationNumber: string, password: string) => {
      const result = await api.login({ registrationNumber, password })
      applyAuth(result)
    },
    [applyAuth],
  )

  const register = useCallback(
    async (data: {
      registrationNumber: string
      password: string
      firstName: string
      lastName: string
      department: string
    }) => {
      const result = await api.register(data)
      applyAuth(result)
    },
    [applyAuth],
  )

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem('tki_admin_user')
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
