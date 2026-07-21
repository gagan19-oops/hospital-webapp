// ============================================================================
// ROBOT SIMULATOR
// ============================================================================
// Stands in for a real delivery robot until actual hardware exists. Run this
// as its own process (`node robot-simulator.js`), separate from the main
// server - exactly like a real robot's onboard controller (Raspberry Pi,
// ESP32, etc.) would be its own separate device calling the same API.
//
// Matches the app's real robot API:
//   GET  /api/robot/next-job  - claims the oldest "Requested" delivery
//   POST /api/robot/status    - reports progress: Picked Up, In Transit,
//                               (occasionally) Obstacle Detected, Delivered
//
// A request only becomes available here after: nurse creates it -> pharmacy
// prices it + generates its QR -> pharmacy clicks "Send to Robot" on the
// Pharmacy Dashboard. That last click is what sets delivery_status to
// "Requested", which is what this script is watching for.
//
// SWAPPING IN REAL HARDWARE LATER:
// The two API calls below (fetchNextJob, reportStatus) are exactly what real
// hardware should call too - point a Raspberry Pi/ESP32 at the same
// ROBOT_API_URL with the same ROBOT_API_KEY, replace the setTimeout "travel"
// delays with real navigation/sensor logic, and call reportStatus() at the
// same points (Picked Up / In Transit / Delivered). Nothing on the server
// side needs to change.
// ============================================================================

require("dotenv").config();

const ROBOT_API_URL = process.env.ROBOT_API_URL || "http://localhost:5000";
const ROBOT_API_KEY = process.env.ROBOT_API_KEY;

const POLL_INTERVAL_MS = 8000; // how often to check for new jobs when idle
const PICKUP_TO_TRANSIT_MS = 4000; // simulated time to leave pharmacy
const TRANSIT_TO_DELIVERED_MS = 10000; // simulated travel time to the ward
const OBSTACLE_CHANCE = 0.25; // 25% chance of a brief, self-resolving obstacle event for realism

if (!ROBOT_API_KEY) {
  console.error("ROBOT_API_KEY is not set in .env - the server will reject every request.");
  console.error("Add a line like ROBOT_API_KEY=some-long-random-string to .env (same value on both sides,");
  console.error("and also set it as an environment variable on Render if this is your deployed app).");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${msg}`);
}

async function fetchNextJob() {
  const res = await fetch(`${ROBOT_API_URL}/api/robot/next-job`, {
    headers: { "X-Robot-Key": ROBOT_API_KEY },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`next-job fetch failed (${res.status}): ${body.error || res.statusText}`);
  }
  const { job } = await res.json();
  return job;
}

async function reportStatus(reqId, status) {
  const res = await fetch(`${ROBOT_API_URL}/api/robot/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Robot-Key": ROBOT_API_KEY,
    },
    body: JSON.stringify({ req_id: reqId, status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Status update failed (${res.status}): ${body.error || res.statusText}`);
  }
}

async function deliverOne(job) {
  const label = `Request #${job.req_id} (${job.patient_id} \u2192 ${job.ward})`;

  log(`\ud83d\udce6 Picking up ${label}`);
  await reportStatus(job.req_id, "Picked Up");

  await sleep(PICKUP_TO_TRANSIT_MS);
  log(`\ud83d\ude80 In transit: ${label}`);
  await reportStatus(job.req_id, "In Transit");

  // Occasionally simulate a brief obstacle for realism - it always resolves
  // and continues on to delivery (this is a demo, not a real navigation
  // stack, so there's no actual re-routing logic here, just the status blip).
  if (Math.random() < OBSTACLE_CHANCE) {
    await sleep(2000);
    log(`\u26a0\ufe0f  Obstacle detected en route: ${label}`);
    await reportStatus(job.req_id, "Obstacle Detected");
    await sleep(3000);
    log(`\u2705 Obstacle cleared, resuming: ${label}`);
    await reportStatus(job.req_id, "In Transit");
  }

  await sleep(TRANSIT_TO_DELIVERED_MS);
  log(`\u2705 Delivered: ${label}`);
  await reportStatus(job.req_id, "Delivered");
}

async function mainLoop() {
  log(`Robot simulator started. Watching ${ROBOT_API_URL} for jobs sent from the Pharmacy Dashboard...`);

  while (true) {
    try {
      const job = await fetchNextJob();

      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      await deliverOne(job);
    } catch (err) {
      log(`\u26a0\ufe0f  Error: ${err.message}`);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

mainLoop();