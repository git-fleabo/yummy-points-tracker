drop policy if exists "Family members can delete transactions" on public.transactions;

create policy "Family members can delete transactions"
  on public.transactions
  for delete
  to authenticated
  using (
    public.is_family_member(family_id)
    and exists (
      select 1
      from public.children c
      where c.id = transactions.child_id
        and c.family_id = transactions.family_id
    )
  );
