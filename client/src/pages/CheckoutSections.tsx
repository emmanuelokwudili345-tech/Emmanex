import { CreditCard, MapPin } from 'lucide-react'
import { formatNaira } from '../lib/formatCurrency'
import type {
  CheckoutDetails,
  ShoppingCartItem,
  ShippingOption,
} from '../services/shoppingApi'

interface DeliveryDetailsSectionProps {
  details: CheckoutDetails
  shippingOptions: ShippingOption[]
  loading: boolean
  error: string
  onChange: <K extends keyof CheckoutDetails>(field: K, value: CheckoutDetails[K]) => void
  onRetry: () => void
}

export function DeliveryDetailsSection({
  details,
  shippingOptions,
  loading,
  error,
  onChange,
  onRetry,
}: DeliveryDetailsSectionProps) {
  const selectedShipping = shippingOptions.find((option) => option.state === details.state)

  return (
    <section className="checkout-card">
      <div className="checkout-card-heading">
        <span className="checkout-step">01</span>
        <div>
          <h2>Delivery details</h2>
          <p>Where should we send your order?</p>
        </div>
      </div>

      <label>
        Full name
        <input
          autoComplete="name"
          maxLength={200}
          required
          value={details.recipientName}
          onChange={(event) => onChange('recipientName', event.target.value)}
        />
      </label>
      <label>
        Email address
        <input
          autoComplete="email"
          type="email"
          maxLength={255}
          required
          value={details.recipientEmail}
          onChange={(event) => onChange('recipientEmail', event.target.value)}
        />
      </label>
      <label>
        Phone number
        <input
          autoComplete="tel"
          type="tel"
          maxLength={30}
          required
          value={details.phone}
          onChange={(event) => onChange('phone', event.target.value)}
        />
      </label>
      <label>
        Street address
        <input
          autoComplete="address-line1"
          maxLength={255}
          required
          value={details.addressLine1}
          onChange={(event) => onChange('addressLine1', event.target.value)}
        />
      </label>
      <label>
        Apartment, suite, etc. <span className="checkout-optional">Optional</span>
        <input
          autoComplete="address-line2"
          maxLength={255}
          value={details.addressLine2}
          onChange={(event) => onChange('addressLine2', event.target.value)}
        />
      </label>
      <div className="checkout-form-row">
        <label>
          City
          <input
            autoComplete="address-level2"
            maxLength={100}
            required
            value={details.city}
            onChange={(event) => onChange('city', event.target.value)}
          />
        </label>
        <label>
          State or territory
          <select
            autoComplete="address-level1"
            required
            value={details.state}
            onChange={(event) => onChange('state', event.target.value)}
          >
            <option value="">Choose a state</option>
            {shippingOptions.map((option) => (
              <option key={option.state} value={option.state}>{option.state}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Postal code <span className="checkout-optional">Optional</span>
        <input
          autoComplete="postal-code"
          maxLength={20}
          value={details.postalCode}
          onChange={(event) => onChange('postalCode', event.target.value)}
        />
      </label>

      {loading && <p className="checkout-note" role="status">Loading delivery areas…</p>}
      {error && (
        <div className="checkout-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      )}
      {selectedShipping && (
        <p className="checkout-zone-note">
          <MapPin size={15} aria-hidden="true" />
          {selectedShipping.zone} delivery · {formatNaira(Number(selectedShipping.shippingFee))}
        </p>
      )}
    </section>
  )
}

interface CheckoutMethodsProps {
  deliveryMethod: CheckoutDetails['deliveryMethod']
  paymentMethod: CheckoutDetails['paymentMethod']
  onDeliveryMethodChange: (method: CheckoutDetails['deliveryMethod']) => void
  onPaymentMethodChange: (method: CheckoutDetails['paymentMethod']) => void
}

export function CheckoutMethods({
  deliveryMethod,
  paymentMethod,
  onDeliveryMethodChange,
  onPaymentMethodChange,
}: CheckoutMethodsProps) {
  return (
    <>
      <section className="checkout-card">
        <div className="checkout-card-heading">
          <span className="checkout-step">02</span>
          <div>
            <h2>Delivery method</h2>
            <p>Delivery fees are based on your destination.</p>
          </div>
        </div>
        <fieldset className="checkout-options">
          <legend>Available delivery</legend>
          <label>
            <input
              type="radio"
              name="deliveryMethod"
              value="standard"
              checked={deliveryMethod === 'standard'}
              onChange={() => onDeliveryMethodChange('standard')}
            />
            <span>
              <strong>Standard home delivery</strong>
              <small>The delivery fee is shown in the order summary.</small>
            </span>
          </label>
        </fieldset>
      </section>

      <section className="checkout-card">
        <div className="checkout-card-heading">
          <span className="checkout-step">03</span>
          <div>
            <h2>Payment method</h2>
            <p>No payment gateway or financial details are used.</p>
          </div>
        </div>
        <fieldset className="checkout-options">
          <legend>Available payment method</legend>
          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="demo"
              checked={paymentMethod === 'demo'}
              onChange={() => onPaymentMethodChange('demo')}
            />
            <span>
              <strong><CreditCard size={15} aria-hidden="true" /> Demo payment</strong>
              <small>Simulates payment confirmation; no actual charge is made.</small>
            </span>
          </label>
        </fieldset>
      </section>
    </>
  )
}

interface CheckoutOrderSummaryProps {
  items: ShoppingCartItem[]
  subtotal: string
  shippingFee: string | null
  total: number | null
}

export function CheckoutOrderSummary({
  items,
  subtotal,
  shippingFee,
  total,
}: CheckoutOrderSummaryProps) {
  return (
    <aside className="shopping-summary checkout-summary">
      <p className="store-eyebrow">ORDER SUMMARY</p>
      <div className="checkout-summary-items">
        {items.map(({ product, quantity }) => (
          <div key={product.id}>
            <span>
              {product.name}
              <small>× {quantity} · {formatNaira(Number(product.price))} each</small>
            </span>
            <strong>{formatNaira(Number(product.price) * quantity)}</strong>
          </div>
        ))}
      </div>
      <dl className="checkout-summary-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatNaira(Number(subtotal))}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{shippingFee ? formatNaira(Number(shippingFee)) : 'Choose a state'}</dd>
        </div>
        <div className="checkout-total">
          <dt>Total</dt>
          <dd>{total === null ? 'Choose a state' : formatNaira(total)}</dd>
        </div>
      </dl>
      <p>Final totals are recalculated by the server. No financial transaction is made.</p>
    </aside>
  )
}
