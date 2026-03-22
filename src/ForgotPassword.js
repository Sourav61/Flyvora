import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "./admin/firebase-config";
import "./styles/auth.scss";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
    } catch (requestError) {
      const messages = {
        "auth/user-not-found": "No account found with this email address.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/operation-not-allowed": "Password reset is not enabled. Please contact support.",
        "auth/network-request-failed": "Network error. Check your connection and try again.",
      };

      setError(messages[requestError.code] || requestError.message);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-layout__panel">
        <p className="auth-layout__eyebrow">Admin Recovery</p>
        <h1 className="auth-layout__title">Reset password</h1>
        <p className="auth-layout__copy">
          Enter your admin email address to receive password reset instructions.
        </p>

        {!submitted ? (
          <form className="auth-layout__form" onSubmit={handleSubmit}>
            <div className="auth-layout__field">
              <label htmlFor="reset-email">Admin email address</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="button button--primary">Send Reset Link</button>
            {error ? <p className="auth-layout__message auth-layout__message--error">{error}</p> : null}
          </form>
        ) : (
          <p className="auth-layout__message auth-layout__message--success">
            We have sent password reset instructions to {email}.
          </p>
        )}

        <div className="auth-layout__footer">
          <button type="button" className="auth-layout__link" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
