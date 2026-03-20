import Dashboard from "./admin/pages/Main/dashboard/Dashboard";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import { Terms, Privacy } from "./Policies";
import List from "./admin/pages/Main/list/List";
import Single from "./admin/pages/Main/single/Single";
import New from "./admin/pages/Main/new/New";
import Home from "./user/pages/home/Home"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { productInputs, userInputs } from "./admin/formSource";
import "./admin/style/dark.scss";
import { useContext } from "react";
import { DarkModeContext } from "./context/darkModeContext";
import 'bootstrap/dist/css/bootstrap.css';
import { useAuth0 } from "@auth0/auth0-react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Provider } from "react-redux";
import store from "./Redux/store";
import BookingList from "./user/components/BookingList/BookingList";
import Bookings from "./admin/pages/Main/bookings/Bookings";

function App() {
  const { darkMode } = useContext(DarkModeContext);
  const { isAuthenticated } = useAuth0();

  const muiTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#7451f8',
      },
      secondary: {
        main: '#ff690f',
      },
    },
    typography: {
      fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiSelect: {
        styleOverrides: {
          root: {
            color: darkMode ? '#fff' : 'inherit',
          }
        }
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            color: darkMode ? '#fff' : 'inherit',
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: darkMode ? 'rgba(255,255,255,0.7)' : 'inherit',
          }
        }
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            color: '#ffffff',
            border: 'none',
          },
          cell: {
            color: '#ffffff',
          },
          columnHeaders: {
            color: '#ffffff',
          }
        }
      }
    }
  });

  return (
    <div className={darkMode ? "app dark" : "app"}>
      <ThemeProvider theme={muiTheme}>
        <Provider store={store}>
          <BrowserRouter>
            <Routes>
              <Route path="/">
                <Route index element={!isAuthenticated ? <Login /> : <Home />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="admin">
                  <Route index element={<Dashboard />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="users">
                    <Route index element={<List />} />
                    <Route path=":userId" element={<Single />} />
                    <Route
                      path="new"
                      element={<New inputs={userInputs} title="Add New User" />}
                    />
                  </Route>
                  <Route path="flights">
                    <Route index element={<List />} />
                    <Route path=":flightId" element={<Single />} />
                    <Route
                      path="new"
                      element={<New inputs={productInputs} title="Add New flight" />}
                    />
                  </Route>
                </Route>
                <Route path="bookings">
                  <Route index element={<BookingList />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </Provider>
      </ThemeProvider>
    </div>
  );
}

export default App;