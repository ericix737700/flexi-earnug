# Improve the Public Footer

## Goal
Replace the plain, flat footer with the approved "Gold Glassmorphism" direction, adapted to the app's green/gold theme and its light/dark modes.

## Design (from selected direction, v2 + green glow behind logo)
- Footer becomes a large rounded glass card (rounded corners, glass background, subtle border) sitting inside page padding, instead of a full-width flat strip.
- Soft green radial glow behind the logo in the brand block; a faint gold glow in the opposite corner for ambience.
- Brand block: real FlexiEarn logo + short tagline, centered on mobile, left-aligned on desktop.
- Link columns with small gold gradient headings: Platform (Home, About, FAQ, System Status), Support (Contact Us, Sign In, Create Account), Legal (Terms & Conditions, Privacy Policy).
- Bottom bar: copyright centered/left, and a pill containing "Powered by <powered_by> | v<version>" with the powered-by name in gold gradient — still fed by the admin-configurable settings, unchanged behavior.
- All existing links and admin-configurable powered-by/version values preserved; purely visual change.

## Files
- `src/components/PublicFooter.tsx` — full rewrite to the new layout.
- `src/index.css` — add one `.text-gradient-gold` utility (gold gradient text) alongside the existing `.text-gradient-primary`.

## Verification
- `bunx tsgo --noEmit` typecheck; check build log for OK.
- Playwright check of the landing page footer on mobile and desktop viewports, confirming layout, glows, and links render.
