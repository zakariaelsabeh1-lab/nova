-- ============================================================================
-- 0008 · Scope invites to a workspace and allow the viewer role.
-- ============================================================================

alter table public.invites add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.invites drop constraint if exists invites_role_check;
alter table public.invites add constraint invites_role_check
  check (role in ('admin', 'member', 'viewer'));

create index if not exists idx_invites_workspace on public.invites(workspace_id);

-- Members can see invites for their workspace; admins manage them.
drop policy if exists "Admins can manage invites" on public.invites;
drop policy if exists invites_select on public.invites;
drop policy if exists invites_write on public.invites;

create policy invites_select on public.invites for select
  using (workspace_id is null or is_workspace_member(workspace_id));
create policy invites_write on public.invites for all
  using (workspace_id is not null and workspace_role(workspace_id) = 'admin')
  with check (workspace_id is not null and workspace_role(workspace_id) = 'admin');
