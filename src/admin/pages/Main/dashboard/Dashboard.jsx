import React, { useEffect, useState } from "react";
import Sidebar from "../../../components/sidebar/Sidebar";
import Navbar from "../../../components/navbar/Navbar";
import "./dashboard.scss";
import Widget from "../../../components/widget/Widget";
import Featured from "../../../components/featured/Featured";
import Chart from "../../../components/chart/Chart";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase-config";

const Dashboard = () => {
  const [userCount, setUserCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [flightCount, setFlightCount] = useState(0);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Users (Assuming 'users' collection exists, falling back to basic mock if none)
        const usersSnap = await getDocs(collection(db, "users"));
        setUserCount(usersSnap.docs.length || 142); // fallback if empty initially

        // Fetch Flights
        const flightsSnap = await getDocs(collection(db, "flights"));
        setFlightCount(flightsSnap.docs.length);

        // Fetch Bookings
        const bookingsSnap = await getDocs(collection(db, "bookings"));
        let totalBookings = 0;
        bookingsSnap.forEach(doc => {
          totalBookings += doc.data().bookings?.length || 0;
        });
        setBookingCount(totalBookings);

        // Calculate Revenue (Mock average ticket price)
        setEarnings(totalBookings * 450); // $450 avg ticket
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="homeContainer">
        <Navbar />
        <div className="widgets">
          <Widget type="user" customAmount={userCount} diff={12} />
          <Widget type="flight" customAmount={flightCount} diff={5} />
          <Widget type="order" customAmount={bookingCount} diff={24} />
          <Widget type="earning" customAmount={earnings} diff={18} />
        </div>
        <div className="charts">
          <Featured revenue={earnings} target={50000} />
          <Chart title="Revenue Analytics (Last 6 Months)" aspect={2 / 1} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
