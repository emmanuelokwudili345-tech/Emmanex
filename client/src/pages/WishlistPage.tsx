import { ArrowLeft, Heart } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useToast } from '../components/useToast'
import { SiteHeader } from '../components/SiteHeader'
import { useCart } from '../features/cart/useCart'
import { ProductCard } from '../features/products/ProductCard'
import { ProductGridSkeleton } from '../features/products/ProductGrid'
import { useWishlist } from '../features/wishlist/useWishlist'

export function WishlistPage() {
  const { user } = useAuth()
  const { items, isLoading, loadError, refreshWishlist, toggleItem } = useWishlist()
  const { addItem } = useCart()
  const { showToast } = useToast()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/wishlist' }} />
  }

  function handleRemove(productName: string) {
    showToast({
      type: 'info',
      title: 'Removed from wishlist',
      message: productName,
    })
  }

  function handleAddToBag(productName: string) {
    showToast({
      type: 'success',
      title: 'Added to your bag',
      message: productName,
    })
  }

  return (
    <>
      <title>Wishlist</title>
      <div className="store-header-shell">
        <SiteHeader />
      </div>

      <main className="shopping-page wishlist-page">
        <Link className="shopping-back-link" to="/">
          <ArrowLeft size={15} />
          Continue shopping
        </Link>

        <div className="shopping-page-heading">
          <div>
            <p className="store-eyebrow">YOUR SAVED FINDS</p>
            <h1>Wishlist</h1>
          </div>
          <span>{isLoading ? 'Loading…' : loadError && items.length === 0 ? 'Unavailable' : `${items.length} saved`}</span>
        </div>

        {isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : loadError && items.length === 0 ? (
          <section className="shopping-empty" role="alert">
            <Heart size={32} />
            <h2>We couldn’t load your wishlist</h2>
            <p>{loadError}</p>
            <button className="button button-dark" type="button" onClick={() => void refreshWishlist().catch(() => undefined)}>
              Try again
            </button>
          </section>
        ) : (
          <>
            {loadError && (
              <div className="form-alert" role="alert">
                <p>We couldn’t refresh your wishlist. {loadError}</p>
                <button type="button" onClick={() => void refreshWishlist().catch(() => undefined)}>
                  Try again
                </button>
              </div>
            )}
            {items.length === 0 ? (
              <section className="shopping-empty">
                <Heart size={32} />
                <h2>Your wishlist is empty</h2>
                <p>Save products you would like to come back to.</p>
                <Link className="button button-dark" to="/">
                  Explore the collection
                </Link>
              </section>
            ) : (
              <div className="product-grid">
                {items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    saved
                    onToggleWishlist={(item) => {
                      void toggleItem(item).then(() => handleRemove(item.name)).catch((error: unknown) => {
                        showToast({ type: 'error', title: 'Wishlist could not be updated', message: error instanceof Error ? error.message : 'Please try again.' })
                      })
                    }}
                    onAddToBag={(item) => {
                      void addItem(item).then(() => handleAddToBag(item.name)).catch((error: unknown) => {
                        showToast({ type: 'error', title: 'Could not add product', message: error instanceof Error ? error.message : 'Please try again.' })
                      })
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="minimal-footer">
        <Link to="/">
          <ArrowLeft size={14} />
          Back to Emmanex
        </Link>
        <span>Saved to your Emmanex account</span>
      </footer>
    </>
  )
}
