import Dashboard from "./admin/pages/Main/dashboard/Dashboard";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import { Terms, Privacy } from "./Policies";
import List from "./admin/pages/Main/list/List";
import Single from "./admin/pages/Main/single/Single";
import New from "./admin/pages/Main/new/New";
import Home from "./user/pages/home/Home";
import SearchResults from "./user/pages/searchResults/SearchResults";
import SeatSelection from "./user/pages/seatSelection/SeatSelection";
import Checkout from "./user/pages/checkout/Checkout";
import FeaturedJourney from "./user/pages/featuredJourney/FeaturedJourney";
import AdminLogin from "./admin/pages/auth/AdminLogin";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { productInputs, userInputs } from "./admin/formSource";
import "./admin/style/dark.scss";
import { useContext, useEffect, useState } from "react";
import { DarkModeContext } from "./context/darkModeContext";
import "bootstrap/dist/css/bootstrap.css";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useAuth0 } from "@auth0/auth0-react";
import BookingList from "./user/components/BookingList/BookingList";
import { buildApiUrl } from "./shared/api";
import Bookings from "./admin/pages/Main/bookings/Bookings";
import {
  clearAdminSession,
  getAdminAuthorizationHeaders,
  hasActiveAdminSession,
  readAdminSession,
} from "./admin/auth/adminSession";


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
  const { isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();
  const [isCheckingAdminSession, setIsCheckingAdminSession] = useState(true);
  const [isAdminVerified, setIsAdminVerified] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setIsAdminVerified(false);
      setIsCheckingAdminSession(false);
      return;
    }

    const adminSession = readAdminSession();

    if (!hasActiveAdminSession(adminSession)) {
      clearAdminSession();
      setIsAdminVerified(false);
      setIsCheckingAdminSession(false);
      return;
    }

    let isActive = true;

    const verifyAdminSession = async () => {
      setIsCheckingAdminSession(true);

      try {
        const response = await fetch(buildApiUrl("/api/admin/session/me"), {
          headers: {
            "Content-Type": "application/json",
            ...getAdminAuthorizationHeaders(adminSession),
          },
        });

        if (!response.ok) {
          throw new Error("Admin session verification failed.");
        }

        if (!isActive) {
          return;
        }

        setIsAdminVerified(true);
      } catch (error) {
        clearAdminSession();

        if (!isActive) {
          return;
        }

        setIsAdminVerified(false);
      } finally {
        if (isActive) {
          setIsCheckingAdminSession(false);
        }
      }
    };

    verifyAdminSession();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isLoading, location.pathname]);

  if (isLoading || (isAuthenticated && isCheckingAdminSession)) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  }

  if (!isAdminVerified) {
    return <Navigate to="/admin/login" replace state={{ returnTo: location.pathname }} />;
  }

  return children;
}

function App() {
  const { darkMode } = useContext(DarkModeContext);

  const muiTheme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    },
  });

  return (
    <div className={darkMode ? "app dark" : "app"}>
      <ThemeProvider theme={muiTheme}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/journeys/:journeySlug" element={<FeaturedJourney />} />
          <Route path="/flights" element={<SearchResults />} />
          <Route path="/flights/:flightId" element={<SeatSelection />} />
          <Route path="/checkout/:flightId" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
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
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingList />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ThemeProvider>
    </div>
  );
}

export default App;



