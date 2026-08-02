## Goal
Polish the user experience: professional Machines page, a full Statement section in Profile, a leaner Wallet, a configurable welcome message on the home screen, and scoped announcements.

## 1. Machines page (`src/pages/user/Machines.tsx`)
- Remove the balance chip in the header (balance already shows in the app header).
- Replace the plain header with a premium hero: gradient/glass banner with title, one-line value proposition, and 3 quick stats (Active investments, Total invested, Expected returns) computed from the user's investments.
- Upgrade machine cards: larger media area, series ribbon, clearer price / duration / reward metric strip, ROI pill, availability meter ("X of Y sold") when `max_total > 0`, and a trust footnote ("Rewards are credited automatically at maturity").
- My Investments tab: cleaner running cards with progress ring/bar, countdown, maturity date and payout summary; grouped "Completed" history list.
- Keep purchase dialog logic unchanged (insufficient-balance hint still links to Wallet).

## 2. Home screen (`src/pages/user/Dashboard.tsx`)
- Remove the bottom "Withdraw" and "Invite Friends" quick-action buttons (both are still reachable from nav/task tiles).
- Add a professional welcome card at the top of the home screen rendering the admin-configured `welcome_message`, falling back to a polished default that highlights Investment Machines. Only rendered on the dashboard.

## 3. Welcome message in Admin (`src/pages/admin/AdminSettings.tsx`)
- The `welcome_message` setting already exists in Admin Settings but is not shown anywhere in the app; it will now drive the dashboard card. Improve the field with a machines-focused placeholder/default text and helper copy noting it appears on the user home screen.

## 4. Announcement scoping (`src/components/layout/UserLayout.tsx`)
- Add an optional `showAnnouncement` prop (default `false`); only the Dashboard passes `true`, so the announcement banner no longer appears on Profile, Wallet, Machines, etc.

## 5. Wallet = recent transactions only (`src/pages/user/Wallet.tsx`)
- Limit the list to the 5 most recent transactions, retitle the card "Recent Transactions", drop the All/In/Out filter tabs and date grouping there, and add a "View full statement" link to the new Statement page.

## 6. New Statement section (Profile)
- New page `src/pages/user/Statement.tsx` at route `/statement`, added to `App.tsx` as a protected route.
- Linked from Profile under the Account group ("Statement").
- Shows every transaction (paged/infinite, newest first) with: date & time, description, mapped category label (Deposit, Machine Maturity, Machine Purchase, Withdrawal, Task Earning, Referral, Gift Code, Achievement, Admin Top-up, Deduction), amount in/out, **balance before** (derived as `balance_after - amount`) and **balance after**.
- Filters by type and date range (All / Today / This week / This month), plus totals in/out summary header, CSV-style empty and loading states.

## Technical notes
- No database changes; balance-before is derived from existing `transactions.balance_after` and `amount`.
- Transaction category mapping is centralised in a small helper reused by Wallet and Statement.
- All styling uses existing semantic tokens (`glass-card`, `gradient-primary`, `text-success`, etc.).
