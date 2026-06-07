-- =============================================================================
-- 002_seed_constraints.sql
-- Adds unique constraints required for idempotent seed upserts
-- =============================================================================

-- link_types needs unique on (app_id, slug) for seed upserts
DO $$ BEGIN
  ALTER TABLE public.link_types ADD CONSTRAINT link_types_app_id_slug_key UNIQUE (app_id, slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- triggers needs unique on (app_id, name) for seed upserts
DO $$ BEGIN
  ALTER TABLE public.triggers ADD CONSTRAINT triggers_app_id_name_key UNIQUE (app_id, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pipelines needs unique on (app_id, name) for seed upserts
DO $$ BEGIN
  ALTER TABLE public.pipelines ADD CONSTRAINT pipelines_app_id_name_key UNIQUE (app_id, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
