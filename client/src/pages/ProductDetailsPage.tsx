import { useEffect, useState, type SyntheticEvent } from 'react'
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SiteHeader } from '../components/SiteHeader'
import { useToast } from '../components/useToast'
import { useCart } from '../features/cart/useCart'
import { useWishlist } from '../features/wishlist/useWishlist'
import { formatNaira } from '../lib/formatCurrency'
import { catalogApi, type CatalogProduct } from '../services/catalogApi'

const fallbackImage =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85'

type ProductDetailsState =
  | { slug: string; status: 'loaded'; product: CatalogProduct }
  | { slug: string; status: 'error'; message: string }

export function ProductDetailsPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addItem } = useCart()
  const { isSaved, toggleItem } = useWishlist()
  const { showToast } = useToast()
  const [productDetails, setProductDetails] =
    useState<ProductDetailsState | null>(null)
  const [quantityState, setQuantityState] = useState({ slug, value: 1 })
  const isCurrentProduct = productDetails?.slug === slug
  const product =
    isCurrentProduct && productDetails.status === 'loaded'
      ? productDetails.product
      : null
  const error =
    isCurrentProduct && productDetails.status === 'error'
      ? productDetails.message
      : ''
  const loading = !isCurrentProduct
  const quantity = quantityState.slug === slug ? quantityState.value : 1

  useEffect(() => {
    const controller = new AbortController()

    catalogApi
      .getProductBySlug(slug, controller.signal)
      .then((loadedProduct) => {
        if (!controller.signal.aborted) {
          setProductDetails({
            slug,
            status: 'loaded',
            product: loadedProduct,
          })
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return

        const message =
          reason instanceof Error && reason.name !== 'AbortError'
            ? reason.message
            : ''
        setProductDetails({ slug, status: 'error', message })
      })

    return () => controller.abort()
  }, [slug])

  function updateQuantity(nextQuantity: number) {
    setQuantityState({ slug, value: Math.max(1, nextQuantity) })
  }

  function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget
    if (image.dataset.fallbackApplied === 'true') return
    image.dataset.fallbackApplied = 'true'
    image.src = fallbackImage
  }

  function handleAddToBag() {
    if (!product) return

    void addItem(product, quantity)
      .then(() => {
        showToast({
          type: 'success',
          title: 'Added to your bag',
          message: `${product.name} × ${quantity}`,
        })
      })
      .catch((error: unknown) => {
        showToast({
          type: 'error',
          title: 'Could not add product',
          message: error instanceof Error ? error.message : 'Please try again.',
        })
      })
  }

  function handleWishlist() {
    if (!product) return

    if (!user) {
      navigate('/login', { state: { from: `/products/${product.slug}` } })
      return
    }
    const wasSaved = isSaved(product.id)
    void toggleItem(product)
      .then(() => {
        showToast({
          type: wasSaved ? 'info' : 'success',
          title: wasSaved ? 'Removed from wishlist' : 'Added to wishlist',
          message: product.name,
        })
      })
      .catch((error: unknown) => {
        showToast({
          type: 'error',
          title: 'Wishlist could not be updated',
          message: error instanceof Error ? error.message : 'Please try again.',
        })
      })
  }

  return (
    <>
      <div className="store-header-shell">
        <SiteHeader />
      </div>
      <main className="product-details-page">
        <Link className="shopping-back-link" to="/">
          <ArrowLeft size={15} />
          Back to the collection
        </Link>

        {loading ? (
          <div className="product-details-state" role="status">
            Loading product details…
          </div>
        ) : error || !product ? (
          <section className="product-details-state" role="alert">
            <h1>We couldn't find this product</h1>
            <p>{error || 'This product may no longer be available.'}</p>
            <Link className="button button-dark" to="/">
              Return to the collection
            </Link>
          </section>
        ) : (
          <section className="product-details-layout">
            <div className="product-details-image">
              <img
                src={product.imageUrl || fallbackImage}
                alt={product.name}
                onError={handleImageError}
              />
            </div>
            <div className="product-details-copy">
              <p className="store-eyebrow">
                {product.category?.name ?? 'EMMANEX COLLECTION'}
              </p>
              <h1>{product.name}</h1>
              <p className="product-details-price">
                {formatNaira(Number(product.price))}
              </p>
              <div className="product-details-rule" />
              <p className="product-details-description">
                {product.description ||
                  'A considered find from the Emmanex collection. Add it to your bag to keep it with your selections.'}
              </p>
              <p
                className={`product-stock ${
                  product.inStock ? 'is-available' : 'is-unavailable'
                }`}
              >
                {product.inStock ? 'In stock' : 'Currently unavailable'}
              </p>

              <div className="product-details-quantity">
                <span>Quantity</span>
                <div className="quantity-control">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => updateQuantity(quantity - 1)}
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="product-details-actions">
                <button
                  className="button button-dark"
                  type="button"
                  disabled={!product.inStock}
                  onClick={handleAddToBag}
                >
                  <ShoppingBag size={17} />
                  Add to bag
                </button>
                <button
                  className={`product-details-wishlist${
                    isSaved(product.id) ? ' is-saved' : ''
                  }`}
                  type="button"
                  onClick={handleWishlist}
                  aria-pressed={isSaved(product.id)}
                >
                  <Heart
                    size={18}
                    fill={isSaved(product.id) ? 'currentColor' : 'none'}
                  />
                  {isSaved(product.id) ? 'Saved' : 'Add to wishlist'}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="minimal-footer">
        <Link to="/">
          <ArrowLeft size={14} />
          Back to Emmanex
        </Link>
        <span>Prices shown in Nigerian naira (₦)</span>
      </footer>
    </>
  )
}
