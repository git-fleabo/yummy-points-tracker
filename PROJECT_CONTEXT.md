# Yummy Points Project Context

Last updated: 2026-06-16

This file is the handoff document for Codex, Lovable, or any other assistant picking up the
project. Read this before making changes.

## Current State

- Product name in the app: Yummy Points / Yummy Tracker.
- Core idea: parents award points when a child misses a treat or experience; children can later use
  points for rewards.
- Current implementation supports auth, family bootstrap, child profiles, child home, adding
  points, First Points badge unlock, Activity History, Admin Settings, a brighter visual palette,
  and Admin Settings test tools.
- Latest local work added the Admin Settings "Test tools" section.
- Latest local work is not committed yet.
- Current uncommitted files:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routes/settings.tsx`
  - `/Users/noam/Documents/Codex/yummy-points-tracker/PROJECT_CONTEXT.md`
- Verification already run after latest change:
  - `npm run build` passes.
  - `npx eslint src/routes/settings.tsx` passes.
  - `git diff --check` passes.
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
- Do not commit automatically unless the user explicitly asks for a commit.
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
- Generated router tree:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/routeTree.gen.ts`
- Shared family/child loader:
  - `/Users/noam/Documents/Codex/yummy-points-tracker/src/lib/family-data.ts`
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
- Rewards and Journey currently appear as disabled coming-soon actions on the child home screen.
- Admin Settings are intentionally local-first for now.
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
- Add Points inserts a `transactions` row with:
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
- Add Points checks whether the child already has the badge before inserting into `child_badges`.
- First Points threshold is read from Admin Settings local storage.
- Badge errors are logged to the console and do not block the saved points transaction.
- The one-time child-home success message is passed through `sessionStorage` key
  `badge-unlocked-${child.id}`.

### Activity History

- Activity History shows transactions newest first for the selected child and family.
- Rows display date, activity name, points earned, and badge unlocked.
- Activity names come from `transactions.note` when present, otherwise a label derived from
  `transactions.type`.
- Activity History infers First Points display from existing `child_badges` records and the first
  positive transaction that reaches the current threshold.
- There is no explicit per-transaction badge reference yet.

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
- Sample actions currently target the first child in the family.
- "Add sample activity":
  - Inserts a normal `points_added` transaction.
  - Uses note `"Test sample activity"`.
  - Uses the first configured activity point value.
  - Appears in Activity History.
- "Add sample badge-unlocking activity":
  - Inserts a normal `points_added` transaction.
  - Uses note `"Test badge-unlocking activity"`.
  - Amount is enough to reach the current First Points threshold from the child's loaded balance,
    with a minimum of 1 point.
  - Checks for the `First Points` badge and inserts `child_badges` only if not already present.
  - Appears in Activity History.
- "Reset points":
  - Sets all child balances in the family to 0.
  - Leaves history in place.
- "Reset badges":
  - Deletes `child_badges` rows for the family's children.
  - Leaves history in place.
- "Clear activity history":
  - Deletes the family's `transactions` rows.
- "Reset all test data":
  - Deletes the family's `transactions` rows.
  - Deletes `child_badges` rows for the family's children.
  - Sets all child balances in the family to 0.

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
  - Not yet used by the frontend.
  - Child home has disabled Rewards/Journey actions.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `family_id uuid not null references families(id)`
  - `name text not null`
  - `point_cost integer not null`
  - `is_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Constraints:
  - `point_cost > 0`
- Foreign keys from:
  - `transactions.reward_template_id`
- Triggers:
  - `set_reward_templates_updated_at` before update executes `set_updated_at()`.
- RLS policies:
  - Family members can create, view, update, and delete rewards for their family.

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
- Important caveat:
  - There is no DELETE policy listed for child badges. If the reset-badges test tool fails, this is
    likely why.

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
- Do not remove `<Outlet />` from `src/routes/__root.tsx`; nested routes depend on it.
- Do not duplicate plugins already included by `@lovable.dev/vite-tanstack-config` in
  `vite.config.ts`.

## Known Issues / Risks

- The latest test tools include delete actions, but live RLS readout did not list DELETE policies for
  `transactions` or `child_badges`. Verify behavior as an authenticated family member. If deletion
  fails, add appropriate admin/test policies, use a database function, or adjust tools.
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

1. Review the latest uncommitted changes in GitHub Desktop.
2. Before committing, decide whether to keep the current test tools as-is or first fix the likely
   RLS gap for deleting `transactions` and `child_badges`.
3. Commit and push through GitHub Desktop when satisfied.
4. In Lovable/preview, log in with a test account and verify:
   - Admin Settings renders.
   - Add sample activity appears in Activity History.
   - Add sample badge-unlocking activity unlocks/shows First Points.
   - Reset points works.
   - Reset badges works or exposes the expected RLS issue.
   - Clear activity history works or exposes the expected RLS issue.
   - Reset all test data works or exposes the expected RLS issue.
5. Add a child selector to Test tools so sample data can target any child, not only the first child.
6. Move Admin Settings from localStorage to a Supabase-backed family settings model.
7. Add explicit badge activity history data if more badges are added.
8. Build the Rewards flow using the existing `reward_templates` table.
9. Clean up pre-existing lint formatting errors so `npm run lint` can become a reliable gate.
10. Remove or hide `dashboardBuildMarker` once deployment confidence is no longer needed.
