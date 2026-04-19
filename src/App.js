// Admin pages

import Dashboard from "./admin/pages/Main/dashboard/Dashboard";
import List from "./admin/pages/Main/list/List";
import Single from "./admin/pages/Main/single/Single";
import New from "./admin/pages/Main/new/New";
import Bookings from "./admin/pages/Main/bookings/Bookings";

// User pages

import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import { Terms, Privacy } from "./Policies";
import Home from "./user/pages/home/Home";
import SearchResults from "./user/pages/searchResults/SearchResults";
import SeatSelection from "./user/pages/seatSelection/SeatSelection";
import Checkout from "./user/pages/checkout/Checkout";
import FeaturedJourney from "./user/pages/featuredJourney/FeaturedJourney";
import ContactUs from "./user/pages/contact/ContactUs";
import BookingList from "./user/components/BookingList/BookingList";
import AdminLogin from "./admin/pages/auth/AdminLogin";

// Internal Dependancies

// Third Party Dependancies

import "bootstrap/dist/css/bootstrap.css";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { AdminSessionProvider, useAdminSession } from "./admin/auth/AdminSessionContext";

// Static Data
import { productInputs, userInputs } from "./admin/formSource";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isLoading } = useAdminSession();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return children;
}

function App() {
  const muiTheme = createTheme({
    palette: {
      mode: "light",
    },
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    },
  });

  return (
    <AdminSessionProvider>
      <div className="app">
        <ThemeProvider theme={muiTheme}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingList />
                </ProtectedRoute>
              }
            />
            <Route path="/flights" element={<SearchResults />} />
            <Route path="/flights/:flightId" element={<SeatSelection />} />
          <Route path="/checkout/:flightId" element={<Checkout />} />
          <Route path="/journeys/:journeySlug" element={<FeaturedJourney />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <AdminRoute>
                  <Bookings />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <List />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users/:userId"
              element={
                <AdminRoute>
                  <Single />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users/new"
              element={
                <AdminRoute>
                  <New inputs={userInputs} title="Add New User" />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/flights"
              element={
                <AdminRoute>
                  <List />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/flights/:flightId"
              element={
                <AdminRoute>
                  <Single />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/flights/new"
              element={
                <AdminRoute>
                  <New inputs={productInputs} title="Add New flight" />
                </AdminRoute>
              }
            />
          </Routes>
        </ThemeProvider>
      </div>
    </AdminSessionProvider>
  );
}

export default App;



