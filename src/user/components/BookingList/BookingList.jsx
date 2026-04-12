import React, { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import AirRoundedIcon from "@mui/icons-material/AirRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import StyledSelectField from "../StyledSelectField";
import "../../pages/home/home.scss";
import "./BookingList.scss";
import { downloadBookingPdf, viewBookingPdf } from "../../bookings/bookingPdf";
import { buildApiUrl, describeApiTarget, readApiPayload } from "../../../shared/api";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: "confirmed", label: "Confirmed" },
  { value: "payment_pending", label: "Pending" },
  { value: "payment_failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];
const TIME_WINDOW_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "overnight", label: "12 AM - 6 AM" },
  { value: "morning", label: "6 AM - 12 PM" },
  { value: "afternoon", label: "12 PM - 6 PM" },
  { value: "evening", label: "6 PM - 12 AM" },
];

const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : "--");
const formatTime = (value) => (value ? timeFormatter.format(new Date(value)) : "--");
const formatStatusLabel = (value = "") => value.replace(/_/g, " ");
const resolveBookingErrorMessage = (error) => {
  const message = String(error?.message || "").trim();

  if (!message) {
    return "We could not load your bookings right now.";
  }

  if (/failed to fetch|load failed|networkerror|network request failed/i.test(message)) {
    return `We couldn't reach the bookings service at ${describeApiTarget()}. Please make sure the backend is running and try again.`;
  }

  return message;
};
const getStatusTone = (status = "") => {
  if (status === "confirmed") return "success";
  if (status === "payment_pending") return "warning";
  if (status === "payment_failed") return "danger";
  return "neutral";
};
const sortSeatCodes = (seatCodes = []) =>
  [...seatCodes].sort((left, right) => {
    const leftMatch = String(left).match(/^(\d+)([A-Z])$/i);
    const rightMatch = String(right).match(/^(\d+)([A-Z])$/i);

    if (!leftMatch || !rightMatch) {
      return String(left).localeCompare(String(right));
    }

    const rowDifference = Number(leftMatch[1]) - Number(rightMatch[1]);

    if (rowDifference !== 0) {
      return rowDifference;
    }

    return leftMatch[2].localeCompare(rightMatch[2]);
  });
const getTimeWindow = (value) => {
  if (!value) {
    return "all";
  }

  const hour = new Date(value).getHours();

  if (hour < 6) return "overnight";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};
