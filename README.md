# Siddaganga Hospital Webapp — React + Express + MySQL

A smart medicine request, robot delivery, and patient billing system for
Siddaganga Hospital, Tumkur — ported from the original Flask + SQLite app to
**React (Vite) + Express + MySQL**, with a Patient Dashboard (spending chart,
simulated payments, LLM+RAG chatbot), a full Admin Dashboard (analytics,
staff/patient management), multi-medicine requests, and a pharmacy-owned
medicine catalog.

## New in this version (v6): React frontend

- The entire UI is now a **React single-page app** (in `client/`), built with
  Vite, Tailwind CSS v4, React Router, Framer Motion (page/element animation),
  Recharts (charts), and Lucide icons - replacing the old server-rendered EJS
  templates.
- **Express is now a pure JSON API** (`server.js`, all routes under `/api/...`)
  plus a static file server for the built React app - see "How it fits
  together" below.
- Design system lives in `client/src/index.css` (`@theme` tokens: a clinical
  teal + ink navy + coral-pulse palette, Space Grotesk/Inter/JetBrains Mono
  type) and `client/src/components/ui.jsx` (Button/Card/Badge/Input/Select/Alert
  primitives) - built for a clean, professional, technical-club-website feel
  rather than a generic admin-panel look.
- The old `views/*.ejs` templates are gone - if you have an older copy of this
  project, you can delete that folder.

## How it fits together

```
Browser  ──►  React app (client/dist, built with Vite)  ──►  fetch('/api/...')  ──►  Express (server.js)  ──►  MySQL
```

- **Development**: run the Express API (`npm start` in the project root) and
  the Vite dev server (`npm run dev` inside `client/`) side by side. Vite proxies
  `/api/*` requests to Express (see `client/vite.config.js`), and gives you
  instant hot-reload while editing React components.
- **Production / normal use**: build the React app once (`npm run build` inside
  `client/`), which outputs static files to `client/dist/`. Express serves those
  files directly and only needs `npm start` — no separate frontend server, no
  extra port. This is the simplest way to just "run the app" day-to-day.

## Previous version (v5) features

- **Diagnosis + instructions per request**: nurses can optionally note a
  diagnosis and dosage/timing instructions when submitting a request
  (`requests.diagnosis`, `requests.instructions`) - the patient chatbot uses
  these to answer "why was this prescribed" / "when do I take it" questions
  with real data instead of guessing (see `rag.js`).

## Previous version (v4) features

- **Admin-assigned Patient IDs**: patients are no longer free-typed. The admin
  adds a patient (name only) and the app auto-generates their Patient ID
  (`P0001`, `P0002`, ...). Nurses pick from this list on the request form -
  no more typos or made-up IDs.
- **Fixed ward list**: nurses select a ward from a dropdown (`constants.js`)
  instead of typing anything - ICU, Emergency, Maternity Ward, W1-W20.
- **Multiple medicines per request**: one nurse submission can now include
  several medicines, each with its own quantity. Pharmacy prices each medicine
  line individually, and QR generation unlocks only once every line has a
  cost.
