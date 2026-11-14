import { Link } from 'react-router-dom'
import { formatNaira } from '../../lib/formatCurrency'

interface CartSummaryProps {
  subtotal: string
}

export function CartSummary({ subtotal }: CartSummaryProps) {
  return (
    <aside className="shopping-summary">
      <p className="store-eyebrow">ORDER SUMMARY</p>
      <dl className="cart-summary-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatNaira(Number(subtotal))}</dd>
        </div>
      </dl>
      <p>Delivery and any applicable charges are calculated at checkout.</p>
      <Link className="button button-dark" to="/checkout">
        Proceed to checkout
      </Link>
    </aside>
  )
}
