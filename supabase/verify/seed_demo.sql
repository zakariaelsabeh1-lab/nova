-- ============================================================================
-- Optional PERSISTENT demo data for manual QA on a staging project.
-- Idempotent: does nothing if the demo workspace already exists.
-- Note: this seeds a profile + workspace + board directly. To actually log in,
-- create the auth user's password via the Supabase dashboard or auth API for
-- demo@nova.test (this script only creates the auth.users row).
-- ============================================================================

do $$
declare
  demo_uid uuid := '00000000-0000-0000-0000-0000000000de';
  ws   uuid;
  grp  uuid;
  scol uuid; pcol uuid; dcol uuid;
  it   uuid;
begin
  if exists (select 1 from public.workspaces where slug = 'demo-workspace') then
    raise notice 'demo workspace already exists — skipping';
    return;
  end if;

  insert into auth.users (id, email, raw_user_meta_data)
    values (demo_uid, 'demo@nova.test', '{"full_name":"Demo User"}')
    on conflict (id) do nothing;

  insert into public.workspaces (name, slug, owner_id) values ('Demo Workspace', 'demo-workspace', demo_uid)
    returning id into ws;  -- trigger adds owner membership + free subscription

  insert into public.boards (workspace_id, name, type, color, created_by, template)
    values (ws, 'Project Plan', 'projects', '#0ea5e9', demo_uid, 'project_plan')
    returning id into ws;  -- reuse var name is fine; capture below instead
end $$;

-- Populate the demo board (kept simple + explicit).
do $$
declare
  b uuid; g1 uuid; g2 uuid;
  scol uuid; pcol uuid; dcol uuid;
  owner_uid uuid := '00000000-0000-0000-0000-0000000000de';
begin
  select id into b from public.boards where template = 'project_plan'
    and workspace_id = (select id from public.workspaces where slug = 'demo-workspace') limit 1;
  if b is null then return; end if;
  if exists (select 1 from public.groups where board_id = b) then return; end if;

  insert into public.board_columns (board_id, name, type, position, settings) values
    (b, 'Status', 'status', 0, '{"labels":{"Not started":"#94a3b8","Working on it":"#f59e0b","Done":"#22c55e"}}') returning id into scol;
  insert into public.board_columns (board_id, name, type, position) values (b, 'Owner', 'person', 1) returning id into pcol;
  insert into public.board_columns (board_id, name, type, position) values (b, 'Due date', 'date', 2) returning id into dcol;

  insert into public.groups (board_id, name, color, position) values (b, 'Discovery', '#0ea5e9', 0) returning id into g1;
  insert into public.groups (board_id, name, color, position) values (b, 'Launch', '#22c55e', 1) returning id into g2;

  insert into public.items (board_id, group_id, name, position, created_by) values (b, g1, 'Kickoff', 0, owner_uid);
  insert into public.items (board_id, group_id, name, position, created_by) values (b, g1, 'Research', 1, owner_uid);
  insert into public.items (board_id, group_id, name, position, created_by) values (b, g2, 'Ship v1', 0, owner_uid);

  insert into public.cell_values (item_id, column_id, value)
  select i.id, scol, to_jsonb('Working on it'::text) from public.items i where i.board_id = b and i.group_id = g1;
  insert into public.cell_values (item_id, column_id, value)
  select i.id, pcol, to_jsonb(owner_uid::text) from public.items i where i.board_id = b;

  raise notice 'demo workspace + board seeded';
end $$;
