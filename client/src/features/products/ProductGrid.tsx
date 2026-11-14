import type { CatalogProduct } from '../../services/catalogApi'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { ProductCard } from './ProductCard'

type ProductGridProps = {
  products: CatalogProduct[]
  isSaved: (productId: string) => boolean
  onAddToBag: (product: CatalogProduct) => void
  onToggleWishlist: (product: CatalogProduct) => void
}

export function ProductGrid({
  products,
  isSaved,
  onAddToBag,
  onToggleWishlist,
}: ProductGridProps) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          saved={isSaved(product.id)}
          onAddToBag={onAddToBag}
          onToggleWishlist={onToggleWishlist}
        />
      ))}
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid product-grid-skeleton" role="status" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <article className="product-card" key={index}>
          <div className="product-image-wrap">
            <LoadingSkeleton className="product-skeleton-image" />
          </div>
          <div className="product-card-details">
            <LoadingSkeleton className="product-skeleton-category" />
            <LoadingSkeleton className="product-skeleton-title" />
            <LoadingSkeleton className="product-skeleton-price" />
          </div>
        </article>
      ))}
    </div>
  )
}
