import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { buildSearchPath, formatTravelerSummary } from "../../search/searchUtils";
import {
  clearSeatSelectionDraft,
  readSeatSelectionDraft,
  saveSeatSelectionDraft,
} from "../../search/seatSelectionStorage";
import { clearCheckoutDraft, readCheckoutDraft, saveCheckoutDraft } from "../../search/checkoutStorage";
import { readTravelerProfile, saveTravelerProfile } from "../../search/travelerProfileStorage";
import { downloadBookingPdf, viewBookingPdf } from "../../bookings/bookingPdf";
import { BookingHeader } from "../../components/layout/Header";
import { buildApiUrl, readApiPayload } from "../../../shared/api";
import "../home/home.scss";
import "./checkout.scss";

const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });
const DODO_RETURN_STORAGE_KEY = "flyvora-dodo-return";
const LEG_LABELS = { outbound: "Outbound", return: "Return" };

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
const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatIsoTime = (value) => (value ? timeFormatter.format(new Date(value)) : "--");
const formatIsoDate = (value, formatter = dateFormatter) => (value ? formatter.format(new Date(value)) : "--");
const formatHoldTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const normalizePhone = (value = "") => {
  const trimmedValue = value.trim();
  const digitsOnly = trimmedValue.replace(/\D/g, "");
  if (!digitsOnly) return "";
  if (trimmedValue.startsWith("+")) return `+${digitsOnly}`;
  if (digitsOnly.length === 10) return `+91${digitsOnly}`;
  return `+${digitsOnly}`;
};
const getSeatPosition = (seatCode = "") => {
  const seatLetter = String(seatCode).slice(-1).toUpperCase();
  if (["A", "F"].includes(seatLetter)) return "Window";
  if (["C", "D"].includes(seatLetter)) return "Aisle";
  return "Middle";
};
const hasFutureHold = (holdExpiresAt) => Boolean(holdExpiresAt && new Date(holdExpiresAt).getTime() > Date.now());
const getDodoReturnPayloadFromSearch = (search = "") => {
  const searchParams = new URLSearchParams(search);
  const bookingId = searchParams.get("bookingId") || "";
  const status = searchParams.get("status") || "";
  if (!bookingId || !status) return null;
  return { bookingId, paymentId: searchParams.get("payment_id") || "", status, email: searchParams.get("email") || "" };
};
const readDodoReturnPayload = () => {
  if (typeof window === "undefined") return null;
  const rawValue = window.sessionStorage.getItem(DODO_RETURN_STORAGE_KEY);
  if (!rawValue) return null;
  try { return JSON.parse(rawValue); } catch (error) { window.sessionStorage.removeItem(DODO_RETURN_STORAGE_KEY); return null; }
};
const saveDodoReturnPayload = (payload) => {
  if (typeof window === "undefined" || !payload) return;
  window.sessionStorage.setItem(DODO_RETURN_STORAGE_KEY, JSON.stringify(payload));
};
const clearDodoReturnPayload = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DODO_RETURN_STORAGE_KEY);
};
const stripCheckoutQueryParams = () => {
  if (typeof window === "undefined") return;
  const nextUrl = new URL(window.location.href);
  ["bookingId", "payment_id", "status", "email"].forEach((key) => nextUrl.searchParams.delete(key));
  const search = nextUrl.searchParams.toString();
  window.history.replaceState({}, "", `${nextUrl.pathname}${search ? `?${search}` : ""}${nextUrl.hash}`);
};
const postJson = async (path, payload) => {
  let response;
  try {
    response = await fetch(buildApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error("Flyvora could not reach the booking server. Start the backend with npm run server and try again.");
  }
  const data = await readApiPayload(response, "We could not complete checkout right now.");
  if (!response.ok) {
    const requestError = new Error(data.message || "We could not complete checkout right now.");
    requestError.payload = data;
    throw requestError;
  }
  return data;
};
const getJson = async (path) => {
  let response;
  try {
    response = await fetch(buildApiUrl(path));
  } catch (error) {
    throw new Error("Flyvora could not reach the booking server. Start the backend with npm run server and try again.");
  }
  const data = await readApiPayload(response, "We could not refresh your live reservation right now.");
  if (!response.ok) throw new Error(data.message || "We could not refresh your live reservation right now.");
  return data;
};
const getDraftFlightId = (draft = {}) => draft?.selectedFlights?.outbound?.id || draft?.selectedFlight?.id || draft?.flightId;
const getDraftFlights = (draft = {}) => ({
  outbound: draft?.selectedFlights?.outbound || draft?.selectedFlight || null,
  return: draft?.selectedFlights?.return || null,
});
const getLegacySelection = (draft = {}) => ({
  selectedSeatCode: draft?.selectedSeatCode || "",
  selectedSeat: draft?.selectedSeat || null,
  reservationBookingId: draft?.reservationBookingId || draft?.pendingBookingId || null,
  holdExpiresAt: draft?.holdExpiresAt || null,
});
const getDraftSeatSelections = (draft = {}) => ({
  outbound: {
    ...getLegacySelection(draft),
    ...(draft?.seatSelections?.outbound || {}),
  },
  return: {
    ...(draft?.seatSelections?.return || {}),
  },
});
const getRequiredLegKeys = (searchState, selectedFlights) => (
  searchState?.tripType === "round-trip" && selectedFlights?.return ? ["outbound", "return"] : ["outbound"]
);
const buildDraftWithSeatSelections = ({
  baseDraft,
  selectedFlights,
  searchState,
  seatSelections,
  activeSeatLeg,
  extra = {},
}) => {
  const outboundSelection = seatSelections.outbound || {};
  const returnSelection = selectedFlights.return ? seatSelections.return || {} : null;
  const nextSeatSelections = {
    outbound: outboundSelection,
    return: returnSelection,
  };

  return {
    ...(baseDraft || {}),
    ...extra,
    flightId: selectedFlights.outbound?.id || baseDraft?.flightId,
    selectedFlight: selectedFlights.outbound || baseDraft?.selectedFlight || null,
    selectedFlights,
    searchState: searchState || baseDraft?.searchState || null,
    activeSeatLeg: activeSeatLeg || baseDraft?.activeSeatLeg || "outbound",
    seatSelections: nextSeatSelections,
    selectedSeatCode: outboundSelection.selectedSeatCode || "",
    selectedSeat: outboundSelection.selectedSeat || null,
    reservationBookingId: outboundSelection.reservationBookingId || null,
    holdExpiresAt: outboundSelection.holdExpiresAt || null,
    savedAt: new Date().toISOString(),
  };
};
const normalizeCheckoutDraft = (draft) => {
  if (!draft) return null;
  const selectedFlights = getDraftFlights(draft);
  const searchState = draft.searchState || null;
  const requiredLegKeys = getRequiredLegKeys(searchState, selectedFlights);
  const seatSelections = getDraftSeatSelections(draft);
  const hasRequiredSeats = requiredLegKeys.every((legKey) => (
    selectedFlights[legKey]?.id &&
    seatSelections[legKey]?.selectedSeatCode &&
    seatSelections[legKey]?.reservationBookingId
  ));

  if (!selectedFlights.outbound || !hasRequiredSeats) {
    return null;
  }

  return buildDraftWithSeatSelections({
    baseDraft: draft,
    selectedFlights,
    searchState,
    seatSelections,
    activeSeatLeg: draft.activeSeatLeg || "outbound",
  });
};
const formatFlightTitle = (flight = {}) => `${flight.airline || "Flight"} ${flight.flightNumber || ""}`.trim();
const formatRouteLabel = (flight = {}) => `${flight.airportFrom || flight.source || "--"} to ${flight.airportTo || flight.destination || "--"}`;
const getSelectionSeatLabel = (selection = {}) => selection.selectedSeatCode || "--";

const Checkout = () => {
  const { isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const { flightId } = useParams();
  const verificationKeyRef = useRef("");
  const expiredCancelKeyRef = useRef("");
  const travelerDetailsRef = useRef(null);
  const travelerNameInputRef = useRef(null);
  const travelerEmailInputRef = useRef(null);
  const travelerPhoneInputRef = useRef(null);
  const travelerTermsInputRef = useRef(null);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [successPayload, setSuccessPayload] = useState(null);
  const [contactDetails, setContactDetails] = useState({ name: "", email: "", phone: "" });
  const [acceptsTerms, setAcceptsTerms] = useState(true);
  const [dodoReturnPayload, setDodoReturnPayload] = useState(() => {
    const searchPayload = getDodoReturnPayloadFromSearch(location.search);
    if (searchPayload) {
      saveDodoReturnPayload(searchPayload);
      return searchPayload;
    }
    return readDodoReturnPayload();
  });
  const returnBookingId = dodoReturnPayload?.bookingId || "";
  const returnPaymentId = dodoReturnPayload?.paymentId || "";
  const returnStatus = dodoReturnPayload?.status || "";
  const returnEmail = dodoReturnPayload?.email || "";
  const isReturningFromDodo = Boolean(returnBookingId && returnStatus);

  const initialDraft = useMemo(() => {
    const locationDraft = location.state ? normalizeCheckoutDraft(location.state) : null;
    const storedCheckoutDraft = normalizeCheckoutDraft(readCheckoutDraft());
    const storedSeatDraft = normalizeCheckoutDraft(readSeatSelectionDraft());
    const matchesCurrentFlight = (draft) => String(getDraftFlightId(draft)) === String(flightId);
    const candidateDraft = [locationDraft, storedSeatDraft, storedCheckoutDraft]
      .filter((draft) => draft && matchesCurrentFlight(draft))
      .sort((left, right) => new Date(right.savedAt || 0).getTime() - new Date(left.savedAt || 0).getTime())[0] || null;

    return candidateDraft;
  }, [flightId, location.state]);
  const [draftState, setDraftState] = useState(initialDraft);
  const travelerIdentity = useMemo(() => ({ providerUserId: user?.sub || "", email: user?.email || "" }), [user?.email, user?.sub]);
  const selectedFlights = useMemo(() => getDraftFlights(draftState), [draftState]);
  const searchState = draftState?.searchState || null;
  const requiredLegKeys = useMemo(() => getRequiredLegKeys(searchState, selectedFlights), [searchState, selectedFlights]);
  const isRoundTrip = requiredLegKeys.length > 1;
  const legSelections = useMemo(() => getDraftSeatSelections(draftState), [draftState]);
  const itineraryLegs = useMemo(() => requiredLegKeys.map((legKey) => ({
    legKey,
    label: LEG_LABELS[legKey] || "Flight",
    flight: selectedFlights[legKey],
    selection: legSelections[legKey] || {},
  })), [legSelections, requiredLegKeys, selectedFlights]);
  const selectedFlight = selectedFlights.outbound || null;
  const outboundSelection = legSelections.outbound || {};
  const selectedSeatCode = outboundSelection.selectedSeatCode || "";
  const selectedSeat = outboundSelection.selectedSeat || null;
  const travelerSummary = formatTravelerSummary(searchState?.travelers || {});
  const flightFareTotal = itineraryLegs.reduce((total, leg) => total + Number(leg.flight?.totalFare || 0), 0);
  const baseFareTotal = itineraryLegs.reduce((total, leg) => total + Number(leg.flight?.baseFareTotal || 0), 0);
  const taxesAndFeesTotal = itineraryLegs.reduce((total, leg) => total + Number(leg.flight?.taxesAndFees || 0), 0);
  const serviceFee = Math.max(flightFareTotal - baseFareTotal - taxesAndFeesTotal, 0);
  const seatFee = itineraryLegs.reduce((total, leg) => total + Number(leg.selection?.selectedSeat?.seatFee || 0), 0);
  const grandTotal = flightFareTotal + seatFee;
  const holdExpiresAt = itineraryLegs
    .map((leg) => leg.selection?.holdExpiresAt)
    .filter(Boolean)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] || null;
  const hasActiveReservation = itineraryLegs.length > 0 && itineraryLegs.every((leg) => (
    leg.selection?.reservationBookingId && hasFutureHold(leg.selection?.holdExpiresAt)
  ));
  const isHoldExpired = itineraryLegs.some((leg) => (
    leg.selection?.reservationBookingId && !hasFutureHold(leg.selection?.holdExpiresAt)
  ));
  const holdTone = !hasActiveReservation ? "expired" : isHoldExpired ? "expired" : holdSeconds <= 120 ? "warning" : "active";
  const seatCodes = itineraryLegs.map((leg) => getSelectionSeatLabel(leg.selection)).filter((seatCode) => seatCode && seatCode !== "--");
  const seatCodeLabel = seatCodes.join(", ") || selectedSeatCode;
  const seatDescriptor = isRoundTrip
    ? itineraryLegs.map((leg) => `${leg.label} ${getSelectionSeatLabel(leg.selection)}`).join(" | ")
    : selectedSeat
      ? `${selectedSeat.seatType} | ${getSeatPosition(selectedSeatCode)}`
      : "Choose a seat";
  const displayName = user?.name || contactDetails.name || "Traveler";
  const displayInitials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const bookingReferences = successPayload?.bookings?.map((booking) => booking.bookingReference).filter(Boolean) || [];
  const completedBooking = {
    id: successPayload?.booking?.id || outboundSelection.reservationBookingId || selectedFlight?.id || "booking",
    bookingReference: successPayload?.booking?.bookingReference || outboundSelection.reservationBookingId || "Pending",
    bookingReferences,
    status: successPayload ? "confirmed" : paymentStatus,
    createdAt: new Date().toISOString(),
    traveler: {
      name: contactDetails.name || user?.name || "Traveler",
      email: contactDetails.email || user?.email || "",
      phone: contactDetails.phone || "",
    },
    flight: selectedFlight || {},
    seatCode: selectedSeatCode,
    seatCodes,
    cabinClass: searchState?.travelers?.cabinClass || "Economy",
    travelersCount: Number(searchState?.travelers?.count || 1),
    fare: {
      baseFare: baseFareTotal,
      taxesAndFees: taxesAndFeesTotal,
      serviceFee,
      seatFee,
      totalAmount: Number(successPayload?.booking?.totalAmount || grandTotal),
      currency: successPayload?.booking?.currency || "INR",
    },
  };

  useEffect(() => {
    setDraftState(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    const searchPayload = getDodoReturnPayloadFromSearch(location.search);
    if (!searchPayload) return;
    saveDodoReturnPayload(searchPayload);
    setDodoReturnPayload(searchPayload);
    stripCheckoutQueryParams();
  }, [location.search]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    loginWithRedirect({
      appState: { returnTo: `/checkout/${flightId}` },
      authorizationParams: { connection: "google-oauth2", prompt: "login" },
    });
  }, [flightId, isAuthenticated, isLoading, loginWithRedirect]);

  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldSeconds(0);
      return undefined;
    }
    const updateHoldTimer = () => {
      const nextHoldSeconds = Math.max(Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 1000), 0);
      setHoldSeconds(nextHoldSeconds);
    };
    updateHoldTimer();
    const intervalId = window.setInterval(updateHoldTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [holdExpiresAt]);

  useEffect(() => {
    const savedProfile = readTravelerProfile(travelerIdentity);

    if (!savedProfile && !user?.name && !user?.email) {
      return;
    }

    setContactDetails((current) => {
      const nextDetails = {
        name: current.name || savedProfile?.name || user?.name || "",
        email: current.email || savedProfile?.email || user?.email || "",
        phone: current.phone || savedProfile?.phone || "",
      };

      if (
        current.name === nextDetails.name &&
        current.email === nextDetails.email &&
        current.phone === nextDetails.phone
      ) {
        return current;
      }

      return nextDetails;
    });
  }, [travelerIdentity, user?.email, user?.name]);

  useEffect(() => {
    const nextProfile = {
      name: (contactDetails.name || user?.name || "").trim(),
      email: (contactDetails.email || user?.email || "").trim(),
      phone: contactDetails.phone.trim(),
    };

    if (!nextProfile.name && !nextProfile.email && !nextProfile.phone) {
      return;
    }

    saveTravelerProfile(travelerIdentity, nextProfile);
  }, [contactDetails.email, contactDetails.name, contactDetails.phone, travelerIdentity, user?.email, user?.name]);

  const persistDraft = (nextDraft) => {
    saveCheckoutDraft(nextDraft);
    saveSeatSelectionDraft(nextDraft);
    return nextDraft;
  };

  const syncSeatSelections = (nextSeatSelections, extra = {}) => {
    setDraftState((current) => {
      if (!current) return current;
      return persistDraft(buildDraftWithSeatSelections({
        baseDraft: current,
        selectedFlights: getDraftFlights(current),
        searchState: current.searchState || null,
        seatSelections: nextSeatSelections,
        activeSeatLeg: current.activeSeatLeg || "outbound",
        extra,
      }));
    });
  };

  const resolveActiveReservations = async () => {
    if (!draftState || !selectedFlight) {
      throw new Error("Your reserved seat is missing. Go back and choose a seat again.");
    }

    const nextSeatSelections = {
      outbound: { ...(legSelections.outbound || {}) },
      return: { ...(legSelections.return || {}) },
    };
    const activeReservations = [];

    for (const legKey of requiredLegKeys) {
      const legFlight = selectedFlights[legKey];
      const legSelection = legSelections[legKey] || {};

      if (!legFlight?.id || !legSelection.selectedSeatCode || !legSelection.reservationBookingId) {
        throw new Error("Your reserved seat is missing. Go back and choose a seat again.");
      }

      const payload = await getJson(buildSeatMapPath(legFlight.id, travelerIdentity));
      const activeReservation = payload.activeReservation || null;
      const matchingSeat = payload.seats?.find((seat) => seat.seatCode === legSelection.selectedSeatCode) || null;
      const fallbackHoldExpiresAt = matchingSeat?.reservedUntil || legSelection.holdExpiresAt || null;
      const seatClearlyBelongsToAnotherTraveler = Boolean(
        matchingSeat && matchingSeat.status === "reserved" && !matchingSeat.reservedByCurrentTraveler
      );
      const seatClearlyUnavailable = Boolean(matchingSeat?.isOccupied || seatClearlyBelongsToAnotherTraveler);

      if (!activeReservation) {
        if (seatClearlyUnavailable || !hasFutureHold(fallbackHoldExpiresAt)) {
          throw new Error(`${LEG_LABELS[legKey]} seat is no longer reserved for you. Please return to the seat map and reserve it again.`);
        }

        nextSeatSelections[legKey] = {
          ...legSelection,
          selectedSeat: matchingSeat || legSelection.selectedSeat,
          holdExpiresAt: fallbackHoldExpiresAt,
        };
        activeReservations.push({
          legKey,
          bookingId: legSelection.reservationBookingId,
          seatCode: legSelection.selectedSeatCode,
          holdExpiresAt: fallbackHoldExpiresAt,
        });
        continue;
      }

      nextSeatSelections[legKey] = {
        ...legSelection,
        reservationBookingId: activeReservation.bookingId,
        selectedSeatCode: activeReservation.seatCode,
        selectedSeat: payload.seats?.find((seat) => seat.seatCode === activeReservation.seatCode) || legSelection.selectedSeat,
        holdExpiresAt: activeReservation.holdExpiresAt,
      };
      activeReservations.push({
        legKey,
        bookingId: activeReservation.bookingId,
        seatCode: activeReservation.seatCode,
        holdExpiresAt: activeReservation.holdExpiresAt,
      });
    }

    syncSeatSelections(nextSeatSelections);
    return activeReservations;
  };

  useEffect(() => {
    if (!isReturningFromDodo || !returnBookingId || isLoading || !isAuthenticated) return;
    const verificationKey = `${returnBookingId}:${returnPaymentId}:${returnStatus}:${returnEmail}`;
    if (verificationKeyRef.current === verificationKey) return;
    verificationKeyRef.current = verificationKey;
    const verifyCheckoutReturn = async () => {
      setPaymentStatus("verifying");
      setFeedbackMessage("Verifying your Dodo payment and confirming the booking...");
      try {
        const payload = await postJson("/api/bookings/confirm", {
          bookingId: returnBookingId,
          paymentId: returnPaymentId,
          status: returnStatus,
          email: returnEmail,
        });
        if (payload.payment?.status !== "succeeded") {
          setPaymentStatus("processing");
          setFeedbackMessage(payload.message || "Payment is still processing. Please wait a moment.");
          return;
        }
        clearCheckoutDraft();
        clearSeatSelectionDraft();
        clearDodoReturnPayload();
        setDodoReturnPayload(null);
        setSuccessPayload(payload);
        setPaymentStatus("success");
        setFeedbackMessage("");
      } catch (error) {
        setPaymentStatus("error");
        setFeedbackMessage(error.message || "Payment verification failed. Please try again.");
      }
    };
    verifyCheckoutReturn();
  }, [isAuthenticated, isLoading, isReturningFromDodo, returnBookingId, returnEmail, returnPaymentId, returnStatus]);

  useEffect(() => {
    if (paymentStatus !== "error" || !feedbackMessage) return;
    travelerDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [feedbackMessage, paymentStatus]);

  useEffect(() => {
    const expiredReservations = itineraryLegs
      .filter((leg) => leg.selection?.reservationBookingId && !hasFutureHold(leg.selection?.holdExpiresAt))
      .map((leg) => ({
        bookingId: leg.selection.reservationBookingId,
        holdExpiresAt: leg.selection.holdExpiresAt || "expired",
      }));

    if (!expiredReservations.length || successPayload || isReturningFromDodo) {
      return undefined;
    }

    const expiryKey = expiredReservations.map((reservation) => `${reservation.bookingId}:${reservation.holdExpiresAt}`).join("|");

    if (expiredCancelKeyRef.current === expiryKey) {
      return undefined;
    }

    expiredCancelKeyRef.current = expiryKey;
    let isActive = true;

    const releaseExpiredReservations = async () => {
      await Promise.allSettled(expiredReservations.map((reservation) => (
        postJson("/api/bookings/cancel", { bookingId: reservation.bookingId })
      )));

      if (!isActive) {
        return;
      }

      setFeedbackMessage("Your five-minute seat hold expired. Please return to the seat map and reserve again.");
      clearCheckoutDraft();
    };

    releaseExpiredReservations();

    return () => {
      isActive = false;
    };
  }, [isReturningFromDodo, itineraryLegs, successPayload]);

  const handleBackToSeatSelection = () => {
    if (draftState) saveSeatSelectionDraft(draftState);
    navigate(`/flights/${selectedFlight?.id || flightId}`, { state: draftState || undefined });
  };
  const handleBackToResults = () => navigate(searchState ? buildSearchPath(searchState) : "/flights");
  const focusTravelerDetails = (fieldRef) => {
    travelerDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (fieldRef?.current) {
      window.setTimeout(() => fieldRef.current?.focus?.(), 180);
    }
  };
  const validateBeforePayment = () => {
    if (!draftState || !selectedFlight || !hasActiveReservation) return { message: "Your reserved seats are missing. Go back and choose seats again." };
    if (!contactDetails.name.trim()) return { message: "Traveler name is required before payment.", fieldRef: travelerNameInputRef };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactDetails.email.trim())) return { message: "Enter a valid email address for your itinerary.", fieldRef: travelerEmailInputRef };
    if (normalizePhone(contactDetails.phone).replace(/\D/g, "").length < 10) return { message: "Enter a valid mobile number so payment updates can reach you.", fieldRef: travelerPhoneInputRef };
    if (!acceptsTerms) return { message: "Please accept the booking terms before continuing to payment.", fieldRef: travelerTermsInputRef };
    return null;
  };
  const handlePayNow = async () => {
    if (isHoldExpired || !hasActiveReservation) {
      handleBackToSeatSelection();
      return;
    }
    const validationMessage = validateBeforePayment();
    if (validationMessage) {
      setPaymentStatus("error");
      setFeedbackMessage(validationMessage.message);
      focusTravelerDetails(validationMessage.fieldRef);
      return;
    }
    saveTravelerProfile(travelerIdentity, {
      name: contactDetails.name.trim(),
      email: contactDetails.email.trim(),
      phone: normalizePhone(contactDetails.phone),
    });
    clearDodoReturnPayload();
    setDodoReturnPayload(null);
    setFeedbackMessage("");
    setPaymentStatus("creating-session");
    try {
      const activeReservations = await resolveActiveReservations();
      const bookingIds = Array.from(new Set(activeReservations.map((reservation) => reservation.bookingId).filter(Boolean)));

      if (bookingIds.length !== requiredLegKeys.length) {
        throw new Error(
          isRoundTrip
            ? "Both outbound and return seat reservations are required before round-trip payment."
            : "Your reserved seat is missing. Go back and choose a seat again."
        );
      }

      const sessionPayload = await postJson("/api/payments/dodo/session", {
        bookingId: bookingIds[0],
        bookingIds,
        customer: {
          name: contactDetails.name.trim(),
          email: contactDetails.email.trim(),
          phone: normalizePhone(contactDetails.phone),
          providerUserId: user?.sub || "",
        },
      });
      const sessionBookings = sessionPayload.bookings || (sessionPayload.booking ? [sessionPayload.booking] : []);
      const refreshedSelections = {
        outbound: { ...(legSelections.outbound || {}) },
        return: { ...(legSelections.return || {}) },
      };

      activeReservations.forEach((reservation) => {
        const sessionBooking = sessionBookings.find((booking) => Number(booking.id) === Number(reservation.bookingId)) || null;
        refreshedSelections[reservation.legKey] = {
          ...refreshedSelections[reservation.legKey],
          reservationBookingId: sessionBooking?.id || reservation.bookingId,
          selectedSeatCode: reservation.seatCode,
          holdExpiresAt: sessionBooking?.holdExpiresAt || reservation.holdExpiresAt,
        };
      });
      syncSeatSelections(refreshedSelections, {
        pendingCheckoutSessionId: sessionPayload.checkout.sessionId,
      });
      setPaymentStatus("redirecting");
      setFeedbackMessage("Redirecting you to Dodo Payments to complete the booking...");
      window.location.assign(sessionPayload.checkout.checkoutUrl);
    } catch (error) {
      setPaymentStatus("error");
      setFeedbackMessage(error.message || "We could not initiate payment right now.");
    }
  };

  const ctaLabel = isHoldExpired
    ? "Return to seat map"
    : paymentStatus === "creating-session"
      ? "Preparing Dodo checkout..."
      : paymentStatus === "redirecting"
        ? "Redirecting to Dodo..."
        : paymentStatus === "verifying"
          ? "Verifying payment..."
          : paymentStatus === "processing"
            ? "Payment is processing..."
            : "Confirm & Pay Securely";
  const isPaymentBusy = ["creating-session", "redirecting", "verifying"].includes(paymentStatus);

  if (isLoading) return <main className="checkout-page checkout-page--centered">Loading checkout...</main>;
  if (!isAuthenticated) return <main className="checkout-page checkout-page--centered">Redirecting to Google sign in...</main>;
  if (!draftState || !selectedFlight || !hasActiveReservation) {
    return (
      <main className="checkout-page checkout-page--centered">
        <div className="checkout-page__empty-card">
          <h1>Checkout details are missing</h1>
          <p>Select flights and reserve seats first, then continue here to complete payment.</p>
          {feedbackMessage ? <div className="checkout-page__feedback is-error"><ErrorOutlineRoundedIcon fontSize="small" /><span>{feedbackMessage}</span></div> : null}
          <div className="checkout-page__success-actions"><button type="button" className="button button--primary" onClick={handleBackToResults}>Back to Search</button></div>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      {successPayload ? (
        <div className="checkout-page__success-overlay">
          <div className="checkout-page__success-card">
            <div className="checkout-page__success-icon"><CheckCircleRoundedIcon fontSize="inherit" /></div>
            <h2>Booking confirmed</h2>
            <p>Your payment was received and seats {seatCodeLabel} are now locked in for this itinerary.</p>
            <div className="checkout-page__success-meta">
              <div><span>Booking Ref</span><strong>{bookingReferences.join(", ") || successPayload.booking?.bookingReference || "Pending"}</strong></div>
              <div><span>Total Paid</span><strong>{formatCurrency(successPayload.booking?.totalAmount || grandTotal)}</strong></div>
            </div>
            <div className="checkout-page__success-actions">
              <button type="button" className="button button--secondary" onClick={() => viewBookingPdf(completedBooking)}>
                <VisibilityRoundedIcon fontSize="small" />
                <span>View Itinerary</span>
              </button>
              <button type="button" className="button button--secondary" onClick={() => downloadBookingPdf(completedBooking)}>
                <DownloadRoundedIcon fontSize="small" />
                <span>Download PDF</span>
              </button>
              <button type="button" className="button button--primary" onClick={() => navigate("/bookings")}>
                My Bookings
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BookingHeader
        backLabel="Back to seats"
        onBack={handleBackToSeatSelection}
        rightContent={
          <div className="checkout-page__avatar-shell">
            {user?.picture ? <img src={user.picture} alt={displayName} /> : displayInitials}
          </div>
        }
      />

      <section className="checkout-page__hero">
        <div className="checkout-page__shell">
          <div className="checkout-page__intro">
            <p className="checkout-page__eyebrow">Checkout</p>
            <h1>Review traveler details and pay securely</h1>
            <p>We already have your {isRoundTrip ? "flights and reserved seats" : "flight and reserved seat"} in place. Add the final contact details, review the fare, and continue into Dodo Payments to finish securely.</p>
          </div>

          <div className={`checkout-page__hold-banner checkout-page__hold-banner--${holdTone}`}>
            <LockRoundedIcon fontSize="small" />
            <div>
              <strong>{isHoldExpired ? "Seat hold expired" : `${isRoundTrip ? "Seats" : "Seat"} reserved for ${formatHoldTime(holdSeconds)}`}</strong>
              <span>{isHoldExpired ? "Return to the seat map to reserve seats again before starting payment." : "Your selected seats are already reserved on the backend while you finish payment."}</span>
            </div>
          </div>

          <div className="checkout-page__layout">
            <div className="checkout-page__main-column">
              <section className="checkout-page__journey-card">
                <button type="button" className="checkout-page__journey-toggle" aria-expanded={isSummaryExpanded} onClick={() => setIsSummaryExpanded((current) => !current)}>
                  <div><span>Journey Snapshot</span><strong>{isRoundTrip ? "Round trip itinerary" : `${formatFlightTitle(selectedFlight)} | Seat ${selectedSeatCode}`}</strong></div>
                  <ExpandMoreRoundedIcon fontSize="small" />
                </button>
                {isSummaryExpanded ? (
                  <div className="checkout-page__journey-body">
                    {isRoundTrip ? (
                      <div className="checkout-page__leg-list">
                        {itineraryLegs.map((leg) => (
                          <article key={leg.legKey} className="checkout-page__leg-card">
                            <div>
                              <span>{leg.label}</span>
                              <strong>{formatFlightTitle(leg.flight)}</strong>
                              <p>{formatRouteLabel(leg.flight)}</p>
                            </div>
                            <div>
                              <span>Departure</span>
                              <strong>{formatIsoTime(leg.flight?.departure_time)}</strong>
                              <p>{formatIsoDate(leg.flight?.departure_time, shortDateFormatter)}</p>
                            </div>
                            <div>
                              <span>Seat</span>
                              <strong>{getSelectionSeatLabel(leg.selection)}</strong>
                              <p>{getSeatPosition(leg.selection?.selectedSeatCode)}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="checkout-page__journey-timeline">
                        <div><span>Departure</span><strong>{formatIsoTime(selectedFlight.departure_time)}</strong><p>{selectedFlight.airportFrom}</p><em>{formatIsoDate(selectedFlight.departure_time, shortDateFormatter)}</em></div>
                        <div className="checkout-page__journey-line"><FlightTakeoffRoundedIcon fontSize="small" /><span>{travelerSummary}</span></div>
                        <div className="checkout-page__journey-arrival"><span>Arrival</span><strong>{formatIsoTime(selectedFlight.arrival_time)}</strong><p>{selectedFlight.airportTo}</p><em>{formatIsoDate(selectedFlight.arrival_time, shortDateFormatter)}</em></div>
                      </div>
                    )}
                    <div className="checkout-page__journey-meta-grid">
                      <article><div className="checkout-page__journey-meta-icon"><EventSeatRoundedIcon fontSize="small" /></div><div><span>Seat Selection</span><strong>{seatCodeLabel}</strong><p>{seatDescriptor}</p></div></article>
                      <article><div className="checkout-page__journey-meta-icon"><LuggageRoundedIcon fontSize="small" /></div><div><span>Baggage</span><strong>1 cabin + 1 check-in bag</strong><p>Included with this itinerary</p></div></article>
                      <article><div className="checkout-page__journey-meta-icon"><RestaurantRoundedIcon fontSize="small" /></div><div><span>Meals</span><strong>Complimentary onboard meal</strong><p>Cabin service remains included</p></div></article>
                    </div>
                  </div>
                ) : null}
              </section>

              <section ref={travelerDetailsRef} className="checkout-page__panel checkout-page__panel--details">
                <div className="checkout-page__section-head"><div><span>Traveler Details</span><h2>Where should we send your itinerary?</h2></div></div>
                <div className="checkout-page__field-grid">
                  <label className="checkout-page__field"><span>Traveler Name</span><input ref={travelerNameInputRef} type="text" value={contactDetails.name} onChange={(event) => setContactDetails((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></label>
                  <label className="checkout-page__field"><span>Email Address</span><input ref={travelerEmailInputRef} type="email" value={contactDetails.email} onChange={(event) => setContactDetails((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" /></label>
                  <label className="checkout-page__field checkout-page__field--wide"><span>Mobile Number</span><input ref={travelerPhoneInputRef} type="tel" value={contactDetails.phone} onChange={(event) => setContactDetails((current) => ({ ...current, phone: event.target.value }))} placeholder="+91 98765 43210" /></label>
                </div>
                <label className="checkout-page__terms-row"><input ref={travelerTermsInputRef} type="checkbox" checked={acceptsTerms} onChange={(event) => setAcceptsTerms(event.target.checked)} /><span>I agree to Flyvora&apos;s <a href="/terms">Terms of Service</a> and <a href="/privacy">privacy policy</a> for this booking.</span></label>
                <div className="checkout-page__secure-card"><div className="checkout-page__secure-icon"><VerifiedUserRoundedIcon fontSize="small" /></div><div><strong>Dodo Payments Hosted Checkout</strong><p>The seats are already reserved for five minutes. Flyvora collects traveler details here, then Dodo handles the final payment step securely.</p></div></div>
                {feedbackMessage ? <div className={`checkout-page__feedback ${paymentStatus === "success" ? "is-success" : "is-error"}`}>{paymentStatus === "success" ? <CheckCircleRoundedIcon fontSize="small" /> : <ErrorOutlineRoundedIcon fontSize="small" />}<span>{feedbackMessage}</span></div> : null}
              </section>
            </div>

            <aside className="checkout-page__summary-column">
              <div className="checkout-page__summary-card">
                <div className="checkout-page__summary-head"><div><span>Fare Breakdown</span><h3>{isRoundTrip ? "Round trip itinerary" : formatFlightTitle(selectedFlight)}</h3></div><div className="checkout-page__summary-chip">Reserved Seat</div></div>
                {isRoundTrip ? (
                  <div className="checkout-page__summary-leg-list">
                    {itineraryLegs.map((leg) => (
                      <div key={leg.legKey}>
                        <span>{leg.label}</span>
                        <strong>{formatFlightTitle(leg.flight)} | Seat {getSelectionSeatLabel(leg.selection)}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="checkout-page__summary-line-items">
                  <div><span>Base fare ({travelerSummary})</span><strong>{formatCurrency(baseFareTotal)}</strong></div>
                  <div><span>Taxes &amp; fees</span><strong>{formatCurrency(taxesAndFeesTotal)}</strong></div>
                  <div><span>Flyvora service fee</span><strong>{formatCurrency(serviceFee)}</strong></div>
                  <div><span>Seat selection</span><strong>{seatFee === 0 ? "Complimentary" : formatCurrency(seatFee)}</strong></div>
                </div>
                <div className="checkout-page__summary-total"><div><span>Total Payable</span><strong>{formatCurrency(grandTotal)}</strong></div><p>Charged once in Dodo checkout</p></div>
                <div className="checkout-page__summary-security"><ShieldRoundedIcon fontSize="small" /><span>Flyvora never handles raw card details. Dodo hosts the final payment step for this booking.</span></div>
                <div className="checkout-page__summary-route">
                  <div><span>Traveler</span><strong>{travelerSummary}</strong></div>
                  <div><span>Travel date</span><strong>{isRoundTrip ? itineraryLegs.map((leg) => formatIsoDate(leg.flight?.departure_time, shortDateFormatter)).join(" + ") : formatIsoDate(selectedFlight.departure_time)}</strong></div>
                  <div><span>Seat</span><strong>{seatCodeLabel}</strong></div>
                </div>
                <button type="button" className="button button--primary checkout-page__cta" disabled={isPaymentBusy} onClick={handlePayNow}><LockRoundedIcon fontSize="small" /><span>{ctaLabel}</span></button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="checkout-page__mobile-footer"><div><span>Total Payable</span><strong>{formatCurrency(grandTotal)}</strong></div><button type="button" className="button button--primary checkout-page__mobile-cta" disabled={isPaymentBusy} onClick={handlePayNow}><span>{isHoldExpired ? "Back to seats" : "Pay now"}</span><ArrowForwardRoundedIcon fontSize="small" /></button></div>
    </main>
  );
};

export default Checkout;
