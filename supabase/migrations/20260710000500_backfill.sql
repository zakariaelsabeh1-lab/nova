-- ============================================================================
-- 0005 · Backfill existing data into the new model. Idempotent & non-destructive.
--   • one default workspace, every profile becomes a member (owner = admin)
--   • existing boards attach to that workspace
--   • old `columns` (Kanban lanes) → `groups`
--   • old `tasks` → `items` (kept in their lane's group)
--   • default typed columns (Status, Owner, Priority, Due) created per board
--   • task fields backfilled into cell_values
-- Old tables are left untouched.
-- ============================================================================

do $$
declare
  ws_id   uuid;
  first_user uuid;
  b       record;
  c       record;
  t       record;
  g_id    uuid;
  col_status uuid;
  col_owner  uuid;
  col_prio   uuid;
  col_due    uuid;
  status_labels jsonb;
begin
  -- 1. Default workspace (only if none exists yet)
  select id into ws_id from public.workspaces limit 1;
  if ws_id is null then
    select id into first_user from public.profiles order by created_at limit 1;
    insert into public.workspaces (name, slug, owner_id)
    values ('My Workspace', 'my-workspace', first_user)
    returning id into ws_id;

    insert into public.subscriptions (workspace_id, plan, status)
    values (ws_id, 'free', 'active')
    on conflict (workspace_id) do nothing;
  end if;

  -- 2. Every profile is a member; workspace owner is admin, others members
  insert into public.workspace_members (workspace_id, user_id, role)
  select ws_id, p.id,
         case when p.id = (select owner_id from public.workspaces where id = ws_id)
              then 'admin'
              when p.role = 'admin' then 'admin'
              else 'member' end
  from public.profiles p
  on conflict (workspace_id, user_id) do nothing;

  -- 3. Attach workspace-less boards
  update public.boards set workspace_id = ws_id where workspace_id is null;

  -- 4. Per-board structural migration (skip boards already migrated)
  for b in select * from public.boards where workspace_id = ws_id loop
    continue when exists (select 1 from public.groups where board_id = b.id);

    -- 4a. lanes → groups, remember mapping via temp on the fly
    -- build status label→color map from lanes for the Status column
    select coalesce(jsonb_object_agg(c2.name, c2.color), '{}'::jsonb)
      into status_labels
      from public.columns c2 where c2.board_id = b.id;

    -- 4b. typed columns
    insert into public.board_columns (board_id, name, type, position, width, settings)
    values (b.id, 'Status', 'status', 0, 150,
            jsonb_build_object('labels', status_labels))
    returning id into col_status;
    insert into public.board_columns (board_id, name, type, position, width)
    values (b.id, 'Owner', 'person', 1, 140) returning id into col_owner;
    insert into public.board_columns (board_id, name, type, position, width)
    values (b.id, 'Priority', 'priority', 2, 120) returning id into col_prio;
    insert into public.board_columns (board_id, name, type, position, width)
    values (b.id, 'Due date', 'date', 3, 140) returning id into col_due;

    -- 4c. one group per lane, migrate its tasks into items + cells
    for c in select * from public.columns where board_id = b.id order by position loop
      insert into public.groups (board_id, name, color, position)
      values (b.id, c.name, c.color, c.position)
      returning id into g_id;

      for t in select * from public.tasks where column_id = c.id order by position loop
        with new_item as (
          insert into public.items (board_id, group_id, name, position, created_by, created_at)
          values (b.id, g_id, t.title, t.position, t.created_by, t.created_at)
          returning id
        )
        insert into public.cell_values (item_id, column_id, value)
        select ni.id, col, val from new_item ni,
        lateral (values
          (col_status, to_jsonb(c.name)),
          (col_owner,  case when t.assignee_id is null then null else to_jsonb(t.assignee_id::text) end),
          (col_prio,   to_jsonb(t.priority)),
          (col_due,    case when t.due_date is null then null else to_jsonb(t.due_date::text) end)
        ) as v(col, val)
        where val is not null;
      end loop;
    end loop;
  end loop;
end $$;
