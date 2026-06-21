# Yummy Points Project Context

Last updated: 2026-06-20

This file is the handoff document for Codex, Lovable, or any other assistant picking up the
project. Read this before making changes.

## Current State

- Product name in the app: Yummy Points / Yummy Tracker.
- Core idea: parents award points when a child misses a treat or experience; children can later use
  points for rewards.
- Current implementation supports auth, family bootstrap, child profiles, child home, adding
  points, reward creation/redemption, Journey, First Points badge unlock, Activity History, Admin
  Settings, child removal from the dashboard, a blue mobile-first visual palette, and Admin
  Settings test tools.
- Sprint 5 Journey is in progress/completed locally:
  - `/children/$childId/journey` is a friendly Yummy Journey timeline for the selected child.
  - Journey uses `transactions` as the source of truth and does not change points, rewards, badges,
    or schema.
  - It loads transaction `id`, `type`, `points_change`, `note`, `created_at`,
    `reward_template_id`, and joined reward template name when available.
  - Points read like `<child> earned <amount> <point name>`, with the saved note underneath.
  - Redemptions read like `<child> redeemed <reward name>` and show
    `<amount> <point name> used`.
  - Dates are shown as `Today`, `Yesterday`, or a simple long date.
- Sprint 5A Reward Scope is in progress/completed locally:
  - Rewards can be family-wide or scoped to one child.
  - `reward_templates.child_id = null` means the reward is available to the whole family.
  - `reward_templates.child_id = <child id>` means the reward appears only for that child.
  - Existing rewards continue to work as family-wide rewards because `child_id` is nullable.
  - Rewards and Journey filter active rewards to family-wide rewards plus rewards scoped to the
    selected child.
  - The Rewards create form defaults to "Whole family" and can save "This child only".
  - Reward cards are labelled "Family reward" or `Just for <child name>`.
- Sprint 4 Rewards is in progress/completed locally:
  - `/children/$childId/rewards` completes the first full points loop: earn points, save points,
    redeem a reward.
  - Rewards loads active `reward_templates` for the selected child's family.
  - Creating a reward inserts `family_id`, `name`, `point_cost`, and `is_active = true`.
  - Redeeming a reward creates a negative `reward_redeemed` transaction with
    `reward_template_id` and `note = reward name`.
  - After redemption, the page refreshes the child balance and rewards list, then shows
    `🎁 Reward redeemed!`.
  - First successful reward redemption checks for the `First Reward` badge, inserts a
    `child_badges` row if missing, and shows `🎁 First Reward unlocked!` once using
    `sessionStorage`.
- Sprint 4 Core Experience Polish was also completed locally:
  - Child Home now acts as the selected child's main hub with a balance panel and clear action cards
    for Add Points, Rewards, and Journey.
  - Rewards separates "Available now" from "Saving towards" and shows how many more points are
    needed for locked rewards.
  - Journey uses friendlier timeline language for earned points, redeemed rewards, and badges.
  - First Points badge behaviour remains one-time and friendly through the shared badge unlock
    celebration.
  - Avatar colours saved in Settings now render on Dashboard and Child Home via a shared
    `src/lib/avatar-colours.ts` helper.
- Recent settings work completed the Admin Settings child profile and reward management sections:
  - Settings now has Family, Children, Rewards, Points, and Tools tabs.
  - Child profiles can be edited from Settings: display name, avatar icon, and avatar colour.
  - Reward templates can be created, renamed, repriced, and hidden from Settings.
  - These changes use existing `children` and `reward_templates` tables and RLS; no schema or policy
    change was needed.
- Recent committed work fixed the Admin Settings "Reset badges" test tool by adding the missing
  `child_badges` DELETE RLS policy and clearing pending local badge celebration state after reset.
- Latest committed work adds a Test child picker to Admin Settings test tools so sample actions,
  resets, and cleanup apply to the selected child instead of automatically affecting every child in
  the family.
- Expected clean working tree after current handoff commit.
- Live Supabase migration added this iteration:
  - `add_reward_template_child_scope`
  - `enforce_reward_template_child_scope_family`
  - `allow_family_members_delete_child_badges`
- Root cause of the failed badge reset:
  - The frontend delete query targeted the correct `child_badges` table and filtered by the current
    family's child IDs, but live RLS had SELECT and INSERT policies only. The authenticated delete
    was filtered to zero rows, so the follow-up verification still found badge records.
