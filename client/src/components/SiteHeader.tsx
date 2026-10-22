import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function SiteHeader() {
  const { user, status, logout } = useAuth()
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await logout()
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Sign out failed.')
    }
  }

  return (
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="Emmanex home">
        <span className="wordmark-mark">E</span>
        <span>emmanex</span>
      </Link>

      <nav className="header-nav" aria-label="Main navigation">
        <Link to="/">Discover</Link>
        {status === 'authenticated' && <Link to="/account">My account</Link>}
      </nav>

      <div className="header-actions">
        {status === 'loading' ? (
          <span className="header-loading" aria-label="Checking sign-in status" />
        ) : user ? (
          <>
            <span className="header-greeting">Hi, {user.firstName}</span>
            <button className="button button-quiet button-small" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link className="header-signin" to="/login">Sign in</Link>
            <Link className="button button-dark button-small" to="/register">Create account</Link>
          </>
        )}
      </div>
      {signOutError && <p className="header-error" role="alert">{signOutError}</p>}
    </header>
  )
}
