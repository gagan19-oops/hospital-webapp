import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Trash2, Plus, Phone, Check } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button, Card, Badge, Input, Select, Alert } from "../components/ui";
import { api } from "../lib/api";

const PIE_COLORS = ["#f5b93d", "#0f8b8d", "#8b98a0"];

function StatCard({ label, value, tone }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</div>
      <div className={`mt-1.5 font-display text-2xl font-semibold ${tone || "text-ink"}`}>{value}</div>
    </Card>
  );
}

export default function AdminDashboard() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("nurse");

  const [patientName, setPatientName] = useState("");

  const load = useCallback(async () => {
    const res = await api.get("/api/admin/data");
    setDash(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateDelivery(reqId, status) {
    await api.post("/api/admin/requests/update", { req_id: reqId, delivery_status: status });
    await load();
  }

  async function addUser(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/admin/users", { username, password, role });
      setUsername("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteUser(id) {
    if (!confirm("Delete this account?")) return;
    try {
      await api.del(`/api/admin/users/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addPatient(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/admin/patients", { name: patientName });
      setPatientName("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deletePatient(patientId) {
    if (!confirm("Delete this patient? (Only works if they have no requests yet.)")) return;
    try {
      await api.del(`/api/admin/patients/${patientId}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markConsultationContacted(id) {
    try {
      await api.post(`/api/admin/consultations/${id}/status`, { status: "Contacted" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteConsultation(id) {
    if (!confirm("Delete this consultation request?")) return;
    try {
      await api.del(`/api/admin/consultations/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || !dash) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center text-slate">Loading admin dashboard…</div>
        <Footer />
      </div>
    );
  }

  const revenueData = dash.revenueDates.map((d, i) => ({ date: d, revenue: dash.revenueValues[i] }));
  const wardData = dash.wardLabels.map((w, i) => ({ ward: w, requests: dash.wardValues[i] }));
  const deliveryData = [
    { name: "Pending", value: dash.deliveryCounts.Pending },
    { name: "Delivered", value: dash.deliveryCounts.Delivered },
    { name: "Other", value: dash.deliveryCounts.Other },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin Dashboard</h1>
        <p className="mt-1 text-slate">Hospital-wide analytics, request oversight, and account management.</p>

        {error && (
          <div className="mt-6">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Patients" value={dash.stats.totalPatients} />
          <StatCard label="Total Requests" value={dash.stats.totalRequests} />
          <StatCard label="Revenue Collected" value={`₹${dash.stats.totalRevenue.toFixed(2)}`} tone="text-teal-deep" />
          <StatCard label="Pending Payments" value={`₹${dash.stats.pendingRevenue.toFixed(2)}`} tone="text-coral-deep" />
        </div>

        {/* CHARTS */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-5">
            <h2 className="font-display text-sm font-semibold text-ink">Revenue Trend (Paid)</h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5b6b73" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#5b6b73" }} />
                  <Tooltip formatter={(v) => [`₹${v.toFixed(2)}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#0f8b8d" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-4">
            <h2 className="font-display text-sm font-semibold text-ink">Requests by Ward</h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.06)" />
                  <XAxis dataKey="ward" tick={{ fontSize: 10, fill: "#5b6b73" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#5b6b73" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#0d6efd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-3">
            <h2 className="font-display text-sm font-semibold text-ink">Delivery Status</h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deliveryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                    {deliveryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ALL REQUESTS */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold text-ink">All Medicine Requests</h2>
            <div className="mt-4 max-h-[420px] overflow-auto thin-scroll">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-slate">
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Ward</th>
                    <th className="py-2 pr-3">Medicines</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Delivery</th>
                    <th className="py-2 pr-3">Payment</th>
                    <th className="py-2">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.allRequests.map((r) => (
                    <tr key={r.id} className="border-b border-ink/5">
                      <td className="py-2.5 pr-3 font-data">{r.patient_id}</td>
                      <td className="py-2.5 pr-3">{r.ward}</td>
                      <td className="py-2.5 pr-3">
                        {r.items.map((it, i) => (
                          <div key={i} className="text-xs text-slate">
                            {it.medicine_name} ({it.quantity} {it.unit})
                          </div>
                        ))}
                      </td>
                      <td className="py-2.5 pr-3 font-data">{r.total_cost > 0 ? `₹${r.total_cost.toFixed(2)}` : "—"}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={r.delivery_status === "Delivered" ? "delivered" : "pending"}>
                          {r.delivery_status || "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={r.payment_status === "Paid" ? "paid" : "unpaid"}>{r.payment_status}</Badge>
                      </td>
                      <td className="py-2.5">
                        <Select
                          defaultValue={r.delivery_status}
                          onChange={(e) => updateDelivery(r.id, e.target.value)}
                          className="!py-1 !text-xs"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Delivered">Delivered</option>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* STAFF + PATIENTS */}
          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Staff Accounts</h2>
              <div className="mt-3 max-h-44 overflow-y-auto thin-scroll">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {dash.users.map((u) => (
                      <tr key={u.id} className="border-b border-ink/5">
                        <td className="py-1.5 pr-2">{u.username}</td>
                        <td className="py-1.5 pr-2 text-slate capitalize">{u.role}</td>
                        <td className="py-1.5 text-right">
                          <button onClick={() => deleteUser(u.id)} className="text-slate hover:text-coral-deep">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={addUser} className="mt-3 space-y-2">
                <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="admin">Admin</option>
                </Select>
                <Button type="submit" variant="primary" className="w-full">
                  <Plus size={14} /> Add Staff Account
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Patients</h2>
              <div className="mt-3 max-h-44 overflow-y-auto thin-scroll">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {dash.patients.map((p) => (
                      <tr key={p.patient_id} className="border-b border-ink/5">
                        <td className="py-1.5 pr-2 font-data text-xs">{p.patient_id}</td>
                        <td className="py-1.5 pr-2">{p.name}</td>
                        <td className="py-1.5 pr-2 font-data text-xs">₹{p.total.toFixed(2)}</td>
                        <td className="py-1.5 text-right">
                          <button onClick={() => deletePatient(p.patient_id)} className="text-slate hover:text-coral-deep">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={addPatient} className="mt-3 space-y-2">
                <Input
                  placeholder="Patient full name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" className="w-full">
                  <Plus size={14} /> Add Patient (auto-generates ID)
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Consultation Requests</h2>
                {dash.consultations.filter((c) => c.status === "New").length > 0 && (
                  <Badge tone="pending">{dash.consultations.filter((c) => c.status === "New").length} new</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate">Submitted from the homepage "Book a Free Consultation" form.</p>

              <div className="mt-3 max-h-56 overflow-y-auto thin-scroll">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {dash.consultations.length === 0 && (
                      <tr>
                        <td className="py-4 text-center text-xs text-slate">No consultation requests yet.</td>
                      </tr>
                    )}
                    {dash.consultations.map((c) => (
                      <tr key={c.id} className="border-b border-ink/5">
                        <td className="py-2 pr-2">
                          <div className="font-medium text-ink">{c.name}</div>
                          <div className="flex items-center gap-1 font-data text-xs text-slate">
                            <Phone size={11} /> {c.phone}
                          </div>
                          <div className="text-xs text-slate">{c.created_at}</div>
                        </td>
                        <td className="py-2 pr-2">
                          <Badge tone={c.status === "New" ? "pending" : "delivered"}>{c.status}</Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.status === "New" && (
                              <button
                                onClick={() => markConsultationContacted(c.id)}
                                className="text-slate hover:text-teal-deep"
                                title="Mark as contacted"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button onClick={() => deleteConsultation(c.id)} className="text-slate hover:text-coral-deep">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
