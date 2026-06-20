alter table public.reward_templates
  add column if not exists child_id uuid null references public.children(id) on delete cascade;

create index if not exists reward_templates_family_child_idx
  on public.reward_templates (family_id, child_id);

drop policy if exists "Family members can create rewards" on public.reward_templates;
create policy "Family members can create rewards"
  on public.reward_templates
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and (
      child_id is null
      or exists (
        select 1
        from public.children
        where children.id = reward_templates.child_id
          and children.family_id = reward_templates.family_id
      )
    )
  );

drop policy if exists "Family members can update rewards" on public.reward_templates;
create policy "Family members can update rewards"
  on public.reward_templates
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and (
      child_id is null
      or exists (
        select 1
        from public.children
        where children.id = reward_templates.child_id
          and children.family_id = reward_templates.family_id
      )
    )
  );
