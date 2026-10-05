# Real earning pages + "Make money online in Uganda" guide

## What changes for users

Today the dashboard "Start" buttons for Watch Videos and Surveys open the general Tasks list, surveys pay out with no questions, and Gift Codes only live inside the Wallet. Each one gets its own full-screen page:

- **/earn/videos**: list of today's video tasks with reward, length and a "done today" tick. Tapping one opens the player (no seeking). The reward is paid only after the full watch time has passed.
- **/earn/surveys**: list of surveys. Each survey opens a question-by-question flow (single choice, multiple choice, short text) with a progress bar. All questions must be answered before the reward is paid. Each survey pays once per day.
- **/earn/gift-codes**: redeem box using the existing gift code redeem flow and success animation, plus the user's own redemption history.
- **Machines**: the Start button keeps opening the existing Machines page, which already supports buying and automatic payouts.
- The dashboard Start buttons point to these new pages. The Tasks page stays as-is.
- Earning respects the admin kill switches (tasks or rewards turned off) and only works for activated, non-blocked accounts.

## Admin

- In Admin > Tasks, a survey editor to add, reorder and remove questions and choose the answer type. Existing surveys with no questions get a single default "How did you hear about FlexiEarn?" question until edited.
- Survey answers are saved, so admins can view responses for each survey.

## Guide page: /make-money-online-uganda (public)

- Hero: "Make Money Online in Uganda" in the dark green and gold landing style.
- How to start: 4 steps (Sign up → Pay activation → Earn with tasks, surveys, machines, codes and referrals → Withdraw).
- MTN MoMo and Airtel Money sections, each with network badges and step lists for depositing, withdrawing and approving the prompt (*165# / *185#), plus fee notes.
- FAQ accordion (8–10 questions), with FAQ structured data and its own page title and description for search engines.
- Linked from the landing page (hero/“How it works” link and the footer Platform column) and added to the sitemap.

## Technical details

- Server-side reward: new `complete_task(task_id, answers jsonb)` security-definer RPC. It checks auth, activation, kill switches, one completion per day, minimum watch time for videos (from a server-recorded start via `start_task`), and that all survey questions are answered. In one transaction it credits the balance, inserts the transaction and completion, and stores survey responses. This replaces client-side balance writes for these flows.
- New table `survey_responses(user_id, task_id, answers jsonb, created_at)` with GRANTs and RLS: users insert and read their own rows, admins read all. `task_starts` table for watch-time checks.
- New pages: `src/pages/user/earn/Videos.tsx`, `Surveys.tsx`, `SurveyRun.tsx` (`/earn/surveys/:id`), `GiftCodes.tsx`, using the `FeaturePage` shell, skeleton loaders and realtime balance refresh.
- New `src/pages/public/MakeMoneyGuide.tsx` using `PublicFooter` and the SEO helper. Routes added in `App.tsx`; `public/sitemap.xml` updated.
- Update `taskCategories` hrefs in `Dashboard.tsx`. Add a survey question editor to `AdminTasks.tsx`.
