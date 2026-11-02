import { ArrowLeft, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'

export function CheckoutPage() {
  return (
    <>
      <div className="store-header-shell">
        <SiteHeader />
      </div>

      <main className="state-screen checkout-placeholder">
        <div className="state-icon" aria-hidden="true">
          <Sparkles size={22} />
        </div>
        <p className="eyebrow">Coming soon</p>
        <h1>Checkout is not open yet</h1>
        <p>
          We’ll enable checkout when product, order, and payment services are
          ready.
        </p>
        <Link className="button button-dark" to="/">
          Back to Emmanex
        </Link>
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
