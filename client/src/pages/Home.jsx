import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardPlus, QrCode, Truck, Wallet, Target, ShieldCheck, Phone, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PulseLine from "../components/PulseLine";
import { Button, Card, Input, Alert } from "../components/ui";
import { api } from "../lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const STEPS = [
  {
    n: "01",
    title: "Nurse raises a request",
    body: "The ward nurse selects the patient, ward, and every medicine needed — quantities and units included — from the pharmacy's own catalog.",
    icon: ClipboardPlus,
  },
  {
    n: "02",
    title: "Pharmacy prices & seals it",
    body: "Each medicine line is priced individually. Once every item is priced, a QR code is generated and sealed to that request.",
    icon: QrCode,
  },
  {
    n: "03",
    title: "Robot delivers to the ward",
    body: "The delivery robot scans the QR code and carries the medicine straight to the patient's bedside — no manual handoffs.",
    icon: Truck,
  },
  {
    n: "04",
    title: "Patient tracks & pays",
    body: "Patients watch costs land in real time on their dashboard and settle bills the moment they're ready, from their phone.",
    icon: Wallet,
  },
];

// TODO: swap in your real names, roles, and photos. Drop photo files into
// client/public/team/ and set `photo` to e.g. "/team/yourname.jpg" - leave
// `photo` as null to keep the auto-generated initials avatar instead.
const TEAM = [
  { name: "K.A Gagan Gowda ", role: "1SI23EE017", photo: null },
  { name: "Muthuraj T.R", role: "1SI23EE029", photo: null },
  { name: "Rishi R", role: "1SI23EE046", photo: null },
  { name: "Sharanabassu", role: "1SI23EE048", photo: null },
];

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <span className="inline-flex items-center rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold tracking-wide text-teal-deep">
              SIDDAGANGA HOSPITAL · TUMKUR
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
              Where medicine moves as fast as care does.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate">
              From a nurse's request to a robot at the bedside — one connected system for
              ordering, pricing, delivering, and paying for medicine, built for Siddaganga Hospital.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/patient" variant="primary">
                Patient Portal <ArrowRight size={16} />
              </Button>
              <Button as={Link} to="/login" variant="outline">
                Staff Login
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 shadow-2xl shadow-ink/20">
              <PulseLine className="absolute inset-x-0 top-1/2 h-24 w-full -translate-y-1/2 opacity-70" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="font-data text-xs tracking-[0.2em] text-teal-bright">LIVE REQUEST</div>
                <div className="mt-3 font-display text-2xl font-semibold text-white">Ward W7 → Bedside</div>
                <div className="mt-1 text-sm text-white/50">Robot ETA · 4 min</div>
                <div className="mt-6 grid w-full grid-cols-3 gap-2 font-data text-xs text-white/70">
                  <div className="rounded-lg bg-white/5 py-2">Requested</div>
                  <div className="rounded-lg bg-teal/20 py-2 text-teal-bright">In transit</div>
                  <div className="rounded-lg bg-white/5 py-2">Delivered</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="overflow-hidden py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="max-w-xl"
          >
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">How a request moves through the hospital</h2>
            <p className="mt-3 text-slate">Four handoffs, one continuous thread from ward to bedside.</p>
          </motion.div>
        </div>

        <div className="relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="marquee-track flex w-max gap-6 px-6 sm:px-8">
            {[...STEPS, ...STEPS].map((step, i) => (
              <Card key={i} className="w-72 shrink-0 p-6">
                <div className="font-data text-xs font-semibold text-teal-bright">{step.n}</div>
                <step.icon className="mt-3 h-6 w-6 text-teal" strokeWidth={1.75} />
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{step.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* BOOK A CONSULTATION */}
      <section className="bg-mist py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-teal-deep">Get in touch</span>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
                <span className="text-teal-deep">Book a Free</span> Doctor Consultation
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-slate">
                Leave your name and phone number and our front desk will call you back to schedule
                your visit — no login needed.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: 0.1 }}
            >
              <ConsultationForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOSPITAL GALLERY */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-xl"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-deep">Our hospital</span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Real building, real care
          </h2>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="group overflow-hidden rounded-3xl shadow-lg"
          >
            <img
              src="/banner1.png"
              alt="Siddaganga Hospital building entrance"
              className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-96"
            />
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            transition={{ delay: 0.08 }}
            className="group overflow-hidden rounded-3xl shadow-lg"
          >
            <img
              src="/banner2.png"
              alt="Siddaganga Hospital pharmacy inauguration"
              className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-96"
            />
          </motion.div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-deep">About the project</span>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Built to close the gap between prescription and delivery
            </h2>
            <p className="mt-4 leading-relaxed text-slate">
              Siddaganga Hospital's Smart Medicine Delivery System replaces slow, manual
              ward-to-pharmacy runs with a single connected flow: a nurse raises a request,
              pharmacy prices and clears it, a delivery robot carries it to the bedside, and the
              patient can track and pay for it themselves — all from one dashboard per role.
            </p>
            <p className="mt-4 leading-relaxed text-slate">
              It's a full-stack systems project spanning embedded robotics, a MySQL-backed API,
              and an AI assistant that helps patients understand their own care — built as a
              real, end-to-end hospital workflow rather than a single isolated feature.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4"
          >
            <Card className="p-6">
              <Target className="h-5 w-5 text-teal-deep" strokeWidth={1.75} />
              <h3 className="mt-3 font-display font-semibold text-ink">Our Mission</h3>
              <p className="mt-1.5 text-sm text-slate">Cut the time between prescription and bedside delivery to minutes, not hours.</p>
            </Card>
            <Card className="p-6">
              <ShieldCheck className="h-5 w-5 text-teal-deep" strokeWidth={1.75} />
              <h3 className="mt-3 font-display font-semibold text-ink">Why It Matters</h3>
              <p className="mt-1.5 text-sm text-slate">Fewer manual handoffs means fewer errors, and more time for nurses to spend on care.</p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="bg-mist py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-deep">The team</span>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Who built this
            </h2>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {TEAM.map((member, i) => (
              <motion.div
                key={member.name}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="p-6 text-center">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-teal/20"
                    />
                  ) : (
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal/10 font-display text-xl font-semibold text-teal-deep ring-2 ring-teal/20">
                      {initials(member.name)}
                    </div>
                  )}
                  <h3 className="mt-4 font-display font-semibold text-ink">{member.name}</h3>
                  <p className="mt-1 text-sm text-slate">{member.role}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink px-8 py-12 sm:flex-row sm:items-center sm:px-12"
        >
          <div>
            <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Already a patient here?
            </h3>
            <p className="mt-2 max-w-md text-white/60">
              Check your medicine requests, track deliveries, and pay bills — all from your Patient ID.
            </p>
          </div>
          <Button as={Link} to="/patient" variant="primary" className="shrink-0">
            Open Patient Portal <ArrowRight size={16} />
          </Button>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

function ConsultationForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/consultations", { name: name.trim(), phone: phone.trim() });
      setDone(true);
      setName("");
      setPhone("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="flex flex-col items-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
          <CheckCircle2 className="h-6 w-6 text-teal-deep" />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-ink">Request received!</h3>
        <p className="mt-1.5 text-sm text-slate">
          Our front desk will call you back shortly to schedule your visit.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-4 text-sm font-semibold text-teal-deep hover:text-teal"
        >
          Book another consultation
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate">Your Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate">Phone Number</label>
          <div className="relative">
            <Phone size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              type="tel"
              className="!pl-10"
              required
            />
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Booking…
            </>
          ) : (
            "Book Now"
          )}
        </Button>
      </form>
    </Card>
  );
}
