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
