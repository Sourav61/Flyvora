import React, { useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import "./featuredJourney.scss";
import { featuredJourneys, getFeaturedJourneyBySlug } from "./featuredJourneyData";

const highlightIconMap = {
  "why-now": <LightbulbRoundedIcon fontSize="small" />,
  flyvora: <VerifiedUserRoundedIcon fontSize="small" />,
};

const buildJourneySearchUrl = (journey) => {
  const searchParams = new URLSearchParams();

  if (journey?.ctaRoute?.source) {
    searchParams.set("source", journey.ctaRoute.source);
  }

  if (journey?.ctaRoute?.destination) {
    searchParams.set("destination", journey.ctaRoute.destination);
  }

  searchParams.set("tripType", "one-way");
  searchParams.set("fromJourney", journey?.slug || "");

  return `/?${searchParams.toString()}#search-panel`;
};

const FeaturedJourney = () => {
  const { journeySlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const journey = getFeaturedJourneyBySlug(journeySlug);

  const relatedJourneys = useMemo(
    () => featuredJourneys.filter((item) => item.slug !== journey?.slug).slice(0, 3),
    [journey?.slug]
  );

  if (!journey) {
    return <Navigate to="/" replace />;
  }

  const userDisplayName = user?.given_name || user?.name || "Traveler";

  return (
    <main className="featured-journey-page">
      <header className="featured-journey-page__nav">
        <div className="featured-journey-page__shell featured-journey-page__nav-inner">
          <Link className="featured-journey-page__brand" to="/">Flyvora</Link>
          <nav className="featured-journey-page__links">
            <Link to="/#search-panel">Flights</Link>
            <Link to="/bookings">Bookings</Link>
            <span className="is-active">Explore</span>
            <Link to="/#support">Support</Link>
          </nav>
          <div className="featured-journey-page__actions">
            {isLoading ? null : isAuthenticated ? (
              <>
                <Link className="featured-journey-page__profile-link" to="/bookings">
                  {user?.picture ? (
                    <img src={user.picture} alt={userDisplayName} />
                  ) : (
                    <span>{userDisplayName.charAt(0)}</span>
                  )}
                  <strong>{userDisplayName}</strong>
                </Link>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button button--primary"
                onClick={() =>
                  loginWithRedirect({
                    appState: { returnTo: `/journeys/${journey.slug}` },
                    authorizationParams: { connection: "google-oauth2", prompt: "login" },
                  })
                }
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <section
        className="featured-journey-page__hero"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(9, 20, 42, 0.15), rgba(9, 20, 42, 0.72)), url(${journey.heroImage})` }}
      >
        <div className="featured-journey-page__shell featured-journey-page__hero-content">
          <span className="featured-journey-page__eyebrow">{journey.heroEyebrow}</span>
          <h1>{journey.heroTitle}</h1>
          <p>{journey.heroDescription}</p>
        </div>
      </section>

      <section className="featured-journey-page__section">
        <div className="featured-journey-page__shell featured-journey-page__intro-grid">
          <div>
            <span className="featured-journey-page__section-label">The Digital Concierge</span>
            <h2>{journey.conciergeTitle}</h2>
          </div>
          <div className="featured-journey-page__intro-copy">
            <p>{journey.conciergeBody}</p>
            <div className="featured-journey-page__highlight-grid">
              {journey.highlights.map((highlight) => (
                <article key={highlight.key} className="featured-journey-page__highlight-card">
                  <div className="featured-journey-page__highlight-icon">
                    {highlightIconMap[highlight.key] || <MenuBookRoundedIcon fontSize="small" />}
                  </div>
                  <h3>{highlight.title}</h3>
                  <p>{highlight.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="featured-journey-page__section">
        <div className="featured-journey-page__shell">
          <div className="featured-journey-page__section-head">
            <div>
              <span className="featured-journey-page__section-label">Curated Selection</span>
              <h2>Top Experiences</h2>
            </div>
            <button
              type="button"
              className="featured-journey-page__secondary-link"
              onClick={() => navigate(buildJourneySearchUrl(journey))}
            >
              Plan this route <ArrowForwardRoundedIcon fontSize="inherit" />
            </button>
          </div>

          <div className="featured-journey-page__experience-grid">
            {journey.experiences.map((experience) => (
              <article
                key={experience.title}
                className={`featured-journey-page__experience-card ${experience.featured ? "featured-journey-page__experience-card--featured" : ""}`}
              >
                <img src={experience.image} alt={experience.title} />
                <div className="featured-journey-page__experience-overlay" />
                <div className="featured-journey-page__experience-content">
                  <span>{experience.tag}</span>
                  <h3>{experience.title}</h3>
                  <p>{experience.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-journey-page__section featured-journey-page__section--compact">
        <div className="featured-journey-page__shell">
          <div className="featured-journey-page__center-copy">
            <span className="featured-journey-page__section-label">Expand Your Horizons</span>
            <h2>More Featured Journeys</h2>
            <p>Explore other Flyvora destination pages without losing the same premium search flow.</p>
          </div>

          <div className="featured-journey-page__related-grid">
            {relatedJourneys.map((item) => (
              <Link key={item.slug} className="featured-journey-page__related-card" to={`/journeys/${item.slug}`}>
                <img src={item.cardImage} alt={item.city} />
                <div className="featured-journey-page__related-overlay" />
                <div className="featured-journey-page__related-content">
                  <h3>{item.city}, {item.country}</h3>
                  <p>{item.cardNote}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-journey-page__section featured-journey-page__section--cta">
        <div className="featured-journey-page__shell">
          <div className="featured-journey-page__cta-card">
            <div>
              <span className="featured-journey-page__section-label featured-journey-page__section-label--light">
                Ready To Explore?
              </span>
              <h2>Book the {journey.city} route.</h2>
              <p>
                We will take you straight back to the Flyvora homepage search panel with the route preset, so you can confirm dates and continue without starting over.
              </p>
              <div className="featured-journey-page__cta-pills">
                <span><VerifiedUserRoundedIcon fontSize="inherit" /> Verified booking flow</span>
                <span><PublicRoundedIcon fontSize="inherit" /> Same Flyvora experience</span>
              </div>
            </div>
            <button
              type="button"
              className="featured-journey-page__cta-button"
              onClick={() => navigate(buildJourneySearchUrl(journey))}
            >
              <span>Book a Flight</span>
              <FlightTakeoffRoundedIcon fontSize="small" />
            </button>
          </div>
        </div>
      </section>

      <footer className="featured-journey-page__footer">
        <div className="featured-journey-page__shell featured-journey-page__footer-grid">
          <div>
            <strong>Flyvora</strong>
            <p>The Digital Concierge for polished flight journeys.</p>
          </div>
          <div>
            <span>Explore</span>
            <Link to="/">Homepage</Link>
            <Link to="/bookings">Bookings</Link>
          </div>
          <div>
            <span>Legal</span>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
          <div>
            <span>Support</span>
            <a href="mailto:hello@flyvora.com">hello@flyvora.com</a>
            <a href="/#support">Concierge</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default FeaturedJourney;