- Database/RLS change made:
  - Added `Family members can delete child badges` on `public.child_badges` for `authenticated`.
  - The policy only allows deleting a badge row when its `child_id` belongs to a child whose
    `family_id` passes `public.is_family_member(family_id)`.
  - No broad security disabling or service-role frontend changes were made.
- How Reset badges now works:
  - Collects the current family's loaded child IDs.
  - Reads current `child_badges` rows for those children.
  - Deletes only those `child_badges` rows through normal Supabase RLS.
  - Reads `child_badges` again and shows success only when no rows remain.
  - Clears pending `sessionStorage` badge celebration keys for those children so stale unlocked badge
    banners do not appear after reset.
- Assumptions made:
  - Admin Settings test tools continue to operate on the current user's first loaded family and the
    currently selected child in that family.
  - The existing `is_family_member()` helper remains the right authorization boundary for parent
    test tools.
- Follow-up tasks / known limitations from the badge reset iteration:
  - Verify the reset in a signed-in Lovable/local browser session with real test data.
  - Clear activity history may still need its own narrow `transactions` DELETE policy if it fails in
    the same way.
- Verification already run after the badge reset fix:
  - `npm run build` passes.
  - `npx eslint src/routes/settings.tsx` passes.
  - `git diff --check` passes.
  - Supabase live policy readback confirms `Family members can delete child badges` exists on
    `public.child_badges`.
  - Supabase migration list shows `20260618165815_allow_family_members_delete_child_badges`.
  - Full `npm run lint` currently fails on pre-existing formatting issues in unrelated files:
    `src/routes/__root.tsx`, `src/routes/login.tsx`, and `src/routes/signup.tsx`, plus existing
    Fast Refresh warnings in shared UI exports.
- Browser sanity check reached the local app and `/settings` redirected to `/login` because the
  browser session was not authenticated.

## Repos, Folders, And IDs

- Actual local repo path:
  `/Users/noam/Documents/Codex/yummy-points-tracker`
- The selected Codex workspace folder may be empty:
  `/Users/noam/Documents/Codex/Yummy Tracker`
- Git remote:
  `https://github.com/git-fleabo/yummy-points-tracker.git`
- Current branch observed locally:
  `main`
- Supabase URL:
  `https://tbosqyedogluzcpzodwe.supabase.co`
- Supabase project ref / project id used by MCP tools:
  `tbosqyedogluzcpzodwe`
- Local env file:
  `/Users/noam/Documents/Codex/yummy-points-tracker/.env`
- Required public env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Do not paste Supabase keys into this context file. The publishable key is present in `.env`.
- Lovable package/config:
  - Uses `@lovable.dev/vite-tanstack-config`.
  - Config file: `/Users/noam/Documents/Codex/yummy-points-tracker/vite.config.ts`
  - Error bridge: `/Users/noam/Documents/Codex/yummy-points-tracker/src/lib/lovable-error-reporting.ts`
- Known Lovable preview/image identifiers from root metadata:
  - R2 bucket path id: `3507d1d9-d80e-461c-a994-f09069b4da0e`
  - Preview host in image URL:
    `id-preview-c02ebc76--a29ec2b6-5258-4558-8729-5a6f6058392c.lovable.app`
  - No separate Lovable project id file was found locally.

## Workflow

- Make code changes locally in `/Users/noam/Documents/Codex/yummy-points-tracker`.
- Commit completed code changes automatically unless the user explicitly asks not to.
- The human workflow for publishing is GitHub Desktop:
  - Review changed files in GitHub Desktop.
  - Commit from GitHub Desktop.
  - Push from GitHub Desktop.
- Codex should still run local checks before handoff.
- Before publishing to Lovable or judging a deployed preview, make sure the relevant changes have
  been committed and pushed through GitHub Desktop.
- Keep `PROJECT_CONTEXT.md` updated whenever behavior, schema assumptions, workflow, IDs, or
  important implementation decisions change.

## Tech Stack

- React 19.
- TypeScript.
- TanStack Start / TanStack Router.
- Supabase Auth and Postgres.
- Tailwind CSS v4 style tokens in `src/styles.css`.
- shadcn-style UI components in `src/components/ui`.
- Lucide icons.
- Lovable Vite/TanStack config wrapper.
- Package scripts are in `/Users/noam/Documents/Codex/yummy-points-tracker/package.json`.

