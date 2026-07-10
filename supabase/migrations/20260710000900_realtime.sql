-- ============================================================================
-- 0009 · Add board tables to the realtime publication so client subscriptions
-- receive change events. Guarded so re-running is safe.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array['items', 'groups', 'board_columns', 'cell_values', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
