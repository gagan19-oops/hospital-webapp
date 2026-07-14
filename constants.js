// Fixed ward list - nurses pick from this dropdown instead of typing free
// text, so ward names stay consistent across the app (matches the existing
// data pattern: ICU, W1-W20, etc).
const WARDS = [
  "ICU",
  "Emergency",
  "Maternity Ward",
  "General Ward",
  ...Array.from({ length: 20 }, (_, i) => `W${i + 1}`),
];

// Suggested medicine "forms" - shown as a dropdown when pharmacy adds a new
// medicine to the catalog.
const MEDICINE_FORMS = ["Tablet", "Capsule", "Syrup/Liquid", "Injection", "Ointment", "Other"];

// Suggested units - shown as a <datalist> (so pharmacy can still type a
// custom unit) when adding a medicine to the catalog. Covers solids,
// liquids, and dosage-based units as requested.
const MEDICINE_UNITS = [
  "tablet(s)",
  "capsule(s)",
  "ml",
  "mg",
  "g",
  "mcg",
  "IU",
  "dose(s)",
  "sachet(s)",
  "drop(s)",
  "application(s)",
];

module.exports = { WARDS, MEDICINE_FORMS, MEDICINE_UNITS };
