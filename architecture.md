# architecture.md — System Architecture

## Overall Architecture
Static frontend (HTML/CSS/JS) hosted anywhere (GitHub Pages / any static host) that talks to a Google Apps Script Web App over HTTPS. The GAS Web App is the entire backend — it handles requests and reads/writes to a Google Sheet acting as the database. No traditional server, no hosting cost.

```
Participant / Organizer Browser
         ↓
   HTML/CSS/JS Frontend (static)
         ↓  (fetch → JSON)
  Google Apps Script Web App (doGet / doPost)
         ↓
     Google Sheets (Database)
         ↓
   MailApp (confirmation emails)
```

## Application Flow
1. Frontend loads static HTML/CSS/JS — no server rendering.
2. All dynamic actions (register, list, check-in, admin auth) go through `fetch()` calls to the single GAS Web App URL, using a query param or POST body `action` field to route.
3. GAS `doGet(e)` / `doPost(e)` inspect `e.parameter.action` and dispatch to the matching function.
4. GAS functions read/write rows in the Sheet using the SpreadsheetApp service.
5. On successful registration, GAS generates a QR payload (registration ID), builds an email with an inline/linked QR image, and sends it via MailApp.
6. Responses are returned as JSON (`ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)`).

## User Flow
**Registration:** Form → client validation → `fetch POST action=register` → GAS checks duplicate → writes row → generates ID → sends email → returns `{success, regId}` → frontend shows confirmation.

**Check-in:** Volunteer opens check-in page → scans QR (camera lib decodes registration ID) or types ID manually → `fetch POST action=checkin` → GAS finds row by ID → sets `checkedIn=TRUE`, `checkinTime=now` → returns updated status → UI shows green "Checked in" / red "Already checked in" / "Invalid ID".

**Admin dashboard:** Password prompt → `fetch POST action=verifyAdmin` → on success, `fetch GET action=list` → renders table client-side → search/filter done in JS on the fetched array → "Export CSV" converts the same array to CSV client-side (no extra backend call needed).

## Frontend Architecture
Plain HTML/CSS/JS, no framework, no build step — keeps deployment trivial (can be opened as static files or hosted on GitHub Pages).

```
/frontend
 ├── index.html        (registration form)
 ├── admin.html         (dashboard)
 ├── checkin.html        (check-in / scanner)
 ├── css/
 │    └── style.css       (shared design tokens + page styles)
 ├── js/
 │    ├── config.js        (GAS_WEB_APP_URL constant)
 │    ├── register.js       (registration form logic)
 │    ├── admin.js          (dashboard logic)
 │    └── checkin.js        (scanner + manual check-in logic)
 └── lib/
      └── qr-scanner (via CDN script tag, e.g. html5-qrcode)
```

## Backend Architecture
Single Google Apps Script project bound to the Google Sheet, deployed as a Web App (`Execute as: Me`, `Who has access: Anyone`).

```
/backend (Apps Script project)
 ├── Code.gs           (doGet, doPost, action router)
 ├── Registration.gs    (registerParticipant, checkDuplicate)
 ├── Checkin.gs          (checkInParticipant)
 ├── Admin.gs             (listRegistrations, verifyAdminPassword)
 ├── Email.gs              (sendConfirmationEmail, QR generation)
 └── Utils.gs               (generateRegId, sheet helpers, JSON response helper)
```

## Database Architecture
Single Google Sheet, one primary tab `Registrations` (schema in `database.md`), plus a `Config` tab for event-level settings (event name, admin password hash, max capacity) so nothing is hardcoded in the script.

## API Architecture
One GAS Web App URL is the single endpoint. Routing is done by an `action` parameter:

| Action | Method | Purpose |
|---|---|---|
| `register` | POST | Create new registration |
| `checkin` | POST | Mark attendee as checked in |
| `list` | GET | Fetch all registrations (admin) |
| `verifyAdmin` | POST | Validate admin password |

All responses: `{ success: boolean, data?: ..., message?: string }`

## Authentication Flow
No participant login. Admin/volunteer pages ask for a password once (stored in `sessionStorage` after successful `verifyAdmin` call, never in localStorage/never sent as plaintext beyond that single check) — good enough for single-event, trusted-organizer-team scope. This limitation is explicitly documented in `rules.md`.

## Authorization / Role System
- Public: `register` action only
- Volunteer/Admin (password-verified session): `checkin`, `list` actions

## Data Flow
Browser ⇄ GAS Web App ⇄ Google Sheet, synchronous request/response per action. No caching layer needed at this scale (hundreds to low thousands of rows).

## External Services
- Google Apps Script (compute)
- Google Sheets (storage)
- Gmail/MailApp (email delivery)
- QR generation: a lightweight approach using a QR-generating web API (e.g. an external QR image endpoint) referenced by URL in the email, OR a client-side QR JS library if generating on the frontend at confirmation time. Documented choice: generate the QR image via URL-based QR API embedded directly in the email HTML (simplest, no extra library needed server-side).
- QR scanning on check-in page: `html5-qrcode` JS library loaded via CDN

## Third-Party Integrations
- `html5-qrcode` (CDN) — camera-based QR scanning
- QR image generation endpoint — for embedding scannable codes in emails

## Folder Structure
```
/eventreg
 ├── frontend/
 ├── backend/ (Apps Script, deployed separately via script.google.com)
 └── docs/ (this documentation set)
```

## File Structure
See Frontend/Backend architecture sections above.

## Component Structure
Not component-based (vanilla JS) — each page has its own script file scoped to that page's DOM.

## Route Structure
Static multi-page site — no client-side router needed:
- `/index.html` — registration
- `/admin.html` — dashboard
- `/checkin.html` — check-in

## API Endpoint Structure
Single endpoint, action-based routing (see API Architecture table above) — standard pattern for Apps Script Web Apps since GAS only exposes one `doGet`/`doPost` per deployment.

## Important Technical Decisions
- **No framework/build step**: keeps this deployable by pasting into GitHub Pages or any static host in minutes — appropriate for hackathon/event timelines.
- **Google Sheets as DB**: zero cost, organizers can also eyeball/edit data directly if needed.
- **Single GAS Web App with action routing**: GAS only supports one `doGet`/`doPost` entry point per deployment, so action-based dispatch is the standard and necessary pattern.
- **Session-based simple admin auth**: full auth is out of scope for a single-event tool; documented as a known limitation.
