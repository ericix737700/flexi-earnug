

## Create Admin Account

### What we'll do
Create an admin user account with the specified credentials and assign the admin role.

### Steps

1. **Create the admin user** via a database migration that:
   - Uses Supabase's `auth.users` table to create the user with email `erickydev72@gmail.com` and password `@ericky72`
   - This needs to be done through an edge function since we can't directly insert into `auth.users` via migration

2. **Create an edge function `create-admin`** (temporary, one-time use):
   - Signs up the user with the provided credentials using the Supabase Admin API (service role key)
   - Inserts a row into `user_roles` with `role = 'admin'`
   - Updates the profile status to `'active'` and `registration_paid = true`

3. **Invoke the edge function** to create the account

4. **Clean up** - delete the temporary edge function after use

### Technical details
- The edge function will use `supabase.auth.admin.createUser()` with `email_confirm: true` to skip email verification
- The admin role entry in `user_roles` table grants access to all admin routes
- The profile will be auto-created by the existing `handle_new_user` trigger

