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
