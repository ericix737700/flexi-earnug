# Platform Upgrade: Landing, Payments UX, Notifications, Admin Tools

## 1. Landing page in the MarzPay style
Rebuild `Index.tsx` as alternating full-width sections (deep brand-gradient bands alternating with light bands), each with an eyebrow label, big headline, short paragraph, green check bullet list, and a single strong CTA:
- Hero: status pill ("Live in Uganda"), two-tone headline, primary CTA + secondary text links, stat strip (users, paid out, tasks, machines).
- Sections: Earn from tasks, Investment Machines, Airtime & Data, Referrals, Advertising, Transparent pricing, Trust/security, FAQ teaser, "Ready to get started?" CTA band.
- Footer moves out of the page end into a mid-page position per request: page order becomes hero → core sections → **footer band** → About section → final CTA band.
- Expand `PublicFooter` into the MarzPay-style multi-column footer (brand blurb, Product, Legal, Contact) plus a new About section block.

## 2. Push notifications fix (root cause confirmed)
`push_subscriptions` has no unique constraint on `endpoint`, but the client calls `upsert(..., { onConflict: "endpoint" })` — Postgres rejects it, so every "Enable" attempt fails.
- Migration: add `UNIQUE (endpoint)` on `push_subscriptions`.
- Harden `usePushNotifications` to surface the real error message instead of a generic toast, and verify the client VAPID public key matches the server `VAPID_PUBLIC_KEY` secret (mismatch is the second known failure mode; if they differ, fetch the public key from a small endpoint instead of hardcoding).

## 3. Notification preferences
New `notification_preferences` table (user-owned, RLS + grants) with toggles: wallet deductions, reward credits, investment maturity, promotions/news. Settings UI in Profile; `send-push` and in-app notification writers check the preference before sending.

## 4. Airtime & Data: pending → completed UX
- Purchase returns a reference; show a status card with stages (Submitted → Processing → Delivered) and an animated progress bar.
- Poll purchase status every 3s up to ~2 min (Airtel bundles are commonly async), with Retry on timeout.
- On failure: clear message plus automatic balance refund confirmation and a refund transaction row.
- Restyle the page: network selector cards with MTN/Airtel colors, Airtime/Data tabs, bundle cards grouped by validity with price, validity and "Buy" action, recipient verification inline.

## 5. Withdrawal fees
- New settings: `withdrawal_fee_enabled`, `withdrawal_fee_percent`, `withdrawal_fee_min`, `withdrawal_fee_note`, editable in Admin Settings.
- Wallet withdraw dialog shows a breakdown: amount, fee (%), net received, plus the configurable explanation of why the fee exists (telecom/processing costs, platform upkeep).
- `marzpay-send` / withdrawal creation deducts the fee server-side and records it in the transaction description.

## 6. Account IDs
Add `account_id` to `profiles` (short unique code, e.g. `FE-8KD31M`), backfilled for existing users and generated for new ones. Shown on Profile (copyable) and searchable in Admin.

## 7. Admin transaction explorer
New `/admin/transactions` page: search by transaction ID, MarzPay reference, phone number, account ID, or name; filters by type, status, and date range; row expansion showing full detail (user, balances before/after, reference, timestamps) and CSV export.

## 8. Referral link preview
Referral link carries the code; on Register, resolve the code and show a card with the referrer's name and account ID before signup ("You were invited by …"). Uses a security-definer lookup returning only display name + account id.

## 9. News & Highlights in Profile
New `/news` section reachable from Profile showing platform news, top earners leaderboard, active promotions, and recently unlocked achievements. Admin-managed news items in a new `news_items` table.

## 10. Download app in Profile
Profile shows an "Install / Download App" row only on the website (hidden when running in standalone/installed PWA mode), wired to the existing install prompt with an APK link setting for Android.

## Technical notes
- Migrations: unique endpoint constraint, `notification_preferences`, `profiles.account_id` + backfill, `news_items`, new `platform_settings` rows — each with GRANTs and RLS policies.
- Edge functions touched: `send-push` (preferences), `marzpay-airtime-purchase` (status/refund), new `marzpay-airtime-status`, `marzpay-send` (fee).
- All new UI uses existing glass-card/design tokens; no hardcoded colors.

## Suggested order
Push fix + notification preferences → Airtime status UX + styling → withdrawal fees → account IDs + admin transaction explorer → referral preview → news section + download row → landing page redesign.
