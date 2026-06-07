-- 004_app_version_tracking.sql
-- Adds version tracking columns to app_installations so the CLI and
-- agentic IDE can detect drift between the installed version and the
-- latest published npm package version.

ALTER TABLE public.app_installations
  ADD COLUMN IF NOT EXISTS installed_version varchar,
  ADD COLUMN IF NOT EXISTS package_name      varchar;
