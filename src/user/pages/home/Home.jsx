import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import FlightTakeoffOutlinedIcon from "@mui/icons-material/FlightTakeoffOutlined";
import FlightLandOutlinedIcon from "@mui/icons-material/FlightLandOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DateTimeField from "../../components/DateTimeField";
import "./home.scss";

const featuredDestinations = [
  {
    city: "The New York Experience",
    note: "Explore Flights",
    tag: "Featured Destination",
    image:
      "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80",
    large: true,
  },
  {
    city: "Neon Tokyo",
    note: "Direct routes from Rs 740",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80",
  },
  {
    city: "London",
    note: "Classic city departures",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
  },
  {
    city: "Paris",
    note: "Curated premium weekends",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
  },
];

const perks = [
  {
    title: "Trusted Security",
    body: "Your data and payments are protected by layered backend validation and secure auth flow.",
  },
  {
    title: "24/7 Concierge",
    body: "Search publicly, shortlist quickly, and move into assisted booking only when you are ready.",
  },
  {
    title: "Intelligent Routing",
    body: "Calm search, clear results, and booking access only when the traveler is authenticated.",
  },
];

const travelerOptions = [
  { value: "1 Adult, Economy", label: "1 Adult, Economy" },
  { value: "2 Adults, Economy", label: "2 Adults, Economy" },
  { value: "1 Adult, Business", label: "1 Adult, Business" },
  { value: "2 Adults, Business", label: "2 Adults, Business" },
];

const Home = () => {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    source: "",
    destination: "",
    date: "",
    departureTime: "",
    travelers: "1 Adult, Economy",
  });

  const startGoogleLogin = (returnTo = "/bookings") => {
    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: {
        connection: "google-oauth2",
        prompt: "login",
      },
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleQuickRoute = (source, destination) => {
    setFilters((current) => ({
      ...current,
      source,
      destination,
    }));
  };

  const clearFilters = () => {
    setFilters({
      source: "",
      destination: "",
      date: "",
      departureTime: "",
      travelers: "1 Adult, Economy",
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <main className="home-page">
      <header className="home-page__nav">
        <div className="home-page__shell home-page__nav-inner">
          <div className="home-page__brand">Flyvora</div>
          <button
            type="button"
            className="home-page__menu-toggle"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            {isMobileMenuOpen ? <CloseRoundedIcon fontSize="small" /> : <MenuRoundedIcon fontSize="small" />}
          </button>
          <nav className={`home-page__links ${isMobileMenuOpen ? "is-open" : ""}`}>
            <a href="#search-panel" className="is-active">Flights</a>
            <a href="#destinations">Explore</a>
            <a href="#support">Support</a>
          </nav>
          <div className={`home-page__actions ${isMobileMenuOpen ? "is-open" : ""}`}>
            {isAuthenticated ? <span className="home-page__welcome">{user?.given_name || user?.name}</span> : null}
            <a href="/admin">Admin</a>
            {isLoading ? null : isAuthenticated ? (
              <>
                <button type="button" className="button button--secondary" onClick={() => window.location.assign("/bookings")}>My Bookings</button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                >
                  Logout
                </button>
              </>
            ) : (
              <button type="button" className="button button--primary" onClick={() => startGoogleLogin("/")}>Login</button>
            )}
          </div>
        </div>
      </header>

      <section className="home-page__hero">
        <div className="home-page__shell home-page__hero-inner">
          <p className="home-page__eyebrow">Digital Concierge</p>
          <h1>
            The art of <span>seamless</span> departure.
          </h1>
          <p className="home-page__copy">
            Experience flight booking reimagined as a digital concierge. Precision, calm, and elevated service for the modern voyager.
          </p>

          <form className="search-panel" id="search-panel" onSubmit={handleSubmit}>
            <label className="search-panel__field">
              <span>Departure</span>
              <div className="search-panel__control">
                <FlightTakeoffOutlinedIcon fontSize="small" />
                <input
                  name="source"
                  type="text"
                  placeholder="From where?"
                  value={filters.source}
                  onChange={handleChange}
                />
              </div>
            </label>
            <label className="search-panel__field">
              <span>Arrival</span>
              <div className="search-panel__control">
                <FlightLandOutlinedIcon fontSize="small" />
                <input
                  name="destination"
                  type="text"
                  placeholder="To where?"
                  value={filters.destination}
                  onChange={handleChange}
                />
              </div>
            </label>
            <div className="search-panel__field">
              <span>Date & Time</span>
              <div className="search-panel__control search-panel__control--picker">
                <DateTimeField
                  date={filters.date}
                  time={filters.departureTime}
                  onDateChange={(value) => setFilters((current) => ({ ...current, date: value }))}
                  onTimeChange={(value) => setFilters((current) => ({ ...current, departureTime: value }))}
                />
              </div>
            </div>
            <label className="search-panel__field">
              <span>Travelers</span>
              <div className="search-panel__control">
                <PersonOutlineOutlinedIcon fontSize="small" />
                <select name="travelers" value={filters.travelers} onChange={handleChange}>
                  {travelerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <div className="search-panel__actions">
              <button type="submit" className="button button--primary">Search Flights</button>
              <button type="button" className="button button--secondary" onClick={clearFilters}>Reset</button>
            </div>
          </form>

          <div className="home-page__quick-routes">
            <button type="button" onClick={() => handleQuickRoute("Delhi", "Mumbai")}>Delhi to Mumbai</button>
            <button type="button" onClick={() => handleQuickRoute("Bengaluru", "Goa")}>Bengaluru to Goa</button>
            <button type="button" onClick={() => handleQuickRoute("Chennai", "Dubai")}>Chennai to Dubai</button>
          </div>
        </div>
      </section>

      <section className="destinations" id="destinations">
        <div className="home-page__shell">
          <div className="section-head">
            <div>
              <p className="section-head__eyebrow">Featured Journeys</p>
              <h2>Curated destinations for modern flyers</h2>
            </div>
            <a href="#search-panel">Build your search</a>
          </div>

          <div className="destinations__grid">
            {featuredDestinations.map((item, index) => (
              <article className={`destinations__card ${item.large ? "destinations__card--large" : ""}`} key={`${item.city}-${index}`}>
                <img src={item.image} alt={item.city} className="destinations__image" />
                <div className="destinations__overlay" />
                <div className="destinations__content">
                  {item.tag ? <span className="destinations__tag">{item.tag}</span> : null}
                  <h3>{item.city}</h3>
                  <p>{item.note}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="perks" id="support">
        <div className="home-page__shell perks__grid">
          {perks.map((perk) => (
            <article className="perks__card" key={perk.title}>
              <div className="perks__icon" />
              <h3>{perk.title}</h3>
              <p>{perk.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="home-page__footer">
        <div className="home-page__shell home-page__footer-layout">
          <div className="home-page__footer-brand">
            <strong>Flyvora</strong>
            <p>Redefining the sky through digital precision and human warmth.</p>
            <span>© 2026 Flyvora. The Digital Concierge.</span>
          </div>
          <div className="home-page__footer-column">
            <span>Company</span>
            <a href="#destinations">Explore</a>
            <a href="#support">Support</a>
          </div>
          <div className="home-page__footer-column">
            <span>Legal</span>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
          <div className="home-page__footer-column">
            <span>Access</span>
            <a href="/login">Traveler Login</a>
            <a href="/admin">Admin</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;
