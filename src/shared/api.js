const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const normalizeApiBaseUrl = (value = "") => value.trim().replace(/\/$/, "");

const isLocalHostname = (hostname = "") => LOCAL_HOSTNAMES.has(String(hostname).trim().toLowerCase());

const isLoopbackUrl = (value = "") => {
  try {
    const parsedUrl = new URL(value);
    return isLocalHostname(parsedUrl.hostname);
  } catch (error) {
    return false;
  }
};

const readRuntimeApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const runtimeConfig = window.__FLYVORA_CONFIG__ || {};
  return normalizeApiBaseUrl(runtimeConfig.apiBaseUrl || runtimeConfig.API_BASE_URL || "");
};

export const getApiBaseUrl = () => {
  const runtimeApiBaseUrl = readRuntimeApiBaseUrl();

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  const configuredBaseUrl = normalizeApiBaseUrl(process.env.REACT_APP_API_BASE_URL || "");

  if (configuredBaseUrl) {
    if (typeof window !== "undefined" && !isLocalHostname(window.location.hostname) && isLoopbackUrl(configuredBaseUrl)) {
      return "";
    }

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

const looksLikeHtmlDocument = (value = "") => /^\s*<(?:!doctype html|html)\b/i.test(value);

export const readApiPayload = async (
  response,
  fallbackMessage = "We could not understand the server response."
) => {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    if (looksLikeHtmlDocument(rawBody)) {
      throw new Error(
        `Flyvora reached a web page instead of the API at ${describeApiTarget()}. Configure REACT_APP_API_BASE_URL or runtime-config.js with the backend origin for this environment.`
      );
    }

    throw new Error(fallbackMessage);
  }
};
