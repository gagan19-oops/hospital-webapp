import { useEffect, useState, useCallback } from "react";
import { Trash2, Plus, QrCode } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import QRModal from "../components/QRModal";
import { Button, Card, Badge, Input, Select, Alert } from "../components/ui";
import { api } from "../lib/api";

export default function PharmacyDashboard() {
  const [incoming, setIncoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [forms, setForms] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrModal, setQrModal] = useState(null);

  const [qrFilter, setQrFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [sort, setSort] = useState("latest");

  const [costDrafts, setCostDrafts] = useState({});
  const [medName, setMedName] = useState("");
  const [medForm, setMedForm] = useState("");
  const [medUnit, setMedUnit] = useState("");

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ qr_filter: qrFilter, delivery_filter: deliveryFilter, sort }).toString();
    const res = await api.get(`/api/pharmacy/data?${qs}`);
    setIncoming(res.incoming_data);
    setHistory(res.history_data);
    setMedicines(res.medicines);
    setForms(res.medicineForms);
    setUnits(res.medicineUnits);
    setLoading(false);
  }, [qrFilter, deliveryFilter, sort]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendToRobot(reqId) {
    await api.post("/api/pharmacy/send-to-robot", { req_id: reqId });
    load();
  }

  async function saveCost(itemId) {
    const cost = costDrafts[itemId];
    if (cost === undefined || cost === "") return;
    await api.post("/api/pharmacy/item-cost", { item_id: itemId, cost });
    await load();
  }

  async function generateQr(reqId) {
    setError(null);
    try {
      const res = await api.post("/api/pharmacy/generate-qr", { req_id: reqId });
      setQrModal(res);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addMedicine(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/pharmacy/medicines", { med_name: medName, med_form: medForm, med_unit: medUnit });
      setMedName("");
      setMedForm("");
      setMedUnit("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteMedicine(id) {
    await api.del(`/api/pharmacy/medicines/${id}`);
    await load();
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Pharmacy Dashboard</h1>
        <p className="mt-1 text-slate">Manage the medicine catalog, price requests, and seal them with a QR code.</p>

        {error && (
          <div className="mt-6">
            <Alert>{error}</Alert>
          </div>
        )}

        {/* MEDICINE CATALOG */}
        <Card className="mt-8 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-ink">Medicine Catalog</h2>
          <p className="mt-1 text-sm text-slate">Nurses can only select medicines from this list when sending a request.</p>

          <div className="mt-4 max-h-56 overflow-y-auto thin-scroll">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Form</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => (
                  <tr key={m.id} className="border-b border-ink/5">
                    <td className="py-2.5 pr-4">{m.name}</td>
                    <td className="py-2.5 pr-4 text-slate">{m.form}</td>
                    <td className="py-2.5 pr-4 font-data text-slate">{m.unit}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => deleteMedicine(m.id)}
                        className="text-slate hover:text-coral-deep"
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={addMedicine} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1.3fr_1.3fr_auto]">
            <Input placeholder="Medicine name" value={medName} onChange={(e) => setMedName(e.target.value)} required />
            <Select value={medForm} onChange={(e) => setMedForm(e.target.value)} required>
              <option value="" disabled>
                Form…
              </option>
              {forms.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Unit (mg, ml…)"
              list="unit-options"
              value={medUnit}
              onChange={(e) => setMedUnit(e.target.value)}
              required
            />
            <datalist id="unit-options">
              {units.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <Button type="submit" variant="primary">
              <Plus size={15} /> Add
            </Button>
          </form>
        </Card>

        {/* INCOMING REQUESTS */}
        <Card className="mt-8 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-ink">Incoming Requests</h2>
          <p className="mt-1 text-sm text-slate">Price every medicine, then generate its QR code.</p>

          <div className="mt-5 space-y-4">
            {!loading && incoming.length === 0 && <p className="text-sm text-slate">No incoming requests.</p>}

            {incoming.map((r) => (
              <div key={r.id} className="rounded-2xl border border-ink/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <b className="font-data">{r.patient_id}</b> · Ward {r.ward}
                  </div>
                  <div className="font-data text-xs text-slate">{r.request_time}</div>
                </div>

                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate">
                      <th className="py-1 pr-4">Medicine</th>
                      <th className="py-1 pr-4">Qty</th>
                      <th className="py-1">Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-1.5 pr-4">{it.medicine_name}</td>
                        <td className="py-1.5 pr-4 font-data">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-1.5">
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-28"
                              defaultValue={it.cost ?? ""}
                              onChange={(e) => setCostDrafts((d) => ({ ...d, [it.id]: e.target.value }))}
                            />
                            <Button variant="subtle" onClick={() => saveCost(it.id)}>
                              Set
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3">
                  {r.all_priced ? (
                    <Button variant="primary" onClick={() => generateQr(r.id)}>
                      <QrCode size={15} /> Generate QR (₹{r.total_cost.toFixed(2)})
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      Price every medicine first
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* HISTORY */}
        <Card className="mt-8 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-ink">Request History</h2>
            <div className="flex flex-wrap gap-2">
              <Select value={qrFilter} onChange={(e) => setQrFilter(e.target.value)} className="w-36">
                <option value="">All QR</option>
                <option value="Generated">Generated</option>
                <option value="Pending">Pending</option>
              </Select>
              <Select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} className="w-36">
                <option value="">All Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
              </Select>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-36">
                <option value="latest">Latest First</option>
                <option value="old">Oldest First</option>
              </Select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Ward</th>
                  <th className="py-2 pr-4">Medicines</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">QR</th>
                  <th className="py-2 pr-4">QR Time</th>
                  <th className="py-2 pr-4">Delivery</th>
                  <th className="py-2 pr-4">Delivery Time</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5">
                    <td className="py-3 pr-4 font-data">#{r.id}</td>
                    <td className="py-3 pr-4 font-data">{r.patient_id}</td>
                    <td className="py-3 pr-4">{r.ward}</td>
                    <td className="py-3 pr-4">
                      {r.items.map((it, i) => (
                        <div key={i} className="text-slate">
                          {it.medicine_name} ({it.quantity} {it.unit})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 pr-4 font-data">₹{r.total_cost.toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={r.qr_status === "Generated" ? "generated" : "pending"}>{r.qr_status || "Pending"}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-data text-xs text-slate">{r.qr_time || "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={r.delivery_status === "Delivered" ? "delivered" : "pending"}>
                        {r.delivery_status || "Pending"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-data text-xs text-slate">{r.delivery_time || "—"}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {r.qr_data && (
                          <button
                            className="text-xs font-semibold text-teal-deep hover:text-teal"
                            onClick={() =>
                              setQrModal({
                              qr_data: r.qr_data,
                              req_id: r.id,
                              patient_id: r.patient_id,
                              ward: r.ward,
                              items: r.items.map((it) => ({ name: it.medicine_name, unit: it.unit, quantity: it.quantity })),
                            })
                            }
                          >
                            View QR
                          </button>
                        )}
                        {r.qr_status === "Generated" && (!r.delivery_status || r.delivery_status === "Pending") && (
                          <button
                            className="text-xs font-semibold text-coral hover:text-coral-deep"
                            onClick={() => sendToRobot(r.id)}
                          >
                            Send to robot
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Footer />
      {qrModal && <QRModal data={qrModal} onClose={() => setQrModal(null)} />}
    </div>
  );
}
