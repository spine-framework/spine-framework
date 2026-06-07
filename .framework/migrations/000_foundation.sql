-- =============================================================================
-- 000_foundation.sql
-- Spine Framework — Complete schema for a fresh install
-- Generated from live production DB audit: May 28, 2026
-- =============================================================================
-- Run this on a blank Supabase project to create all core tables.
-- Follow with 001_seed.sql to insert bootstrap data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------------------------------------------------------------------------
-- Helper Functions (must exist before triggers)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_actor_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auth_id UUID;
  v_person_id UUID;
BEGIN
  v_auth_id := auth.uid();
  SELECT p.id INTO v_person_id
  FROM public.people p
  WHERE p.auth_uid = v_auth_id AND p.is_active = true
  LIMIT 1;
  RETURN v_person_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.person_is_system_admin(person_uuid uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.people p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = person_uuid AND r.slug = 'system_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_accounts(actor_id uuid)
RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  actor_person_id uuid;
BEGIN
  SELECT p.id INTO actor_person_id
  FROM public.people p
  WHERE p.id = actor_id AND p.is_active = true
  LIMIT 1;

  IF actor_person_id IS NULL THEN
    SELECT p.id INTO actor_person_id
    FROM public.people p
    WHERE p.auth_uid = actor_id AND p.is_active = true
    LIMIT 1;
  END IF;

  IF actor_person_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.people p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = actor_person_id AND r.slug = 'system_admin'
  ) THEN
    RETURN QUERY SELECT a.id FROM public.accounts a;
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE account_tree AS (
    SELECT p.account_id AS id FROM public.people p WHERE p.id = actor_person_id
    UNION ALL
    SELECT ap.descendant_id
    FROM public.account_paths ap
    JOIN account_tree at ON ap.ancestor_id = at.id
  )
  SELECT id FROM account_tree;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_account_paths()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_id IS NOT NULL THEN
      INSERT INTO public.account_paths (ancestor_id, descendant_id, depth)
      SELECT ancestor_id, NEW.id, depth + 1 FROM public.account_paths WHERE descendant_id = NEW.parent_id;
      INSERT INTO public.account_paths (ancestor_id, descendant_id, depth) VALUES (NEW.parent_id, NEW.id, 1);
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    DELETE FROM public.account_paths WHERE descendant_id = NEW.id;
    IF NEW.parent_id IS NOT NULL THEN
      INSERT INTO public.account_paths (ancestor_id, descendant_id, depth)
      SELECT ancestor_id, NEW.id, depth + 1 FROM public.account_paths WHERE descendant_id = NEW.parent_id;
      INSERT INTO public.account_paths (ancestor_id, descendant_id, depth) VALUES (NEW.parent_id, NEW.id, 1);
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.account_paths WHERE descendant_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Core Tables (dependency order)
-- ---------------------------------------------------------------------------

-- roles (no dependencies)
CREATE TABLE IF NOT EXISTS public.roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL,
  name         text NOT NULL,
  description  text,
  permissions  jsonb DEFAULT '[]'::jsonb,
  is_system    boolean DEFAULT false,
  is_active    boolean DEFAULT true,
  is_protected boolean DEFAULT false,
  app_id       uuid,
  account_id   uuid,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- apps (no dependencies on other custom tables)
CREATE TABLE IF NOT EXISTS public.apps (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  name             text NOT NULL,
  description      text,
  icon             text,
  color            text,
  version          text DEFAULT '0.1.0',
  app_type         text DEFAULT 'custom',
  source           text DEFAULT 'local',
  account_id       uuid,
  owner_account_id uuid,
  is_active        boolean DEFAULT true,
  is_system        boolean DEFAULT false,
  min_role         text,
  config           jsonb DEFAULT '{}'::jsonb,
  nav_items        jsonb DEFAULT '[]'::jsonb,
  route_prefix     text,
  renderer         text DEFAULT 'react',
  manifest_path    text,
  integration_deps jsonb DEFAULT '[]'::jsonb,
  metadata         jsonb DEFAULT '{}'::jsonb,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_route_prefix ON public.apps (route_prefix) WHERE (is_active = true AND route_prefix IS NOT NULL);

-- types (depends on apps)
CREATE TABLE IF NOT EXISTS public.types (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id            uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  kind              text NOT NULL,
  slug              text NOT NULL,
  name              text NOT NULL,
  description       text,
  icon              text,
  color             text,
  design_schema     jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  ownership         text DEFAULT 'tenant'::text,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (app_id, kind, slug)
);

-- accounts (depends on types, apps, people — people FK added after people table)
CREATE TABLE IF NOT EXISTS public.accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id         uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  type_id           uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  slug              text NOT NULL UNIQUE,
  display_name      text NOT NULL,
  description       text,
  data              jsonb DEFAULT '{}'::jsonb,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  design_schema     jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  app_id            uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  created_by        uuid,
  updated_by        uuid
);

