import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ role: null, username: null, patient_id: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/session");
      setSession(data);
    } catch {
      setSession({ role: null, username: null, patient_id: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loginStaff = async (role, username, password) => {
    const data = await api.post("/api/login", { role, username, password });
    await refresh();
    return data;
  };

  const loginPatient = async (patient_id) => {
    const data = await api.post("/api/patient/login", { patient_id });
    await refresh();
    return data;
  };

  const logoutStaff = async () => {
    await api.post("/api/logout");
    await refresh();
  };

  const logoutPatient = async () => {
    await api.post("/api/patient/logout");
    await refresh();
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, loginStaff, loginPatient, logoutStaff, logoutPatient, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
