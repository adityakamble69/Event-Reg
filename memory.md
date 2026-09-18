# memory.md — Project Memory / Current State

## Current Phase
Phase 1 — Project Setup (not yet started)

## Current Task
Create Google Sheet (`Registrations` + `Config` tabs) and bind the Apps Script project.

## Completed
- [x] PRD.md
- [x] architecture.md
- [x] database.md
- [x] rules.md
- [x] phases.md
- [x] design.md

## Completed Features
(none — documentation phase only so far)

## Completed Files
(none — code not started)

## Files Currently Being Modified
(none)

## Pending Tasks
- [ ] Phase 1: Sheet + Apps Script project setup
- [ ] Phase 2: Registration form UI
- [ ] Phase 3: Registration backend logic
- [ ] Phase 4: Email + QR generation
- [ ] Phase 5: Check-in flow
- [ ] Phase 6: Admin dashboard
- [ ] Phase 7: Integration & polish
- [ ] Phase 8: Testing
- [ ] Phase 9: Deployment
- [ ] Phase 10: Post-event wrap-up

## Known Bugs
(none yet — no code written)

## Current Errors
(none)

## Important Decisions
- Vanilla HTML/CSS/JS + GAS chosen over a framework — zero build step, fast to deploy for event timelines
- Google Sheets as DB — free, organizer-editable, sufficient for expected scale (hundreds–low thousands of registrations)
- Simple session-based admin password gate instead of full auth — documented as an intentional v1 limitation
- QR encodes only `regId` — no personal data in the code itself

## Recent Changes
- Initial documentation set created (PRD, architecture, database, rules, phases, design, memory)

## Next Task
Begin Phase 1: create the Sheet with the exact schema from `database.md`, then scaffold the empty `.gs` and frontend files.

## Deployment Status
Not deployed. No Web App URL yet.