-- account_paths (depends on accounts, RLS disabled intentionally — internal trigger-managed)
CREATE TABLE IF NOT EXISTS public.account_paths (
  ancestor_id   uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  descendant_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  depth         integer NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

-- people (depends on accounts, types, roles, apps)
CREATE TABLE IF NOT EXISTS public.people (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid          uuid UNIQUE,
  email             text NOT NULL,
  full_name         text NOT NULL,
  avatar_url        text,
  phone             text,
  status            text DEFAULT 'active',
  data              jsonb DEFAULT '{}'::jsonb,
  is_active         boolean DEFAULT true,
  account_id        uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  app_id            uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  role_id           uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  type_id           uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  design_schema     jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  created_by        uuid
);

-- add deferred FKs now that people exists
DO $$ BEGIN
  ALTER TABLE public.accounts ADD CONSTRAINT accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.accounts ADD CONSTRAINT accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.people(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.people ADD CONSTRAINT people_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.people(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- add FK on roles.account_id and roles.app_id
DO $$ BEGIN
  ALTER TABLE public.roles ADD CONSTRAINT roles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.roles ADD CONSTRAINT roles_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- add FK on apps.account_id and apps.owner_account_id
DO $$ BEGIN
  ALTER TABLE public.apps ADD CONSTRAINT apps_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.apps ADD CONSTRAINT apps_owner_account_id_fkey FOREIGN KEY (owner_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- items (depends on accounts, types, apps)
CREATE TABLE IF NOT EXISTS public.items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id           uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  account_id        uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  app_id            uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  title             text,
  description       text,
  status            text DEFAULT 'active',
  data              jsonb DEFAULT '{}'::jsonb,
  is_active         boolean DEFAULT true,
  design_schema     jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  created_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- link_types (depends on apps)
CREATE TABLE IF NOT EXISTS public.link_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      uuid REFERENCES public.apps(id) ON DELETE CASCADE,
  slug        text NOT NULL,
  name        text NOT NULL,
  description text,
  icon        text,
  color       text,
  config      jsonb DEFAULT '{}'::jsonb,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- links (depends on accounts, types, link_types)
CREATE TABLE IF NOT EXISTS public.links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id           uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  account_id        uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  link_type_id      uuid REFERENCES public.link_types(id) ON DELETE CASCADE,
  source_type       text NOT NULL,
  source_id         uuid NOT NULL,
  target_type       text NOT NULL,
  target_id         uuid NOT NULL,
  link_type         text,
  metadata          jsonb DEFAULT '{}'::jsonb,
  data              jsonb DEFAULT '{}'::jsonb,
  design_schema     jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  created_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- threads (depends on accounts, types, apps, people)
CREATE TABLE IF NOT EXISTS public.threads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id           uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  account_id        uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  app_id            uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  title             text,
  target_type       text NOT NULL,
  target_id         uuid NOT NULL,
  visibility        text DEFAULT 'internal',
  status            text DEFAULT 'open',
  data              jsonb DEFAULT '{}'::jsonb,
  is_active         boolean DEFAULT true,
  design_schema     jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  created_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- messages (depends on threads, types, accounts, people)
CREATE TABLE IF NOT EXISTS public.messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id           uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  thread_id         uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  content           text NOT NULL,
  direction         text DEFAULT 'outbound',
  sequence          integer NOT NULL,
  visibility        text DEFAULT 'internal',
  data              jsonb DEFAULT '{}'::jsonb,
  is_active         boolean DEFAULT true,
  design_schema     jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  person_id         uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  account_id        uuid REFERENCES public.accounts(id) ON DELETE CASCADE
);

-- attachments (depends on accounts, types, people)
CREATE TABLE IF NOT EXISTS public.attachments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id          uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  account_id       uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  filename         text NOT NULL,
  file_size        integer,
  mime_type        text,
  storage_path     text,
  storage_provider text DEFAULT 'supabase',
  metadata         jsonb DEFAULT '{}'::jsonb,
  data             jsonb DEFAULT '{}'::jsonb,
  design_schema    jsonb DEFAULT '{}'::jsonb,
  validation_schema jsonb DEFAULT '{}'::jsonb,
  uploaded_by      uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_by       uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- watchers (depends on accounts, types, people)
CREATE TABLE IF NOT EXISTS public.watchers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id            uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  account_id         uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  target_type        text NOT NULL,
  target_id          uuid NOT NULL,
  person_id          uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  watch_type         text DEFAULT 'all',
  notification_level text DEFAULT 'all',
  metadata           jsonb DEFAULT '{}'::jsonb,
  data               jsonb DEFAULT '{}'::jsonb,
  design_schema      jsonb DEFAULT '{}'::jsonb,
  validation_schema  jsonb DEFAULT '{}'::jsonb,
  created_by         uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (target_type, target_id, person_id)
);

-- pipelines (depends on accounts, apps, people)
CREATE TABLE IF NOT EXISTS public.pipelines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  app_id      uuid REFERENCES public.apps(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  steps       jsonb DEFAULT '[]'::jsonb,
  config      jsonb DEFAULT '{}'::jsonb,
  ownership   text DEFAULT 'tenant',
  is_system   boolean DEFAULT false,
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- pipeline_executions (depends on accounts, pipelines, people)
CREATE TABLE IF NOT EXISTS public.pipeline_executions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id   uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  status        text DEFAULT 'pending',
  trigger_data  jsonb DEFAULT '{}'::jsonb,
  result        jsonb DEFAULT '{}'::jsonb,
  error_message text,
  started_at    timestamptz,
  completed_at  timestamptz,
  duration_ms   integer,
  created_by    uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- triggers (depends on accounts, apps, pipelines, people)
CREATE TABLE IF NOT EXISTS public.triggers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        uuid REFERENCES public.apps(id) ON DELETE CASCADE,
  account_id    uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  trigger_type  text NOT NULL,
  event_type    text,
  config        jsonb DEFAULT '{}'::jsonb,
  pipeline_id   uuid REFERENCES public.pipelines(id) ON DELETE SET NULL,
  metadata      jsonb DEFAULT '{}'::jsonb,
  ownership     text DEFAULT 'tenant',
  is_system     boolean DEFAULT false,
  is_active     boolean DEFAULT true,
  trigger_count integer DEFAULT 0,
  last_triggered timestamptz,
  created_by    uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- trigger_executions (depends on triggers)
CREATE TABLE IF NOT EXISTS public.trigger_executions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id    uuid NOT NULL REFERENCES public.triggers(id) ON DELETE CASCADE,
  status        text DEFAULT 'pending',
  triggered_at  timestamptz DEFAULT now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  trigger_data  jsonb DEFAULT '{}'::jsonb,
  result        jsonb DEFAULT '{}'::jsonb,
  error_message text,
  duration_ms   integer,
  created_at    timestamptz DEFAULT now()
);

-- timers (depends on accounts, apps, pipelines, people)
CREATE TABLE IF NOT EXISTS public.timers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          uuid REFERENCES public.apps(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  timer_type      text NOT NULL,
  config          jsonb DEFAULT '{}'::jsonb,
  pipeline_id     uuid REFERENCES public.pipelines(id) ON DELETE SET NULL,
  metadata        jsonb DEFAULT '{}'::jsonb,
  ownership       text DEFAULT 'tenant',
  is_system       boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  last_execution  timestamptz,
  next_execution  timestamptz,
  execution_count integer DEFAULT 0,
  success_count   integer DEFAULT 0,
  failure_count   integer DEFAULT 0,
  created_by      uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ai_agents (depends on accounts, apps, people)
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       uuid REFERENCES public.apps(id) ON DELETE CASCADE,
  account_id   uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  agent_type   text NOT NULL,
  model_config jsonb DEFAULT '{}'::jsonb,
  system_prompt text,
  tools        jsonb DEFAULT '[]'::jsonb,
  capabilities jsonb DEFAULT '[]'::jsonb,
  constraints  jsonb DEFAULT '{}'::jsonb,
  metadata     jsonb DEFAULT '{}'::jsonb,
  ownership    text DEFAULT 'tenant',
  is_system    boolean DEFAULT false,
  is_active    boolean DEFAULT true,
  created_by   uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- embeddings (depends on accounts)
CREATE TABLE IF NOT EXISTS public.embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  model_id    text NOT NULL,
  document_id text NOT NULL,
  chunk_index integer NOT NULL,
  content     text NOT NULL,
  embedding   vector(1536),
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (model_id, document_id, chunk_index)
);

-- integrations (depends on accounts, apps, people)
CREATE TABLE IF NOT EXISTS public.integrations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  app_id       uuid REFERENCES public.apps(id) ON DELETE CASCADE,
  name         text NOT NULL,
  slug         text,
  provider     text,
  config       jsonb DEFAULT '{}'::jsonb,
  credentials  jsonb DEFAULT '{}'::jsonb,
  status       text DEFAULT 'active',
  is_active    boolean DEFAULT true,
  created_by   uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- prompt_configs (depends on accounts, apps, people)
CREATE TABLE IF NOT EXISTS public.prompt_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      uuid REFERENCES public.apps(id) ON DELETE CASCADE,
  account_id  uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug        text NOT NULL,
  name        text NOT NULL,
  description text,
  template    text,
  variables   jsonb DEFAULT '[]'::jsonb,
  config      jsonb DEFAULT '{}'::jsonb,
  ownership   text DEFAULT 'tenant',
  is_system   boolean DEFAULT false,
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- api_keys (depends on accounts, integrations, people)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL,
  account_id     uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name           text NOT NULL,
  key_value      text UNIQUE NOT NULL,
  key_prefix     text NOT NULL,
  key_type       text NOT NULL,
  permissions    jsonb DEFAULT '[]'::jsonb,
  rate_limit     integer DEFAULT 1000,
  is_active      boolean DEFAULT true,
  expires_at     timestamptz,
  metadata       jsonb DEFAULT '{}'::jsonb,
  ownership      text DEFAULT 'tenant',
  is_system      boolean DEFAULT false,
  machine_type   text,
  is_internal    boolean DEFAULT false,
  scopes         text[] DEFAULT '{}',
  usage_count    integer DEFAULT 0,
  last_used_at   timestamptz,
  created_by     uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- api_key_usage_logs (depends on api_keys, accounts)
CREATE TABLE IF NOT EXISTS public.api_key_usage_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  request_method  text,
  request_path    text,
  request_ip      text,
  user_agent      text,
  response_status integer,
  response_size   integer,
  duration_ms     integer,
  success         boolean DEFAULT true,
  error_message   text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);

-- logs (depends on accounts, people)
CREATE TABLE IF NOT EXISTS public.logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level       text NOT NULL,
  message     text NOT NULL,
  context     jsonb DEFAULT '{}'::jsonb,
  source      text,
  source_type text,
  source_id   uuid,
  person_id   uuid REFERENCES public.people(id) ON DELETE SET NULL,
  account_id  uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

-- actions (depends on accounts, people)
CREATE TABLE IF NOT EXISTS public.actions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                 uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name                       text NOT NULL,
  slug                       text NOT NULL,
  description                text,
  handler                    text NOT NULL,
  handler_module             text DEFAULT 'functions',
  config                     jsonb DEFAULT '{}'::jsonb,
  input_schema               jsonb DEFAULT '{}'::jsonb,
  output_schema              jsonb DEFAULT '{}'::jsonb,
  ownership                  text DEFAULT 'tenant',
  is_system                  boolean DEFAULT false,
  default_machine_principal_id uuid,
  required_scopes            text[] DEFAULT '{}',
  is_active                  boolean DEFAULT true,
  timeout_seconds            integer DEFAULT 300,
  retry_count                integer DEFAULT 3,
  created_by                 uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at                 timestamptz DEFAULT now()
);

