import React, { startTransition, useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation, useNavigate } from "react-router-dom";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import FlightLandRoundedIcon from "@mui/icons-material/FlightLandRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FlightSearchPanel from "../../components/FlightSearchPanel";
import StyledSelectField from "../../components/StyledSelectField";
import { PublicHeader } from "../../components/layout/Header";
import { PublicFooter } from "../../components/layout/Footer";
import {
  buildSearchPath,
  formatTravelerSummary,
  getTravelerCount,
  parseSearchStateFromParams,
  resultsSortOptions,
  validateSearchState,
} from "../../search/searchUtils";
import { saveSeatSelectionDraft } from "../../search/seatSelectionStorage";
import { buildApiUrl, readApiPayload } from "../../../shared/api";
import "../home/home.scss";
import "./searchResults.scss";

const AIRPORT_CODES = {
  Ahmedabad: "AMD",
  Bengaluru: "BLR",
  Chennai: "MAA",
  Delhi: "DEL",
  Dubai: "DXB",
  Goa: "GOI",
  Hyderabad: "HYD",
  Jaipur: "JAI",
  Kolkata: "CCU",
  London: "LHR",
  Mumbai: "BOM",
  "New York": "JFK",
  Paris: "CDG",
  Pune: "PNQ",
  Singapore: "SIN",
  Tokyo: "HND",
};

const AIRLINES = [
  { name: "Flyvora Air", code: "FV", aircraft: "Airbus A320neo", tone: "primary" },
  { name: "IndiGo", code: "6E", aircraft: "Airbus A321neo", tone: "ink" },
  { name: "Air India", code: "AI", aircraft: "Boeing 787 Dreamliner", tone: "teal" },
  { name: "Vistara", code: "UK", aircraft: "Boeing 787-9", tone: "coral" },
];

const STOP_CODES = ["DEL", "BOM", "BLR", "HYD", "DXB", "SIN"];
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const longDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});


const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatDateValue = (value, formatter = longDateFormatter) =>
  value ? formatter.format(new Date(`${value}T00:00:00`)) : "";
const formatTimeValue = (value) => timeFormatter.format(new Date(value));

const hashValue = (value) =>
  Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);

const getAirportCode = (city) => {
  if (AIRPORT_CODES[city]) {
    return AIRPORT_CODES[city];
  }

  const lettersOnly = city.replace(/[^a-z]/gi, "").toUpperCase();
  return lettersOnly.slice(0, 3) || "AIR";
};

const getDurationMinutes = (departureTime, arrivalTime) =>
  Math.max(Math.round((new Date(arrivalTime) - new Date(departureTime)) / 60000), 0);

