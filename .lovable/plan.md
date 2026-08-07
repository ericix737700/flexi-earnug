# News, Machines, Bundles & Profile Upgrade

## 1. betPawa-style News

- Admin News page gains an **image upload** (stored in a public news bucket) plus a longer "full story" body, so each post has: headline, banner image, short teaser, full article.
- User News list becomes betPawa-style cards: bold headline on top, wide banner image, 2-3 line teaser, then a full-width **READ MORE** button.
- New article page at `/news/:id` showing the banner, headline, full story, publish date and a back link. Great for winner/prize posts (image of winner + prize amount).
- Skeleton loaders while news loads.

## 2. Footer in the middle

On the landing page the footer block moves above the final "Ready to Start Earning?" call-to-action section, so it sits mid-page instead of at the very bottom.

## 3. Airtime & Data — My Airtel style cards

- Phone input with verified account-holder name shown in a green check row under it.
- Bundle categories rendered as a 3-column icon tile grid (Data, Voice, Combos, SMS, etc. derived from the catalog groups).
- Bundle list becomes clean white/glass rows: bundle name on top, bold "Data - 1.0 GB" style line, small validity line, and a large right-aligned price with "UGX" underneath.
- Search box to filter bundles by name, plus skeleton loaders while the catalog fetches.

## 4. Machines — Jumia-style grid

- Machines shown in a **2-column product grid**: square image, name, price in bold, daily/total income lines, discount-style badge (duration/ROI), and a full-width action button — matching the marketplace layout in the screenshot.
- Skeleton card grid while machines load.
- Seed a starter set of investment machines (name, price, reward, duration, image) so the page is populated immediately; admin can still add/edit/delete them.

## 5. Tasks centre skeleton

Replace the current spinner with a skeleton card list matching the task card shape.

## 6. Account ID in profile

Display the user's account ID (FE-XXXXXX) in the profile account card with a copy button and toast, so it can be shared with admin for quick lookup.

## Technical notes

- New public storage bucket `news` with admin-only write policies; user news reads stay public.
- `news_items` gains a `content` column for the full article (teaser stays in `body`).
- Route `/news/:id` added to `App.tsx`; `NewsSection` cards link to it.
- Reuse the existing `RouteSkeleton` / `Skeleton` primitives for all loaders.
- All styling via existing semantic tokens — no hardcoded colors.
