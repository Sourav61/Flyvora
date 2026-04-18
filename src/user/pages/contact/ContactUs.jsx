import React, { useState } from "react";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import HeadsetMicRoundedIcon from "@mui/icons-material/HeadsetMicRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { PublicHeader } from "../../components/layout/Header";
import { PublicFooter } from "../../components/layout/Footer";
import { buildApiUrl, readApiPayload } from "../../../shared/api";
import "../home/home.scss";
import "./contact.scss";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const supportNotes = [
  {
    title: "Fast review",
    body: "Questions from the form go straight into the Flyvora contact inbox for follow-up.",
    icon: <HeadsetMicRoundedIcon fontSize="small" />,
  },
  {
    title: "Thoughtful replies",
    body: "Share route, dates, or booking context and we can answer with much more precision.",
    icon: <VerifiedRoundedIcon fontSize="small" />,
  },
  {
    title: "Direct channel",
    body: "Prefer email? You can also reach the team at flyvora18@gmail.com.",
    icon: <AlternateEmailRoundedIcon fontSize="small" />,
  },
];

const availability = [
  {
    label: "Coverage",
    value: "Booking help, itinerary questions, and partnership queries",
  },
  {
    label: "Typical reply window",
    value: "Usually within 24 hours",
  },
  {
    label: "Best details to include",
    value: "Route, travel dates, booking reference, and the question you need resolved",
  },
];

const ContactUs = () => {
  const [formState, setFormState] = useState(initialFormState);
  const [status, setStatus] = useState({ tone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field) => (event) => {
    const nextValue = event.target.value;
    setFormState((current) => ({ ...current, [field]: nextValue }));

    if (status.message) {
      setStatus({ tone: "", message: "" });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      phone: formState.phone.trim(),
      subject: formState.subject.trim(),
      message: formState.message.trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      setStatus({ tone: "error", message: "Please complete your name, email, subject, and message before sending." });
      return;
    }

    if (!EMAIL_REGEX.test(payload.email)) {
      setStatus({ tone: "error", message: "Enter a valid email address so we can reply to you." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ tone: "", message: "" });

    try {
      const response = await fetch(buildApiUrl("/api/contact"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await readApiPayload(
        response,
        "We could not process your message right now. Please try again in a moment."
      );

      if (!response.ok) {
        throw new Error(responsePayload.message || "We could not send your message right now.");
      }

      setStatus({
        tone: "success",
        message: responsePayload.message || "Your message is on its way. We will get back to you soon.",
      });
      setFormState(initialFormState);
    } catch (error) {
      setStatus({
        tone: "error",
        message: error.message || "We could not send your message right now. Please try again shortly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="contact-page">
      <PublicHeader />

      <section className="contact-page__hero">
        <div className="home-page__shell contact-page__hero-inner">
          <div className="contact-page__hero-copy">
            <p className="contact-page__eyebrow">Contact Flyvora</p>
            <h1>Simple support, built around the same calm experience.</h1>
            <p className="contact-page__intro">
              Use the form below to ask about bookings, travel planning, or partnerships. We will route your message directly to the Flyvora inbox and reply to the email you provide.
            </p>

            <div className="contact-page__hero-pills">
              <span><ScheduleRoundedIcon fontSize="inherit" /> Usually within 24 hours</span>
              <span><AlternateEmailRoundedIcon fontSize="inherit" /> flyvora18@gmail.com</span>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-page__content">
        <div className="home-page__shell contact-page__content-grid">
          <article className="contact-page__form-card">
            <div className="contact-page__section-head">
              <span>Get in touch</span>
              <h2>Tell us what you need.</h2>
              <p>A short message is enough. Add booking or trip details if you want a more specific reply.</p>
            </div>

            <form className="contact-page__form" onSubmit={handleSubmit}>
              <div className="contact-page__field-grid">
                <label className="contact-page__field">
                  <span>Full name</span>
                  <input type="text" value={formState.name} onChange={updateField("name")} placeholder="Your name" />
                </label>

                <label className="contact-page__field">
                  <span>Email address</span>
                  <input type="email" value={formState.email} onChange={updateField("email")} placeholder="you@example.com" />
                </label>

                <label className="contact-page__field">
                  <span>Phone number</span>
                  <input type="tel" value={formState.phone} onChange={updateField("phone")} placeholder="+91 98765 43210" />
                </label>

                <label className="contact-page__field">
                  <span>Subject</span>
                  <input type="text" value={formState.subject} onChange={updateField("subject")} placeholder="How can we help?" />
                </label>
              </div>

              <label className="contact-page__field contact-page__field--message">
                <span>Message</span>
                <textarea
                  value={formState.message}
                  onChange={updateField("message")}
                  placeholder="Share your route, travel dates, booking reference, or the question you want help with."
                  rows="7"
                />
              </label>

              {status.message ? (
                <p className={`contact-page__status contact-page__status--${status.tone || "neutral"}`}>
                  {status.message}
                </p>
              ) : null}

              <button type="submit" className="button button--primary contact-page__submit" disabled={isSubmitting}>
                <SendRoundedIcon fontSize="small" />
                <span>{isSubmitting ? "Sending..." : "Send message"}</span>
              </button>
            </form>
          </article>

          <div className="contact-page__side">
            <article className="contact-page__info-card">
              <div className="contact-page__section-head contact-page__section-head--compact">
                <span>Why this works</span>
                <h2>Simple on purpose.</h2>
              </div>

              <div className="contact-page__note-list">
                {supportNotes.map((item) => (
                  <div className="contact-page__note" key={item.title}>
                    <div className="contact-page__note-icon">{item.icon}</div>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="contact-page__info-card">
              <div className="contact-page__section-head contact-page__section-head--compact">
                <span>Before you send</span>
                <h2>Helpful details</h2>
              </div>

              <div className="contact-page__availability">
                {availability.map((item) => (
                  <div className="contact-page__availability-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
};

export default ContactUs;
