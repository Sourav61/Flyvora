import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./styles/auth.scss";

function Login() {
  const { loginWithRedirect, isLoading, isAuthenticated, error } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      navigate(returnTo, { replace: true });
      return;
    }

    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: {
        connection: "google-oauth2",
        prompt: "login",
      },
    });
  }, [isAuthenticated, isLoading, loginWithRedirect, navigate, returnTo]);

  return (
    <div className="auth-layout">
      <div className="auth-layout__card">
        <p className="auth-layout__eyebrow">Flyvora Login</p>
        <h1 className="auth-layout__title">Taking you to Google sign-in.</h1>
        <p className="auth-layout__copy">
          Sign in once to unlock bookings and other restricted actions across the app.
        </p>
        {error ? (
          <p className="auth-layout__status auth-layout__status--error">{error.message}</p>
        ) : (
          <p className="auth-layout__status">Redirecting to Google...</p>
        )}
      </div>
    </div>
  );
}

export default Login;
