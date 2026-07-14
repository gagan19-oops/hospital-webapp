import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, Badge } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function RobotDelivery() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    api.get("/api/robot").then((res) => {
      setRows(res.data);
      setLoading(false);
    });
  }, []);

  const backTo = session.role ? `/${session.role}` : "/";

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
                  <th className="py-2 pr-4">Robot ID</th>
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Ward</th>
                  <th className="py-2 pr-4">Medicine</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Live Video</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate">
                      Loading…
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-ink/5">
                    <td className="py-3 pr-4 font-data">{r[0]}</td>
                    <td className="py-3 pr-4 font-data">{r[1]}</td>
                    <td className="py-3 pr-4">{r[2]}</td>
                    <td className="py-3 pr-4">{r[3]}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={r[4] === "Delivering" ? "pending" : "delivered"}>{r[4]}</Badge>
                    </td>
                    <td className="py-3">
                      <iframe title={`robot-feed-${i}`} width="200" height="120" src={r[5]} className="rounded-lg" />
                    </td>
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
