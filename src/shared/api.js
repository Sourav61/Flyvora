const normalizeApiBaseUrl = (value = "") => value.trim().replace(/\/$/, "");

const isLocalHostname = (hostname = "") => ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);

export const getApiBaseUrl = () => {
  const configuredBaseUrl = normalizeApiBaseUrl(process.env.REACT_APP_API_BASE_URL || "");

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window === "undefined") {
    return "http://localhost:5000";
  }

  if (isLocalHostname(window.location.hostname)) {
    return "http://localhost:5000";
  }

  return "";
};

export const buildApiUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};

export const describeApiTarget = () => {
  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "this deployment";
};
