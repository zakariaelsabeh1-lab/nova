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
