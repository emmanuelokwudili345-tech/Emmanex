import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, authApi, type User } from './api'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  error: string | null
  login: (input: { email: string; password: string }) => Promise<void>
  register: (input: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const restoredRef = useRef(false)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const refreshSession = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const currentUser = await authApi.getCurrentUser()
      await authApi.refreshCsrfToken()
      setUser(currentUser)
      setStatus('authenticated')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setUser(null)
        setStatus('unauthenticated')
        return
      }
      setError(cause instanceof Error ? cause.message : 'Unable to restore your session.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (restoredRef.current) {
      return
    }
    restoredRef.current = true
    void refreshSession()
  }, [refreshSession])

  const login = useCallback(async (input: { email: string; password: string }) => {
    setError(null)
    try {
      const signedInUser = await authApi.login(input)
      setUser(signedInUser)
      setStatus('authenticated')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Sign in failed.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const register = useCallback(async (input: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => {
    setError(null)
    try {
      const registeredUser = await authApi.register(input)
      setUser(registeredUser)
      setStatus('authenticated')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Account creation failed.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await authApi.logout()
      setUser(null)
      setStatus('unauthenticated')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Sign out failed.'
      if (cause instanceof ApiError && cause.status === 401) {
        setUser(null)
        setStatus('unauthenticated')
      }
      setError(message)
      throw new Error(message)
    }
  }, [])

  const value = useMemo(
    () => ({ user, status, error, login, register, logout, refreshSession }),
    [user, status, error, login, register, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
