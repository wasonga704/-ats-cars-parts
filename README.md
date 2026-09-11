# Automotive and Transport Solutions — Live Website

A car and spare-parts website backed by a real Postgres database, so every
visitor — anywhere — sees the same listings, plus a password-protected admin
panel to manage them.

This has been tested end-to-end against a real Postgres database, including
restarting the server and confirming the data survives.

## What's inside

- `server.js` — Express server (API + serves the website)
- `db.js` — Postgres setup (auto-creates tables on first run, seeded with starter cars/parts if empty)
- `public/index.html` — the public website
- `public/admin.html` — password-protected admin panel
- `public/styles.css`, `public/app.js` — shared styling and frontend logic
- `.env.example` — copy this to `.env` and fill in your real values

## Step 1 — Create your free database (Neon)

Render's own free database expires after 30 days and gets deleted — not
good enough for a real site. **Neon** has a genuinely permanent free
Postgres tier with no credit card required, so we're using that.

1. Go to **neon.tech** and sign up for a free account.
2. Create a new project (any name, e.g. "ats-cars").
3. On your project dashboard, find the **Connection string** — it looks like:
   ```
   postgres://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy that whole string — you'll need it in the next step.

## Step 2 — Run it locally first (to make sure it works)

1. Install [Node.js](https://nodejs.org) (v18 or newer) if you don't have it.
2. In this folder, run:
   ```
   npm install
   cp .env.example .env
   ```
3. Open `.env` in a text editor and fill in:
   - `DATABASE_URL` — paste the Neon connection string from Step 1
   - `ADMIN_PASSWORD` — your own password
   - `JWT_SECRET` — a long random string. You can generate one by running:
     ```
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
4. Start the server:
   ```
   npm start
   ```
5. Open **http://localhost:3000** — you should see the site, with the same
   starter cars and parts. Go to **http://localhost:3000/admin.html**, log in,
   and try adding/removing a listing to confirm it works.

## Step 3 — Put it online for real (Render)

1. Push this folder to a new GitHub repository.
2. Go to **render.com**, sign up, and click **New → Web Service**.
3. Connect your GitHub repo.
4. Set:
   - Build command: `npm install`
   - Start command: `npm start`
5. Under **Environment**, add these environment variables (same values as
   your local `.env` — do not upload the `.env` file itself, this is where
   secrets belong on Render):
   - `DATABASE_URL`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
6. Click **Deploy**. Render gives you a live URL like
   `https://your-app.onrender.com` — that's your public website. Anyone,
   anywhere, can now visit it and see the same cars and parts, and the admin
   panel is at `https://your-app.onrender.com/admin.html`.

**One thing to know:** Render's free web service "sleeps" after 15 minutes
with no visitors, and takes about a minute to wake back up on the next
visit. Your data is unaffected either way — it lives in Neon, not on Render.
If that wake-up delay matters to you (e.g. you're expecting steady traffic),
Render's cheapest paid instance type removes it.

## About vehicle & spare part photos

When adding a car or a part in the admin panel, there's now an optional
photo field (JPG, PNG, or WEBP, up to 2.5MB). Photos are stored inside your
Neon database along with the listing itself — not as separate files — so
they survive server restarts and redeploys, unlike files saved to disk on
Render's free tier. A listing without a photo just falls back to a simple
icon, so photos are optional, not required.

## Step 4 — Set up the contact form email

The "Get In Touch" form on the site sends enquiries straight to your Gmail
inbox. We use **Resend** to deliver these, not Gmail's own SMTP — this is
important: **Render's free tier blocks the ports Gmail SMTP needs**, so
Gmail SMTP will never work here no matter how correctly it's configured.
Resend sends over regular HTTPS instead, the same kind of connection as
loading a webpage, so it isn't blocked.

1. Go to **resend.com** and sign up for a free account — use the same
   Gmail address you want enquiries delivered to
   (`josephwasonga40@gmail.com`). No credit card needed.
2. Once logged in, go to **resend.com/api-keys** and click **Create API Key**.
   Give it any name (e.g. `ATS Website`) and leave permissions as default.
3. Copy the key shown (starts with `re_`) — like the Gmail app password,
   you won't be able to see it again after closing that screen.
4. In your `.env` file (locally) or Render's environment variables (live),
   set:
   - `RESEND_API_KEY` — the key from step 3
   - `CONTACT_TO_EMAIL` — the address enquiries should land in
     (defaults to `josephwasonga40@gmail.com` if left blank)
   - `CONTACT_FROM_EMAIL` — leave this as `onboarding@resend.dev` for now
5. Restart the server (locally: stop and run `npm start` again; on Render:
   it restarts automatically when you save new environment variables).

**A limit worth knowing:** on the free plan, without your own verified
domain, Resend only allows sending to the *same email address you signed up
with*. Since that's `josephwasonga40@gmail.com` in both places, this works
perfectly for a single-admin business site — every enquiry lands exactly
where you want it. If you ever want enquiries to go to a different address,
or send from your own domain (e.g. `enquiries@yourbusiness.com`), you'd
verify a domain on Resend first — happy to help with that when you get there.

**To test it:** open your site, fill in the contact form, and submit it.
You should see a "message sent" confirmation on the page, and the email
should land in your inbox within a few seconds. If it doesn't arrive within
a minute or two, check Render's Logs tab for a line starting with
"Resend API error" — it'll show exactly what Resend rejected and why.

## Changing the admin password later

Update `ADMIN_PASSWORD` in Render's Environment settings (or your local
`.env`), then redeploy/restart.

## A note on security

This uses one shared password for the whole admin panel — fine for a small,
single-admin business site. It doesn't support multiple admin accounts or
different permission levels. Let me know if you need that later.
