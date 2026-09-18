# rules.md — Development Rules

## Coding Standards
**DO**
- Use `const`/`let`, never `var`
- Use async/await style with `fetch` wrapped in try/catch on the frontend
- Keep each `.gs` file focused on one responsibility (see architecture.md file structure)
- Comment every GAS function with what it expects in `e.parameter` / `e.postData`

**DON'T**
- Don't put business logic inline in `doGet`/`doPost` — keep them as thin routers only
- Don't mix admin and public logic in the same function

## Naming Conventions
- Files: `camelCase.js` / `PascalCase.gs` for backend files, `kebab-case.html` for pages
- GAS functions: `verbNoun` style — `registerParticipant`, `checkInParticipant`, `listRegistrations`
- Sheet column headers: exact `camelCase` matching the schema in `database.md` — never rename a header without updating `database.md`

## Folder Conventions
Follow the exact structure defined in `architecture.md`. Do not create new top-level folders without updating `architecture.md` first.

## Component Conventions
N/A (no component framework) — each HTML page owns one JS file; don't let `register.js` logic leak into `admin.js` or vice versa.

## API Conventions
- Every GAS response is JSON: `{ success: true/false, data, message }`
- Every action name matches exactly what's documented in `architecture.md`'s API table — don't invent new actions without documenting them first
- Frontend always checks `response.success` before touching `response.data`

## Database Conventions
- Never manually reorder or delete columns in the `Registrations` tab without updating `database.md` and every `.gs` function that reads by column index
- Prefer reading rows as objects (header-mapped) over hardcoded column indices where practical, to reduce breakage risk

## Security Rules
- Admin password is stored only as a value in the `Config` tab (or Script Properties), never hardcoded in `.gs` files committed anywhere public
- Never log participant emails/phones to the Apps Script execution log in production
- QR codes encode only the `regId`, never email/phone/personal data

## Authentication Rules
- Public registration form: no auth
- Admin/check-in pages: password gate via `verifyAdmin`; session flag kept in `sessionStorage` only (clears on tab close), never `localStorage`

## Environment Variable Rules
- GAS Web App URL lives in `frontend/js/config.js` as a single constant — never duplicated across files
- Admin password lives in the Sheet's `Config` tab — never hardcoded in `.gs` or `.js` files

## Error Handling Rules
- Every `fetch` call handles both network failure and `success: false` responses with a user-visible message
- GAS functions wrap Sheet operations in try/catch and return `{success:false, message}` on failure instead of throwing raw errors to the client

## Validation Rules
- Frontend: required-field + email format + phone format validation before submit
- Backend: re-validate required fields and duplicate check server-side — never trust client validation alone

## Responsive Design Rules
- Registration form must work cleanly on mobile (majority of participants will register from phone) — single-column layout under 600px
- Admin dashboard table should horizontally scroll on small screens rather than break layout

## Accessibility Rules
- All form inputs have associated `<label>` elements
- Sufficient color contrast per `design.md` tokens
- Check-in success/failure states communicated with both color AND text/icon (not color alone)

## Git/GitHub Rules
- Commit frontend and backend (`.gs` files exported as text) together in one repo for version history, even though `.gs` files are deployed separately via script.google.com
- Never commit the actual admin password or live Sheet ID in committed config — use a placeholder and a local `config.local.js` if needed

## Dependency Rules
- Only two external dependencies allowed: `html5-qrcode` (CDN) for scanning, and the QR-image generation endpoint used in emails — don't add frameworks/build tools that break the zero-build-step goal

## Performance Rules
- Cache the `list` response client-side during a dashboard session; don't re-fetch on every keystroke of a search box — filter the already-fetched array in JS

## Testing Rules
- Manually test full flow before each event: register → receive email → scan QR → confirm check-in reflected on dashboard
- Test duplicate-registration rejection and invalid-QR/check-in-twice handling explicitly
