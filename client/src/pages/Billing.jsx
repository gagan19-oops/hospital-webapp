import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button, Card, Badge, Input, Alert } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Billing() {
  const [patientId, setPatientId] = useState("");
  const [data, setData] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const { session } = useAuth();

  const backTo = session.role ? `/${session.role}` : "/";

  async function handleSearch(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post("/api/billing", { patient_id: patientId });
      setData(res.data);
      setTotal(res.total);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">Patient Billing</h1>
            <p className="mt-1 text-slate">Look up a patient's full request and payment history.</p>
          </div>
          <Link to={backTo} className="text-sm font-semibold text-teal-deep hover:text-teal">
            ← Back
          </Link>
        </div>

        <Card className="mt-8 p-6 sm:p-8">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID"
              className="max-w-xs"
              required
            />
            <Button type="submit" variant="primary">
              <Search size={15} /> Search
            </Button>
          </form>

          {error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}
        </Card>

        {searched && (
          <Card className="mt-6 p-6 sm:p-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-slate">
                    <th className="py-2 pr-4">Ward</th>
                    <th className="py-2 pr-4">Medicines</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate">
                        No records found for that Patient ID.
                      </td>
                    </tr>
                  )}
                  {data.map((r) => (
                    <tr key={r.id} className="border-b border-ink/5">
                      <td className="py-3 pr-4">{r.ward}</td>
                      <td className="py-3 pr-4">
                        {r.items.map((it, i) => (
                          <div key={i} className="text-slate">
                            {it.medicine_name} ({it.quantity} {it.unit})
                            {it.cost !== null ? ` — ₹${it.cost}` : ""}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 pr-4 font-data">{r.total_cost > 0 ? `₹${r.total_cost.toFixed(2)}` : "—"}</td>
                      <td className="py-3">
                        <Badge tone={r.payment_status === "Paid" ? "paid" : "unpaid"}>{r.payment_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.length > 0 && (
              <div className="mt-4 text-right font-display text-lg font-semibold text-ink">
                Total Bill: ₹{total.toFixed(2)}
              </div>
            )}
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
