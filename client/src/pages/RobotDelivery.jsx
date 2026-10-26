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

  
  const [battery, setBattery] = useState(null);
  const [batteryError, setBatteryError] = useState(false);

  const { session } = useAuth();

  const load = useCallback(async () => {
    const res = await api.get("/api/deliveries/status");
    setRows(res.deliveries);
    setLoading(false);
  }, []);

  useEffect(() => {
  const refresh = () => {
    load().catch((err) => {
      console.error("Robot delivery refresh failed:", err);
    });
  };

  refresh();

  const interval = setInterval(refresh, 3000);

  return () => clearInterval(interval);
}, [load]);


useEffect(() => {
  let active = true;

  const loadBattery = async () => {
    try {
      const data = await api.get("/api/robot/battery");

      if (active) {
        setBattery(data);
        setBatteryError(false);
      }
    } catch (err) {
      console.error("Battery refresh failed:", err);

      if (active) {
        setBatteryError(true);
      }
    }
  };

  loadBattery();
  const interval = setInterval(loadBattery, 15000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}, []);




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

        
        {/* ROBOT BATTERY CARD */}
        <Card className="mt-8 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Robot Battery
              </h2>
              <p className="mt-1 text-sm text-slate">
                Live battery monitoring
              </p>
            </div>

            <span className="text-3xl" aria-hidden="true">
              🔋
            </span>
          </div>

          {batteryError ? (
            <p className="mt-5 text-sm text-red-600">
              Unable to load battery data. Check the API connection and permissions.
            </p>
          ) : battery?.voltage != null &&
            battery?.percentage != null ? (
            (() => {
              const voltage = Number(battery.voltage);
              const percentage = Number(battery.percentage);
              const valid =
                Number.isFinite(voltage) &&
                Number.isFinite(percentage) &&
                voltage >= 0 &&
                voltage <= 15 &&
                percentage >= 0 &&
                percentage <= 100;

              if (!valid) {
                return (
                  <p className="mt-5 text-sm text-slate">
                    Battery reading is invalid.
                  </p>
                );
              }

              const lowBattery = voltage < 10.5;

              return (
                <div className="mt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-3xl font-bold text-ink">
                        {voltage.toFixed(2)} V
                      </p>
                      <p className="mt-1 text-sm text-slate">
                        Estimated charge: {Math.round(percentage)}%
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        lowBattery
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {lowBattery ? "Low Battery" : "Normal"}
                    </span>
                  </div>

                  <div
                    className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label="Estimated battery charge"
                    aria-valuenow={Math.round(percentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        lowBattery ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate">
                    Last updated: {battery.updatedAt || "Unknown"}
                  </p>
                </div>
              );
            })()
          ) : (
            <p className="mt-5 text-sm text-slate">
              Waiting for the first battery reading…
            </p>
          )}
        </Card>

            
        

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