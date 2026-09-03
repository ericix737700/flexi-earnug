# Full-screen feature navigation

## User-facing outcome
Major workflows will open as real application pages with their own URLs instead of floating overlays. Pages will share a consistent mobile-first header with a back arrow, title, normal scrolling, and no visible previous screen behind them.

## Scope
- Add dedicated routes for `/wallet/deposit`, `/wallet/withdraw`, `/airtime-data`, `/machines`, `/tasks`, `/profile/settings`, `/notifications`, `/statement`, and `/support`.
- Reuse existing backend calls, realtime listeners, validation, polling, and success/error handling.
- Move the deposit form, withdrawal form, profile editing form, support choices/live chat, and notification controls out of dialogs/sheets.
- Update Profile, Dashboard, navigation, and Wallet entry points to navigate to these routes.
- Keep only small confirmation dialogs (purchase/submit confirmations and alerts) where needed.
- Preserve existing nested routes such as machine/task details and statement filters.

## Technical approach
- Add a shared `FeaturePage` shell for the full-screen header and content width.
- Convert the existing deposit and edit-profile dialog implementations into route pages with minimal behavior changes.
- Extract the existing withdrawal form from Wallet into a route page and leave Wallet as a recent-activity overview.
- Make Airtime & Data, Machines, Tasks, Statement, and support/notifications page-first while retaining their current feature logic.
- Replace the support chat sheet with an in-page chat state/route so no sheet remains for this workflow.
- Verify route navigation and build/runtime behavior after edits; fix any current build errors surfaced by validation.