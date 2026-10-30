import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  RotateCcw,
  Search,
  Sparkles,
  X,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { SiteHeader } from '../components/SiteHeader'
import { formatNaira } from '../data/mockStore'
import {
  catalogApi,
  type CatalogCategory,
  type CatalogProduct,
} from '../services/catalogApi'

const fallbackProductImage =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=85'

const categoryImageByKeyword: Array<[string, string]> = [
  ['fashion', 'photo-1483985988355-763728e1935b'],
  ['accessor', 'photo-1483985988355-763728e1935b'],
  ['electronic', 'photo-1498049794561-7780e7231661'],
  ['tech', 'photo-1498049794561-7780e7231661'],
  ['beauty', 'photo-1608248543803-ba4f8c70ae0b'],
  ['self-care', 'photo-1608248543803-ba4f8c70ae0b'],
  ['home', 'photo-1616486338812-3dadae4b4ace'],
  ['living', 'photo-1616486338812-3dadae4b4ace'],
]

function getCategoryImage(slug: string): string {
  const match = categoryImageByKeyword.find(([keyword]) =>
    slug.toLowerCase().includes(keyword),
  )

  const imageId = match?.[1] ?? 'photo-1490481651871-ab68de25d43d'

  return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=800&q=85`
}

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [hasMoreProducts, setHasMoreProducts] = useState(false)

  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')

  // This also tracks requests started by user interactions.
  // It is not reset synchronously inside the effect.
  const [productsLoading, setProductsLoading] = useState(true)

  const [catalogError, setCatalogError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const [cartCount, setCartCount] = useState(0)
  const [notification, setNotification] = useState('')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    catalogApi
      .getCategories(controller.signal)
      .then((data) => {
        setCategories(data)
        setCategoriesError('')
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setCategoriesError(error.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    catalogApi
      .getProducts({
        page,
        limit: 12,
        search: searchTerm,
        categorySlug: activeCategory === 'all' ? undefined : activeCategory,
        signal: controller.signal,
      })
      .then((result) => {
        setProducts(result.products)
        setHasMoreProducts(result.pagination.hasMore)
        setCatalogError('')
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setCatalogError(error.message)
          setProducts([])
          setHasMoreProducts(false)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProductsLoading(false)
        }
      })

    return () => controller.abort()
  }, [activeCategory, page, retryKey, searchTerm])

  function showNotification(message: string) {
    setNotification(message)
  }

  function addToBag(productName: string) {
    // Guests can use the cart. Sign-in is required later at checkout.
    setCartCount((count) => count + 1)
    showNotification(`${productName} added to your bag.`)
  }

  function handleWishlist(productName: string) {
    if (!user) {
      navigate('/login', { state: { from: '/' } })
      return
    }

    // Wishlist persistence will be implemented with the backend.
    showNotification(
      `Saving ${productName} to your wishlist will be available soon.`,
    )
  }

  function selectCategory(categorySlug: string) {
    setProductsLoading(true)
    setActiveCategory(categorySlug)
    setPage(1)
    setSearchTerm('')

    document.getElementById('products')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  function clearFilters() {
    setProductsLoading(true)
    setActiveCategory('all')
    setPage(1)
    setSearchTerm('')
  }

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      return
    }

    // This is a UI preview. No email is sent or stored yet.
    setSubscribed(true)
  }

  function handleSearchChange(value: string) {
    setProductsLoading(true)
    setSearchTerm(value)
    setPage(1)
  }

  function handleProductImageError(
    event: React.SyntheticEvent<HTMLImageElement>,
  ) {
    const image = event.currentTarget

    // Prevent repeatedly trying the same fallback image.
    if (image.dataset.fallbackApplied === 'true') {
      return
    }

    image.dataset.fallbackApplied = 'true'
    image.src = fallbackProductImage
  }

  const activeCategoryName = categories.find(
    (category) => category.slug === activeCategory,
  )?.name

    function changePage(nextPage: number) {
    setPage(nextPage)

    document.getElementById('products')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <>
      <div className="store-header-shell">
        <div className="announcement-bar">
          <span>Good finds. Good prices. Good everyday.</span>

          <span className="announcement-extra">
            Thoughtfully picked, just for you
            <Sparkles size={13} aria-hidden="true" />
          </span>
        </div>

        <SiteHeader cartCount={cartCount} />
      </div>

      <main className="store-home">
        <section className="store-hero">
          <div className="store-hero-copy">
            <p className="store-eyebrow">
              <span />
              THE EVERYDAY EDIT — VOL. 01
            </p>

            <h1>
              Find your next
              <br />
              <em>favourite thing.</em>
            </h1>

            <p className="store-hero-description">
              From little upgrades to things you’ll love for years. Discover
              thoughtful finds for every part of your day.
            </p>

            <div className="store-hero-actions">
              <a
                className="button button-dark store-primary-button"
                href="#products"
              >
                Shop the collection
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>

              <a className="store-text-link" href="#categories">
                Explore categories
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>

            <div className="store-hero-proof">
              <div className="proof-avatars" aria-hidden="true">
                <span>E</span>
                <span>+</span>
                <Heart size={13} aria-hidden="true" />
              </div>

              <p>
                <strong>A better kind of browsing.</strong>
                <br />
                Useful finds, all in one place.
              </p>
            </div>
          </div>

          <div className="store-hero-visual">
            <img
              className="store-hero-image"
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=90"
              alt="Fashion and lifestyle pieces in a warm, neutral setting"
            />

            <div className="hero-image-label">
              <span className="hero-label-icon" aria-hidden="true">
                <Sparkles size={17} />
              </span>

              <span>
                <strong>Everyday, elevated.</strong>
                <small>Small things. Better days.</small>
              </span>
            </div>

            <div className="hero-image-index">EMMANEX / 001</div>
          </div>
        </section>

        <section className="store-benefits" aria-label="Shopping benefits">
          <article>
            <span className="benefit-icon">
              <Truck size={19} aria-hidden="true" />
            </span>

            <div>
              <strong>Delivery made simple</strong>
              <p>Convenient delivery options</p>
            </div>
          </article>

          <article>
            <span className="benefit-icon">
              <ShieldCheck size={19} aria-hidden="true" />
            </span>

            <div>
              <strong>Shop with confidence</strong>
              <p>Secure shopping experience</p>
            </div>
          </article>

          <article>
            <span className="benefit-icon">
              <RotateCcw size={19} aria-hidden="true" />
            </span>

            <div>
              <strong>Here to help</strong>
              <p>Support when you need it</p>
            </div>
          </article>
        </section>

        <section
          className="store-section categories-section"
          id="categories"
        >
          <div className="section-heading">
            <div>
              <p className="store-eyebrow">A LITTLE BIT OF EVERYTHING</p>
              <h2>What are you in the mood for?</h2>
            </div>

            <p className="section-side-note">
              Good things for every corner
              <br />
              of your everyday.
            </p>
          </div>

          <div className="category-grid">
            {categoriesLoading ? null : categoriesError ? (
              <p role="alert">{categoriesError}</p>
            ) : categories.length === 0 ? (
              <p>No categories are available yet.</p>
            ) : (
              categories.map((category, index) => (
                <button
                  className={`category-card ${
                    activeCategory === category.slug
                      ? 'category-card-active'
                      : ''
                  }`}
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.slug)}
                  aria-pressed={activeCategory === category.slug}
                >
                  <span className="category-image-wrap">
                    <img
                      src={getCategoryImage(category.slug)}
                      alt=""
                      loading="lazy"
                    />

                    <span className="category-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="category-arrow" aria-hidden="true">
                      <ArrowUpRight size={17} />
                    </span>
                  </span>

                  <span className="category-card-title">
                    {category.name}
                  </span>

                  <span className="category-card-description">
                    {category.description || 'Explore the collection'}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="store-section products-section" id="products">
          <div className="section-heading products-heading">
            <div>
              <p className="store-eyebrow">THE GOOD STUFF</p>

              <h2>
                {activeCategory === 'all'
                  ? 'Little things, big favourites.'
                  : `${activeCategoryName ?? 'Our'} picks.`}
              </h2>
            </div>

            <div className="product-tools">
              <label className="product-search">
                <Search size={17} aria-hidden="true" />

                <span className="sr-only">Search products</span>

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    handleSearchChange(event.target.value)
                  }
                  placeholder="Find something..."
                />
              </label>

              {(activeCategory !== 'all' || searchTerm) && (
                <button
                  className="clear-filter"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div
            className="product-filter-row"
            aria-label="Filter products by category"
          >
            <button
              className={`filter-chip ${
                activeCategory === 'all' ? 'active' : ''
              }`}
              type="button"
              onClick={() => selectCategory('all')}
              aria-pressed={activeCategory === 'all'}
            >
              All finds
            </button>

            {categories.map((category) => (
              <button
                className={`filter-chip ${
                  activeCategory === category.slug ? 'active' : ''
                }`}
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.slug)}
                aria-pressed={activeCategory === category.slug}
              >
                {category.name}
              </button>
            ))}
          </div>

          {catalogError ? (
            <div className="empty-products" role="alert">
              <h3>We couldn’t load the collection</h3>
              <p>{catalogError}</p>

              <button
                className="button button-dark"
                type="button"
                onClick={() => {
                  setProductsLoading(true)
                  setRetryKey((current) => current + 1)
                }}
              >
                Try again
              </button>
            </div>
          ) : products.length > 0 ? (
            <div className="product-grid" aria-busy={productsLoading}>
              {products.map((product) => {
                const image = product.imageUrl || fallbackProductImage

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image-wrap">
                      <img
                        src={image}
                        alt={product.name}
                        loading="lazy"
                        onError={handleProductImageError}
                      />

                      {!product.inStock && (
                        <span className="product-label">
                          Out of stock
                        </span>
                      )}

                      <button
                        className="product-wishlist"
                        type="button"
                        aria-label={`Save ${product.name} to wishlist`}
                        onClick={() => handleWishlist(product.name)}
                      >
                        <Heart size={17} aria-hidden="true" />
                      </button>

                      <button
                        className="quick-add"
                        type="button"
                        disabled={!product.inStock}
                        onClick={() => addToBag(product.name)}
                      >
                        <ShoppingBag size={15} aria-hidden="true" />

                        {product.inStock ? 'Add to bag' : 'Out of stock'}
                      </button>
                    </div>

                    <div className="product-card-details">
                      <div className="product-category-name">
                        {product.category?.name ?? 'Emmanex collection'}
                      </div>

                      <h3>{product.name}</h3>

                      <div className="product-prices">
                        <strong>
                          {formatNaira(Number(product.price))}
                        </strong>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : productsLoading ? (
            <div
              className="empty-products"
              aria-hidden="true"
            />
          ) : (
            <div className="empty-products">
              <Search size={25} aria-hidden="true" />
              <h3>No finds just yet</h3>
              <p>Try another search or browse the full collection.</p>

              <button
                className="button button-dark"
                type="button"
                onClick={clearFilters}
              >
                See all products
              </button>
            </div>
          )}

          {!catalogError && products.length > 0 && (
            <div className="catalog-pagination" aria-label="Product pagination">
              <button
                className="button button-light"
                type="button"
                disabled={page === 1 || productsLoading}
                onClick={() => changePage(Math.max(1, page - 1))}
              >
                Previous
              </button>

              <span>Page {page}</span>

              <button
                className="button button-light"
                type="button"
                disabled={!hasMoreProducts || productsLoading}
                onClick={() => changePage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>

        <section className="editorial-banner">
          <div className="editorial-image">
            <img
              src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1100&q=85"
              alt="Calm, thoughtfully styled home interior"
              loading="lazy"
            />
          </div>

          <div className="editorial-copy">
            <p className="store-eyebrow">MAKE ROOM FOR GOOD THINGS</p>

            <h2>
              A little more joy
              <br />
              in the everyday.
            </h2>

            <p>
              Useful, lovely, and easy to make your own. Your next favourite
              might be closer than you think.
            </p>

            <a className="button button-light" href="#products">
              Find your favourite
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>

            <span className="editorial-stamp">
              THE EMMANEX EDIT <Sparkles size={10} aria-hidden="true" />
            </span>
          </div>
        </section>

        <section className="newsletter-section" id="newsletter">
          <div className="newsletter-mark" aria-hidden="true">
            E
          </div>

          <div className="newsletter-copy">
            <p className="store-eyebrow">A NOTE FROM EMMANEX</p>
            <h2>Good things in your inbox.</h2>

            <p>
              Get first looks at new finds, thoughtful edits, and little offers
              worth opening.
            </p>
          </div>

          {subscribed ? (
            <div className="newsletter-success" role="status">
              <span>
                <Check size={18} aria-hidden="true" />
              </span>

              <div>
                <strong>You’re on the list.</strong>
                <p>Thanks for joining the Emmanex preview.</p>
              </div>
            </div>
          ) : (
            <form
              className="newsletter-form"
              onSubmit={handleNewsletterSubmit}
            >
              <label className="sr-only" htmlFor="newsletter-email">
                Your email address
              </label>

              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                required
              />

              <button
                type="submit"
                aria-label="Subscribe to newsletter"
              >
                <ArrowRight size={19} aria-hidden="true" />
              </button>

              <small>
                Newsletter signup is a preview and does not submit your email
                yet.
              </small>
            </form>
          )}
        </section>

        <section className="final-join-banner">
          <div>
            <p className="store-eyebrow">YOUR EVERYDAY, YOUR WAY</p>
            <h2>Good things look good on you.</h2>

            <p>
              Create your account to get ready for the full Emmanex shopping
              experience.
            </p>
          </div>

          {user ? (
            <Link className="button button-dark" to="/account">
              Go to your account
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <Link className="button button-dark" to="/register">
              Join Emmanex
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}
        </section>
      </main>

      <footer className="store-footer">
        <div className="footer-main">
          <Link className="wordmark" to="/" aria-label="Emmanex home">
            <span className="wordmark-mark">E</span>
            <span>emmanex</span>
          </Link>

          <p>
            Good things, chosen well.
            <br />A little more everyday wonder.
          </p>

          <div className="footer-links">
            <a href="#categories">Shop categories</a>
            <a href="#products">Featured finds</a>

            {user ? (
              <Link to="/account">My account</Link>
            ) : (
              <Link to="/login">Sign in</Link>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Emmanex. All rights reserved.
          </span>

          <span>
            Made for everyday living <Sparkles size={10} aria-hidden="true" />
          </span>

          <span>Prices shown in Nigerian naira (₦)</span>
        </div>
      </footer>

      {notification && (
        <div className="store-toast" role="status">
          <Check size={17} aria-hidden="true" />

          <span>{notification}</span>

          <button
            type="button"
            onClick={() => setNotification('')}
            aria-label="Dismiss notification"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}