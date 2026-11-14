import { ArrowRight, PackageCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { CustomerSidebar } from '../components/CustomerSidebar'
import { CustomerActivitySkeleton } from '../components/CustomerActivitySkeleton'
import { SiteHeader } from '../components/SiteHeader'
import { formatNaira } from '../lib/formatCurrency'
import { useOrderHistory } from '../features/orders/useOrderHistory'

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function AccountPage() {
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
          <span>My account</span>
        </nav>

        <header className="customer-page-heading">
          <div>
            <p className="customer-eyebrow">MY EMMANEX</p>
            <h1>Welcome back, {user.firstName}</h1>
            <p>Manage your profile and keep track of your orders.</p>
          </div>
          <span className="customer-heading-badge">
            <UserRound size={17} aria-hidden="true" />
            Customer account
          </span>
        </header>

        <div className="customer-layout">
          <CustomerSidebar user={user} activePage="account" />

          <div className="customer-content">
            <section className="customer-card profile-details-card">
              <div className="customer-card-heading">
                <div>
                  <p className="customer-eyebrow">PERSONAL DETAILS</p>
                  <h2>Your profile</h2>
                </div>
                <span className="customer-card-icon"><UserRound size={20} aria-hidden="true" /></span>
              </div>
              <dl className="profile-details-list">
                <div>
                  <dt>Full name</dt>
                  <dd>{user.firstName} {user.lastName}</dd>
                </div>
                <div>
                  <dt>Email address</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Account type</dt>
                  <dd>Customer</dd>
                </div>
              </dl>
            </section>

            <section className="customer-card customer-orders-card">
              <div className="customer-card-heading">
                <div>
                  <p className="customer-eyebrow">YOUR PURCHASES</p>
                  <h2>Recent orders</h2>
                </div>
                <Link className="customer-view-all" to="/notifications">
                  Order notifications
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
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
                  <PackageCheck size={25} aria-hidden="true" />
                  <p>You haven’t placed an order yet.</p>
                  <Link to="/">Explore the collection</Link>
                </div>
              ) : (
                <div className="customer-order-list">
                  {orders.slice(0, 5).map((order) => (
                    <article className="customer-order" key={order.id}>
                      <div className="customer-order-main">
                        <span className="customer-order-icon">
                          <PackageCheck size={19} aria-hidden="true" />
                        </span>
                        <div>
                          <Link to={`/order-confirmation/${encodeURIComponent(order.id)}`}>
                            Order {order.id.slice(0, 8).toUpperCase()}
                          </Link>
                          <p>{formatOrderDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
                        </div>
                      </div>
                      <div className="customer-order-total">
                        <span className="customer-order-status">
                          {order.isDemo ? 'Demo order' : order.status}
                        </span>
                        <strong>{formatNaira(Number(order.total))}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <footer className="minimal-footer">
        <Link to="/">Continue shopping</Link>
        <span>Secure account · Demo payments only</span>
      </footer>
    </>
  )
}
