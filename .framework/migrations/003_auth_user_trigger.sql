-- =============================================================================
-- 003_auth_user_trigger.sql
-- Creates a people record whenever a new Supabase auth user signs up.
-- Run AFTER 001_seed.sql (requires spine-system account and person type).
--
-- First user ever → system_admin role (bootstrap)
-- Subsequent users → no role (assigned later via admin invite flow)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account_id uuid;
  v_type_id    uuid;
  v_role_id    uuid;
  v_is_first   boolean;
  v_design_schema jsonb;
  v_validation_schema jsonb;
BEGIN
  SELECT id INTO v_account_id FROM public.accounts WHERE slug = 'spine-system' LIMIT 1;
  SELECT id, design_schema, validation_schema
    INTO v_type_id, v_design_schema, v_validation_schema
  FROM public.types WHERE kind = 'person' AND slug = 'person' LIMIT 1;

  IF v_account_id IS NULL OR v_type_id IS NULL THEN
    RAISE WARNING 'handle_new_auth_user: spine-system account or person type not found — skipping people insert';
    RETURN NEW;
  END IF;

  -- First person ever gets system_admin; subsequent users get no role
  SELECT NOT EXISTS (SELECT 1 FROM public.people LIMIT 1) INTO v_is_first;
  IF v_is_first THEN
    SELECT id INTO v_role_id FROM public.roles WHERE slug = 'system_admin' LIMIT 1;
  END IF;

  INSERT INTO public.people (
    id,
    auth_uid,
    email,
    full_name,
    account_id,
    type_id,
    role_id,
    is_active,
    design_schema,
    validation_schema
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_account_id,
    v_type_id,
    v_role_id,
    true,
    v_design_schema,
    COALESCE(v_validation_schema, '{}'::jsonb)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
