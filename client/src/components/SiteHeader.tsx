import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronRight,
  Heart,
  LogOut,
  Menu,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useCart } from '../features/cart/useCart'

export function SiteHeader() {
  const { user, logout } = useAuth()
  const { itemCount, isLoading: cartLoading } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
      if (event.key !== 'Tab') return

      const focusableElements = menuPanelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusableElements?.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const focusIsOutsideMenu = !menuPanelRef.current?.contains(document.activeElement)

      if (focusIsOutsideMenu) {
        event.preventDefault()
        if (event.shiftKey) {
          lastElement.focus()
        } else {
          firstElement.focus()
        }
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    menuPanelRef.current
      ?.querySelector<HTMLElement>('a, button')
      ?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      menuButtonRef.current?.focus()
    }
  }, [menuOpen])

  async function handleSignOut() {
    setSignOutError(null)

    try {
      await logout()
      setMenuOpen(false)
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Sign out failed.')
    }
  }

  const accountHref = user ? '/account' : '/login'
  const accountLabel = user ? 'Your profile' : 'Sign in to your account'

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <>
      <header className="site-header store-site-header">
        <div className="store-header-brand">
          <button
            ref={menuButtonRef}
            className="store-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="store-navigation-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={22} />}
          </button>
          <Link className="wordmark" to="/" aria-label="Emmanex home">
            <span className="wordmark-mark">E</span>
            <span>Emmanex</span>
          </Link>
        </div>

        <div className="header-actions store-header-actions">
          <Link
            className="header-icon-link"
            to={accountHref}
            aria-label={accountLabel}
            title={accountLabel}
          >
            <UserRound size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>

          <Link
            className="header-bag"
            to="/cart"
            aria-label={
              cartLoading
                ? 'Shopping bag, loading'
                : `Shopping bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
            }
          >
            <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>Bag</span>
            {itemCount > 0 && (
              <span className="bag-count" aria-hidden="true">{itemCount}</span>
            )}
          </Link>
        </div>

        {signOutError && (
          <p className="header-error" role="alert">{signOutError}</p>
        )}
      </header>

      {menuOpen && (
        <div className="store-menu-layer">
          <button
            className="store-menu-backdrop"
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />
          <aside
            ref={menuPanelRef}
            id="store-navigation-menu"
            className="store-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-menu-title"
          >
            <div className="store-menu-heading">
              <div>
                <p className="store-eyebrow">EMMANEX</p>
                <h2 id="store-menu-title">Explore the store</h2>
              </div>
              <button
                className="store-menu-close"
                type="button"
                aria-label="Close navigation menu"
                onClick={closeMenu}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="store-menu-links" aria-label="Store navigation">
              {user && (
                <Link className="store-menu-notification" to="/notifications" onClick={closeMenu}>
                  <span className="store-menu-link-icon"><Bell size={20} /></span>
                  <span className="store-menu-link-copy">
                    <strong>Notifications</strong>
                    <small>Your order updates</small>
                  </span>
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
              )}
              <Link to="/#categories" onClick={closeMenu}>
                Shop by category
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
              <Link to="/#products" onClick={closeMenu}>
                Featured finds
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
              <Link to="/#newsletter" onClick={closeMenu}>
                Our notes
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
              {user && (
                <>
                  <Link to="/wishlist" onClick={closeMenu}>
                    <span><Heart size={18} aria-hidden="true" /> Saved items</span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                  <Link to="/account" onClick={closeMenu}>
                    <span><UserRound size={18} aria-hidden="true" /> Your profile</span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                </>
              )}
            </nav>

            {user ? (
              <button className="store-menu-signout" type="button" onClick={() => void handleSignOut()}>
                <LogOut size={18} aria-hidden="true" />
                Sign out
              </button>
            ) : (
              <div className="store-menu-auth-actions">
                <Link className="store-menu-signup" to="/register" onClick={closeMenu}>
                  Create account
                </Link>
                <Link className="store-menu-signin" to="/login" onClick={closeMenu}>
                  Already have an account? Sign in
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