## Important Commands

- Install dependencies if needed: `npm install`
- Start local dev server: `npm run dev`
- Build: `npm run build`
- Full lint: `npm run lint`
- Targeted lint for latest settings work: `npx eslint src/routes/settings.tsx`
- Format touched files: `npx prettier --write <files>`

## Routes And Files

- `/`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/index.tsx`
- `/login`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/login.tsx`
- `/signup`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/signup.tsx`
- `/dashboard`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/dashboard.tsx`
- `/settings`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/settings.tsx`
- `/children/$childId`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/children.$childId.tsx`
- `/children/$childId/add-points`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/children.$childId_.add-points.tsx`
- `/children/$childId/activity-history`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/children.$childId_.activity-history.tsx`
- `/children/$childId/rewards`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/children.$childId_.rewards.tsx`
- `/children/$childId/journey`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/children.$childId_.journey.tsx`
- Generated router tree:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routeTree.gen.ts`
- Shared family/child loader:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/lib/family-data.ts`
- Shared badge unlock celebration component:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/components/badge-unlock-celebration.tsx`
- Shared points and First Points badge flow:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/lib/points-flow.ts`
- Local Admin Settings defaults/storage:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/lib/admin-settings.ts`
- Supabase client:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/integrations/supabase/client.ts`
- Theme tokens:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/styles.css`

## Product Decisions

- Parent-first experience.
- Multiple children are supported.
- A user gets a default family if they do not already have one.
- Family point label is stored in `families.point_name`.
- Points are added through quick choices or custom amount.
- Add Points has only an optional note; there are no categories in v1.
- Badges are hidden except for the lightweight First Points unlock message and Activity History
  badge display.
- Rewards and Journey are live actions on the child home screen.
- Dashboard has mobile-first child cards with quick actions and a destructive child removal
  confirmation. Removal attempts to delete the child's badges and transactions before deleting the
  child row, using normal RLS-protected frontend calls.
- Admin Settings are intentionally local-first for now.
- Settings is organized into Family, Points, and Tools tabs. Family name and point label update the
  existing `families` row; point rules remain localStorage-backed for now.
- Avoid medical language.
- No photos, streaks, leaderboards, notifications, or allergy-management features in the current
  product direction.

## Current Features

### Auth And Family Bootstrap

- Supabase Auth is the source of session truth.
- Protected pages check `supabase.auth.getSession()` client-side and redirect signed-out users to
  `/login`.
- Dashboard looks up the first `family_members` row for the signed-in user.
- If no family exists, Dashboard creates a `families` row with a client-generated UUID, then creates
  an owner `family_members` row.
- This avoids an RLS read-before-membership trap.

### Dashboard

- Shows family name, app title, tagline, settings link, sign out, add-child form, and child cards.
- Parents can add children.
- New dashboard-created children use `avatar_icon = "⭐"` and `avatar_colour = "soft-yellow"`.
- A visible `dashboardBuildMarker` remains in `src/routes/dashboard.tsx` for Lovable/deploy sanity
  checks.

### Child Home And Add Points

- Dashboard child cards link to child home.
- Child home shows current balance and parent actions.
- Add Points reads saved activity point choices from local Admin Settings.
- Add Points calls the shared `addPointsActivity()` helper in `src/lib/points-flow.ts`.
- `addPointsActivity()` inserts a `transactions` row with:
  - `type = "points_added"`
  - positive `points_change`
  - `family_id`
  - `child_id`
  - optional `note`
- If the selected saved activity is used and no manual note is entered, the activity name is saved
  into `transactions.note`.
- Child balance changes are handled by the database trigger, not by frontend balance mutation.

### First Points Badge

- Badge lookup uses `badges.name = "First Points"`.
- Add Points checks whether the child already has the badge before inserting into `child_badges`
  through the shared `addPointsActivity()` helper.
- First Points threshold is read from Admin Settings local storage.
- Badge errors are logged to the console and do not block the saved points transaction.
- `addPointsActivity()` returns `unlockedBadge` with the badge name and icon only when it inserts a
  new `child_badges` record.
- The one-time child-home celebration is passed through `sessionStorage` key
  `badge-unlocked-${child.id}` as badge JSON. The child home removes the key as soon as it reads it,
  preventing repeat celebrations on refresh/back navigation. The old `"first-points"` string is
  still supported as a fallback.

### Badge Unlock Celebration

- Shared component: `src/components/badge-unlock-celebration.tsx`.
- The celebration is a compact styled panel using the brighter palette:
  - "New badge unlocked!" message.
  - Badge name.
  - Badge icon from `badges.icon`, with a Lucide badge fallback.
- Normal Add Points:
  - `src/routes/children.$childId_.add-points.tsx` stores the newly unlocked badge in
    `sessionStorage` only when `addPointsActivity()` reports a new unlock.
  - `src/routes/children.$childId.tsx` reads that badge once and shows the celebration above the
    child card.
- Admin Settings test tools:
  - `src/routes/settings.tsx` shows the same celebration inline when "Add sample activity" or
    "Add sample badge-unlocking activity" causes a real new badge unlock.
- Duplicate celebrations are prevented by the existing child badge lookup in `addPointsActivity()`.
  If a child already has First Points, no new `child_badges` row is inserted and no `unlockedBadge`
  is returned.
- No badge rules, point values, transaction logic, or Activity History inference were changed in
  this iteration.

### Activity History

- Activity History shows transactions newest first for the selected child and family.
- Rows display date, activity name, point change, and badge unlocked.
- Activity names come from `transactions.note` when present, otherwise a label derived from
  `transactions.type`.
- Activity History reads `child_badges.earned_at` and shows First Points on the positive transaction
  immediately before the badge was earned. It falls back to the first positive transaction that
  reaches the current threshold when needed.
- There is no explicit per-transaction badge reference yet.

### Rewards

- Rewards lives at `/children/$childId/rewards`.
- Parents can add active family reward templates using `reward_templates`.
- Sprint 5A reward scope:
  - The create form asks "Who can use this reward?"
  - "Whole family" saves `reward_templates.child_id = null`.
  - "This child only" saves `reward_templates.child_id = current child id`.
  - The page loads only active family rewards where `child_id is null` or `child_id` matches the
    selected child.
  - Reward cards show either "Family reward" or `Just for <child name>`.
  - The existing redemption transaction behavior is unchanged.
- Sprint 4 Rewards route behavior:
  - Loads the current Supabase session and redirects signed-out users to `/login`.
  - Loads the selected child through `loadChildForUser()`, which confirms the child belongs to a
    family the signed-in user belongs to.
  - Loads active `reward_templates` for that family.
  - Keeps the lightweight add-reward form.
  - Separates active rewards into "Available now" and "Saving towards".
  - Locked rewards show how many more points the child needs.
  - Empty states use:
    - `"No rewards yet. Create one above."`
    - `"No rewards available yet."`
    - `"No saving goals right now."`
  - Redeeming a reward creates a `transactions` row:
    - `type = "reward_redeemed"`
    - `points_change = -reward.point_cost`
    - `reward_template_id = selected reward id`
    - `note = reward name`
  - The existing database trigger applies the negative point change and increments
    `children.total_rewards_redeemed`.
  - After redemption, Rewards reloads the child and active reward list and shows a success message.
  - First successful redemption checks `badges.name = "First Reward"`, avoids duplicate
    `child_badges` rows, inserts the badge when needed, and shows a one-time unlock message using
    `sessionStorage`.
- Admin Settings also has a Rewards tab for family-level reward management:
  - Loads active `reward_templates` for the signed-in user's first family.
  - Creates active rewards with name and point cost.
  - Saves edits to reward name and point cost.
  - Hides rewards by setting `is_active = false`, preserving past transaction references.
- Redeeming a reward inserts a `transactions` row with:
  - `type = "reward_redeemed"`
  - negative `points_change`
  - `reward_template_id`
  - note `<reward name>`
- The existing database trigger applies the balance change and increments
  `children.total_rewards_redeemed`.
- The page reloads the selected child after redemption so balances and totals stay in sync with the
  database trigger.

### Child Profiles

- Dashboard still owns adding and removing child profiles.
- Avatar colour classes and options live in `src/lib/avatar-colours.ts`.
- Dashboard, Child Home, and Settings all use the shared avatar colour helper so saved profile
  colours render consistently.
- Admin Settings has a Children tab for profile edits:
  - Loads each child's `name`, `avatar_icon`, `avatar_colour`, balance, earned total, and reward
    redemption total.
  - Saves `name`, `avatar_icon`, and `avatar_colour` updates through the existing family-member
    child update policy.
  - Uses fixed avatar colour choices: `ocean`, `sky`, `violet`, `coral`, `amber`, `leaf`, and
    `soft-yellow`.
  - Older saved `mint`, `pink`, and `lavender` values are still mapped to high-contrast swatches.

### Journey

- Journey lives at `/children/$childId/journey`.
- It loads the current session, redirects signed-out users to `/login`, and loads the selected child
  through `loadChildForUser()` so family access is checked consistently.
- It uses the child's `transactions` as the source of truth, ordered newest first.
- Transaction query reads `id`, `type`, `points_change`, `note`, `created_at`,
  `reward_template_id`, and joined `reward_templates(name)` when available.
- It shows a Back to child home button, page title `<child>'s Yummy Journey`, current balance, and a
  clean vertical timeline.
