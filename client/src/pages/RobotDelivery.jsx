import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, Badge, deliveryTone } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function RobotDelivery() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  const load = useCallback(async () => {
    const res = await api.get("/api/deliveries/status");
    setRows(res.deliveries);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // live refresh every 5s
    return () => clearInterval(interval);
  }, [load]);

  const backTo = session.role ? `/${session.role}` : session.patient_id ? "/patient/dashboard" : "/";

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">Robot Delivery Status</h1>
            <p className="mt-1 text-slate">Live tracking for medicines currently on the move.</p>
          </div>
          <Link to={backTo} className="text-sm font-semibold text-teal-deep hover:text-teal">
            ← Back
          </Link>
        </div>

        <Card className="mt-8 p-6 sm:p-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Ward</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate">
                      No deliveries in progress right now.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.req_id} className="border-b border-ink/5">
                    <td className="py-3 pr-4 font-data">#{r.req_id}</td>
                    <td className="py-3 pr-4 font-data">{r.patient_id}</td>
                    <td className="py-3 pr-4">{r.ward}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={deliveryTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="py-3 font-data text-xs text-slate">{r.updated || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}