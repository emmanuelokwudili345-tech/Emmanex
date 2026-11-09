import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { neonAuthClient } from '../auth/neonAuthClient'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const linkError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (token && password !== confirmation) {
      showToast({ type: 'error', title: 'Passwords do not match', message: 'Enter the same password in both fields.' })
      return
    }

    setSubmitting(true)
    try {
      const result = token
        ? await neonAuthClient.resetPassword({ newPassword: password, token })
        : await neonAuthClient.requestPasswordReset({
            email: email.trim().toLowerCase(),
            redirectTo: `${window.location.origin}/forgot-password`,
          })
      if (result.error) throw new Error(result.error.message)
      if (token) {
        setMessage('Your password has been reset. You can now sign in.')
        setPassword('')
        setConfirmation('')
        showToast({ type: 'success', title: 'Password reset', message: 'You can now sign in with your new password.' })
      } else {
        setMessage('If an account matches that email, a password reset link will be sent.')
        showToast({ type: 'success', title: 'Check your email', message: 'If an account matches that email, a reset link will be sent.' })
      }
    } catch (cause) {
      showToast({
        type: 'error',
        title: 'Password reset failed',
        message: cause instanceof Error ? cause.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetLinkInvalid = !token && linkError

  return (
    <>
      <SiteHeader />
      <main className="auth-layout">
        <aside className="auth-aside">
          <p className="eyebrow">Emmanex account</p>
          <h1>{token ? 'Choose a new password.' : 'Let’s get you back in.'}</h1>
          <p>{token ? 'Set a new password to get back to your account.' : 'We’ll email you a secure link to reset your password.'}</p>
        </aside>
        <section className="auth-panel">
          <div className="auth-panel-inner">
            <p className="eyebrow">Password recovery</p>
            <h2>{token ? 'Reset password' : 'Forgot password?'}</h2>
            {resetLinkInvalid && <div className="form-alert" role="alert">This reset link is invalid or expired. Request a new one below.</div>}
            {!(token && message) && (
              <form className="auth-form" onSubmit={handleSubmit}>
                {!token ? (
                  <label>Email address<input autoComplete="email" type="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                ) : (
                  <>
                    <label>New password<input autoComplete="new-password" type="password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} /><span className="field-hint">Use at least 8 characters.</span></label>
                    <label>Confirm new password<input autoComplete="new-password" type="password" minLength={8} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
                  </>
                )}
                <button className="button button-dark submit-button" type="submit" disabled={submitting}>
                  {submitting ? 'Please wait…' : token ? 'Reset password' : 'Send reset link'}
                  {!submitting && <ArrowRight size={16} aria-hidden="true" />}
                </button>
              </form>
            )}
            <p className="form-switch"><Link to="/login">Back to sign in</Link></p>
          </div>
        </section>
      </main>
      <footer className="minimal-footer"><Link to="/"><ArrowLeft size={14} aria-hidden="true" />Back to Emmanex</Link></footer>
    </>
  )
}