- **Pharmacy-owned medicine catalog**: nurses can only select medicines
  pharmacy has added to the catalog (name + form + unit, e.g. "Paracetamol /
  Tablet / mg", "Cough Syrup / Syrup-Liquid / ml") - no free-typing medicine
  names either. Manage it from the Pharmacy Dashboard. Seeded with 30 common
  medicines on first run.
- Requests are now stored as a header (`requests`) + line items
  (`request_items`) rather than one row per medicine - see `helpers.js`
  (`fetchRequestsWithItems`) for how everything reassembles this for display.

## Previous version (v3) features

- **Patient Dashboard** (`/patient`): patients log in with just their Patient ID
  and see a spending chart, their full request history, and can pay any unpaid
  request with one click (simulated - no real money moves).
- **Patient chatbot (LLM + RAG)**: a floating chat widget on the patient
  dashboard answers questions using two retrieved sources — the patient's own
  medicine records (pulled from MySQL) and a small hospital FAQ knowledge base
  (`kb/hospital_kb.js`) — then generates the answer with Google's **Gemini API**
  (free tier, no credit card required). See `rag.js` for the retrieval + generation logic.
- **Admin Dashboard** (`/admin`, login role "admin"): revenue/request stats,
  charts (revenue trend, requests by ward, delivery status breakdown), a table
  to update any request's delivery status, and staff account management
  (add/remove nurse/pharmacy/admin logins).
- **Real staff logins**: nurse/pharmacy/admin credentials now live in a MySQL
  `users` table with bcrypt-hashed passwords, manageable from the Admin
  Dashboard, instead of being hardcoded in the server code.

## What changed (from the original Flask app)

| Original (Flask)              | Now (React + Express)                        |
|--------------------------------|-----------------------------------------------|
| Flask + Jinja2 templates       | React (Vite) SPA + Express JSON API           |
| SQLite (`hospital.db`)         | MySQL (via `mysql2`)                          |
| `sqlite3` module                | `mysql2/promise` connection pool              |
| Python `qrcode` + `base64`      | `qrcode` npm package (`toDataURL`)             |
| Flask `session`                 | `express-session` (cookie-based, used by the API) |
| `app.py` (single file)          | `server.js` + `db.js` + `client/src/*`        |

Row data from MySQL is fetched with `rowsAsArray: true` in the pool config
(arrays instead of objects) for simple queries, and reassembled into plain
objects by `helpers.js` for anything involving a request's medicine line items
(since those have a variable-length nested array that doesn't fit the
`row[0], row[1]` pattern).

## Project layout

```
.
├── server.js              # JSON API only (all routes under /api/...) + serves client/dist in production
├── db.js                  # MySQL pool + auto table creation + default account/medicine seeding
├── helpers.js              # fetchRequestsWithItems() - reassembles request + its medicine lines for display
├── constants.js             # fixed WARDS list, medicine form/unit options
├── rag.js                 # RAG chatbot: keyword retrieval over kb/ + patient records, generation via Gemini
├── kb/hospital_kb.js       # small hospital FAQ knowledge base (the chatbot's retrieval corpus)
├── client/                # React frontend (Vite)
│   ├── src/pages/*.jsx      # Home, Login, NurseDashboard, PharmacyDashboard, AdminDashboard,
│   │                        # PatientLogin, PatientDashboard, Billing, RobotDelivery
│   ├── src/components/      # Navbar, Footer, QRModal, PulseLine, ProtectedRoute, ui.jsx (design system)
│   ├── src/context/AuthContext.jsx  # session state (staff role / patient_id), shared across the app
│   ├── src/lib/api.js        # thin fetch wrapper used by every page
│   ├── src/index.css          # Tailwind v4 + design tokens (colors, fonts)
│   ├── public/                 # static assets (logo, banners) served as-is
│   └── dist/                    # build output (created by `npm run build`; not committed)
├── public/                 # legacy static assets folder (kept for the old EJS-era logo/banner references)
├── db/schema.sql            # standalone CREATE TABLE script (fresh installs)
├── db/migrate_v3.sql         # ALTER script upgrading pre-v3 installs (payments, users table)
├── db/migrate_v4.sql         # ALTER script upgrading pre-v4 installs (patients, medicine catalog, multi-item requests)
├── db/migrate_v5.sql         # ALTER script adding diagnosis/instructions columns (also auto-applied by db.js)
├── db/seed.sql               # your original 72 rows, exported from hospital.db, ready to import into MySQL
├── package.json             # Express/backend dependencies
└── .env.example
```

## Setup

1. Install the backend dependencies:
   ```bash
   npm install
   ```

2. Install the React frontend's dependencies:
   ```bash
   cd client
   npm install
   cd ..
   ```

3. Make sure MySQL is running and create a database + user (or use an existing one).

4. Copy the env file and fill in your MySQL credentials:
   ```bash
   cp .env.example .env
   ```

5. **Fresh install** (no existing data): just let the app create everything on
   first run (step 8 below) — no manual SQL needed. Optionally, if you want to
   start with a reference schema file instead, you can run `db/schema.sql`.

   **Upgrading an existing install**: run the migration matching your current
   version, in order (skip whichever ones you've already run before):
   ```bash
   # If you're on the original Flask/SQLite-ported version (single medicine,
   # free-typed patient IDs, hardcoded staff logins):
   mysql -u root -p hospital_db < db/migrate_v3.sql   # adds payments + real staff logins
   mysql -u root -p hospital_db < db/migrate_v4.sql   # adds patients, medicine catalog, multi-item requests
   ```
   `migrate_v4.sql` carries over your existing patient IDs and medicine names into
   the new `patients`/`medicines` tables automatically (patient names default to
   their ID, medicine forms default to "Other" - both easy to fix up afterwards
   from the Admin/Pharmacy Dashboards). See the comments inside that file for
   details. **Run each migration only once.**

   There's also `db/migrate_v5.sql` (adds `diagnosis`/`instructions` columns to
   requests, so the chatbot can answer "why was this prescribed" questions) -
   but you can skip it: the app already applies those same two `ALTER TABLE`
   statements automatically on startup (see `db.js`), so it's here only for
   manual/reference parity with the other migration files.

6. To use the patient chatbot, get a **free** API key from
   [Google AI Studio](https://aistudio.google.com/apikey) (no credit card needed in most
   regions) and set `GEMINI_API_KEY` in your `.env` file. Without it, the rest of the app
   works fine — only the chat widget will show an error message.

7. Build the React frontend:
   ```bash
   cd client
   npm run build
   cd ..
   ```
   This creates `client/dist/` - Express serves this automatically when you start
   the app. **Re-run this command any time you change something in `client/src/`.**

   (Tip: `npm run build` from the **project root** does steps 2 and 7 together -
   installs the client's dependencies and builds it in one command.)

8. Start the app:
   ```bash
   npm start
   ```
   The app listens on `http://0.0.0.0:5000` by default (same as the Flask app).
   Open `http://localhost:5000` in your browser - this one command + port serves
   both the React UI and the API.

   For local development with auto-reload on both the backend and the React
   frontend (two terminals):
   ```bash
   # Terminal 1 - Express API with auto-reload
   npm run dev

   # Terminal 2 - Vite dev server with hot-reload (proxies /api to Terminal 1)
   cd client && npm run dev
   ```
   In this mode, open the URL Vite prints (usually `http://localhost:5173`) instead
   of port 5000 while developing - Vite hot-reloads your React changes instantly
   without needing to re-run `npm run build` each time.

## Login credentials

Default staff accounts (seeded automatically the first time the app runs, same
credentials as before, but now stored as bcrypt hashes in the `users` table
instead of hardcoded — manageable from the Admin Dashboard):

| Role     | Username | Password  |
|----------|----------|-----------|
| Admin    | admin    | admin123  |
| Nurse    | nurse    | nurse123  |
| Pharmacy | pharmacy | pharm123  |

**Patients** don't have a password — they log in at `/patient` with just their
Patient ID. As of v4, Patient IDs are admin-assigned (auto-generated as `P0001`,
`P0002`, ... when an admin adds a patient from the Admin Dashboard) rather than
anything the patient makes up themselves.

## Notes / things preserved intentionally from the original app

- **Nurse status filter**: the original nurse page tried to filter by a `status`
  column that doesn't exist on the table (the real column is `delivery_status`), so
  the filter silently did nothing. This port fixes the query to use the real
  `delivery_status` column so the filter actually works — everything else is left
  untouched.
- Session secret, credentials, and QR/text formats are unchanged.

## Notes on the v6 React frontend

- **Design system**: colors, fonts, and spacing tokens live in
  `client/src/index.css` under the Tailwind v4 `@theme` block. Change a value
  there (e.g. `--color-teal`) and it updates everywhere the corresponding
  utility class (`bg-teal`, `text-teal`, ...) is used - no need to hunt through
  every component.
- **Auth/session state**: `client/src/context/AuthContext.jsx` holds the
  current staff role or patient_id, fetched once from `/api/session` on load.
  `ProtectedRoute.jsx`'s `RequireRole`/`RequirePatient` wrap any page that
  needs a logged-in staff member or patient, redirecting to the right login
  page otherwise.
- **All server communication goes through `client/src/lib/api.js`** - a thin
  `fetch` wrapper that always sends cookies (`credentials: "include"`) and
  throws on non-2xx responses with the server's error message, so every page
  can just `try { await api.post(...) } catch (err) { setError(err.message) }`.
- If you're picking this up after only ever seeing the old EJS version: the
  server no longer renders any HTML itself (no `res.render`, no view engine) -
  it's a pure JSON API under `/api/*`, plus a catch-all that serves
  `client/dist/index.html` for any other route so React Router can take over
  client-side. This is why you must run `cd client && npm run build` before
  `npm start` will show your latest frontend changes.

## Notes on the v4 restructuring

- **Patients and medicines are no longer free text.** A nurse can only pick a
  patient the admin has already added, and a medicine pharmacy has already
  added to the catalog. Both forms will show a warning message instead of
  submitting if either list is empty (ask an admin/pharmacy staff member to
  add one first).
- **Cost is per medicine line, not per request.** A request's total is the
  sum of all its priced line items - see `total_cost` in `helpers.js`.
- **QR generation is gated**: pharmacy can't generate a QR code for a request
  until every medicine on it has a cost set (`all_priced` in `helpers.js`).
- **Deleting a patient** only works if they have zero requests on file, to
  keep historical data intact - the button will silently no-op otherwise.

## Deploying this for free

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a full walkthrough of putting
this online at no cost - Aiven for a free-forever MySQL database, Render for
free app hosting, plus getting it indexed on Google and a note on what's
needed later for real robot hardware integration.

## Security note

The `.env` file holds your real DB password — don't commit it. Only `.env.example`
(with placeholder values) is meant to be checked in.
