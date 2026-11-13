import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, PackageCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type User } from '../auth/useAuth'
import { SiteHeader } from '../components/SiteHeader'
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
    if (submitting) return

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
      <div className="store-header-shell">
        <SiteHeader />
      </div>

      <main className="shopping-page checkout-page">
        <Link className="shopping-back-link" to="/cart">
          <ArrowLeft size={15} />
          Back to your bag
        </Link>
        <div className="shopping-page-heading">
          <div>
            <p className="store-eyebrow">DELIVERY AND PAYMENT</p>
            <h1>Checkout</h1>
          </div>
          <span>Demo payment only · no money collected</span>
        </div>

        {!cartLoading && !cartError && items.length === 0 ? (
          <section className="shopping-empty">
            <PackageCheck size={32} aria-hidden="true" />
            <h2>Your bag is empty</h2>
            <p>Add something to your bag before continuing to checkout.</p>
            <Link className="button button-dark" to="/">Explore the collection</Link>
          </section>
        ) : cartLoading ? (
          <section className="shopping-empty" role="status">
            <p>Loading your bag…</p>
          </section>
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
            <form className="checkout-form" onSubmit={handleSubmit}>
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
              <button
                className="button button-dark checkout-submit"
                type="submit"
                disabled={submitting || optionsLoading || Boolean(optionsError) || !selectedShipping}
              >
                {submitting ? 'Placing your order…' : 'Place order'}
              </button>
            </form>

            <CheckoutOrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              total={total}
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