- Timeline labels avoid database-y language:
  - Points added reads like `<child> earned <amount> <point name>`.
  - Saved notes appear underneath earned points.
  - Reward redemptions read like `<child> redeemed <reward name>` when the joined reward name or note
    is available.
  - If no reward name or note is available, redemptions read like `<child> redeemed a reward`.
  - Redemption cost reads like `<amount> <point name> used`.
- Dates display as `Today`, `Yesterday`, or a simple readable date such as `20 June 2026`.
- Empty state says `"No journey yet. Add some points to begin."`
- It does not add schema and does not change points, rewards, or badge logic.

### Admin Settings

- Admin Settings lives at `/settings`.
- Data is stored in browser `localStorage`, not Supabase.
- Storage key:
  `yummy-points-admin-settings-v1`
- Default activity point values in `src/lib/admin-settings.ts`:
  - `small-miss`: "Small missed treat", 1 point
  - `regular-miss`: "Regular missed treat", 2 points
  - `big-miss`: "Big missed treat", 5 points
  - `special-miss`: "Special missed plan", 10 points
  - `major-miss`: "Major missed experience", 20 points
- Default badge rule:
  - `first-points`: "First Points", threshold 1
- Changing settings affects new transactions only.
- Existing logged activity is not recalculated.
- Existing badges are not removed if thresholds change.

