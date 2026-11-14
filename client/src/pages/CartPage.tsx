import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'
import { useCart } from '../features/cart/useCart'
import { CartItemRow } from '../features/cart/CartItemRow'
import { CartSummary } from '../features/cart/CartSummary'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function CartPage() {
  const {
    items,
    subtotal,
    updateQuantity,
    removeItem,
    isLoading,
    loadError,
    refreshCart,
  } = useCart()
  const { showToast } = useToast()

  async function handleRefreshCart() {
    try {
      await refreshCart()
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Could not refresh your bag',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function handleQuantityChange(productId: string, quantity: number) {
    try {
      await updateQuantity(productId, quantity)
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Could not update quantity',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function handleRemoveItem(productName: string, productId: string) {
    try {
      await removeItem(productId)
      showToast({
        type: 'success',
        title: 'Removed from your bag',
        message: productName,
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Could not remove product',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  return (
    <>
      <title>Cart</title>
      <div className="store-header-shell">
        <SiteHeader />
      </div>
      <main className="shopping-page">
        <Link className="shopping-back-link" to="/">
          <ArrowLeft size={15} />
          Continue shopping
        </Link>
        <div className="shopping-page-heading">
          <div>
            <p className="store-eyebrow">YOUR SELECTION</p>
            <h1>Shopping bag</h1>
          </div>
          <span>{isLoading ? 'Loading…' : `${items.length} ${items.length === 1 ? 'product' : 'products'}`}</span>
        </div>

        {isLoading ? (
          <div className="shopping-layout cart-loading-skeleton" role="status" aria-label="Loading your shopping bag" aria-busy="true">
            <section className="shopping-items" aria-hidden="true">
              {Array.from({ length: 2 }, (_, index) => (
                <article className="shopping-item" key={index}>
                  <LoadingSkeleton className="cart-skeleton-image" />
                  <div className="cart-skeleton-copy">
                    <LoadingSkeleton className="cart-skeleton-line cart-skeleton-short" />
                    <LoadingSkeleton className="cart-skeleton-line cart-skeleton-name" />
                    <LoadingSkeleton className="cart-skeleton-line cart-skeleton-price" />
                    <LoadingSkeleton className="cart-skeleton-quantity" />
                  </div>
                  <LoadingSkeleton className="cart-skeleton-remove" />
                </article>
              ))}
            </section>
            <aside className="shopping-summary cart-skeleton-summary" aria-hidden="true">
              <LoadingSkeleton className="cart-skeleton-line cart-skeleton-short" />
              <LoadingSkeleton className="cart-skeleton-line" />
              <LoadingSkeleton className="cart-skeleton-line cart-skeleton-button" />
            </aside>
          </div>
        ) : loadError && items.length === 0 ? (
          <section className="shopping-empty" role="alert">
            <ShoppingBag size={32} />
            <h2>We couldn’t load your bag</h2>
            <p>{loadError}</p>
            <button className="button button-dark" type="button" onClick={() => void handleRefreshCart()}>
              Try again
            </button>
          </section>
        ) : items.length === 0 ? (
          <section className="shopping-empty">
            <ShoppingBag size={32} />
            <h2>Your bag is waiting</h2>
            <p>When you find something you love, add it here.</p>
            <Link className="button button-dark" to="/">Explore the collection</Link>
          </section>
        ) : (
          <>
            {loadError && (
              <div className="form-alert" role="alert">
                <p>We couldn’t refresh your bag. {loadError}</p>
                <button type="button" onClick={() => void handleRefreshCart()}>
                  Try again
                </button>
              </div>
            )}
            <div className="shopping-layout">
              <section className="shopping-items" aria-label="Items in your bag">
                {items.map((item) => (
                  <CartItemRow
                    key={item.product.id}
                    item={item}
                    onDecrease={() => void handleQuantityChange(item.product.id, item.quantity - 1)}
                    onIncrease={() => void handleQuantityChange(item.product.id, item.quantity + 1)}
                    onRemove={() => void handleRemoveItem(item.product.name, item.product.id)}
                  />
                ))}
              </section>
              <CartSummary subtotal={subtotal} />
            </div>
          </>
        )}
      </main>
      <footer className="minimal-footer">
        <Link to="/">
          <ArrowLeft size={14} />
          Back to Emmanex
        </Link>
        <span>Prices shown in Nigerian naira (₦)</span>
      </footer>
    </>
  )
}
