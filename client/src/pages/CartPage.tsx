import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'
import { useCart } from '../features/cart/useCart'
import { formatNaira } from '../lib/formatCurrency'
import type { ShoppingCartItem } from '../services/shoppingApi'
import { ImageWithSkeleton } from '../components/ImageWithSkeleton'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

const fallbackCartImage =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80'

interface CartItemRowProps {
  item: ShoppingCartItem
  onDecrease: () => void
  onIncrease: () => void
  onRemove: () => void
}

function CartItemRow({ item, onDecrease, onIncrease, onRemove }: CartItemRowProps) {
  const { product, quantity } = item

  return (
    <article className="shopping-item">
      <ImageWithSkeleton
        className="shopping-item-image"
        src={product.imageUrl || fallbackCartImage}
        alt={product.name}
        fallbackSrc={fallbackCartImage}
      />
      <div className="shopping-item-info">
        <span>{product.category?.name ?? 'Emmanex collection'}</span>
        <h2>{product.name}</h2>
        <strong>{formatNaira(Number(product.price))}</strong>
        <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
          <button
            type="button"
            aria-label={`Decrease quantity of ${product.name}`}
            disabled={quantity <= 1}
            onClick={onDecrease}
          >
            <Minus size={14} />
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity of ${product.name}`}
            onClick={onIncrease}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <button
        className="remove-cart-item"
        type="button"
        aria-label={`Remove ${product.name} from your bag`}
        onClick={onRemove}
      >
        <Trash2 size={17} />
      </button>
    </article>
  )
}

interface CartSummaryProps {
  subtotal: string
}

function CartSummary({ subtotal }: CartSummaryProps) {
  return (
    <aside className="shopping-summary">
      <p className="store-eyebrow">ORDER SUMMARY</p>
      <dl className="cart-summary-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatNaira(Number(subtotal))}</dd>
        </div>
      </dl>
      <p>Delivery and any applicable charges are calculated at checkout.</p>
      <Link className="button button-dark" to="/checkout">
        Proceed to checkout
      </Link>
    </aside>
  )
}

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
