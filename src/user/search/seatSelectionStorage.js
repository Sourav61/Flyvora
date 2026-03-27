export const SEAT_SELECTION_STORAGE_KEY = "flyvora-seat-selection";

export const saveSeatSelectionDraft = (payload) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SEAT_SELECTION_STORAGE_KEY, JSON.stringify(payload));
};

export const readSeatSelectionDraft = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SEAT_SELECTION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    window.sessionStorage.removeItem(SEAT_SELECTION_STORAGE_KEY);
    return null;
  }
};

export const clearSeatSelectionDraft = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SEAT_SELECTION_STORAGE_KEY);
};
