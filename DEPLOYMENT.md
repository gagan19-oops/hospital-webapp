# Deploying for Free: Aiven (MySQL) + Render (App Hosting)

This gets your app live on the public internet at **$0/month**, using:
- **Aiven** for a free-forever MySQL database (no credit card, no trial expiry)
- **Render** for free Node.js app hosting

Total cost: **$0**. Trade-off: Render's free tier "sleeps" your app after ~15
minutes of no traffic, and takes ~30-60 seconds to wake back up on the next
visit. For a hospital demo/college project, this is a normal and expected
trade-off for free hosting.

---

## Part 1: Push your project to GitHub

Render deploys from a GitHub repo, so your code needs to live there first.

1. Go to [github.com](https://github.com) and sign in (or create an account)
2. Click **New repository** → name it `hospital-webapp` → **Create repository**
3. In your VS Code terminal, inside the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/hospital-webapp.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username. Your `.gitignore` already
   excludes `.env`, `node_modules`, and `client/dist` - your real secrets won't
   be pushed.

---

## Part 2: Set up your free MySQL database (Aiven)

1. Go to **[aiven.io](https://aiven.io)** and sign up (no credit card required
   for the free plan)
2. Click **Create service** → choose **MySQL**
3. Pick the **Free** plan tier
4. Choose any cloud region close to you → **Create service**
5. Wait a few minutes for it to say **Running**
6. Click into the service → the **Overview** tab shows your connection details:
   - **Host**
   - **Port**
   - **User** (usually `avnadmin`)
   - **Password**
   - There's also a **CA Certificate** download - save this file, e.g. as
     `aiven-ca.pem`, somewhere in your project (don't commit it to git -
     it's not secret, but keep it out of the repo for tidiness)

### Create the database and tables

Using the connection details above, run this from your computer (you'll need
the `mysql` command-line client - the same one bundled with XAMPP):

```bash
mysql -h YOUR_AIVEN_HOST -P YOUR_AIVEN_PORT -u avnadmin -p --ssl-ca=aiven-ca.pem
```
It'll prompt for the password - paste it in (won't show on screen, that's normal).

Once connected, create the database and load the schema:
```sql
CREATE DATABASE hospital_db;
exit;
```
Then, back at your regular terminal:
```bash
mysql -h YOUR_AIVEN_HOST -P YOUR_AIVEN_PORT -u avnadmin -p --ssl-ca=aiven-ca.pem hospital_db < db/schema.sql
mysql -h YOUR_AIVEN_HOST -P YOUR_AIVEN_PORT -u avnadmin -p --ssl-ca=aiven-ca.pem hospital_db < db/seed.sql
```
(Skip `seed.sql` if you'd rather start empty - the app creates tables
automatically on first run either way, so even skipping `schema.sql` is fine.)

---

## Part 3: Deploy the app (Render)

1. Go to **[render.com](https://render.com)** and sign up (free, no card needed
   for the free tier)
2. Click **New** → **Web Service**
3. Connect your GitHub account and select the `hospital-webapp` repo
4. Fill in:
   - **Name**: anything, e.g. `siddaganga-hospital`
   - **Region**: closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. Scroll to **Environment Variables** and add these (using your real Aiven
   values from Part 2):
   ```
   DB_HOST         = your-aiven-host
   DB_PORT         = your-aiven-port
   DB_USER         = avnadmin
   DB_PASSWORD     = your-aiven-password
   DB_NAME         = hospital_db
   DB_SSL          = true
   SESSION_SECRET  = pick-any-long-random-string
   GEMINI_API_KEY  = your-gemini-key (optional, for the chatbot)
   GEMINI_MODEL    = gemini-3-flash-preview
   ```
   Leave `DB_SSL_CA_PATH` unset - Render will connect to Aiven fine without
   pinning the exact CA file (see the note in `.env.example`).
6. Click **Create Web Service**

Render will build and deploy automatically. Watch the **Logs** tab - once you
see `Hospital webapp is running!`, click the URL at the top of the page
(something like `https://siddaganga-hospital.onrender.com`) - that's your
live site.

**Every time you push new commits to GitHub, Render redeploys automatically.**

---

## Part 4: Getting found when someone searches your site's name

Being live at a public URL is step one - Google needs to actually crawl and
index it before it shows up in search results. This takes anywhere from a
few days to a few weeks, and these steps speed it up:

1. **Google Search Console** (free): go to
   [search.google.com/search-console](https://search.google.com/search-console),
   add your Render URL as a property, and verify ownership (it'll offer an
   HTML tag method - just add the meta tag it gives you to
   `client/index.html`'s `<head>`, rebuild, redeploy)
2. Once verified, use the **URL Inspection** tool and click **Request Indexing**
   for your homepage
3. Your page's `<title>` and `<meta name="description">` (already set in
   `client/index.html`) are what Google shows in search results - keep them
   accurate and specific (e.g. include "Siddaganga Hospital" clearly, which
   it already does)

**Reality check**: a `something.onrender.com` URL will get indexed and found
if someone searches your exact project name, but if you want your *own*
domain (e.g. `siddagangahospital.com`) instead of the Render subdomain,
that requires buying a domain (~$10-15/year - the one part of this that
realistically isn't free) and pointing it at Render (Render supports free
custom domain connection, you just pay the domain registrar, not Render).

---

## Part 5: Future robot integration - why this deployment matters

Once your robot hardware exists, it needs a real internet address to call
back to - it can't reach your laptop's `localhost:5000` from across the
hospital (or from anywhere outside your home Wi-Fi). Your Render URL
(`https://your-app.onrender.com`) solves this: the robot's onboard
controller (Raspberry Pi, ESP32, etc.) can call your API's existing routes
directly over Wi-Fi/mobile data, the same way your browser does now.

When you're ready to wire in the actual robot, we'll want to add one thing
this app doesn't have yet: a dedicated **robot API key** (separate from
staff logins) so the robot can authenticate its own status updates (e.g.
"picked up," "arrived," "delivered") without needing a full user session -
just flag me when the hardware side is ready and we'll build that piece.

---

## Free tier limits worth knowing

- **Render free tier**: app sleeps after ~15 min idle, wakes on next request
  (~30-60s delay for that first visitor). Fine for demos/low traffic.
- **Aiven free tier**: 1GB storage, 1GB RAM, shared CPU - plenty for this
  app's scale, but not built for heavy production traffic.
- Sessions now persist in MySQL (see the `sessions` table), so people stay
  logged in across Render's sleep/wake cycles - this was specifically fixed
  as part of this deployment so free hosting doesn't randomly log people out.
