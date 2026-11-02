import type { SyntheticEvent } from 'react'
import type { CatalogProduct } from '../../services/catalogApi'
import { ProductCard } from './ProductCard'

type ProductGridProps = {
  products: CatalogProduct[]
  isSaved: (productId: string) => boolean
  onAddToBag: (product: CatalogProduct) => void
  onToggleWishlist: (product: CatalogProduct) => void
  onImageError: (event: SyntheticEvent<HTMLImageElement>) => void
  loading: boolean
}

export function ProductGrid({
  products,
  isSaved,
  onAddToBag,
  onToggleWishlist,
  onImageError,
  loading,
}: ProductGridProps) {
  return (
    <div className="product-grid" aria-busy={loading}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          saved={isSaved(product.id)}
          onAddToBag={onAddToBag}
          onToggleWishlist={onToggleWishlist}
          onImageError={onImageError}
        />
      ))}
    </div>
  )
}
