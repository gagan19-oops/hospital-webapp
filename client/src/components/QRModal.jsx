import { AnimatePresence, motion } from "framer-motion";
import { X, Printer, Download } from "lucide-react";
import { Button } from "./ui";

// data: { qr_data (base64 png), patient_id, ward, items: [{name, unit, quantity}] }
export default function QRModal({ data, onClose }) {
  if (!data) return null;
  const src = `data:image/png;base64,${data.qr_data}`;

  function handlePrint() {
    const win = window.open("", "", "width=800,height=800");
    const itemsHtml = data.items.map((it) => `<p>${it.name} — ${it.quantity} ${it.unit}</p>`).join("");
    win.document.write(`
      <html><head><title>Print QR</title>
      <style>
        body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;}
        .label{border:2px solid black;padding:25px;text-align:center;width:380px;border-radius:10px;}
        img{width:280px;margin:15px 0;} p{margin:5px 0;}
      </style></head>
      <body>
        <div class="label">
          <h3>Siddaganga Hospital</h3>
          <p><b>Medicine QR Label</b></p>
          <img src="${src}">
          <p><b>Patient:</b> ${data.patient_id}</p>
          <p><b>Ward:</b> ${data.ward}</p>
          <p><b>Medicines:</b></p>
          ${itemsHtml}
          <p style="margin-top:10px;">Scan for Robot Delivery</p>
        </div>
      </body></html>
    `);
    win.document.close();
    win.onload = () => {
      win.print();
      win.close();
    };
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
        >
          <h3 className="font-display text-lg font-semibold text-ink">QR Code Generated</h3>

          <div className="mx-auto mt-4 w-fit rounded-2xl border border-ink/10 p-3">
            <img src={src} alt="Request QR code" className="h-52 w-52 object-contain" />
          </div>

          <p className="mt-3 text-sm font-semibold text-teal-deep">Ready for robot delivery</p>

          <div className="mt-3 space-y-1 rounded-xl bg-mist p-3 text-left text-sm">
            <div>
              <b>Patient:</b> {data.patient_id}
            </div>
            <div>
              <b>Ward:</b> {data.ward}
            </div>
            <div>
              <b>Medicines:</b>
            </div>
            <ul className="ml-4 list-disc">
              {data.items.map((it, i) => (
                <li key={i}>
                  {it.name} ({it.quantity} {it.unit})
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={handlePrint}>
              <Printer size={15} /> Print
            </Button>
            <Button as="a" variant="outline" href={src} download="qr_code.png">
              <Download size={15} /> Download
            </Button>
          </div>

          <button
            onClick={onClose}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink"
          >
            <X size={14} /> Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
