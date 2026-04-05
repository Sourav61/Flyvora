const TRAVELER_PROFILE_STORAGE_PREFIX = "flyvora-traveler-profile";

const buildTravelerProfileKey = (identity = {}) => {
  const providerUserId = String(identity.providerUserId || "").trim();
  const email = String(identity.email || "").trim().toLowerCase();
  const identityPart = providerUserId || email;

  if (!identityPart) {
    return "";
  }

  return `${TRAVELER_PROFILE_STORAGE_PREFIX}:${identityPart}`;
};

export const readTravelerProfile = (identity) => {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = buildTravelerProfileKey(identity);

  if (!storageKey) {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

export const saveTravelerProfile = (identity, profile) => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = buildTravelerProfileKey(identity);

  if (!storageKey || !profile) {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(profile));
};
