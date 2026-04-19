import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { buildApiUrl, readApiPayload } from "../../shared/api";
import {
  ADMIN_SESSION_KEY,
  clearAdminSession,
  getStoredAdminSession,
  storeAdminSession,
} from "./adminSessionStorage";

const AdminSessionContext = createContext(null);

const getAuthorizationHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

const fetchAdminProfile = async (token) => {
  const response = await fetch(buildApiUrl("/api/admin-auth/me"), {
    method: "GET",
    headers: getAuthorizationHeader(token),
  });
  const payload = await readApiPayload(
    response,
    "We could not verify the admin session."
  );

  if (!response.ok) {
    throw new Error(payload.message || "We could not verify the admin session.");
  }

  return payload.admin;
};

export const AdminSessionProvider = ({ children }) => {
  const [state, setState] = useState({
    isLoading: true,
    token: null,
    admin: null,
  });

  useEffect(() => {
    let isActive = true;

    const initializeSession = async () => {
      const storedSession = getStoredAdminSession();

      if (!storedSession?.token) {
        if (isActive) {
          setState({
            isLoading: false,
            token: null,
            admin: null,
          });
        }

        return;
      }

      try {
        const admin = await fetchAdminProfile(storedSession.token);

        if (!isActive) {
          return;
        }

        storeAdminSession({
          token: storedSession.token,
          admin,
        });
        setState({
          isLoading: false,
          token: storedSession.token,
          admin,
        });
      } catch (error) {
        clearAdminSession();

        if (isActive) {
          setState({
            isLoading: false,
            token: null,
            admin: null,
          });
        }
      }
    };

    initializeSession();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorageChange = (event) => {
      if (event.key !== ADMIN_SESSION_KEY) {
        return;
      }

      const storedSession = getStoredAdminSession();
      setState({
        isLoading: false,
        token: storedSession?.token || null,
        admin: storedSession?.admin || null,
      });
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = async ({ email, password }) => {
    const response = await fetch(buildApiUrl("/api/admin-auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const payload = await readApiPayload(
      response,
      "We could not complete the admin login request."
    );

    if (!response.ok) {
      throw new Error(payload.message || "Admin login failed.");
    }

    const nextSession = {
      token: payload.token,
      admin: payload.admin,
    };

    storeAdminSession(nextSession);
    setState({
      isLoading: false,
      token: nextSession.token,
      admin: nextSession.admin,
    });

    return nextSession.admin;
  };

  const logout = () => {
    clearAdminSession();
    setState({
      isLoading: false,
      token: null,
      admin: null,
    });
  };

  const value = {
    admin: state.admin,
    adminName: state.admin?.email || "Admin",
    token: state.token,
    isAuthenticated: Boolean(state.token && state.admin),
    isLoading: state.isLoading,
    login,
    logout,
  };

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error("useAdminSession must be used within an AdminSessionProvider");
  }

  return context;
};
