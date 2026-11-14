import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, PackageCheck, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { formatNaira } from '../lib/formatCurrency'
import { shoppingApi, type OrderConfirmation } from '../services/shoppingApi'

interface OrderResult {
  orderId: string
  order?: OrderConfirmation
  error?: string
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function OrderConfirmationPage() {
  const { orderId } = useParams()
  const [result, setResult] = useState<OrderResult | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    if (!orderId) return () => { active = false }

    void shoppingApi.getOrder(orderId)
      .then((order) => {
        if (active) setResult({ orderId, order })
      })
      .catch((requestError: unknown) => {
        if (active) {
          setResult({
            orderId,
            error: requestError instanceof Error
              ? requestError.message
              : 'We could not load this order.',
          })
        }
      })

    return () => { active = false }
  }, [orderId, retryCount])

  const currentResult = result?.orderId === orderId ? result : null
  const order = currentResult?.order
  const address = order
    ? [
        order.addressLine1,
        order.addressLine2,
        order.city,
        order.state,
        order.postalCode,
        order.country,
      ].filter(Boolean).join(', ')
    : ''

  return (
    <>
      <div className="store-header-shell">
        <SiteHeader />
      </div>
      <main className="customer-area order-confirmation-area">
        <Link className="customer-back-link" to="/account">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to your account
        </Link>

        {!orderId ? (
          <section className="order-state-card" role="alert">
            <h1>Invalid order reference</h1>
            <p>This confirmation link is incomplete.</p>
            <Link className="button" to="/account">Go to your account</Link>
          </section>
        ) : !currentResult ? (
          <section className="order-state-card order-loading-skeleton" role="status" aria-label="Loading your order" aria-busy="true">
            <LoadingSkeleton className="order-loading-icon" />
            <LoadingSkeleton className="order-loading-heading" />
            <LoadingSkeleton className="order-loading-line" />
            <LoadingSkeleton className="order-loading-line order-loading-line-short" />
          </section>
        ) : currentResult.error || !order ? (
          <section className="order-state-card" role="alert">
            <h1>We couldn’t load this order</h1>
            <p>{currentResult.error ?? 'Order not found.'}</p>
            <button
              className="button"
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </button>
            <Link className="text-link" to="/account">Go to your account</Link>
          </section>
        ) : (
          <>
            <section className="order-success-banner" aria-labelledby="order-confirmation-title">
              <span className="order-success-icon">
                <CheckCircle2 size={30} aria-hidden="true" />
              </span>
              <div className="order-success-copy">
                <p className="customer-eyebrow">ORDER RECEIVED</p>
                <h1 id="order-confirmation-title">Thank you, {order.recipientName.split(' ')[0]}!</h1>
                <p>Your order has been saved. We’ve added this order update to your notifications.</p>
              </div>
              <div className="order-reference">
                <span>ORDER REFERENCE</span>
                <strong>{order.id.slice(0, 8).toUpperCase()}</strong>
                <small>{formatOrderDate(order.createdAt)}</small>
              </div>
            </section>

            <div className="confirmation-layout">
              <section className="customer-card confirmation-order-card">
                <div className="customer-card-heading">
                  <div>
                    <p className="customer-eyebrow">ORDER SUMMARY</p>
                    <h2>Items in your order</h2>
                  </div>
                  <span className="confirmation-status">{order.status}</span>
                </div>

                <div className="confirmation-items">
                  {order.items.map((item, index) => (
                    <article className="confirmation-item" key={`${item.productName}-${index}`}>
                      <span className="confirmation-item-icon">
                        <PackageCheck size={21} aria-hidden="true" />
                      </span>
                      <span className="confirmation-item-copy">
                        <strong>{item.productName}</strong>
                        <small>Quantity: {item.quantity} · {formatNaira(Number(item.unitPrice))} each</small>
                      </span>
                      <strong>{formatNaira(Number(item.lineTotal))}</strong>
                    </article>
                  ))}
                </div>

                <dl className="confirmation-totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{formatNaira(Number(order.subtotal))}</dd>
                  </div>
                  <div>
                    <dt>Delivery fee</dt>
                    <dd>{formatNaira(Number(order.shippingFee))}</dd>
                  </div>
                  <div className="confirmation-total">
                    <dt>Total</dt>
                    <dd>{formatNaira(Number(order.total))}</dd>
                  </div>
                </dl>
                {order.isDemo && (
                  <p className="confirmation-demo-note">
                    Demo payment recorded · no money was collected.
                  </p>
                )}
              </section>

              <aside className="customer-card confirmation-delivery-card">
                <div className="customer-card-heading">
                  <div>
                    <p className="customer-eyebrow">DELIVERY</p>
                    <h2>Delivery details</h2>
                  </div>
                  <span className="customer-card-icon"><Truck size={20} aria-hidden="true" /></span>
                </div>
                <dl className="confirmation-delivery-details">
                  <div>
                    <dt>Recipient</dt>
                    <dd>{order.recipientName}</dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{address}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{order.phone}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{order.recipientEmail}</dd>
                  </div>
                  <div>
                    <dt>Payment method</dt>
                    <dd>{order.paymentMethod === 'demo' ? 'Demo payment' : order.paymentMethod}</dd>
                  </div>
                  <div>
                    <dt>Payment status</dt>
                    <dd>{order.paymentStatus === 'simulated' ? 'Simulated · not charged' : 'No payment collected'}</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <div className="confirmation-actions">
              <Link className="text-link" to="/notifications">View notifications</Link>
              <Link className="button" to="/">Continue shopping</Link>
            </div>
          </>
        )}
      </main>
      <footer className="minimal-footer">
        <Link to="/">Emmanex</Link>
        <span>Demo payment only · no money is collected</span>
      </footer>
    </>
  )
}
