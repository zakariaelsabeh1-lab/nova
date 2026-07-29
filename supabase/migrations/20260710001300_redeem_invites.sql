-- ============================================================================
-- 0013 · Auto-join invited users on sign-up.
--
-- When an admin invites an email that has no account yet, a row is stored in
-- `invites`. This function lets that person, once they sign up, join every
-- workspace they were invited to. It runs SECURITY DEFINER so a brand-new user
-- (not yet a member of the workspace) can be added despite RLS, and it matches
-- on the caller's own email only. Idempotent.
-- ============================================================================

create or replace function public.redeem_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  em  text;
  cnt int := 0;
  inv record;
begin
  if uid is null then return 0; end if;

  select email into em from public.profiles where id = uid;
  if em is null then select email into em from auth.users where id = uid; end if;
  if em is null then return 0; end if;

  for inv in
    select * from public.invites
    where lower(email) = lower(em) and coalesce(used, false) = false and workspace_id is not null
  loop
    begin
      insert into public.workspace_members (workspace_id, user_id, role)
      values (inv.workspace_id, uid, inv.role)
      on conflict (workspace_id, user_id) do nothing;
      update public.invites set used = true where id = inv.id;
      cnt := cnt + 1;
    exception when others then
      -- e.g. the workspace's plan member-limit is hit; leave the invite pending.
      null;
    end;
  end loop;

  return cnt;
end $$;

grant execute on function public.redeem_invites() to authenticated;
