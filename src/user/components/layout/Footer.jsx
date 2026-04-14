import React from "react";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import { useLocation } from "react-router-dom";

export const PublicFooter = () => {
  const location = useLocation();
  const buildHomeAnchor = (hash) => (location.pathname === "/" ? hash : `/${hash}`);

  return (
    <footer className="home-page__footer">
      <div className="home-page__shell home-page__footer-layout">
        <div className="home-page__footer-brand">
          <strong>Flyvora</strong>
          <p>Redefining the sky through digital precision and human warmth.</p>
          <span>Copyright 2026 Flyvora. The Digital Concierge.</span>
        </div>
        <div className="home-page__footer-column">
          <span>Company</span>
          <a href={buildHomeAnchor("#destinations")}>Explore</a>
          <a href={buildHomeAnchor("#support")}>Support</a>
        </div>
        <div className="home-page__footer-column">
          <span>Legal</span>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
        <div className="home-page__footer-column home-page__footer-column--connect">
          <span>Connect</span>
          <div className="home-page__socials">
            <a href="mailto:hello@flyvora.com" aria-label="Email Flyvora">
              <AlternateEmailRoundedIcon fontSize="small" />
            </a>
            <a href="https://flyvora.com" aria-label="Visit Flyvora website">
              <LanguageRoundedIcon fontSize="small" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
