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