### Admin Test Tools

- Test tools live inside `/settings` in `src/routes/settings.tsx`.
- They are labelled as admin-only setup and cleanup, not normal daily use.
- Actions:
  - Add sample activity.
  - Add sample badge-unlocking activity.
  - Reset points.
  - Reset badges.
  - Clear activity history.
  - Reset all test data.
- Destructive actions use `window.confirm`.
- Tools load the signed-in user's first family membership and use that family's children.
- A Test child picker defaults to the first child in the family and stays on the selected child while
  that child still exists in refreshed data.
- Sample actions, reset points, reset badges, clear activity history, and reset all test data now
  target the selected child.
- "Add sample activity":
  - Calls the shared `addPointsActivity()` helper used by Add Points.
  - Uses note `"Test sample activity"`.
  - Uses the first configured activity point value.
  - Can unlock First Points if the normal badge rules say it should.
  - Appears in Activity History.
  - Shows the success message `"Sample activity added"` when complete.
  - The success state includes a "View Activity History" link for the affected child.
  - If this action newly unlocks First Points, it also shows the badge unlock celebration inline.
- "Add sample badge-unlocking activity":
  - Calls the shared `addPointsActivity()` helper used by Add Points.
  - Uses note `"Test badge-unlocking activity"`.
  - Uses the selected child.
  - Amount is enough to reach the current First Points threshold from the selected child's loaded
    balance, with a minimum of 1 point.
  - Requires the normal First Points badge insert to succeed; failures are shown visibly in the
    Admin Settings error area.
  - Appears in Activity History with the First Points badge shown on the unlocking transaction.
  - Shows the success message `"Sample badge activity added"` when complete.
  - The success state includes a "View Activity History" link for the affected child.
  - Shows the badge unlock celebration inline when First Points is newly unlocked.
- Root cause fixed in this iteration:
  - The sample buttons used settings-local helper functions that inserted transactions directly
    instead of reusing the Add Points transaction/badge path. This made the buttons fragile and kept
    badge-specific failures outside the normal app flow. The fix extracted the real flow into
    `addPointsActivity()` and wired both Add Points and Admin Settings to it.
