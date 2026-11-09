import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'
import { useCart } from '../features/cart/useCart'
import { formatNaira } from '../lib/formatCurrency'

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, isLoading, loadError, refreshCart } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  return (
    <>
      <div className="store-header-shell"><SiteHeader /></div>
      <main className="shopping-page">
        <Link className="shopping-back-link" to="/"><ArrowLeft size={15} /> Continue shopping</Link>
        <div className="shopping-page-heading">
          <div><p className="store-eyebrow">YOUR SELECTION</p><h1>Shopping bag</h1></div>
          <span>{items.length} {items.length === 1 ? 'product' : 'products'}</span>
        </div>
        {isLoading ? (
          <section className="shopping-empty" role="status"><p>Loading your shopping bag…</p></section>
        ) : loadError && items.length === 0 ? (
          <section className="shopping-empty" role="alert">
            <ShoppingBag size={32} />
            <h2>We couldn’t load your bag</h2>
            <p>{loadError}</p>
            <button className="button button-dark" type="button" onClick={() => void refreshCart().catch(() => undefined)}>
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
                <button type="button" onClick={() => void refreshCart().catch(() => undefined)}>
                  Try again
                </button>
              </div>
            )}
            <div className="shopping-layout">
              <section className="shopping-items" aria-label="Items in your bag">
              {items.map(({ product, quantity }) => (
                <article className="shopping-item" key={product.id}>
                  <img src={product.imageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80'} alt={product.name} />
                  <div className="shopping-item-info">
                    <span>{product.category?.name ?? 'Emmanex collection'}</span>
                    <h2>{product.name}</h2>
                    <strong>{formatNaira(Number(product.price))}</strong>
                    <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => { void updateQuantity(product.id, quantity - 1).catch((error: unknown) => showToast({ type: 'error', title: 'Could not update quantity', message: error instanceof Error ? error.message : 'Please try again.' })) }}><Minus size={14} /></button>
                      <span>{quantity}</span>
                      <button type="button" aria-label="Increase quantity" onClick={() => { void updateQuantity(product.id, quantity + 1).catch((error: unknown) => showToast({ type: 'error', title: 'Could not update quantity', message: error instanceof Error ? error.message : 'Please try again.' })) }}><Plus size={14} /></button>
                    </div>
                  </div>
                <button className="remove-cart-item" type="button" aria-label={`Remove ${product.name}`} onClick={() => { void removeItem(product.id).then(() => showToast({ type: 'success', title: 'Removed from your bag', message: product.name })).catch((error: unknown) => showToast({ type: 'error', title: 'Could not remove product', message: error instanceof Error ? error.message : 'Please try again.' })) }}><Trash2 size={17} /></button>
                </article>
              ))}
              </section>
              <aside className="shopping-summary">
                <p className="store-eyebrow">ORDER SUMMARY</p>
                <div><span>Subtotal</span><strong>{formatNaira(Number(subtotal))}</strong></div>
                <p>Delivery and any applicable charges are calculated at checkout.</p>
                <button className="button button-dark" type="button" onClick={() => navigate('/checkout')}>Continue to checkout</button>
                <small>Sign in is required to continue to checkout.</small>
              </aside>
            </div>
          </>
        )}
      </main>
      <footer className="minimal-footer"><Link to="/"><ArrowLeft size={14} /> Back to Emmanex</Link><span>Prices shown in Nigerian naira (₦)</span></footer>
    </>
  )
}
