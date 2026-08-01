# Investment Machines

Adds a self-contained investment module: users buy a "machine" with wallet balance, it runs for a set duration, then the reward is auto-credited. Admin fully controls machines, investments, payouts, and feature availability. Nothing in the existing task/wallet/ads flow changes.

## Navigation
- Bottom nav gets a 6th item **Machines** (`/machines`, Cpu icon), sitting between Tasks and Wallet. Item is hidden when the feature flag is off, and shows a **NEW** dot while the badge window is active.
- Admin sidebar gets **Machines** (management) and **Investments** (monitoring) entries.

## Database (new tables)
- `investment_machines` — name, series, description, image_url, price, reward_amount, duration_hours, status (`active` | `coming_soon` | `sold_out` | `disabled`), max_per_user, max_total, purchases_count, sort_order, is_visible, sort/timestamps.
- `user_investments` — user_id, machine_id, amount_paid, reward_amount, status (`active` | `completed` | `cancelled` | `refunded`), starts_at, matures_at, completed_at, timestamps.
- `investment_audit_log` — actor, action, investment/machine id, details jsonb.

Access rules in plain English:
- Anyone signed in can see visible machines; only admins can create, edit, or delete them.
- Users can see only their own investments; admins can see all.
- Users cannot insert or modify investments directly — purchases go through the server so balance and limits are enforced.
- Audit log is admin-read only, written by the server.

A `machines` storage bucket (public) holds machine images.

## Server logic (edge functions)
1. `invest-purchase` — validates auth, feature flag on, machine active/visible, not sold out, per-user and total limits, sufficient balance. Then atomically: deducts balance, writes a `transactions` row (`investment`, negative), creates `user_investments` with `matures_at = now() + duration`, increments purchases_count, logs audit, sends notification + push.
2. `invest-mature` — scheduled via cron every 5 minutes. Skips when admin has paused reward processing. For every active investment past `matures_at`: credits reward to balance, writes a `transactions` row, marks completed, notifies user (in-app + push), logs audit. Idempotent per investment.
3. `invest-admin-action` — admin-only: cancel + refund, force-complete (pay now), adjust reward on an active investment, all audit-logged. Timers (`starts_at`/`matures_at`) are immutable — DB rule blocks changing them on active rows.

All amounts and durations are computed server-side; the client only sends a machine id.

## User page `/machines`
- Card grid: image, name, series badge, description, price, duration, estimated reward, ROI %, status pill. Disabled/sold-out/coming-soon cards are visually muted and non-clickable.
- Purchase dialog with a confirmation summary (machine, amount, duration, reward, expected completion date), balance check and insufficient-funds link to deposit.
- **My Investments** tab: live countdown per active investment with progress bar, plus completed history. Realtime subscription so a matured reward appears instantly.
- If feature flag is `coming_soon`, the page renders a teaser state instead of the grid.

## Admin
- `/admin/machines` — table + create/edit sheet with every field (name, series, description, image upload, price, reward, duration, max per user, max total, sort order, visibility, status). Row actions: enable/disable, mark coming soon, mark sold out, duplicate, delete.
- `/admin/investments` — stats cards (total invested, total rewards paid, active/completed/cancelled counts), search by user, filter by status/machine, per-row actions (complete now, cancel & refund, adjust reward), and a global **Pause / Resume reward processing** switch.
- Announcement composer reuses the existing notifications + push infrastructure to notify users about new machines/plans.

## Feature management
Stored in `platform_settings`:
- `feature_machines_status` — `coming_soon` (default) | `active` | `disabled`
- `feature_machines_activated_at`, `feature_machines_new_badge_days` (default 7)

Toggled from Admin → Settings. On activation the server sends an in-app notification + push broadcast and creates an announcement; the NEW badge auto-expires once the configured days elapse.

## Technical notes
- Balance mutation happens only in security-definer database functions called by edge functions, so RLS-bypassing client writes are impossible.
- Cron scheduling uses `pg_cron` + `pg_net` against the `invest-mature` function.
- Transaction types added: `investment` (debit) and `investment_reward` (credit) — both surface in the existing wallet history filters automatically.
