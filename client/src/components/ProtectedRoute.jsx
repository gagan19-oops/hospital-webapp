import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireRole({ role, children }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session.role !== role) return <Navigate to={`/login?role=${role}`} replace />;
  return children;
}

export function RequirePatient({ children }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session.patient_id) return <Navigate to="/patient" replace />;
  return children;
}
