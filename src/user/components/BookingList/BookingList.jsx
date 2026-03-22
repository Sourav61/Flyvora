import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs } from "@firebase/firestore";
import { useAuth0 } from "@auth0/auth0-react";
import { userColumns } from "../../../admin/datatablesource";
import { db } from "../../../admin/firebase-config";
import "../../../styles/content-pages.scss";

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [flights, setFlights] = useState([]);
  const { user } = useAuth0();

  useEffect(() => {
    const loadData = async () => {
      const bookingsSnapshot = await getDocs(collection(db, "bookings"));
      const flightsSnapshot = await getDocs(collection(db, "flights"));

      setBookings(bookingsSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      setFlights(flightsSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    loadData();
  }, []);

  const bookedTickets = () => {
    if (!user?.email) {
      return [];
    }

    const matchedBooking = bookings.find((entry) => entry.email === user.email);

    if (!matchedBooking) {
      return [];
    }

    const bookedFlightIds = new Set(matchedBooking.bookings || []);
    return flights.filter((flight) => bookedFlightIds.has(flight.id));
  };

  return (
    <main className="booking-list">
      <div className="booking-list__shell">
        <div className="booking-list__header">
          <div>
            <h1>Your booked flights</h1>
            <p>Bookings unlock after Google sign-in. This view shows the flights linked to your traveler email.</p>
          </div>
        </div>

        <div className="booking-list__panel">
          {bookedTickets().length === 0 ? (
            <div className="booking-list__notice">
              No bookings found for this account yet. Once reservation flow is connected to the backend booking flow, they will appear here.
            </div>
          ) : (
            <div className="booking-list__grid">
              <DataGrid
                rows={bookedTickets()}
                columns={userColumns}
                pageSize={9}
                rowsPerPageOptions={[9]}
                checkboxSelection
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default BookingList;
