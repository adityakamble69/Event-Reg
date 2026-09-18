# phases.md — Development Roadmap

## Phase 1 — Project Setup
**Objective:** Get the base Sheet, Apps Script project, and file skeletons ready.
- [ ] Create Google Sheet with `Registrations` and `Config` tabs (headers per `database.md`)
- [ ] Create Apps Script project bound to the Sheet
- [ ] Create empty `.gs` files: `Code.gs`, `Registration.gs`, `Checkin.gs`, `Admin.gs`, `Email.gs`, `Utils.gs`
- [ ] Create frontend folder structure with empty `index.html`, `admin.html`, `checkin.html`, `style.css`, and JS files
**Files/modules:** whole `frontend/` and `backend/` skeleton
**Dependencies:** none
**Expected result:** empty but correctly structured project
**Completion criteria:** Sheet exists with correct headers; Apps Script project deploys a "hello world" `doGet` successfully

## Phase 2 — UI Foundation
**Objective:** Build the static registration form UI with design system applied.
- [ ] Build `index.html` structure + `style.css` design tokens (per `design.md`)
- [ ] Client-side field validation in `register.js` (no backend call yet)
- [ ] Responsive layout tested on mobile widths
**Files/modules:** `index.html`, `css/style.css`, `js/register.js`
**Dependencies:** Phase 1
**Expected result:** A fully styled, validating form that doesn't yet submit anywhere
**Completion criteria:** Form looks correct and validates on both desktop and mobile

## Phase 3 — Backend Core (Registration)
**Objective:** Implement registration logic end-to-end.
- [ ] `Utils.gs`: `generateRegId()`, sheet helper functions, JSON response helper
- [ ] `Registration.gs`: `registerParticipant(data)`, `checkDuplicate(email, phone)`
- [ ] `Code.gs`: `doPost` routes `action=register` to `registerParticipant`
- [ ] Connect `register.js` to the deployed Web App URL via `fetch`
**Files/modules:** `Utils.gs`, `Registration.gs`, `Code.gs`, `js/config.js`, `js/register.js`
**Dependencies:** Phase 1, Phase 2
**Expected result:** Submitting the form creates a row in the Sheet with a generated `regId`
**Completion criteria:** Duplicate email/phone correctly rejected; valid submission creates a row and returns `regId` to the UI

## Phase 4 — Email + QR
**Objective:** Send confirmation email with embedded QR code on successful registration.
- [ ] `Email.gs`: `sendConfirmationEmail(regData)` — builds HTML email with QR image (URL-based QR generation embedding the `regId`)
- [ ] Wire into `registerParticipant` after successful insert
- [ ] Update `emailSent` column on success
**Files/modules:** `Email.gs`, `Registration.gs`
**Dependencies:** Phase 3
**Expected result:** Registering triggers a real email with a scannable QR code
**Completion criteria:** Email arrives within seconds; QR code, when scanned, decodes to the correct `regId`

## Phase 5 — Check-in Flow
**Objective:** Build the check-in page with camera scanning + manual entry.
- [ ] `Checkin.gs`: `checkInParticipant(regId)` — validates ID, sets `checkedIn`/`checkinTime`
- [ ] `Code.gs`: route `action=checkin`
- [ ] `checkin.html` + `checkin.js`: integrate `html5-qrcode` for camera scan, plus manual ID input fallback
- [ ] Handle states: valid check-in / already checked in / invalid ID
**Files/modules:** `Checkin.gs`, `Code.gs`, `checkin.html`, `js/checkin.js`
**Dependencies:** Phase 3
**Expected result:** Scanning or entering a valid `regId` marks attendance correctly
**Completion criteria:** All three states (success/duplicate/invalid) tested and correctly displayed

## Phase 6 — Admin Dashboard
**Objective:** Build the organizer-facing dashboard.
- [ ] `Admin.gs`: `verifyAdminPassword(password)`, `listRegistrations()`
- [ ] `Code.gs`: route `action=verifyAdmin`, `action=list`
- [ ] `admin.html` + `js/admin.js`: password gate, table render, search/filter (client-side), stats (total/checked-in), CSV export
**Files/modules:** `Admin.gs`, `Code.gs`, `admin.html`, `js/admin.js`
**Dependencies:** Phase 3, Phase 5
**Expected result:** Organizers can view, search, and export all registration data live
**Completion criteria:** Dashboard reflects Sheet data accurately, including check-in status; CSV export matches on-screen data

## Phase 7 — Integration & Polish
**Objective:** Tie all pieces together and polish UX.
- [ ] Loading states / spinners on all fetch calls
- [ ] Error messages styled per `design.md`
- [ ] Empty states (no registrations yet, no search results)
- [ ] Cross-check all pages against `design.md` for visual consistency
**Files/modules:** all frontend files
**Dependencies:** Phases 2–6
**Expected result:** A cohesive, polished product ready for real use
**Completion criteria:** No unstyled/broken states remain in any page

## Phase 8 — Testing
**Objective:** Full end-to-end test pass before going live.
- [ ] Test full participant journey on a real phone
- [ ] Test duplicate registration rejection
- [ ] Test check-in twice / invalid QR handling
- [ ] Load-test with ~50 seeded dummy rows for dashboard performance
**Dependencies:** Phase 7
**Expected result:** Confidence the system handles real event-day conditions
**Completion criteria:** All test cases in `rules.md` Testing Rules pass

## Phase 9 — Deployment
**Objective:** Go live for the actual event.
- [ ] Deploy Apps Script Web App (new deployment, note the stable URL)
- [ ] Host frontend (GitHub Pages or equivalent static host)
- [ ] Update `Config` tab with real event name/date/admin password
- [ ] Clear dummy/seed data from `Registrations` tab
**Dependencies:** Phase 8
**Expected result:** Live system ready to accept real registrations
**Completion criteria:** Real test registration end-to-end succeeds on the deployed URLs

## Phase 10 — Post-Event
**Objective:** Wrap up after the event.
- [ ] Export final registration + attendance CSV for records
- [ ] Note any bugs/improvements in `memory.md` for the next event iteration
**Dependencies:** Phase 9 (event has occurred)
**Expected result:** Clean record of the event and a documented list of improvements for v2
