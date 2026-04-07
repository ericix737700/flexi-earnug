

## Dual Login, Admin UX, Account Restrictions & Device Detection

### Summary
Unify login (phone or email), remove admin login link, add account restrictions, detect same-device multi-accounts, improve blocked/suspended dialog with support options, show loading animation after login/signup, and polish dialogs.

### Database Changes (migration)

1. **Add `device_fingerprint` column to profiles** — stores a browser fingerprint to detect multi-account usage on the same device
2. **Add `restrictions` JSONB column to profiles** — stores granular restrictions like `{ "no_transactions": true, "blocked_tasks": ["task-id-1"] }`

```sql
ALTER TABLE public.profiles ADD COLUMN device_fingerprint text;
ALTER TABLE public.profiles ADD COLUMN restrictions jsonb DEFAULT '{}'::jsonb;
```

### Plan

**1. Dual Login (phone or email + password)**
- Update `Login.tsx`: add a toggle/tab to switch between "Phone" and "Email" login modes
- Phone mode: formats as `{phone}@flexiearn.ug` (existing behavior)
- Email mode: uses the email directly for `signInWithPassword`
- Remove the "Admin Login →" link at the bottom — admin panel access is already shown in Profile page when the user has admin role

**2. Loading animation after successful login/signup**
- After successful login in `Login.tsx`, show `LoadingScreen` for ~2 seconds before navigating to dashboard
- Same in `Register.tsx` / `PayRegistration.tsx` after successful payment

**3. Blocked/Suspended dialog improvements**
- Enhance the existing blocked status screen in `Login.tsx` with the `SupportDialog` component (WhatsApp + Telegram options)
- Add the platform logo to the blocked screen
- Also check status on app load in `AuthContext.tsx` — if profile status is blocked/suspended, sign out and show a dialog

**4. Account restrictions (admin feature)**
- Add restriction controls in the user detail sheet in `AdminUsers.tsx`:
  - Toggle: "Restrict transactions" (blocks deposits/withdrawals)
  - Toggle: "Restrict tasks" (blocks task completions)
- Store in the `restrictions` JSONB column
- In user-facing pages (`Wallet.tsx`, `Tasks.tsx`), check `profile.restrictions` before allowing actions

**5. Same-device multi-account detection**
- On login/signup, generate a device fingerprint (using `navigator.userAgent` + screen size + timezone hash) and store in `device_fingerprint` column
- Create a check: if another active profile already has the same fingerprint, mark both accounts as "spam" and set status to "suspended"
- Admin can see flagged accounts in the user detail sheet

**6. Admin login page kept but hidden**
- Keep `/admin/login` route functional (admins with email credentials need it)
- Just remove the visible link from the user login page

**7. Improve dialogs UI**
- **Deposit dialog**: Add quick-amount buttons (5K, 10K, 50K), better spacing, gradient header
- **Withdraw dialog**: Add network icons, confirmation step before submitting
- **Terms & Privacy dialogs**: Add scroll indicator, better typography, close button at bottom

### Files to modify

| File | Change |
|---|---|
| Migration SQL | Add `device_fingerprint` and `restrictions` columns |
| `src/pages/auth/Login.tsx` | Dual login (phone/email tabs), remove admin link, loading animation, improved blocked screen with SupportDialog |
| `src/contexts/AuthContext.tsx` | Add `restrictions` to Profile interface, device fingerprint storage, blocked status check |
| `src/pages/admin/AdminUsers.tsx` | Add restriction toggles in user detail sheet, show device fingerprint flags |
| `src/pages/user/Wallet.tsx` | Check restrictions before deposit/withdraw |
| `src/pages/user/Tasks.tsx` | Check restrictions before task completion |
| `src/components/user/DepositDialog.tsx` | Quick amount buttons, gradient header, improved layout |
| `src/pages/user/Profile.tsx` | Improved Terms & Privacy dialogs with better styling |
| `src/pages/auth/Register.tsx` | Device fingerprint on signup, loading animation |

### Technical Details
- Device fingerprint: simple hash of `navigator.userAgent + screen.width + screen.height + Intl.DateTimeFormat().resolvedOptions().timeZone`
- Restrictions check: `if (profile?.restrictions?.no_transactions) { toast.error("Your account is restricted"); return; }`
- Multi-account detection runs server-side query: `SELECT * FROM profiles WHERE device_fingerprint = $1 AND user_id != $2`

