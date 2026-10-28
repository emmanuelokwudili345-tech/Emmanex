
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from './api'
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

interface ProfileSyncState {
  userId: string
  user: User | null
  error: string | null
}

const profileSyncRequests = new Map<string, Promise<User>>()

function syncProfileOnce(userId: string): Promise<User> {
  const existingRequest = profileSyncRequests.get(userId)

  if (existingRequest) {
    return existingRequest
  }

  const request = authApi.syncProfile()
  profileSyncRequests.set(userId, request)

  void request.finally(() => {
    if (profileSyncRequests.get(userId) === request) {
      profileSyncRequests.delete(userId)
    }
  }).catch(() => {
    // The original request handles the error.
  })

  return request
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = neonAuthClient.useSession()

  const sessionUser = (
    session as
      | { user?: {
          id: string
          email: string
          name?: string | null
          emailVerified?: boolean
        } }
      | null
      | undefined
  )?.user
  const neonUserId =
    sessionUser?.emailVerified === true ? sessionUser.id : null

  const [profileSync, setProfileSync] =
    useState<ProfileSyncState | null>(null)

  useEffect(() => {
    if (!neonUserId) {
      return
    }

    if (profileSync?.userId === neonUserId) {
      return
    }

    let active = true

    void syncProfileOnce(neonUserId)
      .then((profile) => {
        if (active) {
          setProfileSync({
            userId: neonUserId,
            user: profile,
            error: null,
          })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileSync({
            userId: neonUserId,
            user: null,
            error:
              error instanceof Error
                ? error.message
                : 'We could not prepare your customer profile.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [neonUserId, profileSync])

  const user = useMemo<User | null>(() => {
    if (!neonUserId || profileSync?.userId !== neonUserId) {
      return null
    }

    return profileSync.user
  }, [neonUserId, profileSync])

  const syncError =
    neonUserId && profileSync?.userId === neonUserId
      ? profileSync.error
      : null

  const status: AuthStatus = isPending
    ? 'loading'
    : sessionError
      ? 'error'
      : !neonUserId
        ? 'unauthenticated'
        : profileSync?.userId !== neonUserId
          ? 'loading'
          : profileSync.error
            ? 'error'
            : user
              ? 'authenticated'
              : 'error'

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

      setProfileSync(null)
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

      setProfileSync(null)
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

        setProfileSync(null)
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
      const result = await neonAuthClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setProfileSync(null)
          },
        },
      })

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error, 'logout'), {
          cause: result.error,
        })
      }

      setProfileSync(null)
      await refetch()
    },
    [refetch],
  )

  const refreshSession = useCallback(async () => {
    setProfileSync(null)
    await refetch()
  }, [refetch])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error: sessionError?.message ?? syncError,
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
      syncError,
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
