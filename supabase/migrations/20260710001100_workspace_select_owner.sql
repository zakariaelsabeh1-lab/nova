-- ============================================================================
-- 0011 · Fix "cannot create workspace" — broaden the workspaces SELECT policy.
--
-- Symptom: onboarding calls `insert(workspace).select().single()`. PostgREST runs
-- INSERT ... RETURNING and then applies the ws_select policy to return the row.
-- The old policy only allowed members (`is_workspace_member(id)`), but the owner's
-- membership row is created by the handle_new_workspace AFTER-INSERT trigger, which
-- is NOT visible to the same statement's RETURNING. Result: the workspace row is
-- created, but the SELECT-back returns 0 rows and the client throws
-- (`POST /rest/v1/workspaces?select=* → PGRST116 / "0 rows"`), so onboarding fails.
--
-- Fix: let the owner read their own workspace directly. The just-inserted row has
-- owner_id = auth.uid() (available in the same statement), so it is returned
-- immediately, while members still see workspaces they belong to.
-- Additive and idempotent.
-- ============================================================================

drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select
  using (owner_id = auth.uid() or is_workspace_member(id));

-- Re-assert the owner→admin membership + free subscription trigger, in case an
-- earlier migration run applied the policies but not this trigger. Idempotent.
create or replace function public.handle_new_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (new.id, new.owner_id, 'admin')
    on conflict (workspace_id, user_id) do nothing;
    insert into public.subscriptions (workspace_id, plan, status)
    values (new.id, 'free', 'active')
    on conflict (workspace_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created after insert on public.workspaces
  for each row execute function public.handle_new_workspace();
