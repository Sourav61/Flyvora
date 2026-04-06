export const CHECKOUT_STORAGE_KEY = "flyvora-checkout";

export const saveCheckoutDraft = (payload) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
};

export const readCheckoutDraft = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    return null;
  }
};

export const clearCheckoutDraft = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
};
