import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminSession } from "../../auth/AdminSessionContext";
import "../../../styles/auth.scss";

const resolveAdminReturnTo = (candidatePath) => {
  if (typeof candidatePath !== "string") {
    return "/admin";
  }

  return candidatePath.startsWith("/admin") ? candidatePath : "/admin";
};

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAdminSession();
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const returnTo = resolveAdminReturnTo(location.state?.returnTo);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login(formValues);
      navigate(returnTo, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "We could not sign you in to the admin dashboard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-layout">
        <div className="auth-layout__card">
          <p className="auth-layout__eyebrow">Admin Access</p>
          <h1 className="auth-layout__title">Checking your dashboard session.</h1>
          <p className="auth-layout__status">Please wait a moment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__panel">
        <p className="auth-layout__eyebrow">Admin Access</p>
        <h1 className="auth-layout__title">Sign in to the operations dashboard.</h1>
        <p className="auth-layout__copy">
          Admin access uses a separate dashboard account. Your regular traveler login does not unlock this area.
        </p>

        <form className="auth-layout__form" onSubmit={handleSubmit}>
          <label className="auth-layout__field" htmlFor="admin-email">
            <span>Email</span>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={handleChange}
              placeholder="Enter your admin email"
              required
            />
          </label>

          <label className="auth-layout__field" htmlFor="admin-password">
            <span>Password</span>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formValues.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </label>

          {errorMessage ? (
            <p className="auth-layout__message auth-layout__message--error">{errorMessage}</p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Enter Admin Dashboard"}
          </button>
        </form>

        <div className="auth-layout__footer">
          <Link className="auth-layout__link" to="/">
            Return to Flyvora home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
