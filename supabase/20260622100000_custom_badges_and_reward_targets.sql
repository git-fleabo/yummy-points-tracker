alter table public.badges
  add column if not exists family_id uuid null references public.families(id) on delete cascade,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.badges
  drop constraint if exists badges_name_key;

create unique index if not exists badges_global_name_unique
  on public.badges (lower(name))
  where family_id is null;

create unique index if not exists badges_family_name_unique
  on public.badges (family_id, lower(name))
  where family_id is not null;

create index if not exists badges_family_active_idx
  on public.badges (family_id, is_active);

update public.badges
set trigger_type = 'total_points_earned',
    trigger_value = greatest(trigger_value, 1),
    is_active = true,
    updated_at = now()
where name = 'First Points';

update public.badges
set trigger_type = 'rewards_redeemed',
    trigger_value = greatest(trigger_value, 1),
    is_active = true,
    updated_at = now()
where name = 'First Reward';

drop trigger if exists set_badges_updated_at on public.badges;
create trigger set_badges_updated_at
  before update on public.badges
  for each row execute function public.set_updated_at();

drop policy if exists "Anyone signed in can view badges" on public.badges;
drop policy if exists "Family members can view badges" on public.badges;
drop policy if exists "Family members can create badges" on public.badges;
drop policy if exists "Family members can update badges" on public.badges;

create policy "Family members can view badges"
  on public.badges
  for select
  to authenticated
  using (family_id is null or public.is_family_member(family_id));

create policy "Family members can create badges"
  on public.badges
  for insert
  to authenticated
  with check (family_id is not null and public.is_family_member(family_id));

create policy "Family members can update badges"
  on public.badges
  for update
  to authenticated
  using (family_id is not null and public.is_family_member(family_id))
  with check (family_id is not null and public.is_family_member(family_id));

create table if not exists public.reward_template_child_targets (
  reward_template_id uuid not null references public.reward_templates(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reward_template_id, child_id)
);

alter table public.reward_template_child_targets enable row level security;

insert into public.reward_template_child_targets (reward_template_id, child_id)
select id, child_id
from public.reward_templates
where child_id is not null
on conflict do nothing;

create index if not exists reward_template_child_targets_child_idx
  on public.reward_template_child_targets (child_id);

drop policy if exists "Family members can view reward targets" on public.reward_template_child_targets;
drop policy if exists "Family members can create reward targets" on public.reward_template_child_targets;
drop policy if exists "Family members can delete reward targets" on public.reward_template_child_targets;

create policy "Family members can view reward targets"
  on public.reward_template_child_targets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.reward_templates rt
      join public.children c on c.id = reward_template_child_targets.child_id
      where rt.id = reward_template_child_targets.reward_template_id
        and rt.family_id = c.family_id
        and public.is_family_member(rt.family_id)
    )
  );

create policy "Family members can create reward targets"
  on public.reward_template_child_targets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.reward_templates rt
      join public.children c on c.id = reward_template_child_targets.child_id
      where rt.id = reward_template_child_targets.reward_template_id
        and rt.family_id = c.family_id
        and public.is_family_member(rt.family_id)
    )
  );

create policy "Family members can delete reward targets"
  on public.reward_template_child_targets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.reward_templates rt
      join public.children c on c.id = reward_template_child_targets.child_id
      where rt.id = reward_template_child_targets.reward_template_id
        and rt.family_id = c.family_id
        and public.is_family_member(rt.family_id)
    )
  );
