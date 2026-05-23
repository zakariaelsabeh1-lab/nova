-- ============================================================
-- Nova: Complete idempotent migration — safe to run multiple times
-- Run in Supabase SQL Editor (postgres role, bypasses RLS)
-- ============================================================

-- ── 1. Indexes ─────────────────────────────────────────────
create index if not exists idx_tasks_board_id     on public.tasks(board_id);
create index if not exists idx_tasks_column_id    on public.tasks(column_id);
create index if not exists idx_tasks_assignee_id  on public.tasks(assignee_id);
create index if not exists idx_tasks_status       on public.tasks(status);
create index if not exists idx_columns_board_id   on public.columns(board_id);
create index if not exists idx_comments_task_id   on public.comments(task_id);
create index if not exists idx_notifications_user on public.notifications(user_id);

-- ── 2. RLS — drop ALL possible old names then recreate ────────
-- Boards
drop policy if exists "Boards creatable by authenticated"  on public.boards;
drop policy if exists "Boards updatable by authenticated"  on public.boards;
drop policy if exists "Boards insert by authenticated"     on public.boards;
drop policy if exists "Boards update by authenticated"     on public.boards;
drop policy if exists "Boards delete by authenticated"     on public.boards;
drop policy if exists "Boards readable by authenticated"   on public.boards;

create policy "Boards insert by authenticated"
  on public.boards for insert with check (auth.role() = 'authenticated');
create policy "Boards update by authenticated"
  on public.boards for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Boards delete by authenticated"
  on public.boards for delete using (auth.role() = 'authenticated');

-- Columns
drop policy if exists "Columns manageable by authenticated" on public.columns;
drop policy if exists "Columns insert by authenticated"     on public.columns;
drop policy if exists "Columns update by authenticated"     on public.columns;
drop policy if exists "Columns delete by authenticated"     on public.columns;

create policy "Columns insert by authenticated"
  on public.columns for insert with check (auth.role() = 'authenticated');
create policy "Columns update by authenticated"
  on public.columns for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Columns delete by authenticated"
  on public.columns for delete using (auth.role() = 'authenticated');

-- Tasks
drop policy if exists "Tasks manageable by authenticated"  on public.tasks;
drop policy if exists "Tasks insert by authenticated"      on public.tasks;
drop policy if exists "Tasks update by authenticated"      on public.tasks;
drop policy if exists "Tasks delete by authenticated"      on public.tasks;

create policy "Tasks insert by authenticated"
  on public.tasks for insert with check (auth.role() = 'authenticated');
create policy "Tasks update by authenticated"
  on public.tasks for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Tasks delete by authenticated"
  on public.tasks for delete using (auth.role() = 'authenticated');

-- Comments
drop policy if exists "Comments creatable by authenticated" on public.comments;
drop policy if exists "Comments deletable by owner"         on public.comments;
drop policy if exists "Comments insert by owner"            on public.comments;
drop policy if exists "Comments delete by owner"            on public.comments;

create policy "Comments insert by owner"
  on public.comments for insert with check (auth.uid() = user_id);
create policy "Comments delete by owner"
  on public.comments for delete using (auth.uid() = user_id);

-- ── 3. Column-seeding trigger (for new boards) ─────────────
create or replace function public.seed_board_columns()
returns trigger language plpgsql security definer as $$
begin
  case new.type
    when 'tasks' then
      insert into public.columns (board_id, name, color, position) values
        (new.id, 'Not Started', '#64748b', 0),
        (new.id, 'In Progress', '#0ea5e9', 1),
        (new.id, 'Review',      '#8b5cf6', 2),
        (new.id, 'Done',        '#22c55e', 3);
    when 'projects' then
      insert into public.columns (board_id, name, color, position) values
        (new.id, 'Planning',  '#64748b', 0),
        (new.id, 'Active',    '#0ea5e9', 1),
        (new.id, 'Review',    '#8b5cf6', 2),
        (new.id, 'Complete',  '#22c55e', 3);
    when 'assignments' then
      insert into public.columns (board_id, name, color, position) values
        (new.id, 'Unassigned',  '#64748b', 0),
        (new.id, 'Assigned',    '#f59e0b', 1),
        (new.id, 'In Progress', '#0ea5e9', 2),
        (new.id, 'Complete',    '#22c55e', 3);
    when 'vacation' then
      insert into public.columns (board_id, name, color, position) values
        (new.id, 'Pending',  '#f59e0b', 0),
        (new.id, 'Approved', '#22c55e', 1),
        (new.id, 'Declined', '#ef4444', 2);
    else
      insert into public.columns (board_id, name, color, position) values
        (new.id, 'To Do',       '#64748b', 0),
        (new.id, 'In Progress', '#0ea5e9', 1),
        (new.id, 'Done',        '#22c55e', 2);
  end case;
  return new;
end;
$$;

drop trigger if exists on_board_created on public.boards;
create trigger on_board_created
  after insert on public.boards
  for each row execute function public.seed_board_columns();

-- ── 4. DIRECT backfill for every existing board right now ───
-- Tasks boards
insert into public.columns (board_id, name, color, position)
select b.id, v.name, v.color, v.pos
from public.boards b
cross join (values
  ('Not Started', '#64748b', 0),
  ('In Progress', '#0ea5e9', 1),
  ('Review',      '#8b5cf6', 2),
  ('Done',        '#22c55e', 3)
) as v(name, color, pos)
where b.type = 'tasks'
  and not exists (select 1 from public.columns where board_id = b.id)
on conflict do nothing;

-- Projects boards
insert into public.columns (board_id, name, color, position)
select b.id, v.name, v.color, v.pos
from public.boards b
cross join (values
  ('Planning',  '#64748b', 0),
  ('Active',    '#0ea5e9', 1),
  ('Review',    '#8b5cf6', 2),
  ('Complete',  '#22c55e', 3)
) as v(name, color, pos)
where b.type = 'projects'
  and not exists (select 1 from public.columns where board_id = b.id)
on conflict do nothing;

-- Assignments boards
insert into public.columns (board_id, name, color, position)
select b.id, v.name, v.color, v.pos
from public.boards b
cross join (values
  ('Unassigned',  '#64748b', 0),
  ('Assigned',    '#f59e0b', 1),
  ('In Progress', '#0ea5e9', 2),
  ('Complete',    '#22c55e', 3)
) as v(name, color, pos)
where b.type = 'assignments'
  and not exists (select 1 from public.columns where board_id = b.id)
on conflict do nothing;

-- Vacation boards
insert into public.columns (board_id, name, color, position)
select b.id, v.name, v.color, v.pos
from public.boards b
cross join (values
  ('Pending',  '#f59e0b', 0),
  ('Approved', '#22c55e', 1),
  ('Declined', '#ef4444', 2)
) as v(name, color, pos)
where b.type = 'vacation'
  and not exists (select 1 from public.columns where board_id = b.id)
on conflict do nothing;

-- Generic fallback (any other type)
insert into public.columns (board_id, name, color, position)
select b.id, v.name, v.color, v.pos
from public.boards b
cross join (values
  ('To Do',       '#64748b', 0),
  ('In Progress', '#0ea5e9', 1),
  ('Done',        '#22c55e', 2)
) as v(name, color, pos)
where b.type not in ('tasks', 'projects', 'assignments', 'vacation')
  and not exists (select 1 from public.columns where board_id = b.id)
on conflict do nothing;
