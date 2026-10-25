import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useAuth } from '../auth/AuthProvider'

export function AccountPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <>
      <SiteHeader />
      <main className="account-page">
        <p className="eyebrow">Your Emmanex</p>
        <h1>Welcome back, {user.firstName}.</h1>
        <p className="account-lead">Your account is ready. We’re still preparing the first collection and order experience.</p>
        <div className="account-grid">
          <section className="account-card">
            <span className="card-kicker">ACCOUNT DETAILS</span>
            <h2>Your profile</h2>
            <dl>
              <div><dt>Name</dt><dd>{user.firstName} {user.lastName}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Account</dt><dd>Customer</dd></div>
            </dl>
          </section>
          <section className="account-card orders-card">
            <span className="card-kicker">COMING SOON</span>
            <h2>Your orders</h2>
            <p>Order history will appear here once the store’s product and order services are available.</p>
            <Link className="text-link" to="/">Back to discover <ArrowRight size={14} aria-hidden="true" /></Link>
          </section>
        </div>
      </main>
      <footer className="site-footer"><Link className="wordmark footer-wordmark" to="/"><span className="wordmark-mark">E</span><span>emmanex</span></Link><span>Good things are on their way.</span><span>© {new Date().getFullYear()} Emmanex</span></footer>
    </>
  )
}

export function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main className="state-screen checkout-placeholder">
        <div className="state-icon" aria-hidden="true"><Sparkles size={22} /></div>
        <p className="eyebrow">Coming soon</p>
        <h1>Checkout is not open yet</h1>
        <p>We’ll enable checkout when product, order, and payment services are ready.</p>
        <Link className="button button-dark" to="/">Back to Emmanex</Link>
      </main>
      <footer className="minimal-footer"><Link to="/"><ArrowLeft size={14} aria-hidden="true" /> Back to Emmanex</Link><span>© {new Date().getFullYear()} Emmanex</span></footer>
    </>
  )
}
