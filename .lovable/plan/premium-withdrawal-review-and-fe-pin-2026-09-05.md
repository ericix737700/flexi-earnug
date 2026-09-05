# Premium withdrawal review and FE PIN

## User-facing outcome
- Withdrawal starts with a clean amount/recipient form, then opens a premium review screen matching the supplied dark reference: amount summary, recipient, MTN/Airtel badge, fees, total deduction, security notice, and a clear confirm action.
- Every withdrawal requires the user’s private 4-digit FE PIN. Users can create or change that PIN from Profile Settings.
- MTN and Airtel are shown with recognizable network badges throughout withdrawal selection and review.

## Build scope
- Add a secure backend PIN store using one-way hashing, failed-attempt limits, and temporary lockout; the raw PIN is never stored or readable.
- Add authenticated backend actions to set the FE PIN, check whether one is configured, and submit a withdrawal only after validating it.
- Make withdrawal creation and balance deduction atomic on the backend, including restrictions, minimum amount, fee settings, and available balance checks.
- Update automatic payout handling to use the stored withdrawal details rather than trusting values sent by the browser.
- Redesign the withdrawal experience as a two-step form and review flow with a four-box PIN entry, clear edit/cancel controls, loading/error states, and mobile-first scrolling.
- Add a Profile Settings security section for setting/changing the 4-digit FE PIN.
- Replace hardcoded network colors with semantic MTN/Airtel badge styles and use the supplied brand marks as visual reference only.

## Verification
- Validate PIN setup, incorrect PIN, lockout, successful manual submission, and automatic payout trigger behavior.
- Check the redesigned pages on mobile and desktop, then confirm the project builds without errors.
