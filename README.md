# EventReg

A lightweight, zero-cost registration system for college fests, hackathons, and tech events. Students register through a public form, get an automated confirmation email with a QR code, and organizers check them in at the venue by scanning it.

Built as a static HTML/CSS/JS frontend with a Google Apps Script + Google Sheets backend — no server, no hosting cost, no database to provision.

## Features

- **Public registration form** — name, email, phone, college, and event track, with client-side validation and optional payment-screenshot upload
- **Duplicate prevention** — registrations are checked against existing email/phone before being accepted
- **Unique registration IDs** — each entry gets an auto-generated ID (`EVT-XXXXXX`)
- **Automated confirmation email** — sent on successful registration with an embedded QR code
- **QR check-in** — volunteers scan the QR code (camera) or enter the registration ID manually to mark attendance
- **Admin dashboard** — password-gated view of all registrations, with search/filter and CSV export
- **Live stats** — total registered vs. total checked-in

## Tech stack

| Layer     | Technology                                          |
| --------- | ---------------------------------------------------- |
| Frontend  | Plain HTML, CSS, JavaScript — no framework, no build step |
| Backend   | Google Apps Script (Web App, `doGet`/`doPost`)        |
| Database  | Google Sheets                                         |
| Email     | Gmail via `MailApp`                                   |
| QR scan   | `html5-qrcode` (loaded via CDN)                        |
| QR generate | URL-based QR image API, embedded in confirmation email |

## Project structure

```
frontend/
  index.html            # Public registration form
  admin.html            # Admin dashboard
  admin-login.html      # Admin password gate
  checkin.html          # QR scanner / check-in page
  checkin-login.html    # Check-in password gate
  css/
    style.css           # Shared design tokens + page styles
  js/
    config.js            # GAS_WEB_APP_URL + shared fetch/helper functions
    register.js           # Registration form logic
    admin.js               # Dashboard logic (list, search, export)
    checkin.js               # Scanner + manual check-in logic
    login.js                  # Password-gate logic

PRD.md            # Product requirements
architecture.md    # System architecture
database.md         # Sheet schema (Registrations + Config tabs)
design.md            # Design notes
rules.md              # Project conventions / known limitations
phases.md              # Build roadmap
```

> Note: this repo contains the frontend only. The Apps Script backend (`Code.gs`, `Registration.gs`, `Checkin.gs`, `Admin.gs`, `Email.gs`, `Utils.gs` as described in `architecture.md`) lives in its own Apps Script project bound to the Google Sheet and is deployed separately — see below.

## Setup

### 1. Set up the Google Sheet + Apps Script backend

1. Create a new Google Sheet named `EventReg_DB` with two tabs:
   - **`Registrations`** with header row: `regId | name | email | phone | college | track | registeredAt | checkedIn | checkinTime | emailSent`
   - **`Config`** with columns `key | value`, holding rows like `eventName`, `adminPasswordHash`, `maxCapacity`, `eventDate`
2. Open **Extensions → Apps Script** from the Sheet and add the backend script files (`Code.gs`, `Registration.gs`, `Checkin.gs`, `Admin.gs`, `Email.gs`, `Utils.gs`) implementing the `register`, `list`, `checkin`, `verifyAdmin`, and `eventInfo` actions described in `architecture.md`.
3. Deploy the script as a **Web App**: *Execute as* `Me`, *Who has access* `Anyone`.
4. Copy the deployed Web App URL (ends in `/exec`).

### 2. Configure the frontend

Edit `frontend/js/config.js`:

```js
const CONFIG = {
  GAS_WEB_APP_URL: 'YOUR_DEPLOYED_APPS_SCRIPT_URL', // ends in /exec
  EVENT_NAME: 'YourEventName',
  EVENT_TAGLINE: 'Your tagline here',
  PAYMENT_QR_URL: 'assets/payment-qr.png',
  PAYMENT_UPI: 'yourupi@bank',
  MAX_SCREENSHOT_BYTES: 3 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
};
```

### 3. Run locally

No build step is required — open `frontend/index.html` directly in a browser, or serve the `frontend/` folder with any static file server:

```bash
npx serve frontend
```

### 4. Deploy

Host the `frontend/` folder on any static host (GitHub Pages, Netlify, Vercel, etc.). The Apps Script Web App is already publicly reachable once deployed, so no backend hosting is needed.

## Pages

| Page | File | Access |
| --- | --- | --- |
| Registration form | `index.html` | Public |
| Admin login | `admin-login.html` | Public (password gate) |
| Admin dashboard | `admin.html` | Password-protected |
| Check-in login | `checkin-login.html` | Public (password gate) |
| Check-in / scanner | `checkin.html` | Password-protected |

## Known limitations

- **Auth**: admin and check-in access use a single shared password verified against a value in the `Config` tab, stored client-side in `sessionStorage` after verification — sufficient for a single trusted-organizer-team event, not a full multi-user auth system.
- **Single-event scope**: the system is designed for one event per deployment. Multi-event support would require a sheet/event selector (see `PRD.md` → *Future Features*).
- **Scale**: appropriate for roughly hundreds to low thousands of registrations, since it relies on a full-sheet scan (`getDataRange().getValues()`) with no indexing.

See `rules.md` for the full list of documented conventions and limitations.

## Documentation

- `PRD.md` — product requirements and scope
- `architecture.md` — system architecture and data flow
- `database.md` — Sheet schema
- `design.md` — UI/design notes
- `phases.md` — build roadmap
