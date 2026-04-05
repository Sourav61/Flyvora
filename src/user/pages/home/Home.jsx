import React, { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import ContactSupportRoundedIcon from "@mui/icons-material/ContactSupportRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FlightSearchPanel from "../../components/FlightSearchPanel";
import {
  buildSearchPath,
  canUnlockCabinClasses,
  createDefaultSearchState,
  getTodayDateValue,
  validateSearchState,
} from "../../search/searchUtils";
import { featuredJourneys } from "../featuredJourney/featuredJourneyData";
import "./home.scss";

const suggestedRoutes = [
  {
    tag: "Popular right now",
    route: "Delhi to Mumbai",
    note: "Fast city connection with frequent departures.",
  },
  {
    tag: "Weekend favorite",
    route: "Bengaluru to Goa",
    note: "Short leisure hop with strong price availability.",
  },
  {
    tag: "International pick",
    route: "Chennai to Dubai",
    note: "Well-loved premium corridor for short-haul business travel.",
  },
];

const perks = [
  {
    title: "Trusted Security",
    body: "Your data and payments are protected by layered backend validation and secure auth flow.",
    icon: <ShieldOutlinedIcon fontSize="small" />,
    tone: "primary",
  },
  {
    title: "24/7 Concierge",
    body: "Search publicly, shortlist quickly, and move into assisted booking only when you are ready.",
    icon: <SupportAgentOutlinedIcon fontSize="small" />,
    tone: "teal",
  },
  {
    title: "Intelligent Routing",
    body: "Calm search, clear results, and booking access only when the traveler is authenticated.",
    icon: <AutoAwesomeOutlinedIcon fontSize="small" />,
    tone: "coral",
  },
];

const navigationItems = [
  { label: "Flights", href: "#search-panel", isActive: true },
  { label: "Explore", href: "#destinations" },
  { label: "Support", href: "#support" },
];

const Home = () => {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [filters, setFilters] = useState(createDefaultSearchState);
  const [searchErrors, setSearchErrors] = useState({});
  const [searchFeedback, setSearchFeedback] = useState("");
  const featuredDestinations = featuredJourneys.slice(0, 4).map((journey) => ({
    slug: journey.slug,
    city: journey.city,
    note: journey.cardNote,
    tag: journey.cardTag,
    image: journey.cardImage,
    large: journey.large,
  }));

  const userDisplayName = user?.given_name || user?.name || "Traveler";
  const todayDateValue = getTodayDateValue();
  const returnMinDate = filters.departureDate || todayDateValue;
  const allowCabinSelection = canUnlockCabinClasses(filters);
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };
  const toggleMobileMenu = () => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen((current) => !current);
  };

  const startGoogleLogin = (returnTo = "/bookings") => {
    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: {
        connection: "google-oauth2",
        prompt: "login",
      },
    });
  };

  const mobilePrimaryItems = [
    {
      label: "Search Flights",
      href: "#search-panel",
      icon: <SearchRoundedIcon fontSize="inherit" />,
    },
    {
      label: "My Trips",
      onClick: () => {
        if (isAuthenticated) {
          window.location.assign("/bookings");
          return;
        }

        startGoogleLogin("/bookings");
      },
      icon: <LuggageRoundedIcon fontSize="inherit" />,
    },
    {
      label: "Explore",
      href: "#destinations",
      icon: <ExploreRoundedIcon fontSize="inherit" />,
    },
    {
      label: "Support",
      href: "#support",
      icon: <ContactSupportRoundedIcon fontSize="inherit" />,
    },
  ];

  const mobileLegalItems = [
    {
      label: "Settings",
      onClick: () => window.location.assign("/admin"),
    },
    {
      label: "Privacy Policy",
      href: "/privacy",
    },
    {
      label: "Terms of Service",
      href: "/terms",
    },
  ];

  const mobileAccountAction = isLoading
    ? null
    : isAuthenticated
      ? {
          label: "Sign Out",
          onClick: () => logout({ logoutParams: { returnTo: window.location.origin } }),
          icon: <LogoutRoundedIcon fontSize="inherit" />,
          tone: "danger",
        }
      : {
          label: "Sign In",
          onClick: () => startGoogleLogin("/"),
          icon: <LoginRoundedIcon fontSize="inherit" />,
          tone: "primary",
        };

  const mobileAccountSubtext = isAuthenticated ? "Premium Member" : "Sign in to Flyvora";
  const mobileAccountName = isAuthenticated ? userDisplayName : "Guest Traveler";

  const renderMobilePrimaryItem = (item) => {
    if (item.href) {
      return (
        <a
          key={item.label}
          href={item.href}
          className="home-page__mobile-card"
          onClick={closeMobileMenu}
        >
          <span className="home-page__mobile-card-icon">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        className="home-page__mobile-card"
        onClick={() => {
          closeMobileMenu();
          item.onClick();
        }}
      >
        <span className="home-page__mobile-card-icon">{item.icon}</span>
        <span>{item.label}</span>
      </button>
    );
  };

  const renderMobileLegalItem = (item) => {
    if (item.href) {
      return (
        <a
          key={item.label}
          href={item.href}
          className="home-page__mobile-meta-link"
          onClick={closeMobileMenu}
        >
          {item.label}
        </a>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        className="home-page__mobile-meta-link"
        onClick={() => {
          closeMobileMenu();
          item.onClick();
        }}
      >
        {item.label}
      </button>
    );
  };

  const handleSearchStateChange = (nextFilters) => {
    setFilters(nextFilters);
    setSearchErrors({});
    setSearchFeedback("");
  };

  const handleQuickRoute = (source, destination) => {
    setFilters((current) => ({
      ...current,
      source,
      destination,
    }));
    setSearchErrors({});
    setSearchFeedback("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validateSearchState(filters);

    if (Object.keys(validationErrors).length > 0) {
      setSearchErrors(validationErrors);
      setSearchFeedback(Object.values(validationErrors)[0]);
      return;
    }

    navigate(buildSearchPath(filters));
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!allowCabinSelection && filters.travelers.cabinClass !== "Economy") {
      setFilters((current) => ({
        ...current,
        travelers: {
          ...current.travelers,
          cabinClass: "Economy",
        },
      }));
    }
  }, [allowCabinSelection, filters.travelers.cabinClass]);

  useEffect(() => {
    if (filters.returnDate && filters.returnDate < returnMinDate) {
      setFilters((current) => ({
        ...current,
        returnDate: "",
      }));
    }
  }, [filters.returnDate, returnMinDate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const source = searchParams.get("source") || "";
    const destination = searchParams.get("destination") || "";
    const tripType = searchParams.get("tripType");

    if (!source && !destination && !tripType) {
      return;
    }

    setFilters((current) => ({
      ...current,
      source: source || current.source,
      destination: destination || current.destination,
      tripType: tripType === "round-trip" || tripType === "one-way" ? tripType : current.tripType,
      returnDate: tripType === "one-way" ? "" : current.returnDate,
    }));
    setSearchErrors({});
    setSearchFeedback("");
  }, [location.search]);

  useEffect(() => {
    if (location.hash !== "#search-panel") {
      return;
    }

    const scrollToSearchPanel = () => {
      document.getElementById("search-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.setTimeout(scrollToSearchPanel, 80);
  }, [location.hash]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <main className="home-page">
      <header className={`home-page__nav ${isMobileMenuOpen ? "is-mobile-open" : ""}`}>
        <div className="home-page__shell home-page__nav-inner">
          <div className="home-page__brand">Flyvora</div>
          <button
            type="button"
            className={`home-page__menu-toggle ${isMobileMenuOpen ? "is-open" : ""}`}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <CloseRoundedIcon fontSize="small" /> : <MenuRoundedIcon fontSize="small" />}
          </button>
          <nav className="home-page__links">
            {navigationItems.map((item) => (
              <a key={item.label} href={item.href} className={item.isActive ? "is-active" : ""}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="home-page__actions">
            {isLoading ? null : isAuthenticated ? (
              <div className="home-page__profile" ref={profileMenuRef}>
                <button
                  type="button"
                  className={`home-page__profile-trigger ${isProfileMenuOpen ? "is-open" : ""}`}
                  onClick={() => setIsProfileMenuOpen((current) => !current)}
                >
                  {user?.picture ? (
                    <img className="home-page__avatar" src={user.picture} alt={userDisplayName} />
                  ) : (
                    <span className="home-page__avatar-fallback">{userDisplayName.charAt(0)}</span>
                  )}
                  <span className="home-page__profile-copy">
                    <span className="home-page__profile-greeting">Hi, {userDisplayName}</span>
                    <span className="home-page__profile-subtext">Account</span>
                  </span>
                  <ExpandMoreRoundedIcon fontSize="small" />
                </button>
                {isProfileMenuOpen ? (
                  <div className="home-page__profile-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout({ logoutParams: { returnTo: window.location.origin } });
                      }}
                    >
                      Logout
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        window.location.assign("/bookings");
                      }}
                    >
                      My Bookings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        window.location.assign("/admin");
                      }}
                    >
                      Admin
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <a href="/admin">Admin</a>
                <button type="button" className="button button--primary" onClick={() => startGoogleLogin("/")}>Login</button>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className={`home-page__mobile-backdrop ${isMobileMenuOpen ? "is-open" : ""}`}
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
        />
        <nav
          id="mobile-navigation-menu"
          className={`home-page__mobile-menu ${isMobileMenuOpen ? "is-open" : ""}`}
          aria-label="Mobile navigation"
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="home-page__mobile-menu-inner">
            <div className="home-page__mobile-card-list">
              {mobilePrimaryItems.map((item) => renderMobilePrimaryItem(item))}
            </div>

            <div className="home-page__mobile-meta">
              {mobileLegalItems.map((item) => renderMobileLegalItem(item))}
            </div>

            <div className="home-page__mobile-bottom">
              <a
                href="#search-panel"
                className="home-page__mobile-cta"
                onClick={closeMobileMenu}
              >
                <span className="home-page__mobile-cta-icon">
                  <AddRoundedIcon fontSize="inherit" />
                </span>
                <span>Book a Journey</span>
              </a>

              <div className="home-page__mobile-account">
                <div className="home-page__mobile-account-main">
                  {user?.picture ? (
                    <img className="home-page__mobile-account-avatar" src={user.picture} alt={mobileAccountName} />
                  ) : (
                    <span className="home-page__mobile-account-fallback">
                      {mobileAccountName.charAt(0)}
                    </span>
                  )}
                  <div className="home-page__mobile-account-copy">
                    <strong>{mobileAccountName}</strong>
                    <span>{mobileAccountSubtext}</span>
                  </div>
                </div>

                {mobileAccountAction ? (
                  <button
                    type="button"
                    className={`home-page__mobile-account-action home-page__mobile-account-action--${mobileAccountAction.tone}`}
                    onClick={() => {
                      closeMobileMenu();
                      mobileAccountAction.onClick();
                    }}
                  >
                    <span className="home-page__mobile-account-action-icon">{mobileAccountAction.icon}</span>
                    <span>{mobileAccountAction.label}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </nav>
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

          <FlightSearchPanel
            id="search-panel"
            value={filters}
            onChange={handleSearchStateChange}
            onSubmit={handleSubmit}
            fieldErrors={searchErrors}
            message={searchFeedback}
          />

          <div className="home-page__suggestions">
            <div className="home-page__suggestions-head">
              <span>Quick suggestions</span>
            </div>
            <div className="home-page__suggestions-grid">
              {suggestedRoutes.map((item) => {
                const [source, destination] = item.route.split(" to ");

                return (
                  <button
                    key={item.route}
                    type="button"
                    className="home-page__suggestion-card"
                    onClick={() => handleQuickRoute(source, destination)}
                  >
                    <span className="home-page__suggestion-tag">{item.tag}</span>
                    <strong>{item.route}</strong>
                    <p>{item.note}</p>
                  </button>
                );
              })}
            </div>
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
              <Link
                className={`destinations__card ${item.large ? "destinations__card--large" : ""}`}
                key={`${item.city}-${index}`}
                to={`/journeys/${item.slug}`}
              >
                <img src={item.image} alt={item.city} className="destinations__image" />
                <div className="destinations__overlay" />
                <div className="destinations__content">
                  {item.tag ? <span className="destinations__tag">{item.tag}</span> : null}
                  <h3>{item.city}</h3>
                  <p>{item.note}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="perks" id="support">
        <div className="home-page__shell perks__grid">
          {perks.map((perk) => (
            <article className="perks__card" key={perk.title}>
              <div className={`perks__icon perks__icon--${perk.tone}`}>{perk.icon}</div>
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
            <span>Copyright 2026 Flyvora. The Digital Concierge.</span>
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
          <div className="home-page__footer-column home-page__footer-column--connect">
            <span>Connect</span>
            <div className="home-page__socials">
              <a href="mailto:hello@flyvora.com" aria-label="Email Flyvora">
                <AlternateEmailRoundedIcon fontSize="small" />
              </a>
              <a href="https://flyvora.com" aria-label="Visit Flyvora website">
                <LanguageRoundedIcon fontSize="small" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;
