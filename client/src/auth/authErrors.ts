
type AuthErrorDetails = {
  code?: string
  message?: string
}

function getErrorDetails(error: unknown): AuthErrorDetails {
  if (!error || typeof error !== 'object') {
    return {}
  }

  const candidate = error as Record<string, unknown>

  return {
    code:
      typeof candidate.code === 'string'
        ? candidate.code.toUpperCase()
        : undefined,
    message:
      typeof candidate.message === 'string'
        ? candidate.message
        : undefined,
  }
}

export function getAuthErrorMessage(
  error: unknown,
  action: 'register' | 'login' | 'verify' | 'resend' | 'logout',
): string {
  const { code, message } = getErrorDetails(error)

  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'The email or password is incorrect.'

    case 'EMAIL_NOT_VERIFIED':
      return 'Please verify your email before signing in.'

    case 'INVALID_EMAIL':
      return 'Enter a valid email address.'

    case 'USER_ALREADY_EXISTS':
    case 'EMAIL_ALREADY_EXISTS':
      return 'An account may already exist for this email. Try signing in instead.'

    case 'INVALID_OTP':
    case 'OTP_EXPIRED':
    case 'VERIFICATION_CODE_EXPIRED':
      return 'That verification code is invalid or expired. Request a new code and try again.'

    case 'TOO_MANY_REQUESTS':
      return 'Too many attempts. Please wait a while before trying again.'
  }

  if (
    message &&
    /failed to fetch|network error|network request failed/i.test(message)
  ) {
    return 'We could not connect to the authentication service. Check your connection and try again.'
  }

  switch (action) {
    case 'register':
      return 'We could not complete registration. Please try signing in if you already have an account.'

    case 'login':
      return 'We could not sign you in. Check your details and try again.'

    case 'verify':
      return 'We could not verify your email. Check the code and try again.'

    case 'resend':
      return 'We could not send another verification code. Please try again later.'

    case 'logout':
      return 'We could not complete sign-out. Please try again.'

    default:
      return 'Something went wrong. Please try again.'
  }
}
