const { pool } = require("./db");

// Fetches request "header" rows matching whereSql/params, each with its
// medicine line items attached (from request_items), plus a computed
// total_cost (sum of priced items) and all_priced flag (true once every
// item on that request has a cost set - used to gate QR generation).
//
// Returns an array of plain objects (not the raw rowsAsArray tuples) since
// each request now has a variable-length nested items array, which doesn't
// fit the fixed-index row[] pattern used elsewhere in this app.
async function fetchRequestsWithItems(whereSql, params, orderSql) {
  const [headers] = await pool.query(
    `SELECT id, patient_id, ward, request_time, qr_status, qr_time,
            delivery_status, delivery_time, qr_data, payment_status, payment_time,
            diagnosis, instructions
     FROM requests WHERE ${whereSql} ${orderSql || ""}`,
    params
  );

  if (headers.length === 0) return [];

  const ids = headers.map((h) => h[0]);
  const [itemRows] = await pool.query(
    `SELECT id, request_id, medicine_name, unit, quantity, cost
     FROM request_items WHERE request_id IN (?) ORDER BY id ASC`,
    [ids]
  );

  const itemsByRequest = {};
  for (const it of itemRows) {
    const reqId = it[1];
    if (!itemsByRequest[reqId]) itemsByRequest[reqId] = [];
    itemsByRequest[reqId].push({
      id: it[0],
      medicine_name: it[2],
      unit: it[3],
      quantity: it[4],
      cost: it[5] !== null ? parseFloat(it[5]) : null,
    });
  }

  return headers.map((h) => {
    const id = h[0];
    const items = itemsByRequest[id] || [];
    const total_cost = items.reduce((sum, it) => sum + (it.cost !== null ? it.cost : 0), 0);
    const all_priced = items.length > 0 && items.every((it) => it.cost !== null);

    return {
      id,
      patient_id: h[1],
      ward: h[2],
      request_time: h[3],
      qr_status: h[4],
      qr_time: h[5],
      delivery_status: h[6],
      delivery_time: h[7],
      qr_data: h[8],
      payment_status: h[9],
      payment_time: h[10],
      diagnosis: h[11],
      instructions: h[12],
      items,
      total_cost,
      all_priced,
    };
  });
}

// Generates a unique, sequential Patient ID like "P0001", "P0002", etc.
// Used when the admin adds a new patient - patients never type their own ID.
async function generatePatientId() {
  const [rows] = await pool.query("SELECT COUNT(*) FROM patients");
  let n = rows[0][0] + 1;

  for (let i = 0; i < 50; i++) {
    const candidate = "P" + String(n).padStart(4, "0");
    const [existing] = await pool.query("SELECT id FROM patients WHERE patient_id=?", [candidate]);
    if (existing.length === 0) return candidate;
    n++;
  }

  throw new Error("Could not generate a unique patient ID after 50 attempts");
}

module.exports = { fetchRequestsWithItems, generatePatientId };
