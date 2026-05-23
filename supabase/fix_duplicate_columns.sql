-- Delete duplicate columns, keeping one per (board_id, name)
-- Keeps the row with the lowest position (or earliest created_at if tied)

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY board_id, name
      ORDER BY position ASC, created_at ASC
    ) AS rn
  FROM public.columns
)
DELETE FROM public.columns
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Verify: show remaining columns per board
SELECT b.name AS board, c.name AS column_name, c.position, c.color
FROM public.columns c
JOIN public.boards b ON b.id = c.board_id
ORDER BY b.name, c.position;
