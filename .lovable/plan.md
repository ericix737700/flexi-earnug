## 1. Real-time wallet updates
`transactions`, `withdrawals`, `deposits`, `profiles` are already in the realtime publication.
- Extend the Wallet realtime channel to also listen to `deposits`, and invalidate the `statement` query key as well so both lists refresh instantly.
- Add the same subscription to the Statement page so an open statement updates live.
- On any incoming event, also refresh the header balance (already via `refreshProfile`), plus a subtle "new activity" highlight animation on the newest row.

## 2. Statement page — betPawa style with expandable rows
Rewrite `src/pages/user/Statement.tsx` rows to match the screenshot:
- Each row is a collapsible card: chevron + title (mapped label, e.g. "Deposit · MTN", "Machine Maturity") on the left, signed amount in green/red on the right; second line shows time + date (`8:18 pm, Fri 31/07/2026`) and `Balance: UGX x`.
- Tapping the chevron expands to reveal details: Transaction ID (copyable via a copy button + toast), full description, type badge, balance before, balance after, and date/time in full.
- Keep the period/type filters and totals summary, keep "Load more".

## 3. Profile page — account-menu style from screenshot
Restyle `src/pages/user/Profile.tsx`:
- Top wallet card: centered "Wallet Balance", large UGX amount, network badge + phone under it, then two side-by-side buttons — outlined WITHDRAW and filled DEPOSIT.
- Grouped menu lists ("My Account", "General") with icon + label rows, chevrons, and inline toggle rows (theme, push) — same content as today, just the cleaner grouped card styling.
- Log Out as a standalone destructive row at the bottom.

## 4. Navigation redesign (`MobileNav.tsx`)
- New order: Home · Airtime · **Wallet (center)** · Data · Profile, with Tasks/Machines/Referrals kept reachable (Machines stays in the row when enabled; Tasks and Referrals move to dashboard tiles/profile links which already exist).
- Center Wallet becomes a large raised circular button (gradient primary, glow, elevated above the bar) — the focal action.
- Airtime (Smartphone icon) and Data (Wifi/Signal icon) render as "Coming soon": muted style, small "Soon" chip, tap shows a toast instead of navigating.
- Nav bar restyled: deeper blur/glass surface, softer top radius, refined active pill and label treatment; background gradient of the app shell subtly darkened behind the bar for contrast.

## Technical notes
- No database or edge-function changes; realtime is already enabled on the needed tables.
- Transaction ID copy uses `navigator.clipboard` + sonner toast.
- All styling via existing semantic tokens (`glass-card`, `gradient-primary`, `text-success`, `text-destructive`).
