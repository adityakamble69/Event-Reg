# PRD.md — Project Requirements Document

## Project Name
**EventReg** — College Event Registration System

## Project Overview
A lightweight web-based registration system for college fests, hackathons, and tech events. Built with HTML/CSS/JS on the frontend and Google Apps Script (GAS) on the backend, using Google Sheets as the database. Students register through a public form, receive an automated confirmation email with a QR code, and organizers check them in at the venue by scanning that QR code.

## Problem Statement
Manual event registration (paper forms, Google Forms with no automation, WhatsApp lists) leads to duplicate entries, no proper attendee tracking, slow check-in queues, and no easy way to verify who actually showed up. Organizers need a zero-cost, easy-to-deploy system that handles registration, confirmation, and check-in end to end.

## Goal
Build a registration system that:
- Lets students register for an event in under a minute
- Auto-sends a confirmation email with a unique QR code
- Lets organizers scan the QR code at the venue for instant check-in
- Gives organizers a live dashboard of registrations and attendance

## Target Users
- College students registering for fests/hackathons/workshops
- Event organizers / core team managing the event
- Volunteers at the entry desk doing check-in

## User Roles
| Role | Description |
|---|---|
| Participant | Registers via public form, receives confirmation email |
| Organizer/Admin | Views dashboard, exports data, manages event details |
| Volunteer | Uses check-in page to scan/verify QR codes at entry |

## Core Features
1. Public registration form (name, email, phone, college, event track/category)
2. Duplicate email/phone check before allowing registration
3. Auto-generated unique registration ID per entry
4. Auto-confirmation email with embedded QR code (registration ID encoded)
5. Admin dashboard — view all registrations, search/filter, export CSV
6. Check-in page — scan QR (camera) or manually enter registration ID, mark attendance
7. Live stats: total registered vs total checked-in

## Functional Requirements
- FR1: Form validates required fields client-side before submission
- FR2: Backend rejects duplicate email/phone for the same event
- FR3: Every successful registration gets a unique ID (e.g. `EVT-XXXXXX`)
- FR4: Confirmation email sent within a few seconds of registration, containing QR code image
- FR5: Check-in page decodes QR / accepts manual ID entry and marks `checkedIn = true` with timestamp
- FR6: Dashboard reads live data from the Sheet and displays it in a table
- FR7: Admin can export registrations as CSV

## Non-Functional Requirements
- No cost — must run entirely on free tier (Google Apps Script + Sheets)
- Should handle at least 500–1000 registrations without performance issues
- Mobile-responsive registration form (most students will register from phone)
- Check-in page must work reliably on a laptop/tablet at the entry desk, ideally with camera QR scanning

## Pages / Screens
1. **Registration Page** (`index.html`) — public form
2. **Confirmation Page** (`success.html` or inline state) — shows registration ID + "check your email"
3. **Admin Dashboard** (`admin.html`) — table of registrations, search, export, stats
4. **Check-in Page** (`checkin.html`) — QR scanner + manual entry, live checked-in count

## User Journeys
**Participant:**
Visits form → fills details → submits → sees confirmation on screen → receives email with QR code → arrives at venue → shows QR code (on phone or printed) → gets scanned → checked in.

**Organizer:**
Opens admin dashboard → monitors registrations in real time → exports list before the event → on event day opens check-in page → scans attendees as they arrive → tracks live attendance count.

## Authentication Requirements
- Registration page: no auth (public)
- Admin dashboard & check-in page: simple password gate (a single shared admin password checked client-side against a value stored in Script Properties, verified via a GAS endpoint) — sufficient for a single-event/hackathon scope. Documented as a known limitation, not full user auth.

## Admin Requirements
- View all registrations in a sortable/searchable table
- See total registered / total checked-in counts
- Export data to CSV
- Manually mark/unmark a check-in (in case of scanner issues)

## API Requirements (via Google Apps Script Web App)
- `POST` action `register` — create a new registration
- `GET` action `list` — fetch all registrations (admin only, password-protected)
- `POST` action `checkin` — mark a registration ID as checked in
- `POST` action `verifyAdmin` — validate admin password

## Notifications
- Confirmation email to participant on successful registration (via `MailApp`/`GmailApp`), including QR code image and event details

## Integrations
- Google Sheets (database)
- Google Apps Script (backend/API)
- Gmail (via MailApp, for confirmation emails)
- A client-side QR code generation library (for embedding QR in email) and a QR scanning library (for check-in page camera scanning)

## Future Features (out of current scope but noted)
- Multiple events managed from one system (multi-sheet/event selector)
- Payment integration for paid events
- SMS notifications
- Role-based multi-admin login

## Out-of-Scope Features
- Full user account system with login/signup for participants
- Payment processing
- Multi-event support in v1 (system is built for a single event; extending to multiple events is a documented future feature)
