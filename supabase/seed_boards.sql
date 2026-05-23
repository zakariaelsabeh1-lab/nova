-- Run this in Supabase SQL Editor to seed default boards + columns
-- Safe to run multiple times (skips if board type already exists)

DO $$
DECLARE
  admin_id  uuid;
  board_id  uuid;
BEGIN
  -- Use the first user (your account)
  SELECT id INTO admin_id FROM auth.users ORDER BY created_at LIMIT 1;

  -- Tasks board
  IF NOT EXISTS (SELECT 1 FROM public.boards WHERE type = 'tasks') THEN
    INSERT INTO public.boards (name, type, color, created_by)
    VALUES ('Tasks', 'tasks', '#0ea5e9', admin_id)
    RETURNING id INTO board_id;

    INSERT INTO public.columns (board_id, name, color, position) VALUES
    (board_id, 'Not Started', '#64748b', 0),
    (board_id, 'In Progress', '#0ea5e9', 1),
    (board_id, 'Review',      '#8b5cf6', 2),
    (board_id, 'Done',        '#22c55e', 3);
  END IF;

  -- Projects board
  IF NOT EXISTS (SELECT 1 FROM public.boards WHERE type = 'projects') THEN
    INSERT INTO public.boards (name, type, color, created_by)
    VALUES ('Projects', 'projects', '#8b5cf6', admin_id)
    RETURNING id INTO board_id;

    INSERT INTO public.columns (board_id, name, color, position) VALUES
    (board_id, 'Planning',  '#64748b', 0),
    (board_id, 'Active',    '#0ea5e9', 1),
    (board_id, 'Review',    '#8b5cf6', 2),
    (board_id, 'Complete',  '#22c55e', 3);
  END IF;

  -- Assignments board
  IF NOT EXISTS (SELECT 1 FROM public.boards WHERE type = 'assignments') THEN
    INSERT INTO public.boards (name, type, color, created_by)
    VALUES ('Assignments', 'assignments', '#f59e0b', admin_id)
    RETURNING id INTO board_id;

    INSERT INTO public.columns (board_id, name, color, position) VALUES
    (board_id, 'Unassigned',  '#64748b', 0),
    (board_id, 'Assigned',    '#0ea5e9', 1),
    (board_id, 'In Progress', '#f59e0b', 2),
    (board_id, 'Complete',    '#22c55e', 3);
  END IF;

  -- Vacation board
  IF NOT EXISTS (SELECT 1 FROM public.boards WHERE type = 'vacation') THEN
    INSERT INTO public.boards (name, type, color, created_by)
    VALUES ('Vacation', 'vacation', '#22c55e', admin_id)
    RETURNING id INTO board_id;

    INSERT INTO public.columns (board_id, name, color, position) VALUES
    (board_id, 'Pending',   '#64748b', 0),
    (board_id, 'Approved',  '#22c55e', 1),
    (board_id, 'Declined',  '#ef4444', 2);
  END IF;
END $$;
