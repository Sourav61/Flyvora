import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import { buildSearchPath, formatTravelerSummary } from "../../search/searchUtils";
import {
  readSeatSelectionDraft,
  saveSeatSelectionDraft,
} from "../../search/seatSelectionStorage";
import { clearCheckoutDraft, saveCheckoutDraft } from "../../search/checkoutStorage";
import { buildApiUrl } from "../../../shared/api";
import "../home/home.scss";
import "./seatSelection.scss";

const SEAT_COLUMNS = ["A", "B", "C", "D", "E", "F"];
const CABIN_ROWS = Array.from({ length: 9 }, (_, index) => index + 10);
const EXIT_ROWS = new Set([14]);
const HOLD_DURATION_SECONDS = 5 * 60;
const LIVE_SEAT_REFRESH_INTERVAL_MS = 10000;
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatIsoTime = (value) => timeFormatter.format(new Date(value));
const formatIsoDate = (value) => dateFormatter.format(new Date(value));
const formatHoldTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const buildSeatMapPath = (flightId, traveler = {}) => {
  const params = new URLSearchParams();

  if (traveler.providerUserId) {
    params.set("providerUserId", traveler.providerUserId);
  }

  if (traveler.email) {
    params.set("email", traveler.email);
  }

  const query = params.toString();
  return `/api/flights/${flightId}/seats${query ? `?${query}` : ""}`;
};

const fetchJson = async (path) => {
  const response = await fetch(buildApiUrl(path));
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "We could not refresh live seat availability right now.");
  }

  return payload;
};

const postJson = async (path, payload) => {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "We could not reserve that seat right now.");
  }

  return data;
};

const getSeatFee = (rowNumber, seatCode) => {
  if (seatCode === "12A") {
    return 0;
  }

  if (EXIT_ROWS.has(rowNumber)) {
    return 1650;
  }

  if (rowNumber <= 11) {
    return 1450;
  }

  if (rowNumber <= 13) {
    return 850;
  }

  if (rowNumber <= 16) {
    return 450;
  }

  return 0;
};

const getSeatType = (rowNumber, seatCode, seatFee) => {
  if (seatCode === "12A") {
    return "Complimentary upgrade";
  }

  if (EXIT_ROWS.has(rowNumber)) {
    return "Exit row";
  }

  if (rowNumber <= 11) {
    return "Front cabin";
  }

  if (seatFee > 0) {
    return "Preferred";
  }

  return "Standard";
};

const hasFutureHold = (holdExpiresAt) => {
  if (!holdExpiresAt) {
    return false;
  }

  return new Date(holdExpiresAt).getTime() > Date.now();
};

const buildSeatMap = (seatStatusByCode = {}, activeReservedSeatCode = "", holdExpiresAt = "") =>
  CABIN_ROWS.map((rowNumber) => ({
    rowNumber,
    isExitRow: EXIT_ROWS.has(rowNumber),
    seats: SEAT_COLUMNS.map((column) => {
      const seatCode = `${rowNumber}${column}`;
      const seatState = seatStatusByCode[seatCode] || {
        status: "available",
        isOccupied: false,
        reservedByCurrentTraveler: false,
      };
      const fallbackReservedUntil = seatCode === activeReservedSeatCode ? holdExpiresAt : "";
      const isHeldByCurrentTraveler =
        seatState.status === "reserved" &&
        ((Boolean(seatState.reservedByCurrentTraveler) && hasFutureHold(seatState.reservedUntil)) ||
          (seatCode === activeReservedSeatCode && hasFutureHold(fallbackReservedUntil)));
      const isReservedByOther = seatState.status === "reserved" && !isHeldByCurrentTraveler;
      const isBooked = seatState.status === "booked";
      const seatFee = getSeatFee(rowNumber, seatCode);
      const isWindow = column === "A" || column === "F";
      const isAisle = column === "C" || column === "D";

      return {
        seatCode,
        status: seatState.status || "available",
        isOccupied: isBooked,
        isBooked,
        isReservedByOther,
        isHeldByCurrentTraveler,
        reservedUntil: seatState.reservedUntil || fallbackReservedUntil || null,
        seatFee,
        seatType: getSeatType(rowNumber, seatCode, seatFee),
        isWindow,
        isAisle,
      };
    }),
  }));

