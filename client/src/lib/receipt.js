import { jsPDF } from "jspdf";

// Generates a clean, itemized PDF receipt for a single paid medicine request
// and triggers a browser download. Runs entirely client-side - no server
// round trip needed since we already have everything in the dashboard data.
export function downloadReceipt({ patientId, request }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 64;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 25, 40);
  doc.text("Siddaganga Hospital, Tumkur", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 110);
  y += 18;
  doc.text("Smart Medicine Delivery System - Payment Receipt", margin, y);

  doc.setDrawColor(15, 139, 141);
  doc.setLineWidth(1.5);
  y += 14;
  doc.line(margin, y, pageWidth - margin, y);

  // Receipt meta
  y += 30;
  doc.setFontSize(11);
  doc.setTextColor(15, 25, 40);

  const metaRows = [
    ["Receipt For Request #", String(request.id)],
    ["Patient ID", patientId],
    ["Ward", request.ward || "-"],
    ["Requested On", request.request_time || "-"],
    ["Paid On", request.payment_time || "-"],
  ];

  metaRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 150, y);
    y += 18;
  });

  // Items table header
  y += 14;
  doc.setFillColor(240, 245, 245);
  doc.rect(margin, y - 14, pageWidth - margin * 2, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Medicine", margin + 8, y + 1);
  doc.text("Quantity", margin + 250, y + 1);
  doc.text("Unit", margin + 340, y + 1);
  doc.text("Cost (₹)", pageWidth - margin - 60, y + 1);
  y += 22;

  // Items rows
  doc.setFont("helvetica", "normal");
  (request.items || []).forEach((item, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(250, 251, 251);
      doc.rect(margin, y - 14, pageWidth - margin * 2, 20, "F");
    }
    doc.setTextColor(15, 25, 40);
    doc.text(String(item.medicine_name), margin + 8, y);
    doc.text(String(item.quantity), margin + 250, y);
    doc.text(String(item.unit || ""), margin + 340, y);
    doc.text(item.cost !== null ? Number(item.cost).toFixed(2) : "-", pageWidth - margin - 60, y);
    y += 20;
  });

  // Total
  y += 10;
  doc.setDrawColor(220, 224, 226);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 139, 141);
  doc.text("Total Paid:", margin, y);
  doc.text(`Rs. ${Number(request.total_cost).toFixed(2)}`, pageWidth - margin - 90, y);

  // Payment status stamp
  y += 40;
  doc.setDrawColor(15, 139, 141);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, y - 18, 80, 26, 4, 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 139, 141);
  doc.text("PAID", margin + 24, y);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 48;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(140, 150, 158);
  doc.text(
    "This is a system-generated receipt for a simulated payment made within the hospital's demo billing system.",
    margin,
    footerY
  );
  doc.text(`© ${new Date().getFullYear()} Siddaganga Hospital, Tumkur`, margin, footerY + 12);

  doc.save(`receipt-request-${request.id}.pdf`);
}
