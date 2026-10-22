import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useAuth } from '../auth/AuthProvider'

export function HomePage() {
  const { user, status, error, refreshSession } = useAuth()

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span /> A little more everyday wonder</div>
            <h1>Good things,<br /><em>chosen well.</em></h1>
            <p className="hero-description">
              Emmanex is making room for the things you’ll love having around.
              Thoughtful finds, a simple experience, and a store that feels like yours.
            </p>
            <div className="hero-actions">
              {user ? (
                <Link className="button button-dark" to="/account">Go to your account <span aria-hidden="true">↗</span></Link>
              ) : (
                <>
                  <Link className="button button-dark" to="/register">Join Emmanex <span aria-hidden="true">↗</span></Link>
                  <Link className="button button-outline" to="/login">I already have an account</Link>
                </>
              )}
            </div>
            {status === 'error' && (
              <div className="inline-warning" role="status">
                We couldn’t check your sign-in status.{' '}
                <button onClick={() => void refreshSession()}>Try again</button>
                {error ? <span className="sr-only"> {error}</span> : null}
              </div>
            )}
            <div className="hero-note">
              <span className="note-line" />
              <span>Our first collection is on its way.</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Abstract illustration in warm store colors" role="img">
            <div className="art-sun" />
            <div className="art-loop art-loop-one" />
            <div className="art-loop art-loop-two" />
            <div className="art-card art-card-back" />
            <div className="art-card art-card-front">
              <span className="art-sparkle">✳</span>
              <span className="art-card-label">THE EVERYDAY<br />EDIT</span>
              <span className="art-card-sub">EMMANEX · Nº 01</span>
            </div>
            <div className="art-orb art-orb-one" />
            <div className="art-orb art-orb-two" />
            <div className="art-caption">Made for the moments in between.</div>
          </div>
        </section>

        <section className="value-strip" aria-label="The Emmanex experience">
          <article>
            <span className="value-number">01</span>
            <div><h2>Chosen with care</h2><p>A considered collection for everyday living.</p></div>
          </article>
          <article>
            <span className="value-number">02</span>
            <div><h2>Made to feel easy</h2><p>A thoughtful, uncomplicated way to shop.</p></div>
          </article>
          <article>
            <span className="value-number">03</span>
            <div><h2>Yours from the start</h2><p>Create an account and be part of what’s next.</p></div>
          </article>
        </section>

        <section className="collection-callout">
          <div className="callout-mark">E</div>
          <div>
            <p className="eyebrow">A new chapter in everyday shopping</p>
            <h2>Something good is<br />taking shape.</h2>
          </div>
          <p className="callout-detail">
            Product discovery and checkout are coming soon. For now, make your
            Emmanex account and we’ll have your place ready.
          </p>
          {!user && <Link className="text-link" to="/register">Create your account <span aria-hidden="true">→</span></Link>}
        </section>
      </main>
      <footer className="site-footer">
        <Link className="wordmark footer-wordmark" to="/"><span className="wordmark-mark">E</span><span>emmanex</span></Link>
        <span>Good things are on their way.</span>
        <span>© {new Date().getFullYear()} Emmanex</span>
      </footer>
    </>
  )
}