const SeatSelection = () => {
  const { isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0();
  const { flightId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const expiryCancelKeyRef = useRef("");
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [seatStatusByCode, setSeatStatusByCode] = useState({});
  const [isSeatMapLoading, setIsSeatMapLoading] = useState(true);
  const [hasLoadedSeatMap, setHasLoadedSeatMap] = useState(false);
  const [seatMapError, setSeatMapError] = useState("");
  const [seatNotice, setSeatNotice] = useState("");
  const [seatMapRequestKey, setSeatMapRequestKey] = useState(0);
  const [isReservingSeat, setIsReservingSeat] = useState(false);
  const [liveActiveReservation, setLiveActiveReservation] = useState(null);
  const [pendingReservationId, setPendingReservationId] = useState(null);

  const initialDraft = useMemo(() => {
    const locationDraft = location.state?.flightId ? location.state : null;
    const storedDraft = readSeatSelectionDraft();

    if (String(locationDraft?.flightId) === String(flightId)) {
      return locationDraft;
    }

    if (String(storedDraft?.flightId) === String(flightId)) {
      return storedDraft;
    }

    return null;
  }, [flightId, location.state]);
  const [draftState, setDraftState] = useState(initialDraft);
  const selectedFlight = draftState?.selectedFlight || null;
  const searchState = draftState?.searchState || null;
  const selectedSeatCode = draftState?.selectedSeatCode || "";
  const activeReservedSeatCode = hasFutureHold(draftState?.holdExpiresAt) ? selectedSeatCode : "";
  const seatMap = useMemo(
    () => buildSeatMap(seatStatusByCode, activeReservedSeatCode, draftState?.holdExpiresAt || ""),
    [activeReservedSeatCode, draftState?.holdExpiresAt, seatStatusByCode]
  );
  const allSeats = useMemo(() => seatMap.flatMap((row) => row.seats), [seatMap]);
  const selectedSeat = useMemo(
    () => allSeats.find((seat) => seat.seatCode === selectedSeatCode) || null,
    [allSeats, selectedSeatCode]
  );
  const travelerLabel = user?.name || formatTravelerSummary(searchState?.travelers || {});
  const backPath = searchState ? buildSearchPath(searchState) : "/flights";
  const hasActiveReservation = Boolean(draftState?.reservationBookingId && hasFutureHold(draftState?.holdExpiresAt));
  const holdTone = !draftState?.reservationBookingId
    ? "active"
    : holdSeconds === 0
      ? "expired"
      : holdSeconds <= 90
        ? "warning"
        : "active";

  useEffect(() => {
    setDraftState(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    loginWithRedirect({
      appState: { returnTo: `/flights/${flightId}` },
      authorizationParams: {
        connection: "google-oauth2",
        prompt: "login",
      },
    });
  }, [flightId, isAuthenticated, isLoading, loginWithRedirect]);

  useEffect(() => {
    if (!selectedFlight || isLoading || !isAuthenticated || (!user?.sub && !user?.email)) {
      return undefined;
    }

    let isActive = true;

    const loadSeatMap = async () => {
      setIsSeatMapLoading(true);
      setSeatMapError("");

      try {
        const payload = await fetchJson(
          buildSeatMapPath(selectedFlight.id, {
            providerUserId: user?.sub || "",
            email: user?.email || "",
          })
        );

        if (!isActive) {
          return;
        }

        const nextSeatStatusByCode = payload.seats.reduce((seatMapLookup, seat) => {
          seatMapLookup[seat.seatCode] = {
            status: seat.status,
            isOccupied: seat.isOccupied,
            reservedUntil: seat.reservedUntil,
            reservedByCurrentTraveler: Boolean(seat.reservedByCurrentTraveler),
          };
          return seatMapLookup;
        }, {});

        setSeatStatusByCode(nextSeatStatusByCode);
        setLiveActiveReservation(payload.activeReservation || null);
        setPendingReservationId(null);

        if (payload.activeReservation) {
          setDraftState((current) => {
            const baseDraft = current || {
              flightId: selectedFlight.id,
              selectedFlight,
              searchState,
            };
            const nextDraft = {
              ...baseDraft,
              flightId: selectedFlight.id,
              selectedFlight,
              searchState,
              selectedSeatCode: payload.activeReservation.seatCode,
              reservationBookingId: payload.activeReservation.bookingId,
              holdExpiresAt: payload.activeReservation.holdExpiresAt,
              savedAt: new Date().toISOString(),
            };

            saveSeatSelectionDraft(nextDraft);
            return nextDraft;
          });
        }

        setHasLoadedSeatMap(true);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSeatMapError(error.message || "We could not refresh live seat availability right now.");
      } finally {
        if (isActive) {
          setIsSeatMapLoading(false);
        }
      }
    };

    loadSeatMap();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isLoading, searchState, selectedFlight, seatMapRequestKey, user?.email, user?.sub]);

  useEffect(() => {
    if (!selectedFlight || isLoading || !isAuthenticated || (!user?.sub && !user?.email)) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSeatMapRequestKey((current) => current + 1);
    }, LIVE_SEAT_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, isLoading, selectedFlight, user?.email, user?.sub]);

  useEffect(() => {
    if (!draftState?.holdExpiresAt) {
      setHoldSeconds(0);
      return undefined;
    }

    const updateHoldTimer = () => {
      const nextHoldSeconds = Math.max(
        Math.ceil((new Date(draftState.holdExpiresAt).getTime() - Date.now()) / 1000),
        0
      );
      setHoldSeconds(nextHoldSeconds);
    };

    updateHoldTimer();
    const intervalId = window.setInterval(updateHoldTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [draftState?.holdExpiresAt]);

  const syncDraftState = useCallback((patch) => {
    setDraftState((current) => {
      if (!current && !selectedFlight) {
        return current;
      }

      const baseDraft = current || {
        flightId: selectedFlight?.id,
        selectedFlight,
        searchState,
      };
      const nextDraft = {
        ...baseDraft,
        ...patch,
      };

      saveSeatSelectionDraft(nextDraft);
      return nextDraft;
    });
  }, [searchState, selectedFlight]);

  const clearReservationSelection = ({ message = "", refreshSeatMap = false } = {}) => {
    if (message) {
      setSeatNotice(message);
    }

    setDraftState((current) => {
      if (!current) {
        return current;
      }

      const nextDraft = {
        ...current,
        selectedSeatCode: "",
        selectedSeat: null,
        reservationBookingId: null,
        holdExpiresAt: null,
        savedAt: new Date().toISOString(),
      };

      saveSeatSelectionDraft(nextDraft);
      return nextDraft;
    });
    clearCheckoutDraft();
    setPendingReservationId(null);
    setLiveActiveReservation(null);

    if (refreshSeatMap) {
      setSeatMapRequestKey((current) => current + 1);
    }
  };

  useEffect(() => {
    if (!hasLoadedSeatMap || !draftState?.selectedSeatCode || !draftState?.reservationBookingId || !hasFutureHold(draftState?.holdExpiresAt)) {
      return;
    }

    const currentSeat = allSeats.find((seat) => seat.seatCode === draftState.selectedSeatCode) || null;

    if (pendingReservationId === draftState.reservationBookingId) {
      return;
    }

    if (
      liveActiveReservation?.bookingId === draftState.reservationBookingId &&
      liveActiveReservation.seatCode === draftState.selectedSeatCode &&
      hasFutureHold(liveActiveReservation.holdExpiresAt)
    ) {
      return;
    }

    if (currentSeat?.isHeldByCurrentTraveler && hasFutureHold(currentSeat.reservedUntil || draftState.holdExpiresAt)) {
      return;
    }

    if (liveActiveReservation && hasFutureHold(liveActiveReservation.holdExpiresAt)) {
      const liveSeat = allSeats.find((seat) => seat.seatCode === liveActiveReservation.seatCode) || null;

      syncDraftState({
        reservationBookingId: liveActiveReservation.bookingId,
        selectedSeatCode: liveActiveReservation.seatCode,
        selectedSeat: liveSeat,
        holdExpiresAt: liveActiveReservation.holdExpiresAt,
        savedAt: new Date().toISOString(),
      });
      return;
    }

    if (!currentSeat || (!currentSeat.isOccupied && !currentSeat.isReservedByOther)) {
      return;
    }

    clearReservationSelection({
      message: `Seat ${draftState.selectedSeatCode} is no longer reserved for you. Please choose another seat.`,
      refreshSeatMap: true,
    });
  }, [
    allSeats,
    draftState?.holdExpiresAt,
    draftState?.reservationBookingId,
    draftState?.selectedSeatCode,
    hasLoadedSeatMap,
    liveActiveReservation,
    pendingReservationId,
    syncDraftState,
  ]);

  useEffect(() => {
    if (!draftState?.reservationBookingId || holdSeconds !== 0) {
      return undefined;
    }

    const expiryKey = `${draftState.reservationBookingId}:${draftState.holdExpiresAt || "expired"}`;

    if (expiryCancelKeyRef.current === expiryKey) {
      return undefined;
    }

    expiryCancelKeyRef.current = expiryKey;
    let isActive = true;

    const releaseExpiredReservation = async () => {
      try {
        await postJson("/api/bookings/cancel", { bookingId: draftState.reservationBookingId });
      } catch (error) {
        // no-op: the cleanup job also clears expired holds
      }

      if (!isActive) {
        return;
      }

      clearReservationSelection({
        message: "Your 5-minute seat hold expired. Pick any open seat to continue.",
        refreshSeatMap: true,
      });
    };

    releaseExpiredReservation();

    return () => {
      isActive = false;
    };
  }, [draftState?.holdExpiresAt, draftState?.reservationBookingId, holdSeconds]);

  useEffect(() => {
    if (!hasLoadedSeatMap || !selectedFlight || !searchState || !selectedSeatCode || !selectedSeat || !hasActiveReservation) {
      return;
    }

    saveSeatSelectionDraft({
      ...draftState,
      flightId: selectedFlight.id,
      selectedFlight,
      searchState,
      selectedSeatCode,
      selectedSeat,
      savedAt: new Date().toISOString(),
    });
  }, [draftState, hasActiveReservation, hasLoadedSeatMap, searchState, selectedFlight, selectedSeat, selectedSeatCode]);

  const handleSeatSelect = async (seatCode) => {
    if (!selectedFlight || !searchState || isReservingSeat) {
      return;
    }

    const seatSnapshot = allSeats.find((seat) => seat.seatCode === seatCode);

    if (!seatSnapshot || seatSnapshot.isOccupied || seatSnapshot.isReservedByOther) {
      return;
    }

    setIsReservingSeat(true);
    setSeatNotice("");

    try {
      const payload = await postJson("/api/bookings/reserve", {
        flightId: selectedFlight.id,
        seatCode,
        selectedFlight,
        searchState,
        traveler: {
          name: user?.name || user?.email || "Traveler",
          email: user?.email || "",
          providerUserId: user?.sub || "",
        },
      });

      const nextSelectedSeat = {
        ...seatSnapshot,
        status: "reserved",
        isOccupied: false,
        isHeldByCurrentTraveler: true,
        reservedUntil: payload.booking.holdExpiresAt,
        reservedByCurrentTraveler: true,
      };

      setPendingReservationId(payload.booking.id);
      syncDraftState({
        flightId: selectedFlight.id,
        selectedSeatCode: seatCode,
        selectedSeat: nextSelectedSeat,
        reservationBookingId: payload.booking.id,
        holdExpiresAt: payload.booking.holdExpiresAt,
        savedAt: new Date().toISOString(),
      });
      clearCheckoutDraft();
      setSeatStatusByCode((current) => ({
        ...current,
        [seatCode]: {
          status: "reserved",
          isOccupied: false,
          reservedUntil: payload.booking.holdExpiresAt,
          reservedByCurrentTraveler: true,
        },
      }));
      setSeatMapRequestKey((current) => current + 1);
    } catch (error) {
      setSeatNotice(error.message || "We could not reserve that seat right now.");
      setSeatMapRequestKey((current) => current + 1);
    } finally {
      setIsReservingSeat(false);
    }
  };

  const handleSeatMapRetry = () => {
    setSeatMapRequestKey((current) => current + 1);
  };

  const handleContinueToCheckout = () => {
    if (!selectedFlight || !selectedSeat || !draftState?.reservationBookingId || !hasActiveReservation) {
      return;
    }

    const checkoutPayload = {
      ...draftState,
      flightId: selectedFlight.id,
      selectedFlight,
      searchState,
      selectedSeatCode,
      selectedSeat,
      travelerLabel,
      reservationBookingId: draftState.reservationBookingId,
      holdExpiresAt: draftState.holdExpiresAt,
      savedAt: new Date().toISOString(),
    };

    saveSeatSelectionDraft(checkoutPayload);
    saveCheckoutDraft(checkoutPayload);
    navigate(`/checkout/${selectedFlight.id}`, { state: checkoutPayload });
  };

  if (isLoading) {
    return <main className="seat-selection-page seat-selection-page--centered">Loading seat map...</main>;
  }

  if (!isAuthenticated) {
    return <main className="seat-selection-page seat-selection-page--centered">Redirecting to Google sign in...</main>;
  }

  if (!draftState || !selectedFlight) {
    return (
      <main className="seat-selection-page seat-selection-page--centered">
        <div className="seat-selection-page__empty-card">
          <h1>No flight selection found</h1>
          <p>Choose a flight first, then continue here to pick your seat.</p>
          <button type="button" className="button button--primary" onClick={() => navigate("/flights")}>
            Back to Search
          </button>
        </div>
      </main>
    );
  }

  if (isSeatMapLoading && !hasLoadedSeatMap) {
    return <main className="seat-selection-page seat-selection-page--centered">Loading live seat map...</main>;
  }

  if (seatMapError && !hasLoadedSeatMap) {
    return (
      <main className="seat-selection-page seat-selection-page--centered">
        <div className="seat-selection-page__empty-card">
          <h1>Live seat map unavailable</h1>
          <p>{seatMapError}</p>
          <div className="seat-selection-page__empty-actions">
            <button type="button" className="button button--primary" onClick={handleSeatMapRetry}>
              Retry live seats
            </button>
            <button type="button" className="button button--secondary" onClick={() => navigate(backPath)}>
              Back to results
            </button>
          </div>
        </div>
      </main>
    );
  }

  const seatFee = selectedSeat?.seatFee || 0;
  const grandTotal = Number(selectedFlight.totalFare || 0) + seatFee;
  const aircraftLabel = selectedFlight.aircraft || "Airbus A320neo";
  const seatPosition = selectedSeat
    ? selectedSeat.isWindow
      ? "Window"
      : selectedSeat.isAisle
        ? "Aisle"
        : "Middle"
    : "No seat selected";
  const seatDescriptor = selectedSeat ? `${selectedSeat.seatType} | ${seatPosition}` : "Pick a seat to continue";
  const seatPriceLabel = seatFee === 0 ? "Complimentary" : formatCurrency(seatFee);
  const isHoldExpired = Boolean(draftState?.reservationBookingId) && holdSeconds === 0;

  return (
    <main className="seat-selection-page">
      <header className="seat-selection-page__header">
        <div className="seat-selection-page__shell seat-selection-page__header-inner">
          <div className="seat-selection-page__header-brand-group">
            <button type="button" className="seat-selection-page__back" onClick={() => navigate(backPath)}>
              <ArrowBackRoundedIcon fontSize="small" />
              <span>Back to results</span>
            </button>
            <a className="seat-selection-page__brand" href="/">
              Flyvora
            </a>
          </div>
          <div className={`seat-selection-page__hold seat-selection-page__hold--${holdTone}`}>
            <TimerOutlinedIcon fontSize="small" />
            <span>{hasActiveReservation ? formatHoldTime(holdSeconds) : "Pick a seat"}</span>
          </div>
        </div>
      </header>

      <section className="seat-selection-page__hero">
        <div className="seat-selection-page__shell seat-selection-page__hero-layout">
          <div className="seat-selection-page__main-column">
            <section className="seat-selection-page__intro">
              <p className="seat-selection-page__eyebrow seat-selection-page__eyebrow--route">
                <FlightTakeoffRoundedIcon fontSize="inherit" /> Flight {selectedFlight.flightNumber} | {selectedFlight.airportFrom} to {selectedFlight.airportTo}
              </p>
              <h1>Select your sanctuary</h1>
              <p>
                Click any open seat to lock it for five minutes before checkout. The cabin silhouette keeps the seat position
                clear, and the hold timer stays tied to the backend reservation.
              </p>
            </section>

            <div className="seat-selection-page__flight-meta">
              <div className="seat-selection-page__flight-meta-icon">
                <EventSeatRoundedIcon fontSize="small" />
              </div>
              <div className="seat-selection-page__flight-meta-copy">
                <strong>{searchState?.travelers?.cabinClass || "Economy"}</strong>
                <span>{aircraftLabel}</span>
              </div>
              <div className="seat-selection-page__flight-meta-status">
                <span>{hasActiveReservation ? "Seat reserved" : "Tap to reserve"}</span>
                <strong>{selectedSeatCode ? `Selected: ${selectedSeatCode}` : "Pick a seat"}</strong>
              </div>
            </div>

            <div className="seat-selection-page__legend">
              <span>
                <i className="seat-selection-page__legend-chip" /> Available
              </span>
              <span>
                <i className="seat-selection-page__legend-chip seat-selection-page__legend-chip--reserved" /> Reserved
              </span>
              <span>
                <i className="seat-selection-page__legend-chip seat-selection-page__legend-chip--occupied" /> Occupied
              </span>
              <span>
                <i className="seat-selection-page__legend-chip seat-selection-page__legend-chip--selected" /> Reserved by you
              </span>
            </div>

            {seatNotice ? <div className="seat-selection-page__notice">{seatNotice}</div> : null}
            {seatMapError && hasLoadedSeatMap ? (
              <div className="seat-selection-page__notice seat-selection-page__notice--warning">
                {seatMapError} <button type="button" onClick={handleSeatMapRetry}>Retry</button>
              </div>
            ) : null}

            <div className="seat-selection-page__aircraft-frame">
              <div className="seat-selection-page__aircraft-nose">Flight deck</div>
              <div className="seat-selection-page__aircraft-stage">
                <div className="seat-selection-page__aircraft-wing seat-selection-page__aircraft-wing--left" />
                <div className="seat-selection-page__aircraft-wing seat-selection-page__aircraft-wing--right" />
                <div className="seat-selection-page__aircraft-fuselage">
                  <div className="seat-selection-page__column-labels">
                    <div className="seat-selection-page__seat-bank-labels">
                      {SEAT_COLUMNS.slice(0, 3).map((column) => (
                        <span key={column}>{column}</span>
                      ))}
                    </div>
                    <div className="seat-selection-page__aisle" />
                    <div className="seat-selection-page__seat-bank-labels">
                      {SEAT_COLUMNS.slice(3).map((column) => (
                        <span key={column}>{column}</span>
                      ))}
                    </div>
                  </div>

                  <div className="seat-selection-page__seat-grid">
                    {seatMap.map((row) => (
                      <React.Fragment key={row.rowNumber}>
                        {row.isExitRow ? (
                          <div className="seat-selection-page__exit-row">
                            <span>Exit</span>
                            <span>Exit</span>
                          </div>
                        ) : null}
                        <div className={`seat-selection-page__row ${row.isExitRow ? "is-exit" : ""}`}>
                          <div className="seat-selection-page__seat-bank">
                            {row.seats.slice(0, 3).map((seat) => (
                              <button
                                type="button"
                                key={seat.seatCode}
                                className={`seat-selection-page__seat ${seat.isOccupied ? "is-occupied" : ""} ${seat.isReservedByOther ? "is-reserved" : ""} ${seat.isHeldByCurrentTraveler ? "is-selected" : ""}`}
                                disabled={seat.isOccupied || seat.isReservedByOther || isReservingSeat}
                                onClick={() => handleSeatSelect(seat.seatCode)}
                                aria-label={`${seat.seatCode} ${seat.seatType}`}
                              >
                                {seat.isOccupied ? (
                                  <CloseRoundedIcon fontSize="inherit" />
                                ) : seat.isReservedByOther ? (
                                  <LockRoundedIcon fontSize="inherit" />
                                ) : seat.isHeldByCurrentTraveler ? (
                                  <CheckRoundedIcon fontSize="inherit" />
                                ) : (
                                  seat.seatCode
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="seat-selection-page__aisle seat-selection-page__aisle--row">{row.rowNumber}</div>
                          <div className="seat-selection-page__seat-bank">
                            {row.seats.slice(3).map((seat) => (
                              <button
                                type="button"
                                key={seat.seatCode}
                                className={`seat-selection-page__seat ${seat.isOccupied ? "is-occupied" : ""} ${seat.isReservedByOther ? "is-reserved" : ""} ${seat.isHeldByCurrentTraveler ? "is-selected" : ""}`}
                                disabled={seat.isOccupied || seat.isReservedByOther || isReservingSeat}
                                onClick={() => handleSeatSelect(seat.seatCode)}
                                aria-label={`${seat.seatCode} ${seat.seatType}`}
                              >
                                {seat.isOccupied ? (
                                  <CloseRoundedIcon fontSize="inherit" />
                                ) : seat.isReservedByOther ? (
                                  <LockRoundedIcon fontSize="inherit" />
                                ) : seat.isHeldByCurrentTraveler ? (
                                  <CheckRoundedIcon fontSize="inherit" />
                                ) : (
                                  seat.seatCode
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className="seat-selection-page__aircraft-tail">
                <div className="seat-selection-page__aircraft-tail-fin" />
              </div>
            </div>
          </div>

          <aside className="seat-selection-page__summary-column">
            <div className={`seat-selection-page__timer-card seat-selection-page__timer-card--${holdTone}`}>
              <TimerOutlinedIcon fontSize="small" />
              <div>
                <span>{hasActiveReservation ? "Seat reserved for" : "Seat hold starts at"}</span>
                <strong>{hasActiveReservation ? formatHoldTime(holdSeconds) : formatHoldTime(HOLD_DURATION_SECONDS)} minutes</strong>
              </div>
            </div>

            <div className="seat-selection-page__summary-card">
              <h2>Selection Summary</h2>
              <div className="seat-selection-page__summary-passenger">
                <div>
                  <span>Traveler</span>
                  <strong>{travelerLabel}</strong>
                </div>
                <div className="seat-selection-page__summary-seat-badge">Seat {selectedSeatCode || "--"}</div>
              </div>

              <div className="seat-selection-page__summary-lines">
                <div>
                  <span>Flight fare</span>
                  <strong>{formatCurrency(selectedFlight.baseFareTotal)}</strong>
                </div>
                <div>
                  <span>Taxes and fees</span>
                  <strong>{formatCurrency(selectedFlight.taxesAndFees)}</strong>
                </div>
                <div>
                  <span>Seat selection</span>
                  <strong>{seatPriceLabel}</strong>
                </div>
              </div>

              <div className="seat-selection-page__summary-total">
                <div>
                  <span>Total amount</span>
                  <strong>{formatCurrency(grandTotal)}</strong>
                </div>
              </div>

              <div className="seat-selection-page__summary-meta">
                <div>
                  <span>Travel day</span>
                  <strong>{formatIsoDate(selectedFlight.departure_time)} | {formatIsoTime(selectedFlight.departure_time)}</strong>
                </div>
                <div>
                  <span>Seat profile</span>
                  <strong>{seatDescriptor}</strong>
                </div>
              </div>

              <button
                type="button"
                className="button button--primary seat-selection-page__cta"
                disabled={isReservingSeat || !selectedSeat || !draftState?.reservationBookingId || isHoldExpired}
                onClick={handleContinueToCheckout}
              >
                <LockRoundedIcon fontSize="small" />
                <span>{isReservingSeat ? "Reserving seat..." : "Continue to checkout"}</span>
              </button>

              <div className="seat-selection-page__secure-note">
                <LockRoundedIcon fontSize="inherit" />
                <span>Reserve first, then continue to Dodo checkout</span>
              </div>

              <p className="seat-selection-page__locked-note">
                {isHoldExpired
                  ? "Your hold expired. Tap any available seat again to refresh the five-minute timer and continue."
                  : hasActiveReservation
                    ? "This seat is locked for you on the backend right now. Finish checkout before the timer runs out."
                    : "Tap an available seat to start the real backend reservation timer before checkout."}
              </p>
            </div>

            <div className="seat-selection-page__perks-grid">
              <article className="seat-selection-page__perk-card">
                <RestaurantRoundedIcon fontSize="small" />
                <strong>Gourmet Dining</strong>
              </article>
              <article className="seat-selection-page__perk-card">
                <WifiRoundedIcon fontSize="small" />
                <strong>High-speed Wi-Fi</strong>
              </article>
              <article className="seat-selection-page__perk-card">
                <BoltRoundedIcon fontSize="small" />
                <strong>Power outlet</strong>
              </article>
              <article className="seat-selection-page__perk-card">
                <EventSeatRoundedIcon fontSize="small" />
                <strong>Comfort-first cabin</strong>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <div className="seat-selection-page__mobile-hold-chip">
        <LockRoundedIcon fontSize="inherit" />
        <span>
          {hasActiveReservation
            ? `Seat reserved for ${formatHoldTime(holdSeconds)}`
            : "Pick a seat to start the 5-minute hold"}
        </span>
      </div>

      <footer className="seat-selection-page__mobile-footer">
        <div className="seat-selection-page__mobile-summary-row">
          <div>
            <span>Selected seat</span>
            <strong>{selectedSeatCode || "--"}</strong>
            <p>{seatPosition}</p>
          </div>
          <div className="seat-selection-page__mobile-summary-price">
            <span>Upgrade fee</span>
            <strong>{seatFee === 0 ? formatCurrency(0) : formatCurrency(seatFee)}</strong>
          </div>
        </div>
        <button
          type="button"
          className="button button--primary seat-selection-page__mobile-cta"
          disabled={isReservingSeat || !selectedSeat || !draftState?.reservationBookingId || isHoldExpired}
          onClick={handleContinueToCheckout}
        >
          <span>{isReservingSeat ? "Reserving..." : "Checkout"}</span>
          <ArrowForwardRoundedIcon fontSize="small" />
        </button>
        <div className="seat-selection-page__mobile-perks">
          <span>
            <WifiRoundedIcon fontSize="inherit" /> Fast Wi-Fi
          </span>
          <span>
            <BoltRoundedIcon fontSize="inherit" /> Power outlet
          </span>
        </div>
      </footer>
    </main>
  );
};

export default SeatSelection;