-- schedules (depends on accounts, actions, people)
CREATE TABLE IF NOT EXISTS public.schedules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  action_id            uuid REFERENCES public.actions(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  description          text,
  cron_expression      text,
  config               jsonb DEFAULT '{}'::jsonb,
  machine_principal_id uuid,
  delegated_scopes     text[] DEFAULT '{}',
  is_active            boolean DEFAULT true,
  is_paused            boolean DEFAULT false,
  pause_reason         text,
  max_retries          integer DEFAULT 3,
  success_count        integer DEFAULT 0,
  failure_count        integer DEFAULT 0,
  last_run_at          timestamptz,
  next_run_at          timestamptz,
  last_error           text,
  last_error_at        timestamptz,
  created_by           uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- schedule_executions (depends on accounts, schedules)
CREATE TABLE IF NOT EXISTS public.schedule_executions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id          uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  account_id           uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  machine_principal_id uuid,
  status               text DEFAULT 'pending',
  input_params         jsonb DEFAULT '{}'::jsonb,
  output_result        jsonb DEFAULT '{}'::jsonb,
  error_message        text,
  duration_ms          integer,
  created_at           timestamptz DEFAULT now()
);

-- test_runs (RLS disabled — written by service-role test harness only)
CREATE TABLE IF NOT EXISTS public.test_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite        text NOT NULL,
  status       text NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  duration_ms  integer,
  total        integer,
  passed       integer,
  failed       integer,
  skipped      integer,
  triggered_by text DEFAULT 'agent',
  account_id   uuid REFERENCES public.accounts(id) ON DELETE NO ACTION
);

