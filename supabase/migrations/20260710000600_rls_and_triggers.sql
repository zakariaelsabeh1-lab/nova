-- ============================================================================
-- 0006 · RLS helpers, policies (workspace membership + role), plan enforcement,
--         updated_at triggers. SECURITY DEFINER helpers avoid policy recursion.
-- ============================================================================

-- ── Helper functions ────────────────────────────────────────────────────────
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid());
$$;

create or replace function public.workspace_role(ws uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from workspace_members where workspace_id = ws and user_id = auth.uid();
$$;

create or replace function public.can_read_board(b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from boards bo
    join workspace_members m on m.workspace_id = bo.workspace_id
    where bo.id = b and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_write_board(b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from boards bo
    join workspace_members m on m.workspace_id = bo.workspace_id
    where bo.id = b and m.user_id = auth.uid() and m.role in ('admin','member')
  );
$$;

create or replace function public.item_board(i uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select board_id from items where id = i;
$$;

-- ── Enable RLS on all new tables ────────────────────────────────────────────
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.board_favorites   enable row level security;
alter table public.groups            enable row level security;
alter table public.board_columns     enable row level security;
alter table public.items             enable row level security;
alter table public.subitems          enable row level security;
alter table public.cell_values       enable row level security;
alter table public.updates           enable row level security;
alter table public.activity_log      enable row level security;
alter table public.files             enable row level security;
alter table public.automations       enable row level security;
alter table public.automation_runs   enable row level security;

-- ── Workspaces ──────────────────────────────────────────────────────────────
drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select using (is_workspace_member(id));
drop policy if exists ws_insert on public.workspaces;
create policy ws_insert on public.workspaces for insert with check (auth.uid() = owner_id);
drop policy if exists ws_update on public.workspaces;
create policy ws_update on public.workspaces for update using (workspace_role(id) = 'admin');
drop policy if exists ws_delete on public.workspaces;
create policy ws_delete on public.workspaces for delete using (auth.uid() = owner_id);

-- ── Workspace members ───────────────────────────────────────────────────────
drop policy if exists wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select using (is_workspace_member(workspace_id));
drop policy if exists wm_write on public.workspace_members;
create policy wm_write on public.workspace_members for all
  using (workspace_role(workspace_id) = 'admin')
  with check (workspace_role(workspace_id) = 'admin');

-- ── Subscriptions (readable by members, mutated by server/admin) ────────────
drop policy if exists sub_select on public.subscriptions;
create policy sub_select on public.subscriptions for select using (is_workspace_member(workspace_id));
drop policy if exists sub_write on public.subscriptions;
create policy sub_write on public.subscriptions for all
  using (workspace_role(workspace_id) = 'admin')
  with check (workspace_role(workspace_id) = 'admin');

-- ── Board favorites (per-user) ──────────────────────────────────────────────
drop policy if exists fav_all on public.board_favorites;
create policy fav_all on public.board_favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Boards (replace the old permissive policies) ────────────────────────────
drop policy if exists "Boards viewable by authenticated"  on public.boards;
drop policy if exists "Boards creatable by authenticated" on public.boards;
drop policy if exists "Boards updatable by authenticated" on public.boards;
drop policy if exists "Boards insert by authenticated"    on public.boards;
drop policy if exists "Boards update by authenticated"    on public.boards;
drop policy if exists "Boards delete by authenticated"    on public.boards;
drop policy if exists boards_select on public.boards;
drop policy if exists boards_insert on public.boards;
drop policy if exists boards_update on public.boards;
drop policy if exists boards_delete on public.boards;
create policy boards_select on public.boards for select using (is_workspace_member(workspace_id));
create policy boards_insert on public.boards for insert
  with check (workspace_role(workspace_id) in ('admin','member'));
create policy boards_update on public.boards for update using (workspace_role(workspace_id) in ('admin','member'));
create policy boards_delete on public.boards for delete using (workspace_role(workspace_id) in ('admin','member'));

-- ── Generic board-scoped tables (groups, board_columns, items, automations) ─
do $$
declare tbl text;
begin
  foreach tbl in array array['groups','board_columns','items','automations'] loop
    execute format('drop policy if exists %I_select on public.%I;', tbl, tbl);
    execute format('drop policy if exists %I_write  on public.%I;', tbl, tbl);
    execute format('create policy %I_select on public.%I for select using (can_read_board(board_id));', tbl, tbl);
    execute format('create policy %I_write  on public.%I for all using (can_write_board(board_id)) with check (can_write_board(board_id));', tbl, tbl);
  end loop;
end $$;

-- ── Activity log (read by board members, insert by writers) ─────────────────
drop policy if exists activity_select on public.activity_log;
create policy activity_select on public.activity_log for select using (can_read_board(board_id));
drop policy if exists activity_insert on public.activity_log;
create policy activity_insert on public.activity_log for insert with check (can_write_board(board_id));

-- ── Item-scoped tables (subitems, cell_values, updates, files) ──────────────
drop policy if exists subitems_select on public.subitems;
create policy subitems_select on public.subitems for select using (can_read_board(item_board(parent_item_id)));
drop policy if exists subitems_write on public.subitems;
create policy subitems_write on public.subitems for all
  using (can_write_board(item_board(parent_item_id))) with check (can_write_board(item_board(parent_item_id)));

drop policy if exists cells_select on public.cell_values;
create policy cells_select on public.cell_values for select using (can_read_board(item_board(item_id)));
drop policy if exists cells_write on public.cell_values;
create policy cells_write on public.cell_values for all
  using (can_write_board(item_board(item_id))) with check (can_write_board(item_board(item_id)));

drop policy if exists updates_select on public.updates;
create policy updates_select on public.updates for select using (can_read_board(item_board(item_id)));
drop policy if exists updates_insert on public.updates;
create policy updates_insert on public.updates for insert
  with check (can_write_board(item_board(item_id)) and auth.uid() = user_id);
drop policy if exists updates_delete on public.updates;
create policy updates_delete on public.updates for delete using (auth.uid() = user_id);

drop policy if exists files_select on public.files;
create policy files_select on public.files for select using (is_workspace_member(workspace_id));
drop policy if exists files_write on public.files;
create policy files_write on public.files for all
  using (is_workspace_member(workspace_id) and workspace_role(workspace_id) in ('admin','member'))
  with check (is_workspace_member(workspace_id) and workspace_role(workspace_id) in ('admin','member'));

-- ── Automation runs (read by board members via parent automation) ───────────
drop policy if exists runs_select on public.automation_runs;
create policy runs_select on public.automation_runs for select using (
  exists (select 1 from automations a where a.id = automation_id and can_read_board(a.board_id))
);
drop policy if exists runs_insert on public.automation_runs;
create policy runs_insert on public.automation_runs for insert with check (
  exists (select 1 from automations a where a.id = automation_id and can_write_board(a.board_id))
);

-- ============================================================================
-- Plan-limit enforcement (server-side; client cannot bypass via direct API)
-- ============================================================================
create or replace function public.workspace_plan(ws uuid)
returns text language sql security definer stable set search_path = public as $$
  select coalesce((select plan from subscriptions where workspace_id = ws), 'free');
$$;

-- Boards: Free = max 2 per workspace
create or replace function public.enforce_board_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  if workspace_plan(new.workspace_id) = 'free' then
    select count(*) into cnt from boards where workspace_id = new.workspace_id;
    if cnt >= 2 then
      raise exception 'PLAN_LIMIT: Free plan is limited to 2 boards. Upgrade to Pro for unlimited boards.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_board_limit on public.boards;
create trigger trg_board_limit before insert on public.boards
  for each row execute function public.enforce_board_limit();

-- Members: Free = max 3 per workspace
create or replace function public.enforce_member_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  if workspace_plan(new.workspace_id) = 'free' then
    select count(*) into cnt from workspace_members where workspace_id = new.workspace_id;
    if cnt >= 3 then
      raise exception 'PLAN_LIMIT: Free plan is limited to 3 members. Upgrade to Pro for unlimited members.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_member_limit on public.workspace_members;
create trigger trg_member_limit before insert on public.workspace_members
  for each row execute function public.enforce_member_limit();

-- Automations: Free = max 5 per workspace (across all boards)
create or replace function public.enforce_automation_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int; ws uuid;
begin
  select workspace_id into ws from boards where id = new.board_id;
  if workspace_plan(ws) = 'free' then
    select count(*) into cnt from automations a
      join boards b on b.id = a.board_id where b.workspace_id = ws;
    if cnt >= 5 then
      raise exception 'PLAN_LIMIT: Free plan is limited to 5 automations. Upgrade to Pro for unlimited automations.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_automation_limit on public.automations;
create trigger trg_automation_limit before insert on public.automations
  for each row execute function public.enforce_automation_limit();

-- ============================================================================
-- updated_at triggers (reuse existing public.handle_updated_at)
-- ============================================================================
drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute procedure public.handle_updated_at();
drop trigger if exists items_updated_at on public.items;
create trigger items_updated_at before update on public.items
  for each row execute procedure public.handle_updated_at();
drop trigger if exists subitems_updated_at on public.subitems;
create trigger subitems_updated_at before update on public.subitems
  for each row execute procedure public.handle_updated_at();
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

-- Auto-create a workspace membership when a workspace is inserted (owner→admin)
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
