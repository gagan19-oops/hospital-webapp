import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLE_LINKS = {
  nurse: [
    { to: "/nurse", label: "Requests" },
    { to: "/billing", label: "Billing" },
    { to: "/robot", label: "Robot Delivery" },
  ],
  pharmacy: [
    { to: "/pharmacy", label: "Pharmacy" },
    { to: "/billing", label: "Billing" },
    { to: "/robot", label: "Robot Delivery" },
  ],
  admin: [
    { to: "/admin", label: "Admin" },
    { to: "/robot", label: "Robot Delivery" },
  ],
};

export default function Navbar() {
  const { session, logoutStaff, logoutPatient } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const staffRole = session.role;
  const isPatient = !!session.patient_id;
 const links = staffRole ? ROLE_LINKS[staffRole] || [] : isPatient ? [{ to: "/robot", label: "Robot Delivery" }] : [];
 
  async function handleLogout() {
    if (isPatient) {
      await logoutPatient();
      navigate("/patient");
    } else {
      await logoutStaff();
      navigate("/");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-green-700/20 bg-green-100/40 backdrop-blur-xl shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-full object-cover" />
          <div className="leading-tight">
            <div className="font-display text-[15px] font-semibold text-ink">Siddaganga Hospital</div>
            <div className="text-[11px] font-medium tracking-wide text-slate">Smart Medicine Delivery</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-ink-soft hover:text-teal transition-colors">
              {l.label}
            </Link>
          ))}

          {!staffRole && !isPatient && (
            <>
              <Link to="/patient" className="text-sm font-medium text-ink-soft hover:text-teal transition-colors">
                Patient Portal
              </Link>
              <Link
                to="/login"
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-teal-deep"
              >
                Staff Login
              </Link>
            </>
          )}

          {(staffRole || isPatient) && (
            <button
              onClick={handleLogout}
              className="rounded-full border border-coral/30 px-4 py-1.5 text-sm font-semibold text-coral-deep transition hover:bg-coral/10"
            >
              Log out
            </button>
          )}
        </nav>

        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink/5 bg-paper px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm font-medium text-ink-soft" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {!staffRole && !isPatient && (
              <>
                <Link to="/patient" className="text-sm font-medium text-ink-soft" onClick={() => setOpen(false)}>
                  Patient Portal
                </Link>
                <Link to="/login" className="text-sm font-semibold text-teal" onClick={() => setOpen(false)}>
                  Staff Login
                </Link>
              </>
            )}
            {(staffRole || isPatient) && (
              <button onClick={handleLogout} className="text-left text-sm font-semibold text-coral-deep">
                Log out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