const formatDuration = (durationMinutes) => {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const shiftDateValue = (value, days) => {
  if (!value) {
    return value;
  }

  const nextDate = new Date(`${value}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const enrichFlights = (flightRows, searchState) => {
  const travelerCount = getTravelerCount(searchState.travelers);
  const enriched = flightRows.map((flight, index) => {
    const seed = hashValue(`${flight.id}-${flight.source}-${flight.destination}-${index}`);
    const airline = AIRLINES[seed % AIRLINES.length];
    const stopCount = seed % 5 === 0 ? 2 : seed % 3 === 0 ? 1 : 0;
    const stopKey = stopCount === 0 ? "non-stop" : stopCount === 1 ? "1-stop" : "2-plus";
    const durationMinutes = getDurationMinutes(flight.departure_time, flight.arrival_time);
    const taxesAndFees = Math.max(Math.round(flight.price * 0.14), 399) * travelerCount;
    const totalFare = flight.price * travelerCount + taxesAndFees + travelerCount * 149;

    return {
      ...flight,
      airline: airline.name,
      airlineTone: airline.tone,
      aircraft: airline.aircraft,
      flightNumber: `${airline.code}${100 + ((seed + index) % 899)}`,
      durationMinutes,
      durationLabel: formatDuration(durationMinutes),
      stopKey,
      stopCopy:
        stopCount === 0
          ? "Non-stop"
          : stopCount === 1
            ? `1 stop (${STOP_CODES[seed % STOP_CODES.length]})`
            : `2+ stops (${STOP_CODES[seed % STOP_CODES.length]})`,
      airportFrom: getAirportCode(flight.source),
      airportTo: getAirportCode(flight.destination),
      departureLabel: formatTimeValue(flight.departure_time),
      arrivalLabel: formatTimeValue(flight.arrival_time),
      baseFareTotal: flight.price * travelerCount,
      taxesAndFees,
      totalFare,
      points: Math.round(totalFare * 1.7),
      badge: null,
    };
  });

  if (!enriched.length) {
    return enriched;
  }

  const cheapest = Math.min(...enriched.map((flight) => flight.price));
  const fastest = Math.min(...enriched.map((flight) => flight.durationMinutes));
  const bestValueId = [...enriched]
    .sort((firstFlight, secondFlight) => {
      const firstScore = firstFlight.price * 0.65 + firstFlight.durationMinutes * 3.4;
      const secondScore = secondFlight.price * 0.65 + secondFlight.durationMinutes * 3.4;
      return firstScore - secondScore;
    })[0]?.id;

  return enriched.map((flight) => {
    if (flight.id === bestValueId) {
      return { ...flight, badge: { label: "Best Value", tone: "teal" } };
    }

    if (flight.price === cheapest) {
      return { ...flight, badge: { label: "Cheapest", tone: "coral" } };
    }

    if (flight.durationMinutes === fastest) {
      return { ...flight, badge: { label: "Fastest", tone: "primary" } };
    }

    return flight;
  });
};

const sortFlights = (flights, sortBy) => {
  const nextFlights = [...flights];

  nextFlights.sort((firstFlight, secondFlight) => {
    if (sortBy === "price_asc") {
      return firstFlight.price - secondFlight.price;
    }

    if (sortBy === "price_desc") {
      return secondFlight.price - firstFlight.price;
    }

    if (sortBy === "departure_desc") {
      return new Date(secondFlight.departure_time) - new Date(firstFlight.departure_time);
    }

    if (sortBy === "departure_asc") {
      return new Date(firstFlight.departure_time) - new Date(secondFlight.departure_time);
    }

    const firstPriority = firstFlight.badge?.label === "Best Value" ? 0 : 1;
    const secondPriority = secondFlight.badge?.label === "Best Value" ? 0 : 1;
    return firstPriority - secondPriority || firstFlight.price - secondFlight.price;
  });

  return nextFlights;
};

const SearchResults = () => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();
  const appliedSearch = useMemo(() => parseSearchStateFromParams(location.search), [location.search]);
  const appliedValidationErrors = useMemo(() => validateSearchState(appliedSearch), [appliedSearch]);
  const [draftSearch, setDraftSearch] = useState(appliedSearch);
  const [searchErrors, setSearchErrors] = useState({});
  const [searchFeedback, setSearchFeedback] = useState("");
  const [isSearchEditorOpen, setIsSearchEditorOpen] = useState(
    Object.keys(appliedValidationErrors).length > 0
  );
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("idle");
  const [fetchError, setFetchError] = useState("");
  const [flightRows, setFlightRows] = useState([]);
  const [totalFlights, setTotalFlights] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedStops, setSelectedStops] = useState([]);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [priceLimit, setPriceLimit] = useState(0);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [expandedFlightId, setExpandedFlightId] = useState(null);
  const [isSelectionConfirmed, setIsSelectionConfirmed] = useState(false);

  const startGoogleLogin = (returnTo = "/bookings") => {
    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: {
        connection: "google-oauth2",
        prompt: "login",
      },
    });
  };

  useEffect(() => {
    setDraftSearch(appliedSearch);
    setSearchErrors({});
    setSearchFeedback("");

    if (Object.keys(appliedValidationErrors).length > 0) {
      setIsSearchEditorOpen(true);
    }
  }, [appliedSearch, appliedValidationErrors]);

  useEffect(() => {
    const handleModifySearch = () => setIsSearchEditorOpen(true);

    window.addEventListener("flyvora:modify-search", handleModifySearch);
    return () => window.removeEventListener("flyvora:modify-search", handleModifySearch);
  }, []);


  useEffect(() => {
    if (!isFilterSheetOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterSheetOpen]);

  useEffect(() => {
    if (Object.keys(appliedValidationErrors).length > 0) {
      setFetchStatus("idle");
      setFetchError("");
      setFlightRows([]);
      setTotalFlights(0);
      return undefined;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      source: appliedSearch.source,
      destination: appliedSearch.destination,
      date: appliedSearch.departureDate,
      page: "1",
      limit: "20",
    });

    setFetchStatus("loading");
    setFetchError("");

    fetch(buildApiUrl(`/api/flights/search?${query.toString()}`), { signal: controller.signal })
      .then(async (response) => {
        const payload = await readApiPayload(response, "We could not load flights right now.");

        if (!response.ok) {
          throw new Error(payload.message || "We could not load flights right now.");
        }

        return payload;
      })
      .then((payload) => {
        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setFlightRows(payload.flights || []);
          setTotalFlights(payload.pagination?.total || payload.flights?.length || 0);
          setFetchStatus("success");
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setFetchStatus("error");
        setFetchError(error.message || "We could not load flights right now.");
        setFlightRows([]);
        setTotalFlights(0);
      });

    return () => controller.abort();
  }, [
    appliedSearch.departureDate,
    appliedSearch.destination,
    appliedSearch.source,
    appliedValidationErrors,
    retryCount,
  ]);

  const enrichedFlights = useMemo(() => enrichFlights(flightRows, appliedSearch), [appliedSearch, flightRows]);
  const sortedFlights = useMemo(() => sortFlights(enrichedFlights, appliedSearch.sortBy), [appliedSearch.sortBy, enrichedFlights]);
  const availableAirlines = useMemo(
    () => Array.from(new Set(enrichedFlights.map((flight) => flight.airline))).sort(),
    [enrichedFlights]
  );
  const priceBounds = useMemo(() => {
    if (!enrichedFlights.length) {
      return { min: 0, max: 0 };
    }

    const prices = enrichedFlights.map((flight) => flight.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [enrichedFlights]);

  useEffect(() => {
    if (!availableAirlines.length) {
      setSelectedAirlines([]);
      return;
    }

    setSelectedAirlines((current) => (current.length === 0 ? availableAirlines : current.filter((airline) => availableAirlines.includes(airline))));
  }, [availableAirlines]);

  useEffect(() => {
    if (!enrichedFlights.length) {
      setPriceLimit(0);
      return;
    }

    setPriceLimit((current) => (current ? Math.min(current, priceBounds.max) : priceBounds.max));
  }, [enrichedFlights.length, priceBounds.max]);

  const filteredFlights = useMemo(
    () =>
      sortedFlights.filter((flight) => {
        const matchesStops = selectedStops.length === 0 || selectedStops.includes(flight.stopKey);
        const matchesAirlines = availableAirlines.length === 0 || selectedAirlines.includes(flight.airline);
        const matchesPrice = !priceLimit || flight.price <= priceLimit;
        return matchesStops && matchesAirlines && matchesPrice;
      }),
    [availableAirlines, priceLimit, selectedAirlines, selectedStops, sortedFlights]
  );

  useEffect(() => {
    if (!filteredFlights.length) {
      setSelectedFlightId(null);
      setExpandedFlightId(null);
      setIsSelectionConfirmed(false);
      return;
    }

    setSelectedFlightId((current) => (current && filteredFlights.some((flight) => flight.id === current) ? current : filteredFlights[0].id));
    setExpandedFlightId((current) => (current && filteredFlights.some((flight) => flight.id === current) ? current : filteredFlights[0].id));
  }, [filteredFlights]);

  const selectedFlight = useMemo(
    () => filteredFlights.find((flight) => flight.id === selectedFlightId) || null,
    [filteredFlights, selectedFlightId]
  );

  const routeTitle = `${appliedSearch.source || "Choose"} to ${appliedSearch.destination || "a destination"}`;
  const hasAirlineFilter = availableAirlines.length > 0 && selectedAirlines.length !== availableAirlines.length;
  const mobileAirlineLabel =
    !hasAirlineFilter
      ? "Airlines"
      : selectedAirlines.length === 0
        ? "No airlines"
        : `${selectedAirlines.length} airline${selectedAirlines.length === 1 ? "" : "s"}`;
  const isNonStopQuickFilterActive =
    selectedStops.length === 1 && selectedStops.includes("non-stop");

  const routeSummary = useMemo(() => {
    const outbound = formatDateValue(appliedSearch.departureDate, shortDateFormatter);
    const travelerSummary = formatTravelerSummary(appliedSearch.travelers);

    if (appliedSearch.tripType === "round-trip" && appliedSearch.returnDate) {
      return `${outbound} - ${formatDateValue(appliedSearch.returnDate, shortDateFormatter)} | ${travelerSummary} | ${appliedSearch.travelers.cabinClass}`;
    }

    return `${outbound} | ${travelerSummary} | ${appliedSearch.travelers.cabinClass}`;
  }, [appliedSearch.departureDate, appliedSearch.returnDate, appliedSearch.travelers, appliedSearch.tripType]);

  const insightCards = useMemo(() => {
    if (!filteredFlights.length) {
      return [
        { label: "Fare Window", value: "Adjust filters to widen the shortlist.", tone: "primary", icon: <TrendingUpRoundedIcon fontSize="small" /> },
        { label: "Smart Tip", value: "Nearby dates often open more seats.", tone: "teal", icon: <AutoAwesomeRoundedIcon fontSize="small" /> },
      ];
    }

    const lowestFare = Math.min(...filteredFlights.map((flight) => flight.price));
    const highestFare = Math.max(...filteredFlights.map((flight) => flight.price));
    const morningFlights = filteredFlights.filter((flight) => new Date(flight.departure_time).getHours() < 12).length;

    return [
      { label: "Fare Window", value: lowestFare === highestFare ? `Starts at ${formatCurrency(lowestFare)}` : `${formatCurrency(lowestFare)} to ${formatCurrency(highestFare)}`, tone: "primary", icon: <TrendingUpRoundedIcon fontSize="small" /> },
      { label: "Smart Tip", value: morningFlights > 0 ? `${morningFlights} departure${morningFlights === 1 ? "" : "s"} before noon` : "Later departures dominate today", tone: "teal", icon: <AutoAwesomeRoundedIcon fontSize="small" /> },
    ];
  }, [filteredFlights]);

  const activeFilterCount =
    selectedStops.length +
    (selectedAirlines.length !== availableAirlines.length ? 1 : 0) +
    (priceLimit > 0 && priceLimit < priceBounds.max ? 1 : 0);

  const handleDraftSearchChange = (nextValue) => {
    setDraftSearch(nextValue);
    setSearchErrors({});
    setSearchFeedback("");
  };

  const handleSubmitSearch = (event) => {
    event.preventDefault();
    const validationErrors = validateSearchState(draftSearch);

    if (Object.keys(validationErrors).length > 0) {
      setSearchErrors(validationErrors);
      setSearchFeedback(Object.values(validationErrors)[0]);
      setIsSearchEditorOpen(true);
      return;
    }

    setIsFilterSheetOpen(false);
    setIsSearchEditorOpen(false);
    setIsSelectionConfirmed(false);
    navigate(buildSearchPath(draftSearch));
  };

  const handleSortChange = (nextSort) => navigate(buildSearchPath({ ...appliedSearch, sortBy: nextSort }));
  const handleTryNextDay = () =>
    navigate(
      buildSearchPath({
        ...appliedSearch,
        departureDate: shiftDateValue(appliedSearch.departureDate, 1),
        returnDate:
          appliedSearch.tripType === "round-trip" && appliedSearch.returnDate
            ? shiftDateValue(appliedSearch.returnDate, 1)
            : appliedSearch.returnDate,
      })
    );

  const handleQuickStopToggle = () =>
    setSelectedStops((current) =>
      current.length === 1 && current.includes("non-stop") ? [] : ["non-stop"]
    );

  const handleConfirmSelection = () => {
    if (!selectedFlight) {
      return;
    }

    const seatSelectionPayload = {
      flightId: selectedFlight.id,
      selectedFlight,
      searchState: appliedSearch,
      savedAt: new Date().toISOString(),
    };

    saveSeatSelectionDraft(seatSelectionPayload);

    if (isAuthenticated) {
      navigate(`/flights/${selectedFlight.id}`, { state: seatSelectionPayload });
      return;
    }

    startGoogleLogin(`/flights/${selectedFlight.id}`);
  };
  const clearClientFilters = () => {
    setSelectedStops([]);
    setSelectedAirlines(availableAirlines);
    setPriceLimit(priceBounds.max);
  };

  const renderFilters = () => (
    <>
      <div className="search-results-page__filter-card">
        <span>Sort by</span>
        <StyledSelectField
          className="styled-select--cabin"
          value={appliedSearch.sortBy}
          options={resultsSortOptions}
          onChange={handleSortChange}
        />
      </div>
      <div className="search-results-page__filter-card">
        <div className="search-results-page__filter-head">
          <span>Stops</span>
          <strong>Choose your pace</strong>
        </div>
        {[
          ["non-stop", "Non-stop"],
          ["1-stop", "1 Stop"],
          ["2-plus", "2+ Stops"],
        ].map(([value, label]) => (
          <label className="search-results-page__check-item" key={value}>
            <input
              type="checkbox"
              checked={selectedStops.includes(value)}
              onChange={() =>
                setSelectedStops((current) =>
                  current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
                )
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="search-results-page__filter-card">
        <div className="search-results-page__filter-head">
          <span>Price range</span>
          <strong>{formatCurrency(priceLimit || priceBounds.max)}</strong>
        </div>
        <input
          className="search-results-page__range-input"
          type="range"
          min={priceBounds.min || 0}
          max={priceBounds.max || 0}
          step="1"
          value={priceLimit || priceBounds.max || 0}
          onChange={(event) => setPriceLimit(Number.parseInt(event.target.value, 10))}
          disabled={priceBounds.max <= priceBounds.min}
        />
        <div className="search-results-page__range-meta">
          <span>{formatCurrency(priceBounds.min)}</span>
          <span>{formatCurrency(priceBounds.max)}</span>
        </div>
      </div>
      <div className="search-results-page__filter-card">
        <div className="search-results-page__filter-head">
          <span>Airlines</span>
          <strong>Refine the shortlist</strong>
        </div>
        {availableAirlines.map((airline) => (
          <label className="search-results-page__check-item" key={airline}>
            <input
              type="checkbox"
              checked={selectedAirlines.includes(airline)}
              onChange={() =>
                setSelectedAirlines((current) =>
                  current.includes(airline)
                    ? current.filter((item) => item !== airline)
                    : [...current, airline]
                )
              }
            />
            <span>{airline}</span>
          </label>
        ))}
      </div>
    </>
  );

  return (
    <main className="home-page search-results-page">
      <PublicHeader />

      <section className="search-results-page__hero">
        <div className="home-page__shell">
          <div className="search-results-page__mobile-context">
            <div className="search-results-page__mobile-context-copy">
              <h2>{routeTitle}</h2>
              <p>{routeSummary}</p>
            </div>
            <button
              type="button"
              className="search-results-page__mobile-edit"
              onClick={() => setIsSearchEditorOpen((current) => !current)}
              aria-label={isSearchEditorOpen ? "Hide search editor" : "Modify search"}
            >
              <EditRoundedIcon fontSize="small" />
            </button>
          </div>

          <div className="search-results-page__hero-top">
            <div className="search-results-page__heading">
              <p className="search-results-page__eyebrow">Search Results</p>
              <h1>
                {appliedSearch.source || "Choose"} <ArrowForwardRoundedIcon fontSize="inherit" /> {appliedSearch.destination || "a destination"}
              </h1>
              <p className="search-results-page__summary">{routeSummary}</p>
            </div>

            <div className="search-results-page__hero-actions">
              {insightCards.map((card) => (
                <article className={`search-results-page__insight-card search-results-page__insight-card--${card.tone}`} key={card.label}>
                  <div className="search-results-page__insight-icon">{card.icon}</div>
                  <div className="search-results-page__insight-copy">
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </div>
                </article>
              ))}

              <button type="button" className="search-results-page__edit-trigger" onClick={() => setIsSearchEditorOpen((current) => !current)}>
                <EditRoundedIcon fontSize="small" />
                <span>{isSearchEditorOpen ? "Hide Search" : "Modify Search"}</span>
              </button>
            </div>
          </div>

          {isSearchEditorOpen ? (
            <div className="search-results-page__search-panel">
              <FlightSearchPanel
                value={draftSearch}
                onChange={handleDraftSearchChange}
                onSubmit={handleSubmitSearch}
                submitLabel="Update Search"
                fieldErrors={searchErrors}
                message={searchFeedback}
                className="search-panel--results"
              />
            </div>
          ) : null}

          <div className="search-results-page__mobile-toolbar">
            <button
              type="button"
              className="search-results-page__toolbar-pill search-results-page__toolbar-pill--primary"
              onClick={() => setIsFilterSheetOpen(true)}
            >
              <TuneRoundedIcon fontSize="small" />
              <span>{activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}</span>
            </button>
            <button
              type="button"
              className={`search-results-page__toolbar-pill ${appliedSearch.sortBy === "price_asc" ? "is-active" : ""}`}
              onClick={() => handleSortChange(appliedSearch.sortBy === "price_asc" ? "recommended" : "price_asc")}
            >
              Cheapest
            </button>
            <button
              type="button"
              className={`search-results-page__toolbar-pill ${isNonStopQuickFilterActive ? "is-active" : ""}`}
              onClick={handleQuickStopToggle}
            >
              Non-stop
            </button>
            <button
              type="button"
              className={`search-results-page__toolbar-pill ${hasAirlineFilter ? "is-active" : ""}`}
              onClick={() => setIsFilterSheetOpen(true)}
            >
              {mobileAirlineLabel}
            </button>
            {activeFilterCount > 0 ? (
              <button type="button" className="search-results-page__toolbar-pill" onClick={clearClientFilters}>
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="search-results-page__content">
        <div className="home-page__shell search-results-page__layout">
          <aside className="search-results-page__filters-column">{renderFilters()}</aside>

          <div className="search-results-page__results-column">
            <div className="search-results-page__results-head">
              <div>
                <p className="search-results-page__results-eyebrow">Curated flights</p>
                <h2>
                  {fetchStatus === "loading"
                    ? "Loading the best options..."
                    : `${filteredFlights.length} option${filteredFlights.length === 1 ? "" : "s"} for your route`}
                </h2>
                <p>Balanced for price, timing, and overall ease.</p>
              </div>

              <div className="search-results-page__results-sort">
                <span>Sort</span>
                <StyledSelectField className="styled-select--cabin" value={appliedSearch.sortBy} options={resultsSortOptions} onChange={handleSortChange} />
              </div>
            </div>

                        {isSelectionConfirmed && selectedFlight ? (
              <div className="search-results-page__status-banner">
                <CheckCircleRoundedIcon fontSize="small" />
                <span>{selectedFlight.airline} is confirmed for review. Seat selection comes next.</span>
              </div>
            ) : null}

            {Object.keys(appliedValidationErrors).length > 0 ? (
              <article className="search-results-page__empty-state">
                <ErrorOutlineRoundedIcon fontSize="small" />
                <h3>Tell us the route before we shortlist flights.</h3>
                <p>Departure city, destination, and an outbound date are required for live inventory.</p>
                <button type="button" className="button button--primary" onClick={() => setIsSearchEditorOpen(true)}>
                  Complete Search
                </button>
              </article>
            ) : null}

            {fetchStatus === "loading" ? (
              <div className="search-results-page__skeleton-list">
                {[0, 1, 2].map((item) => (
                  <div className="search-results-page__skeleton-card" key={item}>
                    <div className="search-results-page__skeleton-row search-results-page__skeleton-row--short" />
                    <div className="search-results-page__skeleton-row" />
                    <div className="search-results-page__skeleton-row search-results-page__skeleton-row--wide" />
                  </div>
                ))}
              </div>
            ) : null}

            {fetchStatus === "error" ? (
              <article className="search-results-page__empty-state">
                <ErrorOutlineRoundedIcon fontSize="small" />
                <h3>We could not reach live flight inventory.</h3>
                <p>{fetchError}</p>
                <div className="search-results-page__empty-actions">
                  <button type="button" className="button button--primary" onClick={() => setRetryCount((current) => current + 1)}>
                    <RefreshRoundedIcon fontSize="small" />
                    Retry Search
                  </button>
                </div>
              </article>
            ) : null}

            {fetchStatus === "success" && enrichedFlights.length === 0 ? (
              <article className="search-results-page__empty-state">
                <AutoAwesomeRoundedIcon fontSize="small" />
                <h3>No flights matched this date yet.</h3>
                <p>Try moving the trip by a day or broadening the route details.</p>
                <div className="search-results-page__empty-actions">
                  <button type="button" className="button button--primary" onClick={handleTryNextDay}>
                    Try Next Day
                  </button>
                </div>
              </article>
            ) : null}

            {fetchStatus === "success" && enrichedFlights.length > 0 && filteredFlights.length === 0 ? (
              <article className="search-results-page__empty-state">
                <RestartAltRoundedIcon fontSize="small" />
                <h3>Your filters are a little too tight.</h3>
                <p>Clear one or two refinements to bring more flights back into view.</p>
                <div className="search-results-page__empty-actions">
                  <button type="button" className="button button--primary" onClick={clearClientFilters}>
                    Clear Filters
                  </button>
                </div>
              </article>
            ) : null}

            {fetchStatus === "success" && filteredFlights.length > 0 ? (
              <>
                <div className="search-results-page__flight-list">
                  {filteredFlights.map((flight) => {
                    const isSelected = selectedFlightId === flight.id;
                    const isExpanded = expandedFlightId === flight.id;

                    return (
                      <article className={`search-results-page__flight-card ${isSelected ? "is-selected" : ""} ${isSelectionConfirmed && isSelected ? "is-confirmed" : ""}`} key={flight.id}>
                        {flight.badge ? (
                          <div className={`search-results-page__flight-badge search-results-page__flight-badge--${flight.badge.tone}`}>
                            {flight.badge.label}
                          </div>
                        ) : null}

                        <div className="search-results-page__flight-top">
                          <div className="search-results-page__airline">
                            <span className={`search-results-page__airline-mark search-results-page__airline-mark--${flight.airlineTone}`}>
                              <FlightTakeoffRoundedIcon fontSize="small" />
                            </span>
                            <div>
                              <h3>{flight.airline}</h3>
                              <p>{flight.flightNumber} - {flight.aircraft}</p>
                            </div>
                          </div>
                          <div className="search-results-page__price">
                            <strong>{formatCurrency(flight.price)}</strong>
                            <span>per traveler</span>
                          </div>
                        </div>

                        <div className="search-results-page__timeline">
                          <div className="search-results-page__time-block">
                            <strong>{flight.departureLabel}</strong>
                            <span>{flight.airportFrom}</span>
                          </div>
                          <div className="search-results-page__timeline-line">
                            <span>{flight.durationLabel} - {flight.stopCopy}</span>
                            <div />
                          </div>
                          <div className="search-results-page__time-block search-results-page__time-block--right">
                            <strong>{flight.arrivalLabel}</strong>
                            <span>{flight.airportTo}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="search-results-page__flight-mobile-link"
                          onClick={() => setExpandedFlightId((current) => (current === flight.id ? null : flight.id))}
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>

                        <div className="search-results-page__flight-footer">
                          <div className="search-results-page__flight-mobile-price">
                            <span>Total Price</span>
                            <strong>{formatCurrency(flight.totalFare)}</strong>
                          </div>
                          <div className="search-results-page__amenities">
                            <span>
                              <LuggageRoundedIcon fontSize="inherit" /> 1 Checked
                            </span>
                            <span>
                              <WifiRoundedIcon fontSize="inherit" /> Wi-Fi
                            </span>
                            <span>
                              <RestaurantRoundedIcon fontSize="inherit" /> Meals
                            </span>
                          </div>
                          <div className="search-results-page__flight-actions">
                            <button
                              type="button"
                              className="search-results-page__link-button"
                              onClick={() => setExpandedFlightId((current) => (current === flight.id ? null : flight.id))}
                            >
                              {isExpanded ? "Hide Details" : "View Details"}
                            </button>
                            <button
                              type="button"
                              className={`button ${isSelected ? "button--secondary" : "button--primary"}`}
                              onClick={() => {
                                setSelectedFlightId(flight.id);
                                setExpandedFlightId(flight.id);
                                setIsSelectionConfirmed(false);
                              }}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </button>
                          </div>
                        </div>
                        {isExpanded ? (
                          <div className="search-results-page__flight-details">
                            <div><span>Travel day</span><strong>{formatDateValue(appliedSearch.departureDate)}</strong></div>
                            <div><span>Fare class</span><strong>{appliedSearch.travelers.cabinClass}</strong></div>
                            <div><span>Flight type</span><strong>{flight.stopCopy}</strong></div>
                            <div><span>Total with taxes</span><strong>{formatCurrency(flight.totalFare)}</strong></div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                <div className="search-results-page__results-foot">
                  <p>Showing {filteredFlights.length} of {totalFlights || enrichedFlights.length} live options</p>
                  <div className="search-results-page__results-progress">
                    <div style={{ width: `${Math.min(100, ((filteredFlights.length || 0) / Math.max(totalFlights || 1, 1)) * 100)}%` }} />
                  </div>
                </div>
              </>
            ) : null}

                      </div>

          <aside className="search-results-page__summary-column">
            <div className="search-results-page__summary-card">
              <div className="search-results-page__summary-head">
                <div>
                  <span>Your Journey</span>
                  <h3>{appliedSearch.source || "Departure"} to {appliedSearch.destination || "Arrival"}</h3>
                </div>
                {selectedFlight?.badge ? (
                  <div className={`search-results-page__summary-badge search-results-page__summary-badge--${selectedFlight.badge.tone}`}>
                    {selectedFlight.badge.label}
                  </div>
                ) : null}
              </div>

              {selectedFlight ? (
                <>
                  <div className="search-results-page__summary-legs">
                    <div className="search-results-page__summary-leg">
                      <FlightTakeoffRoundedIcon fontSize="small" />
                      <div>
                        <strong>{selectedFlight.airportFrom} to {selectedFlight.airportTo}</strong>
                        <span>{formatDateValue(appliedSearch.departureDate)} - {selectedFlight.departureLabel}</span>
                      </div>
                    </div>
                    <div className="search-results-page__summary-leg">
                      <FlightLandRoundedIcon fontSize="small" />
                      <div>
                        <strong>{appliedSearch.tripType === "round-trip" ? "Return flight" : "Journey status"}</strong>
                        <span>
                          {appliedSearch.tripType === "round-trip"
                            ? "Pick the return leg after reviewing this outbound."
                            : "One-way itinerary ready for the next step."}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="search-results-page__summary-pricing">
                    <div><span>Base fare</span><strong>{formatCurrency(selectedFlight.baseFareTotal)}</strong></div>
                    <div><span>Taxes and fees</span><strong>{formatCurrency(selectedFlight.taxesAndFees)}</strong></div>
                    <div className="search-results-page__summary-total"><span>Total</span><strong>{formatCurrency(selectedFlight.totalFare)}</strong></div>
                  </div>

                  <button type="button" className="button button--primary search-results-page__summary-button" onClick={handleConfirmSelection}>
                    {isSelectionConfirmed ? "Selection Confirmed" : "Confirm Selection"}
                  </button>

                  <p className="search-results-page__summary-note">
                    Includes {formatTravelerSummary(appliedSearch.travelers).toLowerCase()} in {appliedSearch.travelers.cabinClass.toLowerCase()}.
                  </p>
                </>
              ) : (
                <div className="search-results-page__summary-placeholder">
                  Select a flight to see the full fare breakdown and next-step summary.
                </div>
              )}
            </div>

            <div className="search-results-page__promo-card">
              <VerifiedRoundedIcon fontSize="small" />
              <div>
                <strong>{selectedFlight ? `Earn ${selectedFlight.points.toLocaleString("en-IN")} Voyager points` : "Concierge-ready search"}</strong>
                <span>{selectedFlight ? "Points apply when this itinerary is completed." : "The shortlist stays clear, calm, and easy to compare."}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <button
        type="button"
        className={`search-results-page__filters-sheet-backdrop ${isFilterSheetOpen ? "is-open" : ""}`}
        onClick={() => setIsFilterSheetOpen(false)}
        aria-label="Close filters"
      />
      <aside className={`search-results-page__filters-sheet ${isFilterSheetOpen ? "is-open" : ""}`}>
        <div className="search-results-page__filters-sheet-head">
          <div>
            <span>Filters</span>
            <strong>Refine the shortlist</strong>
          </div>
          <button type="button" onClick={() => setIsFilterSheetOpen(false)} aria-label="Close filters">
            <CloseRoundedIcon fontSize="small" />
          </button>
        </div>
        <div className="search-results-page__filters-sheet-body">{renderFilters()}</div>
        <div className="search-results-page__filters-sheet-actions">
          <button type="button" className="button button--secondary" onClick={clearClientFilters}>Clear Filters</button>
          <button type="button" className="button button--primary" onClick={() => setIsFilterSheetOpen(false)}>Show Flights</button>
        </div>
      </aside>

      {fetchStatus === "success" && filteredFlights.length > 0 && selectedFlight && !isFilterSheetOpen ? (
        <div className="search-results-page__mobile-selection-dock">
          <div className="home-page__shell search-results-page__mobile-selection-inner">
            <div className="search-results-page__mobile-selection-copy">
              <span>Selected flight</span>
              <strong>{selectedFlight.airline} | {formatCurrency(selectedFlight.totalFare)}</strong>
              <p>
                {selectedFlight.departureLabel} to {selectedFlight.arrivalLabel} | {selectedFlight.stopCopy}
              </p>
            </div>
            <button
              type="button"
              className="button button--primary search-results-page__mobile-selection-button"
              onClick={handleConfirmSelection}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}

      <nav className="search-results-page__mobile-nav" aria-label="Search page navigation">
        <a className="search-results-page__mobile-nav-item" href="/">
          <HomeRoundedIcon fontSize="small" />
          <span>Home</span>
        </a>
        <button
          type="button"
          className="search-results-page__mobile-nav-item is-active"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <SearchRoundedIcon fontSize="small" />
          <span>Search</span>
        </button>
        <button
          type="button"
          className="search-results-page__mobile-nav-item"
          onClick={() => {
            if (isAuthenticated) {
              navigate("/bookings");
              return;
            }

            startGoogleLogin("/bookings");
          }}
        >
          <LuggageRoundedIcon fontSize="small" />
          <span>My Trips</span>
        </button>
        <button
          type="button"
          className="search-results-page__mobile-nav-item"
          onClick={() => {
            if (isAuthenticated) {
              window.dispatchEvent(new Event("flyvora:open-public-menu"));
              return;
            }

            startGoogleLogin(`${location.pathname}${location.search}`);
          }}
        >
          <PersonRoundedIcon fontSize="small" />
          <span>Profile</span>
        </button>
      </nav>
      <PublicFooter />
    </main>
  );
};

export default SearchResults;





















