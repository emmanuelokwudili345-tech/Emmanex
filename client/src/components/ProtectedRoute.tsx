import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function ProtectedRoute() {
  const { status, refreshSession } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="state-screen">
        <span className="spinner" aria-hidden="true" />
        <p>Restoring your session…</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="state-screen">
        <div className="state-icon">!</div>
        <h1>We couldn’t verify your session</h1>
        <p>Check your connection and try again.</p>
        <button className="button button-dark" onClick={() => void refreshSession()}>
          Try again
        </button>
      </main>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
