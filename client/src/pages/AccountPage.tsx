import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SiteHeader } from '../components/SiteHeader'
import { formatNaira } from '../lib/formatCurrency'
import { shoppingApi, type CustomerOrder } from '../services/shoppingApi'

export function AccountPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true

    void shoppingApi.getOrderHistory()
      .then((customerOrders) => {
        if (active) setOrders(customerOrders)
      })
      .catch((error: unknown) => {
        if (active) {
          setOrdersError(
            error instanceof Error
              ? error.message
              : 'We could not load your order history.',
          )
        }
      })
      .finally(() => {
        if (active) setOrdersLoading(false)
      })

    return () => {
      active = false
    }
  }, [retryCount])

  if (!user) return null

  return (
    <>
      <SiteHeader />
      <main className="account-page">
        <p className="eyebrow">Your Emmanex</p>
        <h1>Welcome back, {user.firstName}.</h1>
        <p className="account-lead">
          Your account is ready. Review your profile and order history here.
        </p>

        <div className="account-grid">
          <section className="account-card">
            <span className="card-kicker">ACCOUNT DETAILS</span>
            <h2>Your profile</h2>
            <dl>
              <div>
                <dt>Name</dt>
                <dd>
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>Customer</dd>
              </div>
            </dl>
          </section>

          <section className="account-card orders-card">
            <span className="card-kicker">ORDER HISTORY</span>
            <h2>Your orders</h2>
            {ordersLoading ? (
              <p role="status">Loading your orders…</p>
            ) : ordersError ? (
              <div className="order-history-error" role="alert">
                <p>{ordersError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOrdersLoading(true)
                    setOrdersError(null)
                    setRetryCount((count) => count + 1)
                  }}
                >
                  Try again
                </button>
              </div>
            ) : orders.length === 0 ? (
              <>
                <p>You haven’t placed an order yet.</p>
                <Link className="text-link" to="/">
                  Explore the collection
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <div className="order-history-list">
                {orders.map((order) => (
                  <article className="order-history-item" key={order.id}>
                    <div className="order-history-heading">
                      <Link to={`/order-confirmation/${encodeURIComponent(order.id)}`}>
                        Order {order.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <span>
                        {order.isDemo
                          ? 'DEMO · NO PAYMENT COLLECTED'
                          : order.status.toUpperCase()}
                      </span>
                    </div>
                    <p>
                      {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </p>
                    <p className="order-history-products">
                      {order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')}
                    </p>
                    <strong>{formatNaira(Number(order.total))}</strong>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <Link className="wordmark footer-wordmark" to="/">
          <span className="wordmark-mark">E</span>
          <span>emmanex</span>
        </Link>
        <span>Good things are on their way.</span>
        <span>© {new Date().getFullYear()} Emmanex</span>
      </footer>
    </>
  )
}
