import React, { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EventSeatRoundedIcon from "@mui/icons-material/EventSeatRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { buildSearchPath, formatTravelerSummary } from "../../search/searchUtils";
import { readSeatSelectionDraft } from "../../search/seatSelectionStorage";
import "../home/home.scss";
import "./seatSelection.scss";

const SEAT_COLUMNS = ["A", "B", "C", "D", "E", "F"];
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

const buildSeatMap = (flightId) =>
  Array.from({ length: 8 }, (_, rowIndex) => {
    const rowNumber = rowIndex + 1;

    return {
      rowNumber,
      seats: SEAT_COLUMNS.map((column, seatIndex) => {
        const seatCode = `${rowNumber}${column}`;
        const isOccupied = ((Number(flightId) || 0) + rowNumber + seatIndex * 3) % 7 === 0 && seatCode !== "2A";
        const seatFee = rowNumber <= 2 ? 1450 : rowNumber <= 4 ? 650 : 0;
        const seatType = rowNumber <= 2 ? "Extra space" : rowNumber <= 4 ? "Preferred" : "Standard";

        return {
          seatCode,
          isOccupied,
          seatFee,
          seatType,
          isWindow: column === "A" || column === "F",
        };
      }),
    };
  });

const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatIsoTime = (value) => timeFormatter.format(new Date(value));
const formatIsoDate = (value) => dateFormatter.format(new Date(value));

const SeatSelection = () => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { flightId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSeatCode, setSelectedSeatCode] = useState("");
  const [isSeatLocked, setIsSeatLocked] = useState(false);

  const selectionDraft = useMemo(() => {
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

  const seatMap = useMemo(() => buildSeatMap(flightId), [flightId]);
  const allSeats = useMemo(() => seatMap.flatMap((row) => row.seats), [seatMap]);
  const selectedFlight = selectionDraft?.selectedFlight || null;
  const searchState = selectionDraft?.searchState || null;
  const selectedSeat = useMemo(
    () => allSeats.find((seat) => seat.seatCode === selectedSeatCode) || null,
    [allSeats, selectedSeatCode]
  );

  useEffect(() => {
    if (selectedSeatCode) {
      return;
    }

    const preferredSeat = allSeats.find((seat) => !seat.isOccupied && seat.seatCode === "2A");
    const fallbackSeat = allSeats.find((seat) => !seat.isOccupied);
    setSelectedSeatCode(preferredSeat?.seatCode || fallbackSeat?.seatCode || "");
  }, [allSeats, selectedSeatCode]);

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

  if (isLoading) {
    return <main className="seat-selection-page seat-selection-page--centered">Loading seat map...</main>;
  }

  if (!isAuthenticated) {
    return <main className="seat-selection-page seat-selection-page--centered">Redirecting to Google sign in...</main>;
  }

  if (!selectionDraft || !selectedFlight) {
    return (
      <main className="seat-selection-page seat-selection-page--centered">
        <div className="seat-selection-page__empty-card">
          <h1>No flight selection found</h1>
          <p>Choose a flight first, then continue here to pick your seat.</p>
          <button type="button" className="button button--primary" onClick={() => navigate("/flights")}>Back to Search</button>
        </div>
      </main>
    );
  }

  const seatFee = selectedSeat?.seatFee || 0;
  const grandTotal = selectedFlight.totalFare + seatFee;
  const backPath = searchState ? buildSearchPath(searchState) : "/flights";

  return (
    <main className="seat-selection-page">
      <header className="seat-selection-page__header">
        <div className="seat-selection-page__shell seat-selection-page__header-inner">
          <button type="button" className="seat-selection-page__back" onClick={() => navigate(backPath)}>
            <ArrowBackRoundedIcon fontSize="small" />
            <span>Back to results</span>
          </button>
          <div className="seat-selection-page__hold">
            <TimerOutlinedIcon fontSize="small" />
            <span>Holding your seat for 05:00</span>
          </div>
        </div>
      </header>

      <section className="seat-selection-page__hero">
        <div className="seat-selection-page__shell seat-selection-page__hero-layout">
          <div className="seat-selection-page__main-card">
            <div className="seat-selection-page__hero-copy">
              <p className="seat-selection-page__eyebrow">Seat Selection</p>
              <h1>Select your seat</h1>
              <p>
                {selectedFlight.airline} {selectedFlight.flightNumber} from {selectedFlight.airportFrom} to {selectedFlight.airportTo} on {formatIsoDate(selectedFlight.departure_time)} at {formatIsoTime(selectedFlight.departure_time)}.
              </p>
            </div>

            <div className="seat-selection-page__legend">
              <span><i className="seat-selection-page__legend-chip" /> Available</span>
              <span><i className="seat-selection-page__legend-chip seat-selection-page__legend-chip--occupied" /> Occupied</span>
              <span><i className="seat-selection-page__legend-chip seat-selection-page__legend-chip--selected" /> Selected</span>
            </div>

            <div className="seat-selection-page__grid-shell">
              <div className="seat-selection-page__plane-nose">Flight deck</div>
              <div className="seat-selection-page__column-labels">
                <div>A</div><div>B</div><div>C</div><div className="seat-selection-page__aisle" /><div>D</div><div>E</div><div>F</div>
              </div>

              {seatMap.map((row) => (
                <div className="seat-selection-page__row" key={row.rowNumber}>
                  {row.seats.slice(0, 3).map((seat) => (
                    <button
                      type="button"
                      key={seat.seatCode}
                      className={`seat-selection-page__seat ${seat.isOccupied ? "is-occupied" : ""} ${selectedSeatCode === seat.seatCode ? "is-selected" : ""}`}
                      disabled={seat.isOccupied}
                      onClick={() => {
                        setSelectedSeatCode(seat.seatCode);
                        setIsSeatLocked(false);
                      }}
                    >
                      {selectedSeatCode === seat.seatCode ? <CheckRoundedIcon fontSize="inherit" /> : seat.seatCode}
                    </button>
                  ))}
                  <div className="seat-selection-page__aisle seat-selection-page__aisle--row">{row.rowNumber}</div>
                  {row.seats.slice(3).map((seat) => (
                    <button
                      type="button"
                      key={seat.seatCode}
                      className={`seat-selection-page__seat ${seat.isOccupied ? "is-occupied" : ""} ${selectedSeatCode === seat.seatCode ? "is-selected" : ""}`}
                      disabled={seat.isOccupied}
                      onClick={() => {
                        setSelectedSeatCode(seat.seatCode);
                        setIsSeatLocked(false);
                      }}
                    >
                      {selectedSeatCode === seat.seatCode ? <CheckRoundedIcon fontSize="inherit" /> : seat.seatCode}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <aside className="seat-selection-page__summary-card">
            <div>
              <p className="seat-selection-page__eyebrow">Selection Summary</p>
              <h2>{selectedSeatCode || "Pick a seat"}</h2>
              <p>{selectedSeat ? `${selectedSeat.seatType}${selectedSeat.isWindow ? " · Window" : ""}` : "No seat selected yet"}</p>
            </div>

            <div className="seat-selection-page__summary-block">
              <div><span>Traveler</span><strong>{formatTravelerSummary(searchState.travelers)}</strong></div>
              <div><span>Base flight</span><strong>{formatCurrency(selectedFlight.totalFare)}</strong></div>
              <div><span>Seat fee</span><strong>{formatCurrency(seatFee)}</strong></div>
              <div className="seat-selection-page__summary-total"><span>Total</span><strong>{formatCurrency(grandTotal)}</strong></div>
            </div>

            <div className="seat-selection-page__perks">
              <span><WifiRoundedIcon fontSize="inherit" /> Fast Wi-Fi</span>
              <span><BoltRoundedIcon fontSize="inherit" /> Power outlet</span>
              <span><EventSeatRoundedIcon fontSize="inherit" /> Extra comfort</span>
            </div>

            <button type="button" className="button button--primary seat-selection-page__cta" onClick={() => setIsSeatLocked(true)}>
              <LockRoundedIcon fontSize="small" />
              <span>{isSeatLocked ? "Seat Locked" : "Lock Seat"}</span>
            </button>

            {isSeatLocked ? (
              <p className="seat-selection-page__locked-note">Seat locked for review. Booking and payment can hook in next.</p>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
};

export default SeatSelection;
