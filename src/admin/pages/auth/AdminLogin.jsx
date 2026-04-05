import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession, hasActiveAdminSession, saveAdminSession } from "../../auth/adminSession";
import "../../../styles/auth.scss";

const getApiBaseUrl = () =>
  (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const AdminLogin = () => {
  const { isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = useMemo(() => {
    const stateReturnTo = location.state?.returnTo;
    return stateReturnTo && stateReturnTo.startsWith("/admin") ? stateReturnTo : "/admin";
  }, [location.state?.returnTo]);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [helperMessage, setHelperMessage] = useState("");

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    loginWithRedirect({
      appState: { returnTo: "/admin/login" },
      authorizationParams: {
        connection: "google-oauth2",
        prompt: "login",
      },
    });
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAdminSession();
      return;
    }

    if (hasActiveAdminSession()) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, returnTo]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    setHelperMessage("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/session/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          auth0UserId: user?.sub || "",
          auth0Email: user?.email || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "Admin sign-in failed.");
      }

      saveAdminSession(payload.session);
      if (payload.session?.isUsingFallbackCredentials) {
        setHelperMessage("Local demo credentials are active. Set ADMIN_DASHBOARD_USERNAME and ADMIN_DASHBOARD_PASSWORD before deployment.");
      }
      navigate(returnTo, { replace: true });
    } catch (error) {
      clearAdminSession();
      setErrorMessage(error.message || "Admin sign-in failed.");
      setStatus("error");
      return;
    }

    setStatus("success");
  };

  if (isLoading) {
    return (
      <div className="auth-layout">
        <div className="auth-layout__card">
          <p className="auth-layout__eyebrow">Admin Access</p>
          <h1 className="auth-layout__title">Checking your account.</h1>
          <p className="auth-layout__status">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-layout">
        <div className="auth-layout__card">
          <p className="auth-layout__eyebrow">Admin Access</p>
          <h1 className="auth-layout__title">Redirecting to Google sign-in.</h1>
          <p className="auth-layout__status">You need your Flyvora account first, then your admin credentials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__card">
        <p className="auth-layout__eyebrow">Admin Access</p>
        <h1 className="auth-layout__title">Enter admin credentials.</h1>
        <p className="auth-layout__copy">
          You are signed in as {user?.email || user?.name || "this user"}. Use the admin username and password to open the dashboard.
        </p>

        <form className="auth-layout__form" onSubmit={handleSubmit}>
          <label className="auth-layout__field">
            <span>Admin username</span>
            <input
              type="text"
              value={credentials.username}
              onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
              placeholder="Enter admin username"
              autoComplete="username"
            />
          </label>
          <label className="auth-layout__field">
            <span>Password</span>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="button button--primary" disabled={status === "submitting"}>
            {status === "submitting" ? "Checking credentials..." : "Open admin dashboard"}
          </button>
        </form>

        {errorMessage ? <p className="auth-layout__status auth-layout__status--error">{errorMessage}</p> : null}
        {!errorMessage && helperMessage ? <p className="auth-layout__status">{helperMessage}</p> : null}
      </div>
    </div>
  );
};

export default AdminLogin;
