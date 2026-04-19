import React, { useEffect, useState } from "react";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FlightSearchPanel from "../../components/FlightSearchPanel";
import { PublicHeader } from "../../components/layout/Header";
import { PublicFooter } from "../../components/layout/Footer";
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

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const todayDateValue = getTodayDateValue();
  const returnMinDate = filters.departureDate || todayDateValue;
  const allowCabinSelection = canUnlockCabinClasses(filters);

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

  return (
    <main className="home-page">
      <PublicHeader />

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

      <PublicFooter />
    </main>
  );
};

export default Home;






