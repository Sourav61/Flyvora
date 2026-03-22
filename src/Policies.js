import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/content-pages.scss";

function ContentPage({ title, updatedAt, sections }) {
  const navigate = useNavigate();

  return (
    <main className="content-page">
      <div className="content-page__card">
        <button type="button" className="content-page__back" onClick={() => navigate("/")}>
          Back to Home
        </button>
        <h1 className="content-page__title">{title}</h1>
        <p className="content-page__stamp">Last updated: {updatedAt}</p>
        {sections.map((section) => (
          <section className="content-page__section" key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}

export function Terms() {
  return (
    <ContentPage
      title="Terms of Use"
      updatedAt="March 22, 2026"
      sections={[
        {
          heading: "1. Acceptance of Terms",
          body: "By accessing and booking flights via Flyvora, you accept and agree to be bound by these terms.",
        },
        {
          heading: "2. Booking and Payments",
          body: "All bookings are final upon successful payment. Prices include applicable taxes unless stated otherwise.",
        },
        {
          heading: "3. Cancellations and Refunds",
          body: "Refunds remain subject to airline policy. Platform processing fees may be non-refundable depending on the selected fare.",
        },
      ]}
    />
  );
}

export function Privacy() {
  return (
    <ContentPage
      title="Privacy Policy"
      updatedAt="March 22, 2026"
      sections={[
        {
          heading: "1. Information We Collect",
          body: "We collect the traveler information required to process bookings, provide support, and secure the platform.",
        },
        {
          heading: "2. How We Use Your Data",
          body: "Your data is used to power bookings, account access, traveler assistance, and fraud prevention.",
        },
        {
          heading: "3. Data Sharing",
          body: "We do not sell personal data. We share only the booking and traveler details needed with trusted airline and infrastructure partners.",
        },
      ]}
    />
  );
}
