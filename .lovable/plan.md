

## Comprehensive Improvements Plan

This plan addresses all the issues you raised: real-time status updates, admin user detail views, task upload failures, and logo upload failures.

### Root Cause of Upload Failures

Both task video uploads and logo uploads fail because **no storage buckets exist** in the database. We need to create `task-videos` and `branding` buckets.

### What We'll Build

**1. Create storage buckets (fixes upload failures)**
- Create `branding` bucket (public) for platform logo
- Create `task-videos` bucket (public) for task video uploads
- Add appropriate RLS policies for both

**2. Real-time balance/status updates for users**
- Enable Supabase Realtime on `profiles`, `deposits`, `withdrawals`, and `transactions` tables
- Subscribe to changes in the Wallet page, Dashboard, and DepositDialog so balances and statuses update automatically without manual refresh

**3. Add `last_seen` column to profiles**
- Add a `last_seen` timestamp column to the `profiles` table
- Update it on each page load via the AuthContext (whenever a user accesses the app)

**4. Enhanced Admin User Detail View**
- Add a user detail dialog/drawer in AdminUsers that shows:
  - Online status (green dot if last_seen within 5 minutes) and last seen time
  - Tasks completed by the user (count + list from `task_completions`)
  - Referral count (users referred by this user via `referred_by`)
  - Transaction history summary
  - Balance and registration status

**5. Improve Admin UI styling**
- Apply the green/gold theme to all admin pages
- Better card layouts, stat indicators, and visual hierarchy on the dashboard

### Files to modify/create

| File | Change |
|---|---|
| Migration SQL | Create buckets, add `last_seen` column, enable realtime |
| `src/contexts/AuthContext.tsx` | Update `last_seen` on auth state change |
| `src/pages/admin/AdminUsers.tsx` | Add user detail dialog with referrals, tasks, last seen |
| `src/pages/admin/AdminDashboard.tsx` | Improved UI styling |
| `src/pages/admin/AdminTasks.tsx` | Fix — buckets now exist, uploads will work |
| `src/pages/admin/AdminSettings.tsx` | Fix — branding bucket now exists |
| `src/pages/user/Wallet.tsx` | Add realtime subscription for live balance/transaction updates |
| `src/components/user/DepositDialog.tsx` | Add realtime listener for deposit status changes |
| `src/components/layout/AdminLayout.tsx` | UI polish with green/gold theme |

### Technical details

- Storage buckets created via migration with `INSERT INTO storage.buckets`
- RLS policies: authenticated users can upload to task-videos (admins only) and branding (admins only); public can read
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE` for profiles, deposits, withdrawals, transactions
- `last_seen` updated via `supabase.from('profiles').update({ last_seen: new Date() })` on each session load
- User detail panel queries `task_completions`, `profiles` (where `referred_by` matches), and `transactions` for the selected user