- Root cause clarified after follow-up:
  - Reset tools could report success after Supabase returned no error, even when delete/update
    policies prevented rows from changing. The sample badge action then correctly saw existing
    `child_badges` rows and refused to fabricate a duplicate unlock.
- Follow-up fix after real use:
  - Reset actions now verify that deletes/updates actually took effect before showing success.
  - If `child_badges` rows remain after Reset badges, the UI shows:
    `"Badge reset did not remove badge records. Check the database delete policy for child_badges."`
  - If `transactions` rows remain after Clear activity history or Reset all test data, the UI shows:
    `"Activity history was not cleared. Check the database delete policy for transactions."`
  - If points remain after Reset all test data, the UI shows:
    `"Point balances were not reset."`
  - If the selected child already has First Points, the badge sample button asks the parent to reset
    that child's badges first instead of deleting or bypassing existing badge state.
- Assumptions made:
  - The existing database trigger remains responsible for increasing `children.current_balance`
    after a `transactions` insert.
  - The app currently supports two implemented badge flows: First Points and First Reward.
  - The `badges.icon` value is safe to display as a short visual label; if it is missing, the UI
    falls back to a Lucide badge icon.
  - If the selected child already has First Points, the badge sample button should show an error
    asking the parent to reset badges first rather than deleting or bypassing existing badge state.
- "Reset points":
  - Sets the selected child's balance to 0.
  - Leaves history in place.
- "Reset badges":
  - Deletes `child_badges` rows for the selected child.
  - Verifies no `child_badges` rows remain for that child before showing success.
  - Leaves history in place.
- "Clear activity history":
  - Deletes the selected child's `transactions` rows.
  - Verifies no `transactions` rows remain for that child before showing success.
- "Reset all test data":
  - Deletes the selected child's `transactions` rows.
  - Deletes `child_badges` rows for the selected child.
  - Sets the selected child's balance to 0.
  - Verifies each reset step before showing success.

## Visual System

- Palette was refreshed to be brighter and warmer.
- Theme tokens are in `src/styles.css`.
- Main semantic colors:
  - Background: soft warm cream / pale peach.
  - Primary: rich berry / raspberry.
  - Secondary: soft teal / aqua.
  - Accent and badge highlight: mango / golden yellow.
  - Success: fresh green.
  - Text: deep navy.
  - Cards: white or softly tinted panels with subtle borders/shadows.
- Use existing UI components and Tailwind token classes.
- Prefer Lucide icons inside buttons when available.
- Avoid large decorative/marketing surfaces; this is a small operational family app.

## Supabase Live Database

Source: Supabase MCP reads on 2026-06-16 for project `tbosqyedogluzcpzodwe`.

### Migrations

- `20260615173627_initial_yummy_points_schema`
- `20260615173856_add_parent_auth_and_rls_policies`
- `20260618165815_allow_family_members_delete_child_badges`

### Edge Functions

- None currently deployed.

### Enum Types

- `transaction_type`
  - `points_added`
  - `reward_redeemed`
  - `manual_adjustment`

### Tables

#### `public.families`

