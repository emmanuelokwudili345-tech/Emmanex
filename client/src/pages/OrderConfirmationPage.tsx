import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { formatNaira } from '../lib/formatCurrency'
import { shoppingApi, type OrderConfirmation } from '../services/shoppingApi'

export function OrderConfirmationPage() {
  const { orderId } = useParams()
  const [result, setResult] = useState<{
    orderId: string
    order?: OrderConfirmation
    error?: string
  } | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    if (!orderId) return () => { active = false }

    void shoppingApi.getOrder(orderId)
      .then((savedOrder) => {
        if (active) setResult({ orderId, order: savedOrder })
      })
      .catch((requestError: unknown) => {
        if (active) {
          setResult({
            orderId,
            error: requestError instanceof Error ? requestError.message : 'We could not load this order.',
          })
        }
      })

    return () => { active = false }
  }, [orderId, retryCount])

  const currentResult = result?.orderId === orderId ? result : null
  const order = currentResult?.order
  const paymentStatus = order?.paymentStatus === 'simulated'
    ? 'Demo payment simulated · not charged'
    : order?.paymentStatus === 'unknown'
      ? 'Not recorded for this order'
      : 'No payment collected'
  const paymentMethod = order?.paymentMethod === 'demo'
    ? 'Demo payment'
    : order?.paymentMethod ?? ''
  const deliveryMethod = order?.deliveryMethod === 'standard'
    ? 'Standard home delivery'
    : order?.deliveryMethod ?? ''

  return (
    <>
      <div className="store-header-shell"><SiteHeader /></div>
      <main className="shopping-page checkout-page">
        {!orderId ? (
          <section className="shopping-empty" role="alert">
            <h1>Invalid order reference</h1>
            <p>This confirmation link is incomplete.</p>
            <Link className="button button-dark" to="/account">Go to your account</Link>
          </section>
        ) : !currentResult ? (
          <section className="shopping-empty" role="status"><p>Loading your order confirmation…</p></section>
        ) : currentResult.error || !order ? (
          <section className="shopping-empty" role="alert">
            <h1>We couldn’t load this order</h1>
            <p>{currentResult.error ?? 'Order not found.'}</p>
            <button className="button button-dark" type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try again
            </button>
            <Link className="button button-dark" to="/account">Go to your account</Link>
          </section>
        ) : (
          <section className="checkout-confirmation checkout-confirmation-page" aria-labelledby="order-confirmation-title">
            <CheckCircle2 size={38} aria-hidden="true" />
            <p className="store-eyebrow">ORDER PLACED · DEMO PAYMENT</p>
            <h1 id="order-confirmation-title">Thank you for your order</h1>
            <p>Your order has been saved to your account. The payment confirmation is simulated; no money was collected.</p>

            <div className="checkout-confirmation-details">
              <span>Order reference</span><strong>{order.id}</strong>
              <span>Order status</span><strong>{order.status}</strong>
              <span>Payment status</span><strong>{paymentStatus}</strong>
              <span>Payment method</span><strong>{paymentMethod}</strong>
              <span>Delivery method</span><strong>{deliveryMethod}</strong>
              <span>Email</span><strong>{order.recipientEmail}</strong>
              <span>Phone</span><strong>{order.phone}</strong>
              <span>Delivery address</span>
              <strong>
                {[order.recipientName, order.addressLine1, order.addressLine2, order.city, order.state, order.postalCode, order.country]
                  .filter(Boolean)
                  .join(', ')}
              </strong>
            </div>

            <div className="checkout-confirmation-items">
              <h2>Items ordered</h2>
              {order.items.map((item, index) => (
                <div key={`${item.productName}-${index}`}>
                  <span>{item.productName} × {item.quantity}<small>{formatNaira(Number(item.unitPrice))} each</small></span>
                  <strong>{formatNaira(Number(item.lineTotal))}</strong>
                </div>
              ))}
            </div>
            <div className="checkout-confirmation-totals">
              <div><span>Subtotal</span><strong>{formatNaira(Number(order.subtotal))}</strong></div>
              <div><span>Delivery fee</span><strong>{formatNaira(Number(order.shippingFee))}</strong></div>
              <div className="checkout-total"><span>Total</span><strong>{formatNaira(Number(order.total))}</strong></div>
            </div>

            <Link className="text-link" to="/account">View your order history</Link>
            <Link className="button button-dark" to="/">Continue shopping</Link>
          </section>
        )}
      </main>
      <footer className="minimal-footer">
        <Link to="/account">Your account</Link>
        <span>Prices shown in Nigerian naira (₦)</span>
      </footer>
    </>
  )
}
