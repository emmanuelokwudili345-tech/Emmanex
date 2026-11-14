import { ArrowRight, Bell, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { CustomerSidebar } from '../components/CustomerSidebar'
import { CustomerActivitySkeleton } from '../components/CustomerActivitySkeleton'
import { SiteHeader } from '../components/SiteHeader'
import { useOrderHistory } from '../features/orders/useOrderHistory'
import type { CustomerOrder } from '../services/shoppingApi'

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getOrderMessage(status: CustomerOrder['status']) {
  if (status === 'cancelled') return 'This order has been cancelled.'
  if (status === 'delivered') return 'Your order has been delivered.'
  if (status === 'shipped') return 'Your order is on its way.'
  if (status === 'processing') return 'Your order is being prepared.'
  if (status === 'confirmed') return 'Your order has been confirmed.'
  return 'Your order has been placed and saved to your account.'
}

function getOrderTitle(status: CustomerOrder['status']) {
  if (status === 'cancelled') return 'Order cancelled'
  if (status === 'delivered') return 'Order delivered'
  if (status === 'shipped') return 'Order shipped'
  if (status === 'processing') return 'Order being prepared'
  if (status === 'confirmed') return 'Order confirmed'
  return 'Order placed'
}

export function NotificationsPage() {
  const { user } = useAuth()
  const { orders, isLoading, error, retry } = useOrderHistory()

  if (!user) return null

  return (
    <>
      <div className="store-header-shell">
        <SiteHeader />
      </div>
      <main className="customer-area">
        <nav className="customer-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/account">My account</Link>
          <span aria-hidden="true">/</span>
          <span>Notifications</span>
        </nav>

        <header className="customer-page-heading">
          <div>
            <p className="customer-eyebrow">KEEP UP TO DATE</p>
            <h1>Notifications</h1>
            <p>Order updates and confirmations from your Emmanex account.</p>
          </div>
          <span className="customer-heading-badge">
            <Bell size={17} aria-hidden="true" />
            Order activity
          </span>
        </header>

        <div className="customer-layout">
          <CustomerSidebar user={user} activePage="notifications" />
          <section className="customer-card notifications-card" aria-labelledby="notifications-title">
            <div className="customer-card-heading">
              <div>
                <p className="customer-eyebrow">RECENT ACTIVITY</p>
                <h2 id="notifications-title">Your order updates</h2>
              </div>
              <span className="notification-count">
                {isLoading ? 'Loading…' : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
              </span>
            </div>

            {isLoading ? (
              <CustomerActivitySkeleton />
            ) : error ? (
              <div className="customer-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={retry}>Try again</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="customer-empty-orders">
                <Bell size={26} aria-hidden="true" />
                <p>You don’t have any order notifications yet.</p>
                <Link to="/">Explore the collection</Link>
              </div>
            ) : (
              <div className="notification-list">
                {orders.map((order) => (
                  <article className="notification-item" key={order.id}>
                    <span className="notification-item-icon">
                      <PackageCheck size={20} aria-hidden="true" />
                    </span>
                    <div className="notification-item-content">
                      <div className="notification-item-meta">
                        <span>ORDER UPDATE</span>
                        <time dateTime={order.createdAt}>
                          {formatNotificationDate(order.createdAt)}
                        </time>
                      </div>
                      <h3>
                        {getOrderTitle(order.status)} · {order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <p>
                        {getOrderMessage(order.status)}
                        {order.isDemo ? ' Demo payment only; no money was collected.' : ''}
                      </p>
                      <Link to={`/order-confirmation/${encodeURIComponent(order.id)}`}>
                        View order details
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <footer className="minimal-footer">
        <Link to="/account">Your account</Link>
        <span>Order updates stay connected to your account</span>
      </footer>
    </>
  )
}
