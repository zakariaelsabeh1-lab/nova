-- ============================================================================
-- Nova — full one-shot setup for a fresh Supabase project.
-- Paste this entire file into the Supabase SQL editor and Run.
-- Generated from supabase/schema.sql + supabase/migrations/*.sql
-- ============================================================================

-- Nova schema
-- Run in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- Boards
create table public.boards (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('tasks', 'projects', 'assignments', 'vacation')),
  description text,
  color text not null default '#0ea5e9',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns
create table public.columns (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references public.boards(id) on delete cascade not null,
  name text not null,
  color text not null default '#94a3b8',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references public.boards(id) on delete cascade not null,
  column_id uuid references public.columns(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  due_date date,
  position integer not null default 0,
  labels text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('mention', 'assignment', 'digest')),
  title text not null,
  body text not null,
  read boolean not null default false,
  task_id uuid references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Invites
create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references public.profiles(id) on delete set null,
  used boolean not null default false,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.invites enable row level security;

-- Profiles: users see all, only update own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Boards: all authenticated users can read/write
create policy "Boards viewable by authenticated"
  on public.boards for select using (auth.role() = 'authenticated');

create policy "Boards creatable by authenticated"
  on public.boards for insert with check (auth.role() = 'authenticated');

create policy "Boards updatable by authenticated"
  on public.boards for update using (auth.role() = 'authenticated');

-- Columns: all authenticated
create policy "Columns viewable by authenticated"
  on public.columns for select using (auth.role() = 'authenticated');

create policy "Columns manageable by authenticated"
  on public.columns for all using (auth.role() = 'authenticated');

-- Tasks: all authenticated
create policy "Tasks viewable by authenticated"
  on public.tasks for select using (auth.role() = 'authenticated');

create policy "Tasks manageable by authenticated"
  on public.tasks for all using (auth.role() = 'authenticated');

-- Comments: all authenticated
create policy "Comments viewable by authenticated"
  on public.comments for select using (auth.role() = 'authenticated');

create policy "Comments creatable by authenticated"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Comments deletable by owner"
  on public.comments for delete using (auth.uid() = user_id);

-- Notifications: users see own
create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- Invites: admins manage
create policy "Admins can manage invites"
  on public.invites for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- Triggers
-- ============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create trigger boards_updated_at before update on public.boards
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- Seed default boards
-- ============================================

-- Insert boards after first admin signs up (run manually)
-- insert into public.boards (name, type, description, color, created_by)
-- select 'Tasks', 'tasks', 'Daily operational tasks', '#0ea5e9', id from public.profiles where role = 'admin' limit 1;

-- ==================== migration: 20260710000100_workspaces_and_members.sql ====================
-- ============================================================================
-- 0001 · Workspaces + membership + plan subscriptions
-- Additive. Introduces the workspace layer that all board data hangs off of.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ── Workspaces ──────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null default 'My Workspace',
  slug        text unique,
  owner_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Membership (role is enforced in RLS across every board table) ───────────
create table if not exists public.workspace_members (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_ws_members_ws   on public.workspace_members(workspace_id);
create index if not exists idx_ws_members_user on public.workspace_members(user_id);

-- ── Subscriptions (one per workspace) ───────────────────────────────────────
create table if not exists public.subscriptions (
  id                     uuid primary key default uuid_generate_v4(),
  workspace_id           uuid not null unique references public.workspaces(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  status                 text not null default 'active',
  seats                  integer not null default 1,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_subscriptions_ws on public.subscriptions(workspace_id);

-- ── Per-user board favorites ────────────────────────────────────────────────
create table if not exists public.board_favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  board_id   uuid not null references public.boards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, board_id)
);

-- ── Extend boards with workspace + template metadata ────────────────────────
alter table public.boards add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.boards add column if not exists template     text;
alter table public.boards add column if not exists position     integer not null default 0;

create index if not exists idx_boards_workspace on public.boards(workspace_id);

-- ==================== migration: 20260710000200_board_structure.sql ====================
-- ============================================================================
-- 0002 · Board structure: groups, typed columns, items, subitems, cell values
-- The old `columns` table (Kanban lanes) and `tasks` are preserved; the new
-- model is populated from them in migration 0006.
-- ============================================================================

-- ── Groups (collapsible colored row sections) ───────────────────────────────
create table if not exists public.groups (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  name        text not null default 'New Group',
  color       text not null default '#0ea5e9',
  position    integer not null default 0,
  collapsed   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_groups_board on public.groups(board_id);

-- ── Typed board columns (spreadsheet fields) ────────────────────────────────
-- type ∈ text | status | person | date | timeline | number | priority | checkbox | last_updated
-- settings holds type-specific config, e.g. status label→color map, number unit.
create table if not exists public.board_columns (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  name        text not null,
  type        text not null default 'text'
              check (type in ('text','status','person','date','timeline','number','priority','checkbox','last_updated')),
  position    integer not null default 0,
  width       integer not null default 160,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_board_columns_board on public.board_columns(board_id);

-- ── Items (rows) ────────────────────────────────────────────────────────────
create table if not exists public.items (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  group_id    uuid not null references public.groups(id) on delete cascade,
  name        text not null default '',
  position    integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_items_board on public.items(board_id);
create index if not exists idx_items_group on public.items(group_id);

-- ── Subitems ────────────────────────────────────────────────────────────────
create table if not exists public.subitems (
  id             uuid primary key default uuid_generate_v4(),
  parent_item_id uuid not null references public.items(id) on delete cascade,
  name           text not null default '',
  position       integer not null default 0,
  values         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_subitems_parent on public.subitems(parent_item_id);

-- ── Cell values (one row per item×column) ───────────────────────────────────
create table if not exists public.cell_values (
  item_id     uuid not null references public.items(id) on delete cascade,
  column_id   uuid not null references public.board_columns(id) on delete cascade,
  value       jsonb,
  updated_at  timestamptz not null default now(),
  primary key (item_id, column_id)
);
create index if not exists idx_cell_values_item   on public.cell_values(item_id);
create index if not exists idx_cell_values_column on public.cell_values(column_id);

-- ==================== migration: 20260710000300_collaboration.sql ====================
-- ============================================================================
-- 0003 · Collaboration: updates (threaded), activity log, files
-- ============================================================================

-- ── Updates (threaded comments on an item) ──────────────────────────────────
create table if not exists public.updates (
  id           uuid primary key default uuid_generate_v4(),
  item_id      uuid not null references public.items(id) on delete cascade,
  parent_id    uuid references public.updates(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  body         text not null,
  mentions     uuid[] not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists idx_updates_item   on public.updates(item_id);
create index if not exists idx_updates_parent on public.updates(parent_id);

-- ── Activity log (who / what / old / new / when) ────────────────────────────
create table if not exists public.activity_log (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  item_id     uuid references public.items(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,            -- created | updated | deleted | moved | commented ...
  field       text,                     -- column name / attribute affected
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_activity_board on public.activity_log(board_id);
create index if not exists idx_activity_item  on public.activity_log(item_id);

-- ── Files (metadata; blobs live in Supabase Storage bucket "attachments") ───
create table if not exists public.files (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id      uuid references public.items(id) on delete cascade,
  name         text not null,
  path         text not null,           -- storage object path
  mime         text,
  size_bytes   bigint not null default 0,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_files_item on public.files(item_id);
create index if not exists idx_files_ws   on public.files(workspace_id);

-- ==================== migration: 20260710000400_automations_notifications.sql ====================
-- ============================================================================
-- 0004 · Automations + automation runs + notifications rework
-- ============================================================================

-- ── Automations (recipe: WHEN trigger THEN actions) ─────────────────────────
-- trigger example: {"type":"status_changes","columnId":"…","to":"Done"}
-- actions example: [{"type":"notify_person","columnId":"…"},
--                   {"type":"move_to_group","groupId":"…"},
--                   {"type":"set_date","columnId":"…","value":"today"}]
create table if not exists public.automations (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  name        text not null,
  trigger     jsonb not null,
  actions     jsonb not null default '[]'::jsonb,
  enabled     boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_automations_board on public.automations(board_id);

-- ── Automation run log ──────────────────────────────────────────────────────
create table if not exists public.automation_runs (
  id             uuid primary key default uuid_generate_v4(),
  automation_id  uuid not null references public.automations(id) on delete cascade,
  item_id        uuid references public.items(id) on delete set null,
  status         text not null default 'success' check (status in ('success','error')),
  detail         text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_automation_runs_automation on public.automation_runs(automation_id);

-- ── Notifications rework (additive columns on the existing table) ───────────
alter table public.notifications add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.notifications add column if not exists actor_id     uuid references public.profiles(id) on delete set null;
alter table public.notifications add column if not exists item_id      uuid references public.items(id) on delete cascade;
alter table public.notifications add column if not exists board_id     uuid references public.boards(id) on delete cascade;
alter table public.notifications add column if not exists link         text;

-- Broaden the allowed notification types (mention | assignment | automation | digest)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('mention','assignment','automation','digest'));

create index if not exists idx_notifications_user_read on public.notifications(user_id, read);

-- ==================== migration: 20260710000500_backfill.sql ====================
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
    -- Prefer an existing admin as the owner; deterministic tiebreak on created_at then id.
    select id into first_user from public.profiles
      order by (role = 'admin') desc, created_at asc, id asc
      limit 1;
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

-- ==================== migration: 20260710000600_rls_and_triggers.sql ====================
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

-- ==================== migration: 20260710000700_storage.sql ====================
-- ============================================================================
-- 0007 · Storage buckets for avatars (public) and attachments (authenticated)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Avatars: anyone can read; a user may write only under their own {uid}/ prefix
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Attachments: any authenticated user may read/write (fine-grained board checks
-- are enforced on the files metadata table; objects are namespaced by workspace)
drop policy if exists "attachments read" on storage.objects;
create policy "attachments read" on storage.objects
  for select using (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments write" on storage.objects;
create policy "attachments write" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments delete" on storage.objects;
create policy "attachments delete" on storage.objects
  for delete using (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- ==================== migration: 20260710000800_invites_workspace.sql ====================
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

-- ==================== migration: 20260710000900_realtime.sql ====================
-- ============================================================================
-- 0009 · Add board tables to the realtime publication so client subscriptions
-- receive change events. Guarded so re-running is safe.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array['items', 'groups', 'board_columns', 'cell_values', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ==================== migration: 20260710001000_profiles_self_heal.sql ====================
-- ============================================================================
-- 0010 · Let a signed-in user create their OWN profile row.
-- Accounts created before the handle_new_user trigger existed have no profile,
-- which breaks workspace creation (owner_id FK + RLS). With this policy the app
-- can self-heal by inserting the missing profile on login.
-- ============================================================================

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

-- ==================== migration: 20260710001100_workspace_select_owner.sql ====================
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

-- ==================== migration: 20260710001200_owner_full_access.sql ====================
-- ============================================================================
-- 0012 · App-owner full access.
--
-- Plan limits are enforced server-side by enforce_board_limit / _member_limit /
-- _automation_limit, all of which read workspace_plan(). To give the app owner
-- unlimited access without paying (for ownership + testing), workspace_plan()
-- returns 'pro' for any workspace whose owner is in the allowlist below. Keep the
-- email list in sync with SUPER_OWNER_EMAILS in src/lib/plan.ts.
-- Idempotent (create or replace).
-- ============================================================================

create or replace function public.workspace_plan(ws uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when exists (
      select 1
      from workspaces w
      join profiles p on p.id = w.owner_id
      where w.id = ws
        and lower(p.email) = any (array['zack.elsabeh@hotmail.com'])
    ) then 'pro'
    else coalesce((select plan from subscriptions where workspace_id = ws), 'free')
  end;
$$;

-- Reflect Pro on the owner's existing subscriptions so the Billing page and any
-- direct subscription reads show Pro too (not just the plan-limit checks).
update public.subscriptions s
set plan = 'pro', status = 'active', updated_at = now()
from public.workspaces w
join public.profiles p on p.id = w.owner_id
where s.workspace_id = w.id
  and lower(p.email) = 'zack.elsabeh@hotmail.com';

-- ==================== migration: 20260710001300_redeem_invites.sql ====================
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
