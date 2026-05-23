-- Run after schema.sql
-- Creates the 4 default boards
-- Replace <your-admin-user-id> with the UUID of your admin user from auth.users

DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin profile found. Sign up first, then run this seed.';
    RETURN;
  END IF;

  INSERT INTO public.boards (name, type, description, color, created_by) VALUES
    ('Tasks', 'tasks', 'Daily operational tasks', '#0ea5e9', admin_id),
    ('Projects', 'projects', 'Active project pipelines', '#8b5cf6', admin_id),
    ('Assignments', 'assignments', 'Team assignments & reviews', '#f59e0b', admin_id),
    ('Vacation', 'vacation', 'Time-off & leave requests', '#22c55e', admin_id)
  ON CONFLICT DO NOTHING;

  -- Default columns for each board
  INSERT INTO public.columns (board_id, name, color, position)
  SELECT b.id, col.name, col.color, col.pos
  FROM public.boards b
  CROSS JOIN (VALUES
    ('To Do', '#94a3b8', 0),
    ('In Progress', '#0ea5e9', 1),
    ('Review', '#8b5cf6', 2),
    ('Done', '#22c55e', 3)
  ) AS col(name, color, pos)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed complete. Boards and columns created.';
END $$;
