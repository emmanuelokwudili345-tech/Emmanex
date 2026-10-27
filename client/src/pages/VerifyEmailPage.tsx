import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, MailCheck } from 'lucide-react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { getAuthErrorMessage } from '../auth/authErrors'
import { useAuth } from '../auth/useAuth'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'

interface VerifyEmailLocationState {
  email?: unknown
}

export function VerifyEmailPage() {
  const { status, verifyEmailCode, resendVerificationCode } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  const routeState = location.state as VerifyEmailLocationState | null
  const initialEmail =
    typeof routeState?.email === 'string' ? routeState.email : ''

  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/account" replace />
  }

  if (status === 'loading') {
    return (
      <>
        <SiteHeader />
        <main className="state-screen">
          <span className="spinner" aria-hidden="true" />
          <p>Checking your session…</p>
        </main>
      </>
    )
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setVerifying(true)

    const normalizedEmail = email.trim().toLowerCase()

    try {
      await verifyEmailCode({
        email: normalizedEmail,
        otp: otp.trim(),
      })

      showToast({
        type: 'success',
        title: 'Email verified',
        message: 'Your email has been verified successfully.',
      })

      navigate('/login', {
        replace: true,
        state: {
          email: normalizedEmail,
          verified: true,
        },
      })
    } catch (cause) {
      const message = getAuthErrorMessage(cause, 'verify')

      setFormError(message)

      showToast({
        type: 'error',
        title: 'Verification failed',
        message,
      })
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    setFormError(null)
    setResending(true)

    try {
      await resendVerificationCode(email.trim().toLowerCase())

      showToast({
        type: 'success',
        title: 'Code requested',
        message: 'Check your inbox for a new verification code.',
      })
    } catch (cause) {
      const message = getAuthErrorMessage(cause, 'resend')

      setFormError(message)

      showToast({
        type: 'error',
        title: 'Could not resend code',
        message,
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="auth-layout">
        <aside className="auth-aside">
          <div className="auth-aside-art" aria-hidden="true">
            <div className="aside-ring" />
            <div className="aside-shape">E</div>
          </div>

          <p className="eyebrow">One last step</p>
          <h1>Let’s make it official.</h1>
          <p>
            Confirm your email address to help keep your Emmanex account
            secure.
          </p>

          <span className="aside-footnote">
            GOOD THINGS, CHOSEN WELL.
          </span>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            <div className="verification-icon" aria-hidden="true">
              <MailCheck size={27} />
            </div>

            <p className="eyebrow">Email verification</p>
            <h2>Check your inbox</h2>

            <p className="form-intro">
              If you just created an account, enter the six-digit verification code sent to your email. If you already have an Emmanex account, sign in instead.
            </p>

            {formError && (
              <div className="form-alert" role="alert">
                {formError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleVerify}>
              <label>
                Email address
                <input
                  autoComplete="email"
                  type="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label>
                Verification code
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  type="text"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  placeholder="000000"
                  required
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value.replace(/\D/g, '').slice(0, 6),
                    )
                  }
                />
              </label>

              <button
                className="button button-dark submit-button"
                type="submit"
                disabled={verifying || resending}
              >
                {verifying ? 'Verifying…' : 'Verify email'}
                {!verifying && (
                  <ArrowRight size={16} aria-hidden="true" />
                )}
              </button>

              <button
                className="button button-outline submit-button"
                type="button"
                disabled={verifying || resending || !email.trim()}
                onClick={() => void handleResend()}
              >
                {resending ? 'Requesting code…' : 'Resend verification code'}
              </button>

              <p className="form-switch">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </form>

            <p className="privacy-note">
              If the email doesn't arrive, check your spam folder or request
              another code.
            </p>
          </div>
        </section>
      </main>

      <footer className="minimal-footer">
        <Link to="/">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to Emmanex
        </Link>
        <span>© {new Date().getFullYear()} Emmanex</span>
      </footer>
    </>
  )
}
