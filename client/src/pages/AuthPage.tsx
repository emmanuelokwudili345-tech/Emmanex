import { useAuth } from '../auth/useAuth'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'
import { useState, type FormEvent } from 'react'

export interface AuthPageProps {
  mode: 'login' | 'register'
}

export function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === 'register'
  const { status, login, register } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/account" replace />
  }
  if (status === 'loading') {
    return (
      <>
        <SiteHeader />
        <main className="state-screen">
          <span className="spinner" aria-hidden="true" />
          <p>Restoring your session…</p>
        </main>
      </>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      if (isRegister) {
        await register({ firstName, lastName, email, password })
      } else {
        await login({ email, password })
      }
      const from = (location.state as { from?: unknown } | null)?.from
      const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
        ? from
        : '/account'
      navigate(destination, { replace: true })
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Please try again.'

      setFormError(message)

      showToast({
        type: 'error',
        title: isRegister ? 'Registration failed' : 'Sign-in failed',
        message,
      })
    } finally {
          setSubmitting(false)
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
            <span className="aside-star" aria-hidden="true"><Sparkles size={38} /></span>
            <span className="aside-dot" />
          </div>
          <p className="eyebrow">Welcome to Emmanex</p>
          <h1>{isRegister ? 'A good thing starts here.' : 'Good to have you back.'}</h1>
          <p>{isRegister
            ? 'Create your account and get ready for a more thoughtful kind of everyday shopping.'
            : 'Sign in to pick up where you left off and keep your Emmanex experience close.'}</p>
          <span className="aside-footnote">GOOD THINGS, CHOSEN WELL.</span>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            <p className="eyebrow">{isRegister ? 'Get started' : 'Your account'}</p>
            <h2>{isRegister ? 'Create an account' : 'Sign in'}</h2>
            <p className="form-intro">
              {isRegister
                ? 'It only takes a moment to make your place.'
                : 'Enter your details to continue.'}
            </p>

            {status === 'error' && (
              <div className="form-alert" role="alert">
                We couldn’t verify your saved session. You can still try signing in.
              </div>
            )}
            {formError && <div className="form-alert" role="alert">{formError}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              {isRegister && (
                <div className="form-row">
                  <label>
                    First name
                    <input
                      autoComplete="given-name"
                      maxLength={100}
                      required
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      autoComplete="family-name"
                      maxLength={100}
                      required
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </label>
                </div>
              )}
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
                Password
                <input
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  type="password"
                  minLength={isRegister ? 12 : 1}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {isRegister && <span className="field-hint">Use at least 12 characters.</span>}
              </label>
              <button className="button button-dark submit-button" type="submit" disabled={submitting}>
                {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
                {!submitting && <ArrowRight size={16} aria-hidden="true" />}
              </button>
              <p className="form-switch">
                {isRegister ? 'Already have an account?' : 'New to Emmanex?'}{' '}
                <Link to={isRegister ? '/login' : '/register'}>
                  {isRegister ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
            </form>
            <p className="privacy-note">
              Your account is protected with secure sign-in and private sessions.
            </p>
          </div>
        </section>
      </main>
      <footer className="minimal-footer"><Link to="/"><ArrowLeft size={14} aria-hidden="true" /> Back to Emmanex</Link><span>© {new Date().getFullYear()} Emmanex</span></footer>
    </>
  )
}
