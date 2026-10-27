import {
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { neonAuthClient } from './neonAuthClient'
import { getAuthErrorMessage } from './authErrors'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type User,
} from './useAuth'

interface AuthProviderProps {
  children: ReactNode
}

function getUserName(name: string | null | undefined) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = neonAuthClient.useSession()

  const user = useMemo<User | null>(() => {
    const sessionUser = session?.user

    if (!sessionUser || sessionUser.emailVerified !== true) {
      return null
    }

    return {
      id: sessionUser.id,
      email: sessionUser.email,
      ...getUserName(sessionUser.name),
      role: 'customer',
    }
  }, [session?.user])

  const status: AuthStatus = isPending
    ? 'loading'
    : sessionError
      ? 'error'
      : user
        ? 'authenticated'
        : 'unauthenticated'

  const login: AuthContextValue['login'] = useCallback(
    async ({ email, password }) => {
      const result = await neonAuthClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      })

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error, 'login'), {
          cause: result.error,
        })
      }

      await refetch()
    },
    [refetch],
  )

  const register: AuthContextValue['register'] = useCallback(
    async ({ firstName, lastName, email, password }) => {
      const name = `${firstName} ${lastName}`.trim()

      const result = await neonAuthClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name,
      })

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error, 'register'), {
          cause: result.error,
        })
      }

      await refetch()
    },
    [refetch],
  )

  const verifyEmailCode: AuthContextValue['verifyEmailCode'] =
    useCallback(
      async ({ email, otp }) => {
        const result = await neonAuthClient.emailOtp.verifyEmail({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        })

        if (result.error) {
          throw new Error(getAuthErrorMessage(result.error, 'verify'), {
            cause: result.error,
          })
        }

        await refetch()
      },
      [refetch],
    )

  const resendVerificationCode: AuthContextValue['resendVerificationCode'] =
    useCallback(async (email) => {
      const result =
        await neonAuthClient.emailOtp.sendVerificationOtp({
          email: email.trim().toLowerCase(),
          type: 'email-verification',
        })

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error, 'resend'), {
          cause: result.error,
        })
      }
    }, [])

  const logout: AuthContextValue['logout'] = useCallback(
    async () => {
      const result = await neonAuthClient.signOut()

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error, 'logout'), {
          cause: result.error,
        })
      }

      await refetch()
    },
    [refetch],
  )

  const refreshSession = useCallback(async () => {
    await refetch()
  }, [refetch])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error: sessionError?.message ?? null,
      login,
      register,
      verifyEmailCode,
      resendVerificationCode,
      logout,
      refreshSession,
    }),
    [
      user,
      status,
      sessionError,
      login,
      register,
      verifyEmailCode,
      resendVerificationCode,
      logout,
      refreshSession,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}