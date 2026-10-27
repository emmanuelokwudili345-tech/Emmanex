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

let csrfToken: string | null = null

async function request<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    csrf?: boolean
    authenticated?: boolean
  } = {},
): Promise<T> {
  const headers = new Headers()

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const token = await getNeonJWTToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else if (options.authenticated) {
    throw new ApiError('Please sign in to continue.', 401)
  }

  if (options.csrf) {
    if (!csrfToken) {
      await refreshCsrfToken()
    }

    if (!csrfToken) {
      throw new Error(
        'Your session needs to be refreshed. Please sign in again.',
      )
    }

    headers.set('X-CSRF-Token', csrfToken)
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | ApiErrorEnvelope
      | null

    if (response.status === 401) {
      csrfToken = null
    }

    throw new ApiError(
      error?.message || 'The request could not be completed.',
      response.status,
    )
  }

  const envelope = (await response.json()) as ApiEnvelope<T>

  return envelope.data
}

async function refreshCsrfToken(): Promise<void> {
  try {
    const result = await request<{ csrfToken: string }>('/auth/csrf')
    csrfToken = result.csrfToken
  } catch (error) {
    csrfToken = null
    throw error
  }
}

export const authApi = {
  async getCurrentUser(): Promise<User> {
    const result = await request<{ user: User }>('/auth/me', {
      authenticated: true,
    })

    return result.user
  },

  refreshCsrfToken,

  async register(input: {
    firstName: string
    lastName: string
    email: string
    password: string
  }): Promise<User> {
    const result = await request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: input,
    })

    csrfToken = null
    await refreshCsrfToken()

    return result.user
  },

  async login(input: {
    email: string
    password: string
  }): Promise<User> {
    const result = await request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: input,
    })

    csrfToken = null
    await refreshCsrfToken()

    return result.user
  },

  async logout(): Promise<void> {
    await request<{ signedOut: boolean }>('/auth/logout', {
      method: 'POST',
      csrf: true,
    })

    csrfToken = null
  },
}