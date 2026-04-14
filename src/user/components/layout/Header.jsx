import React, { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, useLocation } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContactSupportRoundedIcon from "@mui/icons-material/ContactSupportRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

const InteractiveItem = ({
  item,
  className,
  children,
  onClick,
  ariaLabel,
  ariaHidden,
  id,
}) => {
  const handleClick = (event) => {
    onClick?.(event);
    item?.onClick?.(event);
  };

  if (item?.to) {
    return (
      <Link
        className={className}
        to={item.to}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        id={id}
      >
        {children}
      </Link>
    );
  }

  if (item?.href) {
    return (
      <a
        className={className}
        href={item.href}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        id={id}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      id={id}
    >
      {children}
    </button>
  );
};

const createGoogleLoginHandler = (loginWithRedirect) => (returnTo) => {
  loginWithRedirect({
    appState: { returnTo },
    authorizationParams: {
      connection: "google-oauth2",
      prompt: "login",
    },
  });
};

export const PublicHeader = () => {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const isJourneyPage = location.pathname.startsWith("/journeys/");
  const isSearchResultsPage = location.pathname === "/flights";
  const userDisplayName = user?.given_name || user?.name || "Traveler";
  const startGoogleLogin = createGoogleLoginHandler(loginWithRedirect);
  const buildHomeAnchor = (hash) => (location.pathname === "/" ? hash : `/${hash}`);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) {
        closeMenus();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleOpenPublicMenu = () => {
      setIsProfileMenuOpen(false);
      setIsMobileMenuOpen(true);
    };

    window.addEventListener("flyvora:open-public-menu", handleOpenPublicMenu);
    return () => window.removeEventListener("flyvora:open-public-menu", handleOpenPublicMenu);
  }, []);

  const navigationItems = [
    {
      label: "Flights",
      href: buildHomeAnchor("#search-panel"),
      isActive: !isJourneyPage,
    },
    {
      label: "Explore",
      href: buildHomeAnchor("#destinations"),
      isActive: isJourneyPage,
    },
    {
      label: "Support",
      href: buildHomeAnchor("#support"),
    },
  ];

  const mobilePrimaryItems = [
    isSearchResultsPage
      ? {
          label: "Modify Search",
          onClick: () => window.dispatchEvent(new Event("flyvora:modify-search")),
          icon: <EditRoundedIcon fontSize="inherit" />,
        }
      : {
          label: "Search Flights",
          href: buildHomeAnchor("#search-panel"),
          icon: <SearchRoundedIcon fontSize="inherit" />,
        },
    {
      label: "My Trips",
      onClick: () => {
        if (isAuthenticated) {
          window.location.assign("/bookings");
          return;
        }

        startGoogleLogin("/bookings");
      },
      icon: <LuggageRoundedIcon fontSize="inherit" />,
    },
    {
      label: "Explore",
      href: buildHomeAnchor("#destinations"),
      icon: <ExploreRoundedIcon fontSize="inherit" />,
    },
    {
      label: "Support",
      href: buildHomeAnchor("#support"),
      icon: <ContactSupportRoundedIcon fontSize="inherit" />,
    },
  ];

  const mobileMetaItems = [
    {
      label: "Settings",
      onClick: () => window.location.assign("/admin"),
    },
    {
      label: "Privacy Policy",
      href: "/privacy",
    },
    {
      label: "Terms of Service",
      href: "/terms",
    },
  ];

  const mobileAccountAction = isLoading
    ? null
    : isAuthenticated
      ? {
          label: "Sign Out",
          onClick: () => logout({ logoutParams: { returnTo: window.location.origin } }),
          icon: <LogoutRoundedIcon fontSize="inherit" />,
          tone: "danger",
        }
      : {
          label: "Sign In",
          onClick: () => startGoogleLogin(returnTo),
          icon: <LoginRoundedIcon fontSize="inherit" />,
          tone: "primary",
        };

  const profileMenuItems = [
    {
      label: "Logout",
      onClick: () => logout({ logoutParams: { returnTo: window.location.origin } }),
    },
    {
      label: "My Bookings",
      onClick: () => window.location.assign("/bookings"),
    },
    {
      label: "Admin",
      onClick: () => window.location.assign("/admin"),
    },
  ];

  return (
    <header className={`home-page__nav ${isMobileMenuOpen ? "is-mobile-open" : ""}`}>
      <div className="home-page__shell home-page__nav-inner">
        <a className="home-page__brand" href="/">Flyvora</a>

        <button
          type="button"
          className={`home-page__menu-toggle ${isMobileMenuOpen ? "is-open" : ""}`}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="public-navigation-menu"
          onClick={() => {
            setIsProfileMenuOpen(false);
            setIsMobileMenuOpen((current) => !current);
          }}
        >
          {isMobileMenuOpen ? <CloseRoundedIcon fontSize="small" /> : <MenuRoundedIcon fontSize="small" />}
        </button>

        <nav className="home-page__links">
          {navigationItems.map((item) => (
            <InteractiveItem
              key={item.label}
              item={item}
              className={item.isActive ? "is-active" : undefined}
            >
              {item.label}
            </InteractiveItem>
          ))}
        </nav>

        <div className="home-page__actions">
          {isLoading
            ? null
            : isAuthenticated
              ? (
                <div className="home-page__profile" ref={profileMenuRef}>
                  <button
                    type="button"
                    className={`home-page__profile-trigger ${isProfileMenuOpen ? "is-open" : ""}`}
                    onClick={() => setIsProfileMenuOpen((current) => !current)}
                  >
                    {user?.picture ? (
                      <img className="home-page__avatar" src={user.picture} alt={userDisplayName} />
                    ) : (
                      <span className="home-page__avatar-fallback">{userDisplayName.charAt(0)}</span>
                    )}
                    <span className="home-page__profile-copy">
                      <span className="home-page__profile-greeting">Hi, {userDisplayName}</span>
                      <span className="home-page__profile-subtext">Account</span>
                    </span>
                    <ExpandMoreRoundedIcon fontSize="small" />
                  </button>

                  {isProfileMenuOpen ? (
                    <div className="home-page__profile-menu">
                      {profileMenuItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            item.onClick?.();
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
              : (
                <>
                  <a href="/admin">Admin</a>
                  <button type="button" className="button button--primary" onClick={() => startGoogleLogin(returnTo)}>
                    Login
                  </button>
                </>
              )}
        </div>
      </div>

      <button
        type="button"
        className={`home-page__mobile-backdrop ${isMobileMenuOpen ? "is-open" : ""}`}
        aria-label="Close navigation menu"
        onClick={closeMenus}
      />

      <nav
        id="public-navigation-menu"
        className={`home-page__mobile-menu ${isMobileMenuOpen ? "is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="home-page__mobile-menu-inner">
          <div className="home-page__mobile-card-list">
            {mobilePrimaryItems.map((item) => (
              <InteractiveItem
                key={item.label}
                item={item}
                className="home-page__mobile-card"
                onClick={closeMenus}
              >
                <span className="home-page__mobile-card-icon">{item.icon}</span>
                <span>{item.label}</span>
              </InteractiveItem>
            ))}
          </div>

          <div className="home-page__mobile-meta">
            {mobileMetaItems.map((item) => (
              <InteractiveItem
                key={item.label}
                item={item}
                className="home-page__mobile-meta-link"
                onClick={closeMenus}
              >
                {item.label}
              </InteractiveItem>
            ))}
          </div>

          <div className="home-page__mobile-bottom">
            <InteractiveItem
              item={{
                label: "Book a Journey",
                href: buildHomeAnchor("#search-panel"),
              }}
              className="home-page__mobile-cta"
              onClick={closeMenus}
            >
              <span className="home-page__mobile-cta-icon">
                <AddRoundedIcon fontSize="inherit" />
              </span>
              <span>Book a Journey</span>
            </InteractiveItem>

            <div className="home-page__mobile-account">
              <div className="home-page__mobile-account-main">
                {user?.picture ? (
                  <img
                    className="home-page__mobile-account-avatar"
                    src={user.picture}
                    alt={isAuthenticated ? userDisplayName : "Guest Traveler"}
                  />
                ) : (
                  <span className="home-page__mobile-account-fallback">
                    {(isAuthenticated ? userDisplayName : "Guest Traveler").charAt(0)}
                  </span>
                )}
                <div className="home-page__mobile-account-copy">
                  <strong>{isAuthenticated ? userDisplayName : "Guest Traveler"}</strong>
                  <span>{isAuthenticated ? "Premium Member" : "Sign in to Flyvora"}</span>
                </div>
              </div>

              {mobileAccountAction ? (
                <button
                  type="button"
                  className={`home-page__mobile-account-action home-page__mobile-account-action--${mobileAccountAction.tone}`}
                  onClick={() => {
                    closeMenus();
                    mobileAccountAction.onClick?.();
                  }}
                >
                  <span className="home-page__mobile-account-action-icon">
                    {mobileAccountAction.icon}
                  </span>
                  <span>{mobileAccountAction.label}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export const BookingHeader = ({
  pageClassName,
  brand = { label: "Flyvora", href: "/" },
  backLabel,
  onBack,
  startClassName,
  rightContent = null,
}) => (
  <header className={`${pageClassName}__header`}>
    <div className={`${pageClassName}__shell ${pageClassName}__header-inner`}>
      <div className={startClassName || `${pageClassName}__header-start`}>
        <button type="button" className={`${pageClassName}__back`} onClick={onBack}>
          <ArrowBackRoundedIcon fontSize="small" />
          <span>{backLabel}</span>
        </button>

        <InteractiveItem item={brand} className={`${pageClassName}__brand`}>
          {brand.label}
        </InteractiveItem>
      </div>

      {rightContent}
    </div>
  </header>
);
