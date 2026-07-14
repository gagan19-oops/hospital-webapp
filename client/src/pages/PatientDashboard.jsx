import { useEffect, useState, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { MessageCircle, X, Send, FileDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, Badge, Button } from "../components/ui";
import { api } from "../lib/api";
import { downloadReceipt } from "../lib/receipt";

function StatCard({ label, value, tone }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</div>
      <div className={`mt-1.5 font-display text-2xl font-semibold ${tone || "text-ink"}`}>{value}</div>
    </Card>
  );
}

export default function PatientDashboard() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I can answer questions about your medicine requests, bills, or hospital policies (visiting hours, departments, etc). What would you like to know?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatBoxRef = useRef(null);

  const load = useCallback(async () => {
    const res = await api.get("/api/patient/dashboard");
    setDash(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages]);

  async function pay(reqId) {
    await api.post("/api/patient/pay", { req_id: reqId });
    const res = await api.get("/api/patient/dashboard");
    setDash(res);

    const paidRequest = res.data.find((r) => r.id === reqId);
    if (paidRequest) {
      downloadReceipt({ patientId: res.patient_id, request: paidRequest });
    }
  }

  async function sendChat(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const res = await api.post("/api/patient/chat", { message: text });
      setMessages((m) => [...m, { role: "bot", text: res.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: err.message }]);
    } finally {
      setChatBusy(false);
    }
  }

  if (loading || !dash) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center text-slate">Loading your dashboard…</div>
        <Footer />
      </div>
    );
  }

  const chartData = dash.chartLabels.map((label, i) => ({ date: label, cost: dash.chartValues[i] }));

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Patient Dashboard</h1>
        <p className="mt-1 text-slate">
          Patient ID: <span className="font-data font-semibold text-ink">{dash.patient_id}</span>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Requests" value={dash.data.length} />
          <StatCard label="Total Billed" value={`₹${dash.total.toFixed(2)}`} />
          <StatCard label="Paid" value={`₹${dash.paid.toFixed(2)}`} tone="text-teal-deep" />
          <StatCard label="Pending" value={`₹${dash.unpaid.toFixed(2)}`} tone="text-coral-deep" />
        </div>

        <Card className="mt-6 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-ink">Spending Over Time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b6b73" }} />
                <YAxis tick={{ fontSize: 11, fill: "#5b6b73" }} />
                <Tooltip formatter={(v) => [`₹${v.toFixed(2)}`, "Cost"]} />
                <Line type="monotone" dataKey="cost" stroke="#0f8b8d" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="mt-6 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-ink">My Medicine Requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4">Ward</th>
                  <th className="py-2 pr-4">Medicines</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2 pr-4">Delivery</th>
                  <th className="py-2">Payment</th>
                </tr>
              </thead>
              <tbody>
                {dash.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate">
                      No medicine requests found
                    </td>
                  </tr>
                )}
                {dash.data.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5">
                    <td className="py-3 pr-4">{r.ward}</td>
                    <td className="py-3 pr-4">
                      {r.items.map((it, i) => (
                        <div key={i} className="text-slate">
                          {it.medicine_name} ({it.quantity} {it.unit})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 pr-4 font-data">{r.total_cost > 0 ? `₹${r.total_cost.toFixed(2)}` : "—"}</td>
                    <td className="py-3 pr-4 font-data text-xs text-slate">{r.request_time}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={r.delivery_status === "Delivered" ? "delivered" : "pending"}>
                        {r.delivery_status || "Pending"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {r.payment_status === "Paid" ? (
                        <div className="flex items-center gap-2">
                          <Badge tone="paid">Paid</Badge>
                          <button
                            onClick={() => downloadReceipt({ patientId: dash.patient_id, request: r })}
                            className="flex items-center gap-1 text-xs font-semibold text-teal-deep hover:text-teal"
                            title="Download PDF receipt"
                          >
                            <FileDown size={13} /> Receipt
                          </button>
                        </div>
                      ) : r.total_cost > 0 ? (
                        <Button variant="primary" className="!px-3 !py-1.5 !text-xs" onClick={() => pay(r.id)}>
                          Pay Now
                        </Button>
                      ) : (
                        <Badge tone="neutral">Awaiting Cost</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Footer />

      {/* CHAT FAB + PANEL */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-xl shadow-teal/30 transition hover:bg-teal-deep"
        aria-label="Toggle assistant chat"
      >
        {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 w-[92vw] max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-ink/10"
          >
            <div className="flex items-center justify-between bg-ink px-5 py-4 text-white">
              <span className="font-display text-sm font-semibold">Hospital Assistant</span>
              <button onClick={() => setChatOpen(false)} aria-label="Close chat">
                <X size={16} />
              </button>
            </div>

            <div ref={chatBoxRef} className="thin-scroll h-80 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto rounded-br-md bg-teal text-white"
                      : "rounded-bl-md bg-mist text-ink"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {chatBusy && <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-mist px-3.5 py-2 text-sm text-slate">Thinking…</div>}
            </div>

            <form onSubmit={sendChat} className="flex gap-2 border-t border-ink/5 p-3">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question…"
                autoComplete="off"
                className="flex-1 rounded-xl border border-ink/10 px-3 py-2 text-sm focus:border-teal focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatBusy}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal text-white transition hover:bg-teal-deep disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
