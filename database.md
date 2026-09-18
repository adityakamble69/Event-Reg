# database.md — Database Design

## Database Technology
Google Sheets (accessed via the SpreadsheetApp service in Google Apps Script).

## Database Name
`EventReg_DB` (a single Google Sheet file with multiple tabs)

## Tabs (Tables)

### Tab: `Registrations`
```
Registrations
 ├── regId            (string, unique, e.g. "EVT-A1B2C3")   [Primary Key]
 ├── name              (string, required)
 ├── email              (string, required, unique per event)
 ├── phone               (string, required, unique per event)
 ├── college              (string, required)
 ├── track/category        (string, e.g. "Hackathon", "Workshop")
 ├── registeredAt            (datetime, auto — set on insert)
 ├── checkedIn                (boolean, default FALSE)
 ├── checkinTime                (datetime, nullable — set on check-in)
 └── emailSent                    (boolean, default FALSE — tracks confirmation email status)
```

**Column order in the actual Sheet (Row 1 = headers):**
`regId | name | email | phone | college | track | registeredAt | checkedIn | checkinTime | emailSent`

### Tab: `Config`
```
Config
 ├── key    (string)   e.g. "eventName", "adminPasswordHash", "maxCapacity", "eventDate"
 └── value  (string)
```
Used so event details / admin password aren't hardcoded in the `.gs` files — organizers edit this tab directly to reconfigure for a new event.

## Data Types
All values are stored as Sheet cell types: strings for text fields, native Sheet date-time for timestamps, `TRUE`/`FALSE` for booleans (Apps Script reads these as JS booleans automatically).

## Primary Keys
`regId` is the unique identifier for a registration — generated server-side (see Utils: `generateRegId()`), format `EVT-` + 6 random alphanumeric characters, checked for collision against existing rows before use.

## Foreign Keys
None — single-table design (plus a key-value `Config` tab). No relational joins needed at this scale.

## Relationships
N/A — flat structure by design, appropriate for a single-event registration list.

## Constraints
- `email` + `phone` combination checked for existing entry before insert (duplicate prevention) — implemented in application logic (`checkDuplicate()` in `Registration.gs`), since Sheets has no native unique constraint.
- `regId` must be unique — checked/regenerated on collision (extremely unlikely with 6-char alphanumeric, but checked anyway).

## Indexes
Not applicable — Sheets has no indexing; at expected scale (hundreds–low thousands of rows) a full-sheet linear scan via `getDataRange().getValues()` is fast enough (well under a second).

## Unique Fields
`regId`, and the `(email, phone)` pair (enforced in code, not natively).

## Default Values
- `checkedIn` → `FALSE` on insert
- `emailSent` → `FALSE` until email send succeeds, then set `TRUE`
- `registeredAt` → `new Date()` at insert time

## Required / Optional Fields
Required: `name`, `email`, `phone`, `college`, `track`
Optional: none at registration; `checkinTime` is empty until check-in occurs.

## Entity Relationships
Single entity (`Registration`) — no related entities in v1.

## Important Queries (as GAS operations, not SQL)
- **Find by regId** (for check-in): loop `getDataRange().getValues()`, match column 0 — or maintain a `regId → rowIndex` map built once per request for O(1) lookup.
- **Find by email/phone** (duplicate check on registration): same linear scan pattern before insert.
- **List all** (admin dashboard): `getDataRange().getValues()`, convert rows to array of objects, return as JSON.
- **Count checked-in vs total**: derived client-side from the `list` response, or computed server-side and included in the response for efficiency.

## Seed / Dummy Data Requirements
For development/testing, seed 5–10 sample rows with realistic names/emails/colleges and a mix of `checkedIn = TRUE/FALSE` so the admin dashboard and check-in flow can be tested without live registrations.

## Database Security Considerations
- The Sheet itself is never shared publicly — only the GAS Web App has access to it (runs as the script owner, "Execute as: Me").
- Admin/check-in actions require the password check (`verifyAdmin`) before the frontend will call `list` or `checkin`; **note this is UI-level gating**, not the GAS endpoint itself restricting access — documented in `rules.md` as a known limitation for future hardening (e.g. checking a session token server-side on every request) if this project scales beyond a single trusted-team event.
- No sensitive data (passwords, payment info) stored in the Registrations tab.
