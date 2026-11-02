import type { SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag } from 'lucide-react'
import type { CatalogProduct } from '../../services/catalogApi'
import { formatNaira } from '../../lib/formatCurrency'

type ProductCardProps = {
  product: CatalogProduct
  saved: boolean
  onAddToBag: (product: CatalogProduct) => void
  onToggleWishlist: (product: CatalogProduct) => void
  onImageError: (event: SyntheticEvent<HTMLImageElement>) => void
}

const fallbackProductImage =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=85'

export function ProductCard({
  product,
  saved,
  onAddToBag,
  onToggleWishlist,
  onImageError,
}: ProductCardProps) {
  const image = product.imageUrl || fallbackProductImage

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link className="product-image-link" to={`/products/${encodeURIComponent(product.slug)}`} aria-label={`View ${product.name}`}>
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={onImageError}
          />
        </Link>

        {!product.inStock && (
          <span className="product-label">Out of stock</span>
        )}

        <button
          className={`product-wishlist${saved ? ' is-saved' : ''}`}
          type="button"
          aria-label={`${saved ? 'Remove' : 'Save'} ${product.name} ${saved ? 'from' : 'to'} wishlist`}
          aria-pressed={saved}
          onClick={() => onToggleWishlist(product)}
        >
          <Heart
            size={17}
            fill={saved ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>

        <button
          className="quick-add"
          type="button"
          disabled={!product.inStock}
          onClick={() => onAddToBag(product)}
        >
          <ShoppingBag size={15} aria-hidden="true" />
          {product.inStock ? 'Add to bag' : 'Out of stock'}
        </button>
      </div>

      <div className="product-card-details">
        <div className="product-category-name">
          {product.category?.name ?? 'Emmanex collection'}
        </div>
        <h3><Link className="product-title-link" to={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link></h3>
        <div className="product-prices">
          <strong>{formatNaira(Number(product.price))}</strong>
        </div>
      </div>
    </article>
  )
}
