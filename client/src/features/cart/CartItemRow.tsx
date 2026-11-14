import { Minus, Plus, Trash2 } from 'lucide-react'
import { ImageWithSkeleton } from '../../components/ImageWithSkeleton'
import { formatNaira } from '../../lib/formatCurrency'
import type { ShoppingCartItem } from '../../services/shoppingApi'

const fallbackCartImage =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80'

interface CartItemRowProps {
  item: ShoppingCartItem
  onDecrease: () => void
  onIncrease: () => void
  onRemove: () => void
}

export function CartItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: CartItemRowProps) {
  const { product, quantity } = item

  return (
    <article className="shopping-item">
      <ImageWithSkeleton
        className="shopping-item-image"
        src={product.imageUrl || fallbackCartImage}
        alt={product.name}
        fallbackSrc={fallbackCartImage}
      />
      <div className="shopping-item-info">
        <span>{product.category?.name ?? 'Emmanex collection'}</span>
        <h2>{product.name}</h2>
        <strong>{formatNaira(Number(product.price))}</strong>
        <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
          <button
            type="button"
            aria-label={`Decrease quantity of ${product.name}`}
            disabled={quantity <= 1}
            onClick={onDecrease}
          >
            <Minus size={14} />
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity of ${product.name}`}
            onClick={onIncrease}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <button
        className="remove-cart-item"
        type="button"
        aria-label={`Remove ${product.name} from your bag`}
        onClick={onRemove}
      >
        <Trash2 size={17} />
      </button>
    </article>
  )
}
