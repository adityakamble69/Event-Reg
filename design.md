# design.md — Design System

## Design Philosophy
Dark glassmorphism with neon accent gradients — cinematic, modern, hackathon-appropriate. Frosted-glass cards floating on a deep dark background, glowing accent colors for interactive elements. Should feel premium, not like a default Google Form.

## Color Palette
```css
:root {
  --bg-primary: #0a0a12;
  --bg-secondary: #12121e;
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.12);

  --accent-primary: #7c3aed;   /* violet */
  --accent-secondary: #06b6d4; /* cyan */
  --accent-gradient: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);

  --success: #22c55e;
  --error: #ef4444;
  --warning: #f59e0b;

  --text-primary: #f4f4f6;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
}
```

## Typography
- Font family: `"Space Grotesk", "Inter", sans-serif` for headings; `"Inter", sans-serif` for body — avoid default system fonts for headings to keep the cinematic feel
- Heading sizes: H1 `2.5rem` / H2 `1.75rem` / H3 `1.25rem`, weight 600–700
- Body text: `1rem`, weight 400, line-height 1.6
- Small/meta text: `0.85rem`, `--text-secondary`

## Spacing System
Base unit `4px`. Use multiples: `8px, 16px, 24px, 32px, 48px, 64px` for margins/padding/gaps.

## Border Radius
- Cards: `16px`
- Buttons/inputs: `10px`
- Badges/pills: `999px` (full round)

## Shadows
```css
--shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.4);
--shadow-glow: 0 0 24px rgba(124, 58, 237, 0.35);
```
Glass cards use `backdrop-filter: blur(16px)` + `--shadow-glass`. Primary buttons get `--shadow-glow` on hover.

## Buttons
- Primary: `--accent-gradient` background, white text, `--shadow-glow` on hover, subtle scale(1.02) transition
- Secondary: transparent with `--glass-border`, fills with `--glass-bg` on hover
- Disabled: 40% opacity, no hover effects

## Cards
Glassmorphism: `background: var(--glass-bg); border: 1px solid var(--glass-border); backdrop-filter: blur(16px); border-radius: 16px;` — used for the registration form container, dashboard stat cards, and check-in result card.

## Inputs / Forms
- Dark translucent background matching glass style, `1px solid var(--glass-border)`, glowing `--accent-primary` border on focus
- Labels above inputs, `--text-secondary`, `0.85rem`
- Inline validation messages in `--error` below the field

## Navbar
Minimal top bar — event name/logo left, nothing else needed for a single-purpose registration site. Sticky, glass background on scroll.

## Tables (Admin Dashboard)
Dark rows with subtle alternating glass tint, sticky header row, checked-in status shown as a colored pill (`--success` green / `--text-muted` gray for pending) rather than plain text.

## Modals
Not required for v1 (no destructive actions needing confirmation beyond simple states) — check-in result can be an inline card/toast instead of a modal.

## Badges
Pill-shaped, used for: track/category tag on registration list, checked-in status. Background = 20% opacity of the relevant status color, text = full-opacity status color.

## Icons
Use a lightweight icon set via CDN (e.g. Lucide icons as inline SVG) — checkmark for success, X for error, QR icon on check-in page, download icon for CSV export.

## Loading States
Skeleton pulse (subtle shimmer on glass cards) while dashboard data loads; spinner (thin gradient-colored ring) on form submit button.

## Empty States
Centered glass card with a muted icon + short message: "No registrations yet" / "No results match your search" — never a blank white/dark void.

## Error States
Red-tinted glass card or inline red text with an X icon; never a raw browser `alert()`.

## Hover States
All interactive elements (buttons, table rows, cards) get a subtle lift (`translateY(-2px)`) + glow/brighten transition, `200ms ease`.

## Animations
- Page load: fade-in + slight upward slide (`opacity 0→1`, `translateY(12px→0)`) on main content, `400ms`
- Form submit success: checkmark icon scale-in animation
- Scroll-based parallax on the registration page hero section (subtle, not distracting) — consistent with your usual cinematic site style, but kept restrained here since this is a functional form, not a portfolio piece
- Smooth transitions between form states (idle → submitting → success/error)

## Responsive Breakpoints
- Mobile: `< 600px` — single column, full-width cards
- Tablet: `600px–1024px`
- Desktop: `> 1024px` — dashboard table gets full width, forms stay centered max-width `480px`

## Mobile Design Rules
- Registration form must be fully usable one-handed on a phone
- Check-in page camera view sized appropriately for tablet/laptop use at the entry desk (primary target device, not phone)
- Touch targets minimum `44px` height on all buttons/inputs
