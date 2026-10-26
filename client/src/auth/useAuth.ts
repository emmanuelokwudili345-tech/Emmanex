
import { createContext, useContext } from 'react'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  error: string | null
  login: (input: {
    email: string
    password: string
  }) => Promise<void>
  register: (input: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
