-- ============================================================================
-- 0010 — manual task order: user-defined task priority per goal
--
-- Idempotent. Safe to run on a database that already has 0001–0009.
-- ============================================================================

-- ── goals.manual_task_order ──────────────────────────────────────────────────
-- When false (default): tasks automatically sink completed items to the bottom,
-- and uncompleted tasks remain on top.
-- When true: the user has manually reordered tasks (drag-and-drop or move up/down),
-- so their exact sort_order is strictly respected without auto-sinking.
alter table public.goals
  add column if not exists manual_task_order boolean not null default false;

comment on column public.goals.manual_task_order is
  'Whether the user has manually set a custom task order for this goal. If true, auto-sinking is disabled.';
