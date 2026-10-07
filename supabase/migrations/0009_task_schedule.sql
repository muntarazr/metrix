-- ============================================================================
-- 0009 — task schedule: which weekdays each task runs on
--
-- Idempotent. Safe to run on a database that already has 0001–0008, and safe
-- to run twice. Nothing here drops or rewrites existing data.
-- ============================================================================

-- ── sub_layers.schedule_days ─────────────────────────────────────────────────
-- Explicit execution days per task (0 = Sunday … 6 = Saturday, the JS
-- Date#getDay convention used by the app).
--   null   → run on every day the task's frequency implies (default; matches
--            how every existing row behaves today).
--   [..]   → run only on those weekdays ("daily" on [0,2,4] = Sunday/Tuesday/
--            Thursday only; "weekly" on [1] = every Monday).
alter table public.sub_layers
  add column if not exists schedule_days smallint[] default null;

comment on column public.sub_layers.schedule_days is
  'Weekdays the task runs (0=Sunday..6=Saturday). null = all days per frequency.';
