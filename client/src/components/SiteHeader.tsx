import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, LogOut, ShoppingBag, UserRound } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useCart } from '../features/cart/useCart'

export function SiteHeader() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function handleSignOut() {
    setSignOutError(null)

    try {
      await logout()
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : 'Sign out failed.',
      )
    }
  }

  const accountHref = user ? '/account' : '/login'
  const accountLabel = user ? 'Your account' : 'Sign in to your account'

  return (
    <header className="site-header store-site-header">
      <Link className="wordmark" to="/" aria-label="Emmanex home">
        <span className="wordmark-mark">E</span>
        <span>Emmanex</span>
      </Link>

      <nav className="header-nav store-header-nav" aria-label="Main navigation">
        <Link to="/#categories">Categories</Link>
        <Link to="/#products">Featured finds</Link>
        <Link to="/#newsletter">Our notes</Link>
      </nav>

      <div className="header-actions store-header-actions">
        <Link
          className="header-icon-link"
          to={accountHref}
          aria-label={accountLabel}
          title={accountLabel}
        >
          <UserRound size={20} strokeWidth={1.8} aria-hidden="true" />
        </Link>

        {user && (
          <button
            className="header-icon-link header-icon-button"
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}

        {user && (
          <Link className="header-icon-link" to="/wishlist" aria-label="Wishlist" title="Wishlist">
            <Heart size={19} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        )}

        <Link
          className="header-bag"
          to="/cart"
          aria-label={`Shopping bag, ${itemCount} ${
            itemCount === 1 ? 'item' : 'items'
          }`}
        >
          <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>Bag</span>
          {itemCount > 0 && (
            <span className="bag-count" aria-hidden="true">
              {itemCount}
            </span>
          )}
        </Link>
      </div>

      {signOutError && (
        <p className="header-error" role="alert">
          {signOutError}
        </p>
      )}
    </header>
  )
}