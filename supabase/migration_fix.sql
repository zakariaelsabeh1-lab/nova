-- ============================================================
-- Nova migration: indexes + column-seeding trigger + RLS fix + backfill
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Indexes
create index if not exists idx_tasks_board_id     on public.tasks(board_id);
create index if not exists idx_tasks_column_id    on public.tasks(column_id);
create index if not exists idx_tasks_assignee_id  on public.tasks(assignee_id);
create index if not exists idx_tasks_status       on public.tasks(status);
create index if not exists idx_columns_board_id   on public.columns(board_id);
create index if not exists idx_comments_task_id   on public.comments(task_id);
create index if not exists idx_notifications_user on public.notifications(user_id);

-- 2. RLS — split USING from WITH CHECK so inserts work cleanly
-- Drop old catch-all policies first
drop policy if exists "Boards creatable by authenticated"  on public.boards;
drop policy if exists "Boards updatable by authenticated"  on public.boards;
drop policy if exists "Columns manageable by authenticated" on public.columns;
drop policy if exists "Tasks manageable by authenticated"  on public.tasks;
drop policy if exists "Comments creatable by authenticated" on public.comments;
drop policy if exists "Comments deletable by owner"        on public.comments;

-- Boards
create policy "Boards insert by authenticated"
  on public.boards for insert
  with check (auth.role() = 'authenticated');

create policy "Boards update by authenticated"
  on public.boards for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Boards delete by authenticated"
  on public.boards for delete
  using (auth.role() = 'authenticated');

-- Columns
create policy "Columns insert by authenticated"
  on public.columns for insert
  with check (auth.role() = 'authenticated');

create policy "Columns update by authenticated"
  on public.columns for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Columns delete by authenticated"
  on public.columns for delete
  using (auth.role() = 'authenticated');

-- Tasks
create policy "Tasks insert by authenticated"
  on public.tasks for insert
  with check (auth.role() = 'authenticated');

create policy "Tasks update by authenticated"
  on public.tasks for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Tasks delete by authenticated"
  on public.tasks for delete
  using (auth.role() = 'authenticated');

-- Comments
create policy "Comments insert by owner"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Comments delete by owner"
  on public.comments for delete
  using (auth.uid() = user_id);

-- 3. Trigger: auto-seed columns when a board is created
create or replace function public.seed_board_columns()
returns trigger language plpgsql security definer as $$
begin
  case NEW.type
    when 'tasks' then
      insert into public.columns (board_id, name, color, position) values
        (NEW.id, 'Not Started', '#94a3b8', 0),
        (NEW.id, 'In Progress', '#0ea5e9', 1),
        (NEW.id, 'Review',      '#8b5cf6', 2),
        (NEW.id, 'Done',        '#22c55e', 3);
    when 'projects' then
      insert into public.columns (board_id, name, color, position) values
        (NEW.id, 'Planning',  '#94a3b8', 0),
        (NEW.id, 'Active',    '#0ea5e9', 1),
        (NEW.id, 'Review',    '#8b5cf6', 2),
        (NEW.id, 'Complete',  '#22c55e', 3);
    when 'assignments' then
      insert into public.columns (board_id, name, color, position) values
        (NEW.id, 'Unassigned',  '#94a3b8', 0),
        (NEW.id, 'Assigned',    '#f59e0b', 1),
        (NEW.id, 'In Progress', '#0ea5e9', 2),
        (NEW.id, 'Complete',    '#22c55e', 3);
    when 'vacation' then
      insert into public.columns (board_id, name, color, position) values
        (NEW.id, 'Pending',   '#f59e0b', 0),
        (NEW.id, 'Approved',  '#22c55e', 1),
        (NEW.id, 'Declined',  '#ef4444', 2);
    else
      insert into public.columns (board_id, name, color, position) values
        (NEW.id, 'To Do',       '#94a3b8', 0),
        (NEW.id, 'In Progress', '#0ea5e9', 1),
        (NEW.id, 'Done',        '#22c55e', 2);
  end case;
  return NEW;
end;
$$;

drop trigger if exists on_board_created on public.boards;
create trigger on_board_created
  after insert on public.boards
  for each row execute procedure public.seed_board_columns();

-- 4. Backfill columns for boards that have none
do $$
declare
  b record;
begin
  for b in
    select id, type from public.boards
    where id not in (select distinct board_id from public.columns)
  loop
    case b.type
      when 'tasks' then
        insert into public.columns (board_id, name, color, position) values
          (b.id, 'Not Started', '#94a3b8', 0),
          (b.id, 'In Progress', '#0ea5e9', 1),
          (b.id, 'Review',      '#8b5cf6', 2),
          (b.id, 'Done',        '#22c55e', 3);
      when 'projects' then
        insert into public.columns (board_id, name, color, position) values
          (b.id, 'Planning',  '#94a3b8', 0),
          (b.id, 'Active',    '#0ea5e9', 1),
          (b.id, 'Review',    '#8b5cf6', 2),
          (b.id, 'Complete',  '#22c55e', 3);
      when 'assignments' then
        insert into public.columns (board_id, name, color, position) values
          (b.id, 'Unassigned',  '#94a3b8', 0),
          (b.id, 'Assigned',    '#f59e0b', 1),
          (b.id, 'In Progress', '#0ea5e9', 2),
          (b.id, 'Complete',    '#22c55e', 3);
      when 'vacation' then
        insert into public.columns (board_id, name, color, position) values
          (b.id, 'Pending',   '#f59e0b', 0),
          (b.id, 'Approved',  '#22c55e', 1),
          (b.id, 'Declined',  '#ef4444', 2);
      else
        insert into public.columns (board_id, name, color, position) values
          (b.id, 'To Do',       '#94a3b8', 0),
          (b.id, 'In Progress', '#0ea5e9', 1),
          (b.id, 'Done',        '#22c55e', 2);
    end case;
  end loop;
end $$;
