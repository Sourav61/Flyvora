const ADMIN_SESSION_STORAGE_KEY = "flyvora.admin.session";

const isBrowser = () => typeof window !== "undefined";

export const getStoredAdminSession = () => {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (parsedValue?.token) {
      return parsedValue;
    }
  } catch (error) {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  }

  return null;
};

export const storeAdminSession = (session) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearAdminSession = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
};

export const ADMIN_SESSION_KEY = ADMIN_SESSION_STORAGE_KEY;
