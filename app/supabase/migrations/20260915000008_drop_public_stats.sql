-- =============================================================================
-- Drop public platform statistics
-- =============================================================================
-- `get_public_stats` existed only for the marketing site, which is now fully
-- static and no longer reads the database. The app never called it.
-- =============================================================================

drop function if exists public.get_public_stats();