const normalizeBookingPaymentStatus = (booking) => {
  if (booking.status === "confirmed" || booking.payment?.status === "succeeded") return "confirmed";
  if (booking.status === "payment_pending" || ["created", "processing", "pending"].includes(booking.payment?.status)) return "payment_pending";
  if (booking.status === "payment_failed" || booking.payment?.status === "failed") return "payment_failed";
  if (booking.status === "cancelled" || booking.payment?.status === "cancelled") return "cancelled";
  return "other";
};
const isPendingBookingExpired = (booking) => {
  if (normalizeBookingPaymentStatus(booking) !== "payment_pending") {
    return false;
  }

  const holdExpiresAt = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : Number.NaN;
  return Number.isFinite(holdExpiresAt) && holdExpiresAt <= Date.now();
};
const buildFlightGroupKey = (booking) => {
  const flight = booking.flight || {};
  const paymentStatus = normalizeBookingPaymentStatus(booking);

  return [
    flight.id || "",
    flight.flightNumber || "",
    flight.departure_time || flight.departureTime || "",
    flight.arrival_time || flight.arrivalTime || "",
    flight.airportFrom || flight.source || "",
    flight.airportTo || flight.destination || "",
    paymentStatus,
  ].join("::");
};
const groupBookingsByFlight = (bookings = []) => {
  const groupedBookings = new Map();

  bookings.forEach((booking) => {
    const paymentStatus = normalizeBookingPaymentStatus(booking);
    const groupKey = buildFlightGroupKey(booking);
    const existingGroup = groupedBookings.get(groupKey);
    const bookingHoldExpiresAt = booking.holdExpiresAt || null;

    if (!existingGroup) {
      groupedBookings.set(groupKey, {
        groupId: groupKey,
        groupStatus: paymentStatus,
        bookings: [booking],
        bookingReferences: booking.bookingReference ? [booking.bookingReference] : [],
        seatCodes: booking.seatCode ? [booking.seatCode] : [],
        traveler: booking.traveler,
        flight: booking.flight,
        fare: {
          baseFare: Number(booking.fare?.baseFare || 0),
          taxesAndFees: Number(booking.fare?.taxesAndFees || 0),
          serviceFee: Number(booking.fare?.serviceFee || 0),
          seatFee: Number(booking.fare?.seatFee || 0),
          totalAmount: Number(booking.fare?.totalAmount || 0),
          currency: booking.fare?.currency || "INR",
        },
        travelersCount: Number(booking.travelersCount || 1),
        cabinClasses: booking.cabinClass ? [booking.cabinClass] : [],
        holdExpiresAt: bookingHoldExpiresAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      });
      return;
    }

    existingGroup.bookings.push(booking);
    if (booking.bookingReference) existingGroup.bookingReferences.push(booking.bookingReference);
    if (booking.seatCode) existingGroup.seatCodes.push(booking.seatCode);
    if (booking.cabinClass) existingGroup.cabinClasses.push(booking.cabinClass);
    existingGroup.fare.baseFare += Number(booking.fare?.baseFare || 0);
    existingGroup.fare.taxesAndFees += Number(booking.fare?.taxesAndFees || 0);
    existingGroup.fare.serviceFee += Number(booking.fare?.serviceFee || 0);
    existingGroup.fare.seatFee += Number(booking.fare?.seatFee || 0);
    existingGroup.fare.totalAmount += Number(booking.fare?.totalAmount || 0);
    existingGroup.travelersCount += Number(booking.travelersCount || 1);

    if (bookingHoldExpiresAt) {
      if (!existingGroup.holdExpiresAt || new Date(bookingHoldExpiresAt) < new Date(existingGroup.holdExpiresAt)) {
        existingGroup.holdExpiresAt = bookingHoldExpiresAt;
      }
    }

    existingGroup.createdAt = new Date(booking.createdAt) > new Date(existingGroup.createdAt) ? booking.createdAt : existingGroup.createdAt;
    existingGroup.updatedAt = new Date(booking.updatedAt || booking.createdAt) > new Date(existingGroup.updatedAt || existingGroup.createdAt)
      ? (booking.updatedAt || booking.createdAt)
      : (existingGroup.updatedAt || existingGroup.createdAt);
  });

  return Array.from(groupedBookings.values())
    .map((group) => {
      const bookingReferences = Array.from(new Set(group.bookingReferences));
      const seatCodes = sortSeatCodes(Array.from(new Set(group.seatCodes)));
      const cabinClasses = Array.from(new Set(group.cabinClasses));

      return {
        id: group.groupId,
        bookings: group.bookings,
        bookingReference: bookingReferences[0] || group.groupId,
        bookingReferences,
        bookingReferenceLabel: bookingReferences.length <= 1 ? (bookingReferences[0] || group.groupId) : `${bookingReferences[0]} +${bookingReferences.length - 1} more`,
        seatCode: seatCodes[0] || "",
        seatCodes,
        seatLabel: seatCodes.join(", ") || "--",
        traveler: group.traveler,
        flight: group.flight,
        fare: group.fare,
        travelersCount: group.travelersCount,
        cabinClass: cabinClasses.length <= 1 ? (cabinClasses[0] || "Economy") : cabinClasses.join(", "),
        holdExpiresAt: group.holdExpiresAt,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        status: group.groupStatus,
        paymentSummaryStatus: group.groupStatus,
      };
    })
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
};

