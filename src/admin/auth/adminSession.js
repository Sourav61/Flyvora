export const ADMIN_SESSION_STORAGE_KEY = "flyvora-admin-session";

export const readAdminSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    return null;
  }
};

export const saveAdminSession = (session) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearAdminSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
};

export const hasActiveAdminSession = (session = readAdminSession()) => {
  if (!session?.token) {
    return false;
  }

  if (!session.expiresAt) {
    return true;
  }

  return new Date(session.expiresAt).getTime() > Date.now();
};

export const getAdminAuthorizationHeaders = (session = readAdminSession()) => {
  if (!session?.token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
};
