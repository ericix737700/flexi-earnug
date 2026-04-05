

## Add WhatsApp Support, Terms & Conditions, and User Deletion

### What We'll Build

**1. WhatsApp Support link on Profile page**
- Make "Help & Support" open WhatsApp using the `support_whatsapp` setting already configured in Admin Settings
- Read the number from `usePlatformSettings` hook

**2. Terms & Conditions (configurable from Admin)**
- Add a `terms_and_conditions` setting in Admin Settings with a rich text area
- Create a Terms & Conditions dialog/page that displays the content
- "Terms & Conditions" menu item on Profile opens this dialog

**3. Admin: Add T&C editor**
- Add a new card in `AdminSettings.tsx` with a `Textarea` for terms and conditions content
- Uses the same `platform_settings` table (no migration needed -- just upsert a new key)

**4. Admin: Fix user deletion**
- The `deleteUserMutation` calls a `delete-user` edge function that doesn't exist
- Create the edge function using `supabase.auth.admin.deleteUser()` which cascades to profiles via foreign key

### Database Changes
- Insert a new `terms_and_conditions` platform setting row (using insert tool, no migration needed)

### Files to Create/Modify

| File | Change |
|---|---|
| `supabase/functions/delete-user/index.ts` | New edge function to delete user from auth + cascading data |
| `src/pages/user/Profile.tsx` | WhatsApp link on Help & Support, T&C dialog on Terms menu item |
| `src/pages/admin/AdminSettings.tsx` | Add Terms & Conditions textarea card, update WhatsApp description |
| `src/hooks/usePlatformSettings.ts` | No changes needed (already generic) |

### Technical Details
- WhatsApp link: `window.open(\`https://wa.me/\${settings.support_whatsapp}\`)` 
- T&C displayed in a Dialog component reading from `platform_settings` where `setting_key = 'terms_and_conditions'`
- Delete user edge function uses `SUPABASE_SERVICE_ROLE_KEY` to call `supabase.auth.admin.deleteUser(userId)` which cascades deletes via the `ON DELETE CASCADE` on profiles
- The `formData` state in AdminSettings will be extended with `terms_and_conditions`

