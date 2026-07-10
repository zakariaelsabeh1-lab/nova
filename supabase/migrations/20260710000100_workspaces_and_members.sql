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