- RLS enabled.
- Purpose: family profile/settings.
- Current app use:
  - Reads `id`, `name`, `point_name`.
  - Inserts default family during dashboard bootstrap.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `name text not null default 'My Family'`
  - `point_name text not null default 'Yummy Points'`
  - `quick_add_values int[] not null default ARRAY[1, 2, 5, 10, 20]`
  - `badges_enabled boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Foreign keys from:
  - `family_members.family_id`
  - `children.family_id`
  - `reward_templates.family_id`
  - `transactions.family_id`
- Triggers:
  - `set_families_updated_at` before update executes `set_updated_at()`.
- RLS policies:
  - Authenticated users can create families.
  - Family members can view/update families.
  - Family owners can delete families.

#### `public.family_members`

- RLS enabled.
- Purpose: links authenticated users to families and roles.
- Current app use:
  - Reads first membership by `user_id`.
  - Inserts owner membership during family bootstrap.
  - Used for access checks.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `family_id uuid not null references families(id)`
  - `user_id uuid not null references auth.users(id)`
  - `role text not null default 'parent'`
  - `created_at timestamptz not null default now()`
- Constraints:
  - `role in ('owner', 'parent')`
  - unique `(family_id, user_id)`
- RLS policies:
  - Authenticated users can create their own owner membership when `user_id = auth.uid()`.
  - Users can view their own memberships or memberships in families they belong to.
  - Family owners can manage memberships.

#### `public.children`

- RLS enabled.
- Purpose: child profile and point counters.
- Current app use:
  - Dashboard lists children.
  - Dashboard inserts new children.
  - Child/access helper loads selected child.
  - Admin test tools reset `current_balance`.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `family_id uuid not null references families(id)`
  - `name text not null`
  - `avatar_icon text null`
  - `avatar_colour text null`
  - `current_balance integer not null default 0`
  - `total_points_earned integer not null default 0`
  - `total_rewards_redeemed integer not null default 0`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Constraints:
  - `current_balance >= 0`
  - `total_points_earned >= 0`
  - `total_rewards_redeemed >= 0`
- Foreign keys from:
  - `transactions.child_id`
  - `child_badges.child_id`
- Triggers:
  - `set_children_updated_at` before update executes `set_updated_at()`.
- RLS policies:
  - Family members can create, view, update, and delete children for their family.

#### `public.reward_templates`

- RLS enabled.
- Purpose: future rewards catalog.
- Current app use:
  - Rewards lists active family-wide rewards and active rewards scoped to the selected child.
  - Rewards inserts active family-wide or child-specific rewards.
  - Journey uses scoped reward visibility for next-reward progress.
  - Admin Settings can create/edit/hide active family-wide rewards.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `family_id uuid not null references families(id)`
  - `child_id uuid null references children(id) on delete cascade`
  - `name text not null`
  - `point_cost integer not null`
  - `is_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Constraints:
  - `point_cost > 0`
- Foreign keys from:
  - `transactions.reward_template_id`
  - `children.id` through nullable `reward_templates.child_id`
- Triggers:
  - `set_reward_templates_updated_at` before update executes `set_updated_at()`.
- RLS policies:
  - Family members can create, view, update, and delete rewards for their family.
  - INSERT and UPDATE policies also require any non-null `child_id` to belong to the same
    `family_id` as the reward.

#### `public.transactions`

- RLS enabled.
- Purpose: append-only-ish point/reward/manual activity ledger.
- Current app use:
  - Add Points inserts positive `points_added` rows.
  - Activity History reads rows for selected child/family ordered by `created_at desc`.
  - Admin test tools insert sample rows and can delete family rows.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `family_id uuid not null references families(id)`
  - `child_id uuid not null references children(id)`
  - `type transaction_type not null`
  - `points_change integer not null`
  - `note text null`
  - `reward_template_id uuid null references reward_templates(id)`
  - `created_at timestamptz not null default now()`
- Constraints:
  - If `type = 'points_added'`, `points_change > 0`.
  - If `type = 'reward_redeemed'`, `points_change < 0`.
- Triggers:
  - `apply_transaction_after_insert` after insert executes `apply_transaction_to_child_balance()`.
- Balance trigger behavior:
  - Adds `new.points_change` to `children.current_balance`.
  - Adds `points_change` to `children.total_points_earned` only for `points_added`.
  - Adds 1 to `children.total_rewards_redeemed` only for `reward_redeemed`.
  - Updates child `updated_at`.
  - Raises `Transaction would make child balance negative` if balance becomes negative.
- RLS policies:
  - Family members can create transactions if:
    - they are a member of `family_id`;
    - `child_id` belongs to the same family;
    - any `reward_template_id` also belongs to the same family.
  - Family members can view transactions for their family.
- Important caveat:
  - There is no UPDATE or DELETE policy listed for transactions. If frontend deletion works in test
    tools, it is because policies or privileges allow it through another mechanism; verify in the
    app. If deletion fails, add an explicit test/admin-safe strategy or rethink the reset tool.

#### `public.badges`

- RLS enabled.
- Purpose: badge definitions.
- Current app use:
  - Looks up `First Points` by `name`.
  - Activity History reads badge names through child badge relation.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `name text not null unique`
  - `description text not null`
  - `trigger_type text not null`
  - `trigger_value integer not null default 1`
  - `icon text not null default '⭐'`
  - `created_at timestamptz not null default now()`
- RLS policies:
  - Any signed-in user can view badges.

#### `public.child_badges`

- RLS enabled.
- Purpose: join table recording which child earned which badge.
- Current app use:
  - Add Points and test tools insert when First Points is earned.
  - Activity History reads `badges(name)`.
  - Admin test tools can delete rows for family children.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `child_id uuid not null references children(id)`
  - `badge_id uuid not null references badges(id)`
  - `earned_at timestamptz not null default now()`