-- test_results (RLS disabled — written by service-role test harness only)
CREATE TABLE IF NOT EXISTS public.test_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  suite       text NOT NULL,
  file        text,
  describe    text,
  name        text NOT NULL,
  status      text NOT NULL,
  duration_ms integer,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- item_progress (depends on accounts, types, items, apps, people)
CREATE TABLE IF NOT EXISTS public.item_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id           uuid NOT NULL REFERENCES public.types(id) ON DELETE RESTRICT,
  account_id        uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  app_id            uuid REFERENCES public.apps(id) ON DELETE SET NULL,
  person_id         uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  item_id           uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  title             text,
  description       text,
  status            text NOT NULL DEFAULT 'not_started',
  score             integer,
  data              jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active         boolean NOT NULL DEFAULT true,
  design_schema     jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- webhook_handlers (depends on accounts)
CREATE TABLE IF NOT EXISTS public.webhook_handlers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar NOT NULL UNIQUE,
  function_name varchar NOT NULL,
  description   text,
  events        jsonb DEFAULT '[]'::jsonb,
  account_id    uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  is_active     boolean DEFAULT true,
  is_deleted    boolean DEFAULT false,
  deleted_at    timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- app_installations (depends on accounts)
CREATE TABLE IF NOT EXISTS public.app_installations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  app_slug     varchar NOT NULL,
  is_enabled   boolean DEFAULT true,
  installed_at timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_account_paths_ancestor   ON public.account_paths (ancestor_id);
CREATE INDEX IF NOT EXISTS idx_account_paths_descendant ON public.account_paths (descendant_id);

CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON public.accounts (parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type_id   ON public.accounts (type_id);
CREATE INDEX IF NOT EXISTS idx_accounts_active    ON public.accounts (is_active);

CREATE INDEX IF NOT EXISTS idx_actions_account ON public.actions (account_id);
CREATE INDEX IF NOT EXISTS idx_actions_slug    ON public.actions (slug);

CREATE INDEX IF NOT EXISTS idx_ai_agents_account ON public.ai_agents (account_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_app    ON public.ai_agents (app_id);

CREATE INDEX IF NOT EXISTS idx_akul_account    ON public.api_key_usage_logs (account_id);
CREATE INDEX IF NOT EXISTS idx_akul_api_key    ON public.api_key_usage_logs (api_key_id);
CREATE INDEX IF NOT EXISTS idx_akul_created    ON public.api_key_usage_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_account     ON public.api_keys (account_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_integration ON public.api_keys (integration_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value   ON public.api_keys (key_value);

CREATE INDEX IF NOT EXISTS idx_app_installations_account ON public.app_installations (account_id) WHERE (is_enabled = true);
CREATE INDEX IF NOT EXISTS idx_app_installations_slug    ON public.app_installations (app_slug) WHERE (is_enabled = true);
-- Dedup: system installs (account_id IS NULL) — one row per app slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_installations_slug_no_account
  ON public.app_installations (app_slug)
  WHERE account_id IS NULL;
-- Dedup: tenant installs (account_id IS NOT NULL) — one row per (slug, account)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_installations_slug_with_account
  ON public.app_installations (app_slug, account_id)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apps_owner       ON public.apps (owner_account_id);
CREATE INDEX IF NOT EXISTS idx_apps_slug        ON public.apps (slug);

CREATE INDEX IF NOT EXISTS idx_attachments_account ON public.attachments (account_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type    ON public.attachments (type_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_account   ON public.embeddings (account_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model_doc ON public.embeddings (model_id, document_id);

CREATE INDEX IF NOT EXISTS idx_integrations_account ON public.integrations (account_id);
CREATE INDEX IF NOT EXISTS idx_integrations_app     ON public.integrations (app_id);

CREATE INDEX IF NOT EXISTS idx_item_progress_account  ON public.item_progress (account_id);
CREATE INDEX IF NOT EXISTS idx_item_progress_active   ON public.item_progress (account_id, is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_item_progress_data_gin ON public.item_progress USING gin (data);
CREATE INDEX IF NOT EXISTS idx_item_progress_item     ON public.item_progress (item_id);
CREATE INDEX IF NOT EXISTS idx_item_progress_person   ON public.item_progress (person_id);
CREATE INDEX IF NOT EXISTS idx_item_progress_status   ON public.item_progress (status);
CREATE INDEX IF NOT EXISTS idx_item_progress_type     ON public.item_progress (type_id);

CREATE INDEX IF NOT EXISTS idx_items_account    ON public.items (account_id);
CREATE INDEX IF NOT EXISTS idx_items_active     ON public.items (is_active);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items (created_at);
CREATE INDEX IF NOT EXISTS idx_items_type       ON public.items (type_id);

CREATE INDEX IF NOT EXISTS idx_link_types_slug ON public.link_types (slug);

CREATE INDEX IF NOT EXISTS idx_links_account     ON public.links (account_id);
CREATE INDEX IF NOT EXISTS idx_links_link_type   ON public.links (link_type_id);
CREATE INDEX IF NOT EXISTS idx_links_source      ON public.links (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_links_target      ON public.links (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_logs_account ON public.logs (account_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.logs (created_at);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages (thread_id);

CREATE INDEX IF NOT EXISTS idx_people_account ON public.people (account_id);
CREATE INDEX IF NOT EXISTS idx_people_role    ON public.people (role_id);

CREATE INDEX IF NOT EXISTS idx_pe_account  ON public.pipeline_executions (account_id);
CREATE INDEX IF NOT EXISTS idx_pe_pipeline ON public.pipeline_executions (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pe_status   ON public.pipeline_executions (status);

CREATE INDEX IF NOT EXISTS idx_pipelines_account ON public.pipelines (account_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_app     ON public.pipelines (app_id);

CREATE INDEX IF NOT EXISTS idx_prompt_configs_account ON public.prompt_configs (account_id);
CREATE INDEX IF NOT EXISTS idx_prompt_configs_app     ON public.prompt_configs (app_id);
CREATE INDEX IF NOT EXISTS idx_prompt_configs_slug    ON public.prompt_configs (slug);

CREATE INDEX IF NOT EXISTS idx_roles_slug ON public.roles (slug);
-- Dedup: system roles (app_id IS NULL) — one row per slug globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_slug_no_app
  ON public.roles (slug)
  WHERE app_id IS NULL;
-- Dedup: app-scoped roles (app_id IS NOT NULL) — one row per (app_id, slug)
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_slug_with_app
  ON public.roles (app_id, slug)
  WHERE app_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_se_account  ON public.schedule_executions (account_id);
CREATE INDEX IF NOT EXISTS idx_se_schedule ON public.schedule_executions (schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedules_account  ON public.schedules (account_id);
CREATE INDEX IF NOT EXISTS idx_schedules_action   ON public.schedules (action_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON public.schedules (next_run_at);

CREATE INDEX IF NOT EXISTS idx_test_results_run_id  ON public.test_results (run_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON public.test_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_suite      ON public.test_runs (suite);

CREATE INDEX IF NOT EXISTS idx_threads_account ON public.threads (account_id);
CREATE INDEX IF NOT EXISTS idx_threads_active  ON public.threads (is_active);
CREATE INDEX IF NOT EXISTS idx_threads_target  ON public.threads (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_threads_type    ON public.threads (type_id);

CREATE INDEX IF NOT EXISTS idx_timers_account  ON public.timers (account_id);
CREATE INDEX IF NOT EXISTS idx_timers_app      ON public.timers (app_id);
CREATE INDEX IF NOT EXISTS idx_timers_pipeline ON public.timers (pipeline_id);

CREATE INDEX IF NOT EXISTS idx_te_trigger ON public.trigger_executions (trigger_id);

CREATE INDEX IF NOT EXISTS idx_triggers_account  ON public.triggers (account_id);
CREATE INDEX IF NOT EXISTS idx_triggers_app      ON public.triggers (app_id);
CREATE INDEX IF NOT EXISTS idx_triggers_pipeline ON public.triggers (pipeline_id);

CREATE INDEX IF NOT EXISTS idx_types_kind ON public.types (kind);
CREATE INDEX IF NOT EXISTS idx_types_slug ON public.types (slug);

CREATE INDEX IF NOT EXISTS idx_watchers_person ON public.watchers (person_id);
CREATE INDEX IF NOT EXISTS idx_watchers_target ON public.watchers (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_watchers_type   ON public.watchers (type_id);

CREATE INDEX IF NOT EXISTS idx_webhook_handlers_account ON public.webhook_handlers (account_id) WHERE (is_deleted = false);
CREATE INDEX IF NOT EXISTS idx_webhook_handlers_events  ON public.webhook_handlers USING gin (events) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_webhook_handlers_name    ON public.webhook_handlers (name) WHERE ((is_active = true) AND (is_deleted = false));

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER account_paths_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_account_paths();

CREATE OR REPLACE TRIGGER app_installations_updated_at
  BEFORE UPDATE ON public.app_installations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER webhook_handlers_updated_at
  BEFORE UPDATE ON public.webhook_handlers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables (account_paths, test_runs, test_results are explicitly skipped)
ALTER TABLE public.accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trigger_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triggers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_handlers  ENABLE ROW LEVEL SECURITY;

-- NOTE: account_paths, test_runs, test_results have RLS intentionally disabled.
-- account_paths is managed exclusively by trigger (update_account_paths).
-- test_runs/test_results are written by service_role from the test harness.

-- RLS Policies (idempotent - uses DO blocks to handle existing policies)

DO $$ BEGIN CREATE POLICY accounts_access ON public.accounts FOR ALL TO public
  USING ((id IN (SELECT get_accessible_accounts(current_actor_id()))) OR current_actor_id() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY actions_access ON public.actions FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY ai_agents_access ON public.ai_agents FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY akul_access ON public.api_key_usage_logs FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY api_keys_access ON public.api_keys FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR (id = auth.uid()) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY app_installations_select ON public.app_installations FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY app_installations_admin ON public.app_installations FOR ALL TO authenticated
  USING ((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'system_admin')
  WITH CHECK ((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'system_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY app_installations_service ON public.app_installations FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY apps_access ON public.apps FOR ALL TO public
  USING ((is_system = true) OR (owner_account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY attachments_access ON public.attachments FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR ((design_schema->>'scope' = 'platform') AND auth.uid() IS NOT NULL) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY embeddings_access ON public.embeddings FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY integrations_access ON public.integrations FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY item_progress_access ON public.item_progress FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY items_access ON public.items FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(current_actor_id()))) OR ((design_schema->>'scope' = 'platform') AND current_actor_id() IS NOT NULL) OR current_actor_id() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY link_types_access ON public.link_types FOR ALL TO public
  USING ((app_id IS NULL) OR (EXISTS (SELECT 1 FROM apps a WHERE a.id = link_types.app_id AND a.owner_account_id IN (SELECT get_accessible_accounts(auth.uid())))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY links_access ON public.links FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR ((design_schema->>'scope' = 'platform') AND auth.uid() IS NOT NULL) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY logs_access ON public.logs FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY messages_access ON public.messages FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM threads t WHERE t.id = messages.thread_id AND (t.account_id IN (SELECT get_accessible_accounts(current_actor_id())) OR (t.design_schema->>'scope' = 'platform' AND current_actor_id() IS NOT NULL)))) OR (design_schema->>'scope' = 'platform' AND current_actor_id() IS NOT NULL) OR current_actor_id() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY people_access ON public.people FOR ALL TO public
  USING ((id = current_actor_id()) OR (account_id IN (SELECT get_accessible_accounts(current_actor_id()))) OR current_actor_id() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY pe_access ON public.pipeline_executions FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY pipelines_access ON public.pipelines FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY prompt_configs_access ON public.prompt_configs FOR ALL TO public
  USING ((app_id IS NULL) OR (EXISTS (SELECT 1 FROM apps a WHERE a.id = prompt_configs.app_id AND a.owner_account_id IN (SELECT get_accessible_accounts(auth.uid())))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY roles_read ON public.roles FOR SELECT TO public USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY roles_modify ON public.roles FOR ALL TO public
  USING (((is_system = true) AND person_is_system_admin(current_actor_id())) OR (is_system = false) OR current_actor_id() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY se_access ON public.schedule_executions FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY schedules_access ON public.schedules FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY threads_access ON public.threads FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR (design_schema->>'scope' = 'platform' AND auth.uid() IS NOT NULL) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY timers_access ON public.timers FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY te_access ON public.trigger_executions FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM triggers t WHERE t.id = trigger_executions.trigger_id AND t.account_id IN (SELECT get_accessible_accounts(auth.uid())))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY triggers_access ON public.triggers FOR ALL TO public
  USING ((account_id IN (SELECT get_accessible_accounts(auth.uid()))) OR auth.uid() IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY types_access ON public.types FOR ALL TO public
  USING (current_actor_id() IS NOT NULL OR true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY watchers_access ON public.watchers FOR ALL TO public
  USING (auth.uid() IS NOT NULL OR true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY webhook_handlers_service_role ON public.webhook_handlers FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY webhook_handlers_system_admin ON public.webhook_handlers FOR ALL TO authenticated
  USING ((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'system_admin')
  WITH CHECK ((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'system_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Additional Functions (depend on tables existing)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_account_ancestors(account_id uuid)
RETURNS TABLE(id uuid, slug text, display_name text, depth integer) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.slug, a.display_name, ap.depth
  FROM public.accounts a
  JOIN public.account_paths ap ON a.id = ap.ancestor_id
  WHERE ap.descendant_id = account_id
  ORDER BY ap.depth;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_descendants(account_id uuid, max_depth integer DEFAULT NULL)
RETURNS TABLE(id uuid, slug text, display_name text, depth integer) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    SELECT a.id, a.slug, a.display_name, 0 as depth
    FROM public.accounts a WHERE a.id = account_id
    UNION ALL
    SELECT a.id, a.slug, a.display_name, ap.depth + 1
    FROM public.accounts a
    JOIN public.account_paths ap ON a.id = ap.descendant_id
    WHERE ap.ancestor_id = account_id
    AND (max_depth IS NULL OR ap.depth < max_depth)
  )
  SELECT d.id, d.slug, d.display_name, d.depth FROM descendants d WHERE d.id != account_id ORDER BY d.depth, d.display_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_hierarchy(parent_account_id uuid)
RETURNS TABLE(id uuid, slug text, display_name text, level integer) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE account_tree AS (
    SELECT a.id, a.slug, a.display_name, 1 as level FROM public.accounts a
    WHERE a.parent_id = parent_account_id AND a.is_active = true
    UNION ALL
    SELECT a.id, a.slug, a.display_name, at.level + 1
    FROM public.accounts a INNER JOIN account_tree at ON a.parent_id = at.id
    WHERE a.is_active = true
  )
  SELECT id, slug, display_name, level FROM account_tree ORDER BY level, display_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_apps(account_id uuid, include_system boolean DEFAULT true, include_inactive boolean DEFAULT false)
RETURNS TABLE(id uuid, slug text, name text, description text, icon text, color text, version text, app_type text, source text, owner_account_id uuid, is_active boolean, is_system boolean, min_role text, config jsonb, nav_items jsonb, route_prefix text, renderer text, created_at timestamptz) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.slug, a.name, a.description, a.icon, a.color, a.version, a.app_type, a.source,
    a.owner_account_id, a.is_active, a.is_system, a.min_role, a.config, a.nav_items, a.route_prefix, a.renderer, a.created_at
  FROM public.apps a
  WHERE (include_system OR a.is_system = false)
    AND (include_inactive OR a.is_active = true)
    AND (a.is_system OR a.owner_account_id = get_account_apps.account_id)
  ORDER BY a.is_system DESC, a.app_type, a.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_app_manifest(app_slug text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE manifest_path TEXT;
BEGIN
  SELECT a.manifest_path INTO manifest_path FROM public.apps a WHERE a.slug = app_slug;
  IF manifest_path IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('source', 'manifest', 'path', manifest_path, 'note', 'Manifest content loaded by application layer');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_app_schema(app_slug text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE app_schema jsonb;
BEGIN
  SELECT jsonb_build_object('id', id, 'slug', slug, 'name', name, 'description', description, 'icon', icon, 'color', color, 'version', version, 'app_type', app_type, 'source', source, 'config', config, 'nav_items', nav_items, 'min_role', min_role, 'integration_deps', integration_deps, 'metadata', metadata)
  INTO app_schema FROM public.apps WHERE slug = get_app_schema.app_slug AND is_active = true;
  RETURN COALESCE(app_schema, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_app_available(app_slug text, account_id uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.apps WHERE slug = is_app_available.app_slug AND is_active = true AND (is_system = true OR owner_account_id = is_app_available.account_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_type_schema(kind text, slug text, app_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE type_schema jsonb;
BEGIN
  SELECT design_schema INTO type_schema FROM public.types
  WHERE kind = get_type_schema.kind AND slug = get_type_schema.slug
    AND (app_id = get_type_schema.app_id OR (app_id IS NULL AND get_type_schema.app_id IS NULL))
    AND is_active = true
  ORDER BY app_id DESC NULLS LAST LIMIT 1;
  RETURN COALESCE(type_schema, '{}');
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_trigger_count(p_trigger_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.triggers SET trigger_count = COALESCE(trigger_count, 0) + 1 WHERE id = p_trigger_id RETURNING trigger_count INTO v_count;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_app_version(app_id uuid, new_version text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.apps SET version = new_version, updated_at = now() WHERE id = update_app_version.app_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_api_key(key_type text, key_prefix text DEFAULT 'sp_')
RETURNS text LANGUAGE plpgsql AS $$
DECLARE key_value text; key_suffix text;
BEGIN
  key_suffix := encode(gen_random_bytes(24), 'base64');
  key_suffix := replace(replace(replace(key_suffix, '/', ''), '+', ''), '=', '');
  key_suffix := substring(key_suffix, 1, 32);
  key_value := key_prefix || CASE key_type WHEN 'public' THEN 'pk_' WHEN 'secret' THEN 'sc_' WHEN 'webhook' THEN 'wh_' ELSE 'sk_' END || key_suffix;
  RETURN key_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_due_schedules(p_now timestamptz DEFAULT now())
RETURNS TABLE(id uuid, account_id uuid, action_id uuid, machine_principal_id uuid, config jsonb, delegated_scopes text[]) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT s.id, s.account_id, s.action_id, s.machine_principal_id, s.config, s.delegated_scopes
  FROM public.schedules s WHERE s.is_active = true AND s.is_paused = false AND (s.next_run_at IS NULL OR s.next_run_at <= p_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_due_timers(p_now timestamptz DEFAULT now())
RETURNS TABLE(id uuid, account_id uuid, app_id uuid, name text, pipeline_id uuid, created_by uuid, execution_count integer, next_execution timestamptz) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT t.id, t.account_id, t.app_id, t.name, t.pipeline_id, t.created_by, t.execution_count, t.next_execution
  FROM public.timers t WHERE t.is_active = true AND t.next_execution IS NOT NULL AND t.next_execution <= p_now;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_machine_principal(p_key_value text, p_required_scope text DEFAULT NULL)
RETURNS TABLE(is_valid boolean, machine_id uuid, account_id uuid, scopes text[], machine_type text, is_internal boolean, created_by uuid, error_message text) LANGUAGE plpgsql AS $$
DECLARE
  key_record RECORD;
BEGIN
  SELECT * INTO key_record
  FROM public.api_keys
  WHERE key_value = p_key_value AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text[],
      NULL::text, NULL::boolean, NULL::uuid, 'Invalid or inactive machine principal'::text;
    RETURN;
  END IF;

  IF p_required_scope IS NOT NULL AND
     NOT (p_required_scope = ANY(key_record.scopes) OR '*:*' = ANY(key_record.scopes)) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text[],
      NULL::text, NULL::boolean, NULL::uuid, ('Insufficient scope: ' || p_required_scope)::text;
    RETURN;
  END IF;

  UPDATE public.api_keys SET last_used_at = now(), usage_count = COALESCE(usage_count, 0) + 1 WHERE id = key_record.id;

  RETURN QUERY SELECT true, key_record.id, key_record.account_id, key_record.scopes,
    key_record.machine_type, key_record.is_internal, key_record.created_by, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_schedule_creator(p_schedule_id uuid)
RETURNS TABLE(is_valid boolean, error_message text) LANGUAGE plpgsql AS $$
DECLARE sched RECORD; creator RECORD;
BEGIN
  SELECT * INTO sched FROM public.schedules WHERE id = p_schedule_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Schedule not found'::text; RETURN; END IF;

  SELECT is_active INTO creator FROM public.people WHERE id = sched.created_by;
  IF creator IS NULL OR NOT creator.is_active THEN
    UPDATE public.schedules SET is_paused = true, pause_reason = 'Creator deactivated' WHERE id = p_schedule_id;
    RETURN QUERY SELECT false, 'Schedule creator deactivated; schedule paused'::text; RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_logs(p_retention_days integer DEFAULT 30)
RETURNS TABLE(deleted_count bigint) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY WITH deleted AS (DELETE FROM logs WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days RETURNING id)
  SELECT COUNT(*)::bigint FROM deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_embeddings(query_embedding vector, match_count integer DEFAULT 10, similarity_threshold float DEFAULT 0.7, filter_account_ids uuid[] DEFAULT NULL, filter_vector_type text DEFAULT 'document')
RETURNS TABLE(id uuid, document_id text, content text, metadata jsonb, account_id uuid, similarity float) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT e.id, e.document_id, e.content, e.metadata, e.account_id, 1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE (filter_account_ids IS NULL OR e.account_id = ANY(filter_account_ids))
    AND e.metadata->>'vector_type' = filter_vector_type
    AND 1 - (e.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY e.embedding <=> query_embedding LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_similar_embeddings(p_account_id uuid, p_model_id text, p_query_embedding vector, p_threshold float DEFAULT 0.7, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, content text, similarity float, metadata jsonb, document_id text) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT e.id, e.content, (1 - (e.embedding <=> p_query_embedding))::float as similarity, e.metadata, e.document_id
  FROM public.embeddings e
  WHERE e.account_id = p_account_id AND e.model_id = p_model_id AND 1 - (e.embedding <=> p_query_embedding) > p_threshold
  ORDER BY e.embedding <=> p_query_embedding LIMIT p_limit;
END;
$$;
