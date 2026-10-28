
import { getNeonJWTToken } from './neonAuthClient'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface ApiEnvelope<T> {
  status: 'success'
  message: string
  data: T
}

interface ApiErrorEnvelope {
  status?: 'error'
  message?: string
}

interface ProfileResponse {
  user?: User
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/$/, '')

export const authApi = {
  async syncProfile(): Promise<User> {
    const token = await getNeonJWTToken()

    if (!token) {
      throw new ApiError(
        'Your authentication session has expired. Please sign in again.',
        401,
      )
    }

    const response = await fetch(`${apiBaseUrl}/auth/profile`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as
        | ApiErrorEnvelope
        | null

      throw new ApiError(
        error?.message || 'We could not prepare your customer profile.',
        response.status,
      )
    }

    const envelope = (await response.json()) as ApiEnvelope<ProfileResponse>
    const profile = envelope.data.user ?? envelope.data

    if (
      typeof profile.id !== 'string' ||
      typeof profile.firstName !== 'string' ||
      typeof profile.lastName !== 'string' ||
      typeof profile.email !== 'string' ||
      typeof profile.role !== 'string'
    ) {
      throw new Error(
        'The server returned an invalid customer profile. Please try again.',
      )
    }

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      role: profile.role,
    }
  },
}