const BookingList = () => {
  const { user } = useAuth0();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [departureTimeFilter, setDepartureTimeFilter] = useState("all");
  const [arrivalTimeFilter, setArrivalTimeFilter] = useState("all");

  useEffect(() => {
    if (!user?.email && !user?.sub) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const searchParams = new URLSearchParams();

    if (user?.sub) {
      searchParams.set("providerUserId", user.sub);
    }

    if (user?.email) {
      searchParams.set("email", user.email);
    }

    const loadBookings = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(buildApiUrl(`/api/bookings?${searchParams.toString()}`));
        const payload = await readApiPayload(response, "We could not load your bookings right now.");

        if (!response.ok) {
          throw new Error(payload.message || "We could not load your bookings right now.");
        }

        if (!isActive) {
          return;
        }

        setBookings(payload.bookings || []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(resolveBookingErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadBookings();

    return () => {
      isActive = false;
    };
  }, [reloadKey, user?.email, user?.sub]);

  useEffect(() => {
    const nextPendingExpiry = bookings
      .filter((booking) => normalizeBookingPaymentStatus(booking) === "payment_pending")
      .map((booking) => new Date(booking.holdExpiresAt || 0).getTime())
      .filter((value) => Number.isFinite(value) && value > Date.now())
      .sort((left, right) => left - right)[0];

    if (!nextPendingExpiry) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setReloadKey((value) => value + 1);
    }, Math.max(nextPendingExpiry - Date.now() + 1000, 1000));

    return () => window.clearTimeout(timeoutId);
  }, [bookings]);

  const groupedBookings = useMemo(() => groupBookingsByFlight(bookings.filter((booking) => !isPendingBookingExpired(booking))), [bookings]);
  const filteredBookings = useMemo(
    () =>
      groupedBookings.filter((booking) => {
        const departureTime = booking.flight?.departure_time || booking.flight?.departureTime || "";
        const arrivalTime = booking.flight?.arrival_time || booking.flight?.arrivalTime || "";

        if (paymentStatusFilter !== "all" && booking.paymentSummaryStatus !== paymentStatusFilter) {
          return false;
        }

        if (departureTimeFilter !== "all" && getTimeWindow(departureTime) !== departureTimeFilter) {
          return false;
        }

        if (arrivalTimeFilter !== "all" && getTimeWindow(arrivalTime) !== arrivalTimeFilter) {
          return false;
        }

        return true;
      }),
    [arrivalTimeFilter, departureTimeFilter, groupedBookings, paymentStatusFilter]
  );
  const confirmedBookings = useMemo(
    () => groupedBookings.filter((booking) => booking.paymentSummaryStatus === "confirmed"),
    [groupedBookings]
  );

  return (
    <main className="booking-list-page">
      <div className="booking-list-page__shell">
        <header className="booking-list-page__hero">
          <div>
            <p className="booking-list-page__eyebrow">My Bookings</p>
            <h1>Your upcoming journeys</h1>
            <p>
              Seats are clubbed by flight and payment status, so confirmed tickets stay together while pending holds remain separate and expire cleanly.
            </p>
          </div>
          <div className="booking-list-page__hero-card">
            <span>Confirmed flights</span>
            <strong>{confirmedBookings.length}</strong>
            <p>{groupedBookings.length} grouped trip entries for {user?.email || "this traveler"}</p>
          </div>
        </header>

        {isLoading ? <div className="booking-list-page__notice">Loading your bookings...</div> : null}
        {!isLoading && errorMessage ? (
          <div className="booking-list-page__notice booking-list-page__notice--error">
            <span>{errorMessage}</span>
            <button type="button" className="button button--secondary" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !errorMessage && groupedBookings.length > 0 ? (
          <section className="booking-list-page__filters">
            <div className="booking-list-page__filters-head">
              <FilterAltRoundedIcon fontSize="small" />
              <span>Refine your trips</span>
            </div>
            <div className="booking-list-page__filters-grid">
              <label className="booking-list-page__filter-field">
                <span>Payment status</span>
                <div className="booking-list-page__filter-control">
                  <StyledSelectField value={paymentStatusFilter} options={PAYMENT_STATUS_OPTIONS} onChange={setPaymentStatusFilter} className="booking-list-page__filter-select" />
                </div>
              </label>
              <label className="booking-list-page__filter-field">
                <span><AirRoundedIcon fontSize="inherit" /> Departure time</span>
                <div className="booking-list-page__filter-control">
                  <StyledSelectField value={departureTimeFilter} options={TIME_WINDOW_OPTIONS} onChange={setDepartureTimeFilter} className="booking-list-page__filter-select" />
                </div>
              </label>
              <label className="booking-list-page__filter-field">
                <span><ScheduleRoundedIcon fontSize="inherit" /> Arrival time</span>
                <div className="booking-list-page__filter-control">
                  <StyledSelectField value={arrivalTimeFilter} options={TIME_WINDOW_OPTIONS} onChange={setArrivalTimeFilter} className="booking-list-page__filter-select" />
                </div>
              </label>
            </div>
          </section>
        ) : null}

        {!isLoading && !errorMessage && groupedBookings.length === 0 ? (
          <div className="booking-list-page__empty-card">
            <ReceiptLongRoundedIcon fontSize="inherit" />
            <h2>No bookings yet</h2>
            <p>Once you complete a payment, the confirmed itinerary will appear here automatically.</p>
            <a className="button button--primary" href="/flights">
              Search flights
            </a>
          </div>
        ) : null}

        {!isLoading && !errorMessage && groupedBookings.length > 0 && filteredBookings.length === 0 ? (
          <div className="booking-list-page__notice">No grouped bookings match the current filters.</div>
        ) : null}

        {!isLoading && !errorMessage && filteredBookings.length > 0 ? (
          <div className="booking-list-page__grid">
            {filteredBookings.map((booking) => {
              const flight = booking.flight || {};
              const fare = booking.fare || {};
              const statusTone = getStatusTone(booking.paymentSummaryStatus);
              const isConfirmedBooking = booking.paymentSummaryStatus === "confirmed";

              return (
                <article key={booking.id} className="booking-list-page__card">
                  <div className="booking-list-page__card-head">
                    <div>
                      <span className="booking-list-page__card-label">Booking Ref</span>
                      <strong>{booking.bookingReferenceLabel}</strong>
                    </div>
                    <div className={`booking-list-page__status booking-list-page__status--${statusTone}`}>
                      {formatStatusLabel(booking.paymentSummaryStatus)}
                    </div>
                  </div>

                  <div className="booking-list-page__route-row">
                    <div>
                      <span>Departure</span>
                      <strong>{flight.airportFrom || flight.source || "--"}</strong>
                      <p>{formatDate(flight.departure_time)} | {formatTime(flight.departure_time)}</p>
                    </div>
                    <div className="booking-list-page__route-line">
                      <FlightTakeoffRoundedIcon fontSize="small" />
                      <span>{flight.airline || "Flyvora"} {flight.flightNumber || ""}</span>
                    </div>
                    <div>
                      <span>Arrival</span>
                      <strong>{flight.airportTo || flight.destination || "--"}</strong>
                      <p>{formatDate(flight.arrival_time)} | {formatTime(flight.arrival_time)}</p>
                    </div>
                  </div>

                  <div className="booking-list-page__meta-grid">
                    <div>
                      <span>Traveler</span>
                      <strong>{booking.traveler?.name || "Traveler"}</strong>
                    </div>
                    <div>
                      <span>Seats</span>
                      <strong>{booking.seatLabel}</strong>
                    </div>
                    <div>
                      <span>Cabin</span>
                      <strong>{booking.cabinClass || "Economy"}</strong>
                    </div>
                    <div>
                      <span>{isConfirmedBooking ? "Total paid" : "Total payable"}</span>
                      <strong>{formatCurrency(fare.totalAmount)}</strong>
                    </div>
                  </div>

                  <div className="booking-list-page__perks">
                    <span><EventSeatRoundedIcon fontSize="inherit" /> Seats {booking.seatLabel}</span>
                    <span><LuggageRoundedIcon fontSize="inherit" /> {booking.travelersCount} traveler{booking.travelersCount > 1 ? "s" : ""}</span>
                  </div>

                  {isConfirmedBooking ? (
                    <div className="booking-list-page__actions">
                      <button type="button" className="button button--secondary" onClick={() => viewBookingPdf(booking)}>
                        <VisibilityRoundedIcon fontSize="small" />
                        <span>View</span>
                      </button>
                      <button type="button" className="button button--primary" onClick={() => downloadBookingPdf(booking)}>
                        <DownloadRoundedIcon fontSize="small" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  ) : (
                    <div className="booking-list-page__pending-note">
                      <strong>Payment pending</strong>
                      <span>
                        This reservation stays visible only until the 15-minute hold expires. If payment is not completed in time, the seat is released automatically.
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : null}

        {!isLoading && !errorMessage && filteredBookings.length > 0 ? (
          <div className="booking-list-page__footnote">
            <span>Need another trip?</span>
            <a href="/flights">
              Search flights <ArrowForwardRoundedIcon fontSize="inherit" />
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default BookingList;




