# Yummy Points

## Vision

Turn missed treats into future treats.

## Core Concept

When a child misses out on a treat or experience, parents award points. Children can later redeem
those points for rewards.

## Current Sprint Status

### Completed: Sprint 1 Family Dashboard

- Authenticated users land on `/dashboard`.
- Signed-out users are redirected to `/login`.
- A default family is created for new users when needed.
- The owner membership is created in `family_members`.
- Parents can add children from the dashboard.
- Dashboard shows family name, app title, tagline, sign out, and child cards.

### Completed: Sprint 2 Child Home + Add Points

- Dashboard child cards now open a child home screen.
- Parents can view an individual child's balance.
- Parents can award points through quick-add or custom amount entry.
- Points are saved as `transactions` rows.
- Child balances are left to the existing database trigger.
- The hidden `First Points` badge can be awarded after the first successful points transaction.

## Routes And Pages

- `/` - existing landing/index route.
- `/login` - Supabase email/password login.
- `/signup` - Supabase signup.
- `/dashboard` - family dashboard, family bootstrap, child list, add-child form.
- `/children/$childId` - child home screen with balance and parent actions.
- `/children/$childId/add-points` - add points form for a selected child.

## Product Decisions

- Multiple children are supported.
- Parent-defined points economy is supported through `families.point_name`.
- Parent-first experience remains the priority.
- Child home exists before child-facing mode.
- Rewards and Journey appear as disabled coming-soon actions in Sprint 2.
- Badges remain hidden; only a lightweight one-time unlock message is shown for First Points.
- Points entry has quick-add values and a custom amount.
- Points entry has an optional note only.
- No categories for point entries.
- No photos in v1.
- No streaks.
- No leaderboards.
- No notifications.
- No allergy management features.
- Avoid medical language.

## Database Usage

Existing Supabase tables are used without schema changes:

- `families`
  - Stores family name and custom point name.
  - New users get `name = "My Family"` and `point_name = "Yummy Points"`.
- `family_members`
  - Links authenticated users to families.
  - First membership is created with `role = "owner"`.
- `children`
  - Stores child profile, avatar fields, and current balance.
  - New dashboard-created children use `avatar_icon = "⭐"` and
    `avatar_colour = "soft-yellow"`.
- `transactions`
  - Add Points creates rows with `type = "points_added"`,
    positive `points_change`, optional `note`, `family_id`, and `child_id`.
  - Child balance updates are handled by the existing database trigger.
- `badges`
  - The First Points badge is found via `trigger_type = "first_points"`.
- `child_badges`
  - A row is inserted when a child earns First Points and does not already have it.

## Architectural Decisions

- Supabase Auth remains the source of session truth on protected routes.
- Protected route components check the current session client-side and redirect to `/login`.
- Child access is verified by loading the child, then confirming a matching `family_members`
  row for the logged-in user and the child's `family_id`.
- Shared child/family loading lives in `src/lib/family-data.ts`.
- Family creation avoids an RLS read-before-membership trap by generating the family id client-side,
  inserting the family without readback, then inserting the owner membership.
- The Add Points route is implemented as `children.$childId_.add-points.tsx` so TanStack Router
  treats `/children/$childId/add-points` as a separate screen rather than a nested child-home
  route requiring an `<Outlet />`.
- The implementation intentionally relies on existing RLS policies and database triggers.
- No database schema changes were made for Sprint 2.

## Tech Stack

- React
- TypeScript
- TanStack Router
- Supabase
- GitHub
- Lovable (hosting/preview only)

## Local Path

/Users/noam/Documents/Codex/yummy-points-tracker
