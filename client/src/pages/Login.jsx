import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button, Card, Input, Select, Alert } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const ROLES = ["nurse", "pharmacy", "admin"];

export default function Login() {
  const [params] = useSearchParams();
  const initialRole = ROLES.includes(params.get("role")) ? params.get("role") : "nurse";
  const [role, setRole] = useState(initialRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { loginStaff } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginStaff(role, username, password);
      navigate(role === "admin" ? "/admin" : `/${role}`);
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
              <ShieldCheck className="h-5 w-5 text-teal-deep" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink capitalize">{role} Login</h1>
            <p className="mt-1 text-sm text-slate">Sign in to access the {role} dashboard.</p>

            {error && (
              <div className="mt-4">
                <Alert>{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Role</label>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="capitalize">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Log in"}
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
