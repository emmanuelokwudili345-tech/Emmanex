import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, CreditCard, MapPin, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'
import { useCart } from '../features/cart/useCart'
import { formatNaira } from '../lib/formatCurrency'
import {
  shoppingApi,
  type CheckoutDetails,
  type OrderConfirmation,
  type ShippingOption,
} from '../services/shoppingApi'

const demoCheckoutEnabled =
  import.meta.env.DEV ||
  import.meta.env.VITE_DEMO_CHECKOUT_ENABLED === 'true'

type DeliveryForm = Omit<CheckoutDetails, 'demoOutcome'>

const emptyDelivery: DeliveryForm = {
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
}

export function CheckoutPage() {
  const { items, subtotal, isLoading: cartLoading, loadError: cartError, refreshCart } = useCart()
  const { showToast } = useToast()
  const [delivery, setDelivery] = useState<DeliveryForm>(emptyDelivery)
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(demoCheckoutEnabled)
  const [optionsError, setOptionsError] = useState('')
  const [paymentOutcome, setPaymentOutcome] = useState<'success' | 'failure'>('success')
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null)
  const [retryOptions, setRetryOptions] = useState(0)

  useEffect(() => {
    if (!demoCheckoutEnabled) {
      return
    }

    const controller = new AbortController()
    shoppingApi.getShippingOptions()
      .then((shippingOptions) => {
        if (!controller.signal.aborted) setOptions(shippingOptions)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOptionsError(error instanceof Error ? error.message : 'We could not load delivery options.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOptionsLoading(false)
      })

    return () => controller.abort()
  }, [retryOptions])

  function updateDelivery(field: keyof DeliveryForm, value: string) {
    setDelivery((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)

    try {
      const order = await shoppingApi.submitDemoOrder({
        ...delivery,
        demoOutcome: paymentOutcome,
      })
      setConfirmation(order)
      void refreshCart().catch(() => undefined)
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Could not save your demo order',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedShipping = options.find((option) => option.state === delivery.state)
  const total = Number(subtotal) + Number(selectedShipping?.shippingFee ?? 0)

  return (
    <>
      <div className="store-header-shell">
        <SiteHeader />
      </div>

      {!demoCheckoutEnabled ? (
        <main className="state-screen checkout-placeholder">
          <div className="state-icon" aria-hidden="true"><CreditCard size={22} /></div>
          <p className="eyebrow">Checkout unavailable</p>
          <h1>Demo checkout is disabled</h1>
          <p>Checkout is not enabled for this deployment. No payment has been taken.</p>
          <Link className="button button-dark" to="/cart">Back to your bag</Link>
        </main>
      ) : confirmation ? (
        <main className="shopping-page checkout-page">
          <section className="checkout-confirmation" role="status">
            <CheckCircle2 size={38} aria-hidden="true" />
            <p className="store-eyebrow">DEMO ORDER · NO PAYMENT COLLECTED</p>
            <h1>Your demo order is saved</h1>
            <p>This is a portfolio demonstration. No money was collected and inventory was not changed.</p>
            <div className="checkout-confirmation-details">
              <span>Order reference</span><strong>{confirmation.id}</strong>
              <span>Order total</span><strong>{formatNaira(Number(confirmation.total))}</strong>
            </div>
            <Link className="text-link" to="/account">View your order history</Link>
            <Link className="button button-dark" to="/">Continue shopping</Link>
          </section>
        </main>
      ) : (
        <main className="shopping-page checkout-page">
          <Link className="shopping-back-link" to="/cart"><ArrowLeft size={15} /> Back to your bag</Link>
          <div className="shopping-page-heading">
            <div>
              <p className="store-eyebrow">DELIVERY AND PAYMENT</p>
              <h1>Checkout</h1>
            </div>
            <span>Demo checkout · no real payment</span>
          </div>

          {!cartLoading && !cartError && items.length === 0 ? (
            <section className="shopping-empty">
              <PackageCheck size={32} aria-hidden="true" />
              <h2>Your bag is empty</h2>
              <p>Add something to your bag before continuing to checkout.</p>
              <Link className="button button-dark" to="/">Explore the collection</Link>
            </section>
          ) : cartLoading ? (
            <section className="shopping-empty" role="status"><p>Loading your bag…</p></section>
          ) : cartError ? (
            <section className="shopping-empty" role="alert">
              <h2>We couldn’t load your bag</h2>
              <p>{cartError}</p>
              <button className="button button-dark" type="button" onClick={() => void refreshCart().catch(() => undefined)}>Try again</button>
            </section>
          ) : (
            <div className="checkout-layout">
              <form className="checkout-form" onSubmit={handleSubmit}>
                <section className="checkout-card">
                  <div className="checkout-card-heading">
                    <span className="checkout-step">01</span>
                    <div><h2>Delivery details</h2><p>Where should we send your order?</p></div>
                  </div>

                  <label>
                    Recipient name
                    <input autoComplete="name" maxLength={200} required value={delivery.recipientName} onChange={(event) => updateDelivery('recipientName', event.target.value)} />
                  </label>
                  <label>
                    Phone number
                    <input autoComplete="tel" type="tel" maxLength={30} required value={delivery.phone} onChange={(event) => updateDelivery('phone', event.target.value)} />
                  </label>
                  <label>
                    Street address
                    <input autoComplete="address-line1" maxLength={255} required value={delivery.addressLine1} onChange={(event) => updateDelivery('addressLine1', event.target.value)} />
                  </label>
                  <label>
                    Apartment, suite, etc. <span className="checkout-optional">Optional</span>
                    <input autoComplete="address-line2" maxLength={255} value={delivery.addressLine2} onChange={(event) => updateDelivery('addressLine2', event.target.value)} />
                  </label>
                  <div className="checkout-form-row">
                    <label>
                      City
                      <input autoComplete="address-level2" maxLength={100} required value={delivery.city} onChange={(event) => updateDelivery('city', event.target.value)} />
                    </label>
                    <label>
                      State or territory
                      <select autoComplete="address-level1" required value={delivery.state} onChange={(event) => updateDelivery('state', event.target.value)}>
                        <option value="">Choose a state</option>
                        {options.map((option) => <option key={option.state} value={option.state}>{option.state}</option>)}
                      </select>
                    </label>
                  </div>
                  <label>
                    Postal code <span className="checkout-optional">Optional</span>
                    <input autoComplete="postal-code" maxLength={20} value={delivery.postalCode} onChange={(event) => updateDelivery('postalCode', event.target.value)} />
                  </label>

                  {optionsLoading && <p className="checkout-note" role="status">Loading delivery areas…</p>}
                  {optionsError && (
                    <div className="checkout-error" role="alert">
                      <p>{optionsError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setOptionsLoading(true)
                          setOptionsError('')
                          setRetryOptions((current) => current + 1)
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {selectedShipping && (
                    <p className="checkout-zone-note"><MapPin size={15} aria-hidden="true" /> {selectedShipping.zone} delivery · {formatNaira(Number(selectedShipping.shippingFee))}</p>
                  )}
                </section>

                <section className="checkout-card">
                  <div className="checkout-card-heading">
                    <span className="checkout-step">02</span>
                    <div><h2>Demo payment simulation</h2><p>Choose a test outcome. No real payment will be collected.</p></div>
                  </div>
                  <fieldset className="mock-payment-options">
                    <legend>Demo result</legend>
                    <label>
                      <input type="radio" name="demoOutcome" value="success" checked={paymentOutcome === 'success'} onChange={() => setPaymentOutcome('success')} />
                      <span><strong>Save demo order</strong><small>No payment is collected and inventory stays unchanged.</small></span>
                    </label>
                    <label>
                      <input type="radio" name="demoOutcome" value="failure" checked={paymentOutcome === 'failure'} onChange={() => setPaymentOutcome('failure')} />
                      <span><strong>Simulate failure</strong><small>Keep your bag and inventory unchanged.</small></span>
                    </label>
                  </fieldset>
                </section>

                <button className="button button-dark checkout-submit" type="submit" disabled={submitting || optionsLoading || Boolean(optionsError) || !selectedShipping}>
                  {submitting ? 'Saving demo order…' : 'Place demo order'}
                </button>
              </form>

              <aside className="shopping-summary checkout-summary">
                <p className="store-eyebrow">ORDER SUMMARY</p>
                <div className="checkout-summary-items">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id}>
                      <span>{product.name} <small>× {quantity}</small></span>
                      <strong>{formatNaira(Number(product.price) * quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div><span>Subtotal</span><strong>{formatNaira(Number(subtotal))}</strong></div>
                <div><span>Delivery</span><strong>{selectedShipping ? formatNaira(Number(selectedShipping.shippingFee)) : 'Choose a state'}</strong></div>
                <div className="checkout-total"><span>Total</span><strong>{formatNaira(total)}</strong></div>
                <p>Final totals are recalculated by the server. Demo orders do not reduce inventory.</p>
              </aside>
            </div>
          )}
        </main>
      )}

      <footer className="minimal-footer">
        <Link to="/cart"><ArrowLeft size={14} aria-hidden="true" /> Back to your bag</Link>
        <span>Prices shown in Nigerian naira (₦)</span>
      </footer>
    </>
  )
}
