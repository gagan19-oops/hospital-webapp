import { useEffect, useState, useCallback } from "react";
import { Plus, X, Send } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button, Card, Badge, Input, Select, Alert } from "../components/ui";
import { api } from "../lib/api";

function emptyRow() {
  return { medicine_id: "", quantity: "" };
}

export default function NurseDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [wards, setWards] = useState([]);

  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("new");

  const [patientId, setPatientId] = useState("");
  const [ward, setWard] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ status, sort }).toString();
    const res = await api.get(`/api/nurse/data?${qs}`);
    setData(res.data);
    setPatients(res.patients);
    setMedicines(res.medicines);
    setWards(res.wards);
    setLoading(false);
  }, [status, sort]);

  useEffect(() => {
    load();
  }, [load]);

  function updateRow(i, field, value) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }

  function removeRow(i) {
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/nurse/requests", {
        patient_id: patientId,
        ward,
        diagnosis,
        instructions,
        items: rows.filter((r) => r.medicine_id && r.quantity),
      });
      setPatientId("");
      setWard("");
      setDiagnosis("");
      setInstructions("");
      setRows([emptyRow()]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Nurse Dashboard</h1>
        <p className="mt-1 text-slate">Send medicine requests and track their progress.</p>

        {/* NEW REQUEST FORM */}
        <Card className="mt-8 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-ink">Send Medicine Request</h2>

          {error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}

          {patients.length === 0 && (
            <div className="mt-4">
              <Alert tone="info">No patients yet — ask an admin to add one first.</Alert>
            </div>
          )}
          {medicines.length === 0 && (
            <div className="mt-4">
              <Alert tone="info">No medicines in the catalog yet — ask pharmacy to add some first.</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Patient</label>
                <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
                  <option value="" disabled>
                    Select patient…
                  </option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} ({p.patient_id})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Ward</label>
                <Select value={ward} onChange={(e) => setWard(e.target.value)} required>
                  <option value="" disabled>
                    Select ward…
                  </option>
                  {wards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Diagnosis (optional)</label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Viral fever" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate">Instructions (optional)</label>
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. After food, twice daily"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate">Medicines</label>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <Select
                      value={row.medicine_id}
                      onChange={(e) => updateRow(i, "medicine_id", e.target.value)}
                      required
                      className="flex-[2]"
                    >
                      <option value="" disabled>
                        Select medicine…
                      </option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.form}, {m.unit})
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={row.quantity}
                      onChange={(e) => updateRow(i, "quantity", e.target.value)}
                      placeholder="Qty"
                      required
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="rounded-xl border border-ink/10 px-3 text-slate hover:border-coral hover:text-coral-deep"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRow}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-deep hover:text-teal"
              >
                <Plus size={15} /> Add another medicine
              </button>
            </div>

            <Button type="submit" variant="primary" disabled={submitting}>
              <Send size={15} /> {submitting ? "Sending…" : "Send Request"}
            </Button>
          </form>
        </Card>

        {/* HISTORY */}
        <Card className="mt-8 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-ink">Request History</h2>
            <div className="flex gap-2">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Delivered">Delivered</option>
              </Select>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-40">
                <option value="new">Latest First</option>
                <option value="old">Oldest First</option>
              </Select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Ward</th>
                  <th className="py-2 pr-4">Medicines</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Delivery</th>
                  <th className="py-2 pr-4">Delivery Time</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate">
                      No records found
                    </td>
                  </tr>
                )}
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5">
                    <td className="py-3 pr-4 font-data">{r.patient_id}</td>
                    <td className="py-3 pr-4">{r.ward}</td>
                    <td className="py-3 pr-4">
                      {r.items.map((it, idx) => (
                        <div key={idx} className="text-slate">
                          {it.medicine_name} ({it.quantity} {it.unit})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 pr-4 font-data text-xs text-slate">{r.request_time}</td>
                    <td className="py-3 pr-4 font-data">{r.total_cost > 0 ? `₹${r.total_cost.toFixed(2)}` : "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={r.delivery_status === "Delivered" ? "delivered" : "pending"}>
                        {r.delivery_status || "Pending"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-data text-xs text-slate">{r.delivery_time || "—"}</td>
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
