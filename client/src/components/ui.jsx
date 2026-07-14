// Small shared UI primitives kept in one file to avoid one-component-per-tiny-file sprawl.

export function Button({ as: As = "button", variant = "primary", className = "", children, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-teal text-white hover:bg-teal-deep shadow-sm shadow-teal/20",
    dark: "bg-ink text-paper hover:bg-ink-soft",
    outline: "border border-ink/15 text-ink hover:border-teal hover:text-teal",
    coral: "bg-coral text-white hover:bg-coral-deep shadow-sm shadow-coral/20",
    ghost: "text-ink-soft hover:text-teal",
    subtle: "bg-mist text-teal-deep hover:bg-teal/15",
  };
  return (
    <As className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </As>
  );
}

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-ink/[0.06] bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04),0_8px_24px_-12px_rgba(11,18,32,0.08)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

const BADGE_STYLES = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  delivered: "bg-teal/10 text-teal-deep ring-1 ring-teal/25",
  generated: "bg-teal/10 text-teal-deep ring-1 ring-teal/25",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  unpaid: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

export function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        BADGE_STYLES[tone] || BADGE_STYLES.neutral
      }`}
    >
      {children}
    </span>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-light focus:border-teal focus:outline-none ${
        props.className || ""
      }`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none ${
        props.className || ""
      }`}
    >
      {children}
    </select>
  );
}

export function Alert({ tone = "error", children }) {
  const styles =
    tone === "error"
      ? "bg-coral/10 text-coral-deep ring-1 ring-coral/20"
      : "bg-teal/10 text-teal-deep ring-1 ring-teal/20";
  return <div className={`rounded-xl px-4 py-3 text-sm font-medium ${styles}`}>{children}</div>;
}
