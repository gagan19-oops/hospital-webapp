// The signature visual motif of this design: a vitals-monitor pulse trace
// that morphs into a grid of dots (echoing a QR code) - bridging the
// clinical and delivery-tech sides of what this app does. Used sparingly:
// the hero background and as section dividers.
export default function PulseLine({ className = "", stroke = "var(--color-teal-bright)" }) {
  return (
    <svg
      viewBox="0 0 1000 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 60 H120 L150 60 L170 15 L200 105 L230 60 L260 60 L290 30 L320 90 L350 60 H480
           C500 60 500 20 520 20 C540 20 540 60 560 60 H700 L730 60 L750 15 L780 105 L810 60
           L840 60 L870 30 L900 90 L930 60 H1000"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pulse-line-path"
      />
    </svg>
  );
}
