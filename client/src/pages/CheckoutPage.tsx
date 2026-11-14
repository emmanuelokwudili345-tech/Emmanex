import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, PackageCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type User } from '../auth/useAuth'
import { SiteHeader } from '../components/SiteHeader'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { useToast } from '../components/useToast'
import { useCart } from '../features/cart/useCart'
import {
  shoppingApi,
  type CheckoutDetails,
  type ShippingOption,
} from '../services/shoppingApi'
import {
  CheckoutMethods,
  CheckoutOrderSummary,
  DeliveryDetailsSection,
} from './CheckoutSections'

function createInitialDeliveryDetails(user: User | null): CheckoutDetails {
  return {
    recipientName: user ? `${user.firstName} ${user.lastName}` : '',
    recipientEmail: user?.email ?? '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    deliveryMethod: 'standard',
    paymentMethod: 'demo',
  }
}

export function CheckoutPage() {
  const { user } = useAuth()
  const {
    items,
    subtotal,
    isLoading: cartLoading,
    loadError: cartError,
    refreshCart,
  } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(() => createInitialDeliveryDetails(user))
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retryOptions, setRetryOptions] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    shoppingApi.getShippingOptions()
      .then((options) => {
        if (!controller.signal.aborted) {
          setShippingOptions(options)
          setOptionsError('')
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOptionsError(
            error instanceof Error ? error.message : 'We could not load delivery options.',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setOptionsLoading(false)
        }
      })

    return () => controller.abort()
  }, [retryOptions])

  function updateDelivery<K extends keyof CheckoutDetails>(
    field: K,
    value: CheckoutDetails[K],
  ) {
    setDelivery((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || optionsLoading || optionsError || !selectedShipping) return

    setSubmitting(true)

    try {
      const order = await shoppingApi.submitDemoOrder(delivery)
      navigate(`/order-confirmation/${encodeURIComponent(order.id)}`)

      void refreshCart().catch((error: unknown) => {
        showToast({
          type: 'error',
          title: 'Order placed, but bag refresh failed',
          message: error instanceof Error ? error.message : 'Reload your bag before shopping again.',
        })
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Could not place your order',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function retryShippingOptions() {
    setOptionsLoading(true)
    setOptionsError('')
    setRetryOptions((current) => current + 1)
  }

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

  const selectedShipping = shippingOptions.find(
    (option) => option.state === delivery.state,
  )
  const shippingFee = selectedShipping?.shippingFee ?? null
  const total = selectedShipping
    ? Number(subtotal) + Number(selectedShipping.shippingFee)
    : null

  return (
    <>
      <title>Checkout</title>
      <div className="store-header-shell">
        <SiteHeader />
      </div>

      <main className="shopping-page checkout-page">
        <Link className="shopping-back-link" to="/cart">
          <ArrowLeft size={15} />
          Back to your bag
        </Link>
        <div className="checkout-page-heading">
          <div>
            <p className="customer-eyebrow">YOUR ORDER</p>
            <h1>Checkout</h1>
            <p>Delivery details, then review your order before placing it.</p>
          </div>
        </div>
        <ol className="checkout-progress" aria-label="Checkout steps">
          <li className="is-current"><span>1</span>Delivery details</li>
          <li><span>2</span>Review order</li>
          <li><span>3</span>Confirmation</li>
        </ol>

        {!cartLoading && !cartError && items.length === 0 ? (
          <section className="shopping-empty">
            <PackageCheck size={32} aria-hidden="true" />
            <h2>Your bag is empty</h2>
            <p>Add something to your bag before continuing to checkout.</p>
            <Link className="button button-dark" to="/">Explore the collection</Link>
          </section>
        ) : cartLoading ? (
          <div className="checkout-layout checkout-loading-skeleton" role="status" aria-label="Loading your bag for checkout" aria-busy="true">
            <div className="checkout-form" aria-hidden="true">
              <section className="checkout-card">
                <LoadingSkeleton className="checkout-skeleton-heading" />
                <div className="checkout-skeleton-fields">
                  {Array.from({ length: 8 }, (_, index) => (
                    <LoadingSkeleton
                      className={`checkout-skeleton-field${index === 0 || index === 3 ? ' checkout-skeleton-field-wide' : ''}`}
                      key={index}
                    />
                  ))}
                </div>
              </section>
              <section className="checkout-card checkout-skeleton-method">
                <LoadingSkeleton className="checkout-skeleton-heading" />
                <LoadingSkeleton className="checkout-skeleton-option" />
              </section>
              <section className="checkout-card checkout-skeleton-method">
                <LoadingSkeleton className="checkout-skeleton-heading" />
                <LoadingSkeleton className="checkout-skeleton-option" />
              </section>
            </div>
            <aside className="shopping-summary checkout-summary" aria-hidden="true">
              <LoadingSkeleton className="checkout-skeleton-heading" />
              <LoadingSkeleton className="checkout-skeleton-summary-row" />
              <LoadingSkeleton className="checkout-skeleton-summary-row" />
              <LoadingSkeleton className="checkout-skeleton-summary-button" />
            </aside>
          </div>
        ) : cartError ? (
          <section className="shopping-empty" role="alert">
            <h2>We couldn’t load your bag</h2>
            <p>{cartError}</p>
            <button
              className="button button-dark"
              type="button"
              onClick={() => void handleRefreshCart()}
            >
              Try again
            </button>
          </section>
        ) : (
          <div className="checkout-layout">
            <form id="checkout-form" className="checkout-form" onSubmit={handleSubmit}>
              <DeliveryDetailsSection
                details={delivery}
                shippingOptions={shippingOptions}
                loading={optionsLoading}
                error={optionsError}
                onChange={updateDelivery}
                onRetry={retryShippingOptions}
              />
              <CheckoutMethods
                deliveryMethod={delivery.deliveryMethod}
                paymentMethod={delivery.paymentMethod}
                onDeliveryMethodChange={(method) => updateDelivery('deliveryMethod', method)}
                onPaymentMethodChange={(method) => updateDelivery('paymentMethod', method)}
              />
            </form>

            <CheckoutOrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              total={total}
              submitting={submitting}
              canSubmit={!optionsLoading && !optionsError && Boolean(selectedShipping)}
            />
          </div>
        )}
      </main>

      <footer className="minimal-footer">
        <Link to="/cart">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to your bag
        </Link>
        <span>Prices shown in Nigerian naira (₦)</span>
      </footer>
    </>
  )
}
