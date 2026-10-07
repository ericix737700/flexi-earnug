# Unify the Landing, Login, and Registration Experience

## Goal
Make the complete public landing page, sign-in page, and registration page feel like one polished FlexiEarn experience using the established dark emerald, gold, and bright green direction. Keep all current account, referral, activation, and security behavior working.

## Landing page
- Recompose the full page into one continuous dark emerald experience instead of visually disconnected light and dark sections.
- Keep the current “Your Phone, Your Profit” message, earning methods, gift codes, advertising, trust content, and final registration call-to-action, but give them consistent spacing, typography, imagery, gold accents, and green action buttons.
- Improve mobile readability: avoid cramped three-column content, prevent clipped labels, and use deliberate horizontal scrolling or stacked layouts where appropriate.
- Keep the logo and primary sign-in/create-account actions visible in the top navigation.
- Move `PublicFooter` from its current mid-page position to the true end of the page, after advertising and the final “Ready to Start Earning?” section.

## Sign-in page
- Replace the isolated light card screen with a responsive dark emerald/gold account page that visually continues the landing page.
- Use a compact mobile-first form and a desktop trust/benefit panel without hiding or duplicating the main form.
- Preserve phone/email tabs, password visibility, forgot-password recovery, blocked-account support, loaders, and the existing post-login flow.
- Add the selected trust essentials: a clear remembered-device option aligned with the existing persistent login behavior, inline validation and field guidance, MTN/Airtel availability, encrypted-login messaging, Terms/Privacy links, and a visible route back to the landing page.
- Keep error, loading, disabled, and blocked-account states clear and accessible.

## Registration page
- Match the sign-in page’s responsive visual system and retain full name, phone, required email, password strength, password confirmation, referral lookup, activation fee, and successful-registration behavior.
- Add inline validation with sensible length/format limits, clear MTN/Airtel phone guidance, an activation-fee summary, and required agreement to Terms and Privacy before account creation.
- Present referral validation and password requirements as compact status feedback so the page remains easy to scan on a phone.
- Add trust markers for secure account creation and Mobile Money support, plus a clear route back to the landing page and sign-in.

## Shared implementation
- Create a small shared public-auth shell for the logo, responsive background, trust panel, navigation, and legal/support links so login and registration stay visually consistent without duplicating layout code.
- Extend the existing semantic theme tokens/utilities for the emerald/gold presentation; avoid one-off hardcoded page colors.
- Preserve the current backend and authentication methods; this is a presentation and validation upgrade, not a change to account storage or activation rules.

## Verification
- Check the complete landing page at mobile and desktop sizes, confirming the footer is the final content.
- Test phone and email sign-in form states, password visibility, remembered-device choice, recovery link, and blocked-account presentation.
- Test registration validation, password feedback, referral feedback, legal consent, and activation-fee display.
- Run the project type check, review the latest build status, and confirm there are no browser console or layout errors on all three public pages.