- Constraints:
  - unique `(child_id, badge_id)`
- RLS policies:
  - Family members can view child badges for their family children.
  - Family members can create child badges for their family children.
  - Family members can delete child badges for their family children.

### Public Helper Functions

- `set_updated_at()`
  - Trigger function that sets `new.updated_at = now()`.
- `apply_transaction_to_child_balance()`
  - Trigger function described under `transactions`.
- `is_family_member(check_family_id uuid)`
  - Stable security definer SQL helper.
  - Checks for a `family_members` row with `family_id = check_family_id` and `user_id = auth.uid()`.
- `is_family_owner(check_family_id uuid)`
  - Stable security definer SQL helper.
  - Checks for a matching `family_members` row with `role = 'owner'`.

## Implementation Notes And Constraints

- The frontend intentionally relies on existing Supabase RLS and triggers.
- No new database schema changes were made for Admin Settings, Activity History, visual refresh, or
  test tools.
- Admin Settings are local-only until a Supabase-backed settings table is added.
- Database has `families.quick_add_values` and `families.badges_enabled`, but current Admin Settings
  UI does not use them.
- Badge unlock is currently client-side after a successful transaction insert.
- Activity History badge display is inferred; there is no explicit `badge_unlocked_transaction_id`.
- The Add Points route file uses TanStack's `children.$childId_.add-points.tsx` separate-screen
  route pattern so `/children/$childId/add-points` is not nested under child home.
- The Activity History route follows the same separate-screen pattern.
- Badges Gallery was added as `/children/$childId/badges` using the same separate-screen route
  pattern in `src/routes/children.$childId_.badges.tsx`.
- Badges Gallery data sources:
  - `loadChildForUser(childId, user.id)` for child/family authorization and display data.
  - `badges` filtered to the supported names `First Points` and `First Reward`.
  - `child_badges` joined to `badges(id, name, description, icon)` for earned status and
    `earned_at`.
- Badges Gallery is read-only and makes no points, rewards, transaction, or badge-unlock logic
  changes.
- No schema changes were made for Badges Gallery.
- Do not remove `<Outlet />` from `src/routes/__root.tsx`; nested routes depend on it.
- Do not duplicate plugins already included by `@lovable.dev/vite-tanstack-config` in
  `vite.config.ts`.

## Known Issues / Risks

- The latest test tools include delete actions, but live RLS readout still did not list a DELETE
  policy for `transactions`. Verify Clear activity history as an authenticated family member. If it
  fails, add an appropriately narrow transactions delete policy, use a database function, or adjust
  the tool.
- Reset points directly updates `children.current_balance`; it does not reset
  `total_points_earned` or `total_rewards_redeemed`.
- Clearing transactions after balances have been changed by triggers can make historical totals and
  current balance inconsistent unless reset tools are used carefully.
- Admin Settings are per browser/device, not per family or shared user.
- Full lint has unrelated pre-existing formatting failures.
- Local browser verification of signed-in screens needs test credentials or a seeded auth state.
- Dashboard `dashboardBuildMarker` is intentionally visible but temporary.
- `YUMMY_CONTEXT.md` exists but is older/lighter than this file. Treat `PROJECT_CONTEXT.md` as the
  authoritative handoff.

## Suggested Next Steps

1. Push the latest local commits through GitHub Desktop when satisfied.
2. In Lovable/preview, log in with a test account and verify:
   - Admin Settings renders.
   - The Test child picker appears and can switch between children.
   - Add sample activity appears in Activity History.
   - Add sample badge-unlocking activity unlocks/shows First Points.
   - Reset points affects only the selected child.
   - Reset badges affects only the selected child.
   - Clear activity history works or exposes the expected RLS issue.
   - Reset all test data works or exposes the expected RLS issue.
3. If Clear activity history fails, add a narrow `transactions` DELETE policy for family members.
4. Move Admin Settings from localStorage to a Supabase-backed family settings model.
5. Add explicit badge activity history data if more badges are added.
6. Consider edit/archive controls for `reward_templates` once reward management grows beyond MVP
   creation/redemption.
7. Clean up pre-existing lint formatting errors so `npm run lint` can become a reliable gate.
8. Remove or hide `dashboardBuildMarker` once deployment confidence is no longer needed.
