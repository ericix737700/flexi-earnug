## Goal
Make Notifications open in a dedicated view instead of scrolling to a section at the bottom of Profile.

## Changes

**`src/pages/user/Profile.tsx`**
- Remove the inline `NotificationsSection` and `PushNotificationToggle` block at the bottom (the `#notifications-section` div).
- Change the "Notifications" row in the Preferences group so that clicking it opens a Sheet (slide-in panel) instead of scrolling.
- The Sheet contains:
  - `NotificationsSection` (full list with mark-as-read controls)
  - `PushNotificationToggle` (push opt-in)
  - A Close button
- Keep all other rows, groups, and the user/wallet cards exactly as-is.

## Technical notes
- Add a new state `notificationsOpen` and a `<Sheet>` mirroring the existing Terms/Privacy sheets (right side, `glass-card`, scrollable).
- Remove the `scrollIntoView` handler and the `#notifications-section` wrapper div.
- No backend, no styling system changes.
