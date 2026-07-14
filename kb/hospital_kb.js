// A small static knowledge base of hospital FAQ content, used as the
// "retrieval corpus" for the patient chatbot's RAG pipeline. In a larger
// system this would live in a database or vector store - for this app's
// scale, a plain in-memory array keeps things simple and dependency-free.
module.exports = [
  {
    id: "visiting-hours",
    title: "Visiting Hours",
    content:
      "General ward visiting hours are 10:00 AM - 12:00 PM and 5:00 PM - 7:00 PM daily. " +
      "ICU visiting is restricted to 1 visitor at a time, 11:00 AM - 11:30 AM and 6:00 PM - 6:30 PM. " +
      "Maternity ward visiting hours are 4:00 PM - 6:00 PM.",
  },
  {
    id: "departments",
    title: "Departments Available",
    content:
      "Siddaganga Hospital, Tumkur has the following departments: General Medicine, Cardiology, " +
      "Orthopedics, Pediatrics, Gynecology, ICU, Emergency/Casualty, Pharmacy, and Radiology.",
  },
  {
    id: "medicine-delivery",
    title: "Medicine Delivery Process",
    content:
      "When a nurse raises a medicine request for a patient, the pharmacy team reviews it, sets the " +
      "cost, and generates a QR code once the cost is confirmed. A delivery robot then carries the " +
      "medicine to the patient's ward using the QR code, and the request is marked Delivered once it " +
      "reaches the patient.",
  },
  {
    id: "billing-payment",
    title: "Billing and Payment",
    content:
      "Patients can view all their medicine requests and costs in the Patient Dashboard. Payment can " +
      "be made directly from the dashboard using the Pay button next to each unpaid request. This is a " +
      "simulated/demo payment for this system - no real money is charged.",
  },
  {
    id: "emergency-contact",
    title: "Emergency Contact",
    content:
      "For medical emergencies, go directly to the Emergency/Casualty department, available 24x7. " +
      "For billing or account questions, contact the hospital front desk during working hours, " +
      "9:00 AM - 6:00 PM, Monday to Saturday.",
  },
  {
    id: "discharge-process",
    title: "Discharge Process",
    content:
      "Discharge requires clearance from the treating doctor and full settlement of pending medicine " +
      "and service bills. Patients should check their Patient Dashboard to confirm no unpaid requests " +
      "remain before discharge.",
  },
];
