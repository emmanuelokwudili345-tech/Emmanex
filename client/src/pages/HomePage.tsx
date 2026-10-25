import { useMemo, useState, type FormEvent } from 'react'
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
  Star,
  Truck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { SiteHeader } from '../components/SiteHeader'
import {
  formatNaira,
  mockCategories,
  mockProducts,
} from '../data/mockStore'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [cartCount, setCartCount] = useState(0)
  const [notification, setNotification] = useState('')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const visibleProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return mockProducts.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' || product.category === activeCategory

      const categoryName =
        mockCategories.find((category) => category.id === product.category)
          ?.name ?? ''

      const searchableText = `${product.name} ${categoryName}`.toLowerCase()
      const matchesSearch = !query || searchableText.includes(query)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchTerm])

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

  function selectCategory(categoryId: string) {
    setActiveCategory(categoryId)
    setSearchTerm('')
    document.getElementById('products')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  function clearFilters() {
    setActiveCategory('all')
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

  const activeCategoryName =
    mockCategories.find((category) => category.id === activeCategory)?.name

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
            {mockCategories.map((category, index) => (
              <button
                className={`category-card ${
                  activeCategory === category.id
                    ? 'category-card-active'
                    : ''
                }`}
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.id)}
                aria-pressed={activeCategory === category.id}
              >
                <span className="category-image-wrap">
                  <img src={category.image} alt="" loading="lazy" />
                  <span className="category-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="category-arrow" aria-hidden="true">
                    <ArrowUpRight size={17} />
                  </span>
                </span>

                <span className="category-card-title">{category.name}</span>
                <span className="category-card-description">
                  {category.description}
                </span>
              </button>
            ))}
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
                  onChange={(event) => setSearchTerm(event.target.value)}
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
              onClick={() => setActiveCategory('all')}
              aria-pressed={activeCategory === 'all'}
            >
              All finds
            </button>

            {mockCategories.map((category) => (
              <button
                className={`filter-chip ${
                  activeCategory === category.id ? 'active' : ''
                }`}
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                aria-pressed={activeCategory === category.id}
              >
                {category.name}
              </button>
            ))}
          </div>

          {visibleProducts.length > 0 ? (
            <div className="product-grid">
              {visibleProducts.map((product) => {
                const categoryName = mockCategories.find(
                  (category) => category.id === product.category,
                )?.name

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image-wrap">
                      <img
                        src={product.image}
                        alt={product.imageAlt}
                        loading="lazy"
                      />

                      {product.label && (
                        <span className="product-label">
                          {product.label}
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
                        onClick={() => addToBag(product.name)}
                      >
                        <ShoppingBag size={15} aria-hidden="true" />
                        Add to bag
                      </button>
                    </div>

                    <div className="product-card-details">
                      <div className="product-category-name">
                        {categoryName}
                      </div>

                      <h3>{product.name}</h3>

                      <div
                        className="product-rating"
                        aria-label={`Rating ${product.rating} out of 5 from ${product.reviews} reviews`}
                      >
                        <Star size={13} fill="currentColor" aria-hidden="true" />
                        <strong>{product.rating.toFixed(1)}</strong>
                        <span>({product.reviews})</span>
                      </div>

                      <div className="product-prices">
                        <strong>{formatNaira(product.price)}</strong>
                        {product.previousPrice !== undefined && (
                          <del>{formatNaira(product.previousPrice)}</del>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
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

          <p className="mock-data-note">
            Preview collection · Sample products and prices for design purposes
          </p>
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
              <button type="submit" aria-label="Subscribe to newsletter">
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