import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RequireRole, RequirePatient } from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import NurseDashboard from "./pages/NurseDashboard";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Billing from "./pages/Billing";
import RobotDelivery from "./pages/RobotDelivery";
import PatientLogin from "./pages/PatientLogin";
import PatientDashboard from "./pages/PatientDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/robot" element={<RobotDelivery />} />

          <Route
            path="/nurse"
            element={
              <RequireRole role="nurse">
                <NurseDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <RequireRole role="pharmacy">
                <PharmacyDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />

          <Route path="/patient" element={<PatientLogin />} />
          <Route
            path="/patient/dashboard"
            element={
              <RequirePatient>
                <PatientDashboard />
              </RequirePatient>
            }
          />

          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
