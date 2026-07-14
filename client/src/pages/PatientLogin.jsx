import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HeartPulse } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button, Card, Input, Alert } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function PatientLogin() {
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { session, loading, loginPatient } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session.patient_id) navigate("/patient/dashboard");
  }, [loading, session.patient_id, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginPatient(patientId.trim());
      navigate("/patient/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Card className="p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10">
              <HeartPulse className="h-5 w-5 text-teal-deep" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Patient Portal</h1>
            <p className="mt-1 text-sm text-slate">
              Enter your Patient ID to view your medicine requests, bills, and chat with our assistant.
            </p>

            {error && (
              <div className="mt-4">
                <Alert>{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Patient ID</label>
                <Input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. P0001"
                  autoComplete="off"
                  required
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy ? "Checking…" : "View My Dashboard"}
              </Button>
            </form>

            <Link to="/" className="mt-5 block text-center text-sm text-slate hover:text-teal">
              ← Back to Home
            </Link>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
