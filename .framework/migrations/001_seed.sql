-- =============================================================================
-- 001_seed.sql
-- Spine Framework — Bare minimum bootstrap data for a fresh install
-- Generated from live production DB audit: May 28, 2026
-- =============================================================================
-- Run AFTER 000_foundation.sql.
--
-- This file contains ONLY what is required for Spine to boot and for a
-- system_admin to log in and interact with the framework. Nothing more.
--
-- What requires seeding before the app can function:
--   1. system_admin role        — people.role_id FK target
--   2. spine-core app           — required by runtime; people/accounts ref app_id
--   3. account type             — accounts.type_id is NOT NULL
--   4. person type              — people.type_id is NOT NULL
--   5. root system account      — people.account_id is NOT NULL; the bootstrap
--                                 system_admin must belong to an account
--
-- Everything else (additional roles, app-specific types, tenant accounts,
-- app-owned link types) belongs in app seed files or is created via the admin UI.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. System Role
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (slug, name, description, permissions, is_system, is_active, is_protected)
VALUES (
  'system_admin',
  'System Admin',
  'Full system access — can manage all accounts, types, and system configuration',
  '["*"]'::jsonb,
  true,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1b. Core Roles
-- These are common roles used by apps but defined at core level
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (slug, name, description, permissions, is_system, is_active, is_protected)
VALUES (
  'member',
  'Member',
  'Standard member with read access to platform features',
  '["*"]'::jsonb,
  false,
  true,
  false
), (
  'support',
  'Support',
  'Support agent with access to CRM, tickets, and customer data',
  '["*"]'::jsonb,
  false,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Spine Core App
-- ---------------------------------------------------------------------------
INSERT INTO public.apps (slug, name, description, version, app_type, source, is_active, is_system, min_role, config, nav_items, route_prefix, renderer, integration_deps, metadata)
VALUES (
  'spine-core',
  'Spine Core',
  'Core Spine runtime — provides accounts, people, items, threads, messages, links, attachments, watchers',
  '1.0.0',
  'system',
  'builtin',
  true,
  true,
  NULL,
  '{}'::jsonb,
  '[]'::jsonb,
  NULL,
  'none',
  '[]'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Core Types
-- accounts.type_id and people.type_id are both NOT NULL, so these must exist
-- before any account or person can be created.
-- ---------------------------------------------------------------------------
INSERT INTO public.types (app_id, kind, slug, name, description, ownership, is_active, design_schema, validation_schema)
VALUES
  ((SELECT id FROM public.apps WHERE slug = 'spine-core'), 'account', 'account', 'Account', 'Organization or tenant account', 'pack', true,
    '{"views":{"default_list":{"type":"list","label":"Accounts","fields":{"slug":{"sortable":true,"display_type":"text"},"is_active":{"sortable":true,"display_type":"badge"},"display_name":{"sortable":true,"display_type":"text"}},"display":"table"},"default_detail":{"type":"detail","label":"Account","sections":[{"title":"Overview","fields":["slug","display_name","description","is_active"]},{"title":"Metadata","fields":["created_at","updated_at"]}]}},"fields":{"slug":{"label":"Slug","system":true,"required":true,"data_type":"text"},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"updated_at":{"label":"Updated","system":true,"readonly":true,"required":false,"data_type":"datetime"},"description":{"label":"Description","system":true,"required":false,"data_type":"textarea"},"display_name":{"label":"Display Name","system":true,"required":true,"data_type":"text"}},"record_permissions":{"member":["create","read","update"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb,
    '{"fields":{"slug":{"data_type":"text","required":true},"is_active":{"data_type":"boolean","required":true},"created_at":{"data_type":"datetime","required":false},"updated_at":{"data_type":"datetime","required":false},"description":{"data_type":"textarea","required":false},"display_name":{"data_type":"text","required":true}}}'::jsonb),
  ((SELECT id FROM public.apps WHERE slug = 'spine-core'), 'person',  'person',  'Person',  'User or contact person',         'pack', true,
    '{"views":{"default_list":{"type":"list","label":"People","fields":{"email":{"sortable":true,"display_type":"text"},"status":{"sortable":true,"display_type":"badge"},"full_name":{"sortable":true,"display_type":"text"},"is_active":{"sortable":true,"display_type":"badge"}},"display":"table"},"default_detail":{"type":"detail","label":"Person","sections":[{"title":"Profile","fields":["full_name","email","phone","avatar_url"]},{"title":"Status","fields":["status","is_active"]},{"title":"Metadata","fields":["created_at","updated_at"]}]}},"fields":{"email":{"label":"Email","system":true,"required":true,"data_type":"email"},"phone":{"label":"Phone","system":true,"required":false,"data_type":"phone"},"status":{"label":"Status","system":true,"required":true,"data_type":"text"},"full_name":{"label":"Full Name","system":true,"required":true,"data_type":"text"},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"avatar_url":{"label":"Avatar URL","system":true,"required":false,"data_type":"url"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"updated_at":{"label":"Updated","system":true,"readonly":true,"required":false,"data_type":"datetime"}},"record_permissions":{"member":["create","read","update"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb,
    '{"fields":{"email":{"data_type":"email","required":true},"phone":{"data_type":"phone","required":false},"status":{"data_type":"text","required":true},"full_name":{"data_type":"text","required":true},"is_active":{"data_type":"boolean","required":true},"avatar_url":{"data_type":"url","required":false},"created_at":{"data_type":"datetime","required":false},"updated_at":{"data_type":"datetime","required":false}}}'::jsonb)
ON CONFLICT (app_id, kind, slug) DO UPDATE
  SET design_schema = EXCLUDED.design_schema,
      validation_schema = EXCLUDED.validation_schema,
      name = EXCLUDED.name,
      description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- 4. Root System Account
-- The first system_admin person must belong to an account. This is the
-- bootstrap account for the Spine system itself.
-- NOTE: The system_admin person record is NOT seeded here — it is created
-- via Supabase Auth invite + the onboarding flow, which stamps type_id and
-- role_id onto the resulting people row.
-- ---------------------------------------------------------------------------
INSERT INTO public.accounts (type_id, slug, display_name, description, is_active, design_schema, validation_schema)
VALUES (
  (SELECT id FROM public.types WHERE kind = 'account' AND slug = 'account'),
  'spine-system',
  'Spine System',
  'Root system account for the Spine framework',
  true,
  (SELECT design_schema FROM public.types WHERE kind = 'account' AND slug = 'account'),
  '{}'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET design_schema = EXCLUDED.design_schema,
      validation_schema = EXCLUDED.validation_schema;

-- ---------------------------------------------------------------------------
-- 5. Core Spine Types
-- These types are owned by spine-core and provide design_schema for all
-- built-in framework entities. Apps build on top of these.
-- ---------------------------------------------------------------------------
INSERT INTO public.types (app_id, kind, slug, name, description, ownership, is_active, design_schema, validation_schema)
SELECT
  a.id,
  t.kind,
  t.slug,
  t.name,
  t.description,
  t.ownership,
  true,
  t.design_schema,
  t.validation_schema
FROM (VALUES
  ('alert',      'threshold_alert',         'Threshold Alert',         'System threshold alert configuration for observability',                            'tenant', '{"scope":"account","views":{"default_list":{"type":"list","label":"Threshold Alerts","fields":{"title":{"sortable":true,"display_type":"text"},"metric":{"sortable":true,"display_type":"badge"},"status":{"sortable":true,"display_type":"badge"},"is_active":{"sortable":true,"display_type":"badge"}},"display":"table","default_sort":{"field":"created_at","direction":"desc"}},"default_detail":{"type":"detail","label":"Threshold Alert","sections":[{"title":"Alert Config","fields":["title","description","metric","operator","value","window_minutes","pipeline_id"]},{"title":"Status","fields":["status","is_active"]},{"title":"Metadata","fields":["created_at","updated_at"]}]}},"fields":{"title":{"label":"Title","system":true,"required":true,"data_type":"text"},"value":{"label":"Value","system":false,"required":true,"data_type":"number"},"metric":{"label":"Metric","system":false,"required":true,"data_type":"text"},"status":{"label":"Status","system":true,"required":false,"data_type":"text"},"operator":{"label":"Operator","system":false,"required":true,"data_type":"text"},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"updated_at":{"label":"Updated","system":true,"readonly":true,"required":false,"data_type":"datetime"},"description":{"label":"Description","system":true,"required":false,"data_type":"textarea"},"pipeline_id":{"label":"Pipeline","system":false,"required":false,"data_type":"text"},"window_minutes":{"label":"Window (minutes)","system":false,"required":true,"data_type":"number"}},"record_permissions":{"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"title":{"data_type":"text","required":true},"value":{"data_type":"number","required":true},"metric":{"data_type":"text","required":true},"status":{"data_type":"text","required":false},"operator":{"data_type":"text","required":true},"is_active":{"data_type":"boolean","required":true},"created_at":{"data_type":"datetime","required":false},"updated_at":{"data_type":"datetime","required":false},"description":{"data_type":"textarea","required":false},"pipeline_id":{"data_type":"text","required":false},"window_minutes":{"data_type":"number","required":true}}}'::jsonb),
  ('attachment',  'attachment',              'Attachment',              'File attachment or document',                                                       'pack',   '{"scope":"account","views":{"default_list":{"type":"list","label":"Attachments","fields":{"filename":{"sortable":true,"display_type":"text"},"file_size":{"sortable":true,"display_type":"number"},"mime_type":{"sortable":true,"display_type":"badge"},"storage_provider":{"sortable":true,"display_type":"badge"}},"display":"table"},"default_detail":{"type":"detail","label":"Attachment","sections":[{"title":"File Info","fields":["filename","file_size","mime_type","storage_path","storage_provider"]},{"title":"Metadata","fields":["is_active","created_at"]}]}},"fields":{"filename":{"label":"Filename","system":true,"required":true,"data_type":"text"},"file_size":{"label":"File Size","system":true,"required":false,"data_type":"number"},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"mime_type":{"label":"MIME Type","system":true,"required":false,"data_type":"text"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"storage_path":{"label":"Storage Path","system":true,"required":false,"data_type":"text"},"storage_provider":{"label":"Storage Provider","system":true,"required":false,"data_type":"text"}},"record_permissions":{"member":["read"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"filename":{"data_type":"text","required":true},"file_size":{"data_type":"number","required":false},"is_active":{"data_type":"boolean","required":true},"mime_type":{"data_type":"text","required":false},"created_at":{"data_type":"datetime","required":false},"storage_path":{"data_type":"text","required":false},"storage_provider":{"data_type":"text","required":false}}}'::jsonb),
  ('item',        'item',                    'Item',                    'Generic work item or record',                                                       'pack',   '{"scope":"account","views":{"default_list":{"type":"list","label":"Items","fields":{"title":{"sortable":true,"display_type":"text"},"status":{"sortable":true,"display_type":"badge"},"is_active":{"sortable":true,"display_type":"badge"}},"display":"table"},"default_detail":{"type":"detail","label":"Item","sections":[{"title":"Details","fields":["title","description","status","is_active"]},{"title":"Metadata","fields":["created_at","updated_at"]}]}},"fields":{"title":{"label":"Title","system":true,"required":true,"data_type":"text"},"status":{"label":"Status","system":true,"required":true,"data_type":"text"},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"updated_at":{"label":"Updated","system":true,"readonly":true,"required":false,"data_type":"datetime"},"description":{"label":"Description","system":true,"required":false,"data_type":"textarea"}},"record_permissions":{"member":["create","read","update"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"title":{"data_type":"text","required":true},"status":{"data_type":"text","required":true},"is_active":{"data_type":"boolean","required":true},"created_at":{"data_type":"datetime","required":false},"updated_at":{"data_type":"datetime","required":false},"description":{"data_type":"textarea","required":false}}}'::jsonb),
  ('item',        'activity_log',            'Activity Log',            'Audit log for funnel intelligence activities',                                      'tenant', '{"scope":"platform","views":{"default_list":{"type":"list","label":"Activity Logs","fields":{"action":{"sortable":true,"display_type":"badge"},"account_id":{"sortable":true,"display_type":"text"},"created_at":{"sortable":true,"display_type":"timestamp"}},"display":"table","default_sort":{"field":"created_at","direction":"desc"}}},"fields":{"action":{"label":"Action","options":["lead_score_updated","lifecycle_stage_changed","signal_processed","task_created"],"required":true,"data_type":"text"},"new_score":{"label":"New Score","required":false,"data_type":"integer"},"new_stage":{"label":"New Stage","required":false,"data_type":"text"},"person_id":{"label":"Person ID","required":false,"data_type":"uuid"},"account_id":{"label":"Account ID","required":false,"data_type":"uuid"},"score_delta":{"label":"Score Delta","required":false,"data_type":"integer"},"signal_type":{"label":"Signal Type","required":false,"data_type":"text"}},"record_permissions":{"member":["read"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"action":{"data_type":"text","required":true,"options":["lead_score_updated","lifecycle_stage_changed","signal_processed","task_created"]},"new_score":{"data_type":"integer","required":false},"new_stage":{"data_type":"text","required":false},"person_id":{"data_type":"uuid","required":false},"account_id":{"data_type":"uuid","required":false},"score_delta":{"data_type":"integer","required":false},"signal_type":{"data_type":"text","required":false}}}'::jsonb),
  ('item',        'task',                    'Task',                    'Task or action item for follow-up and tracking',                                    'tenant', '{"scope":"platform","views":{"default_list":{"type":"list","label":"Tasks","fields":{"status":{"sortable":true,"display_type":"badge"},"due_date":{"sortable":true,"display_type":"timestamp"},"priority":{"sortable":true,"display_type":"badge"},"task_type":{"sortable":true,"display_type":"badge"}},"display":"table","default_sort":{"field":"created_at","direction":"desc"}},"default_detail":{"type":"detail","label":"Task","sections":[{"title":"Task Details","fields":["task_type","priority","description","due_date"]},{"title":"Assignment","fields":["account_id","person_id"]},{"title":"Metadata","fields":["status","created_at","updated_at"]}]}},"fields":{"due_date":{"label":"Due Date","required":false,"data_type":"datetime"},"priority":{"label":"Priority","default":"medium","options":["low","medium","high","urgent"],"required":true,"data_type":"text"},"person_id":{"label":"Person ID","required":false,"data_type":"uuid"},"task_type":{"label":"Task Type","options":["lead_review","customer_followup","support_escalation","health_check"],"required":true,"data_type":"text"},"account_id":{"label":"Account ID","required":false,"data_type":"uuid"},"description":{"label":"Description","required":true,"data_type":"textarea"}},"record_permissions":{"member":["read"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"due_date":{"data_type":"datetime","required":false},"priority":{"data_type":"text","required":true,"options":["low","medium","high","urgent"]},"person_id":{"data_type":"uuid","required":false},"task_type":{"data_type":"text","required":true,"options":["lead_review","customer_followup","support_escalation","health_check"]},"account_id":{"data_type":"uuid","required":false},"description":{"data_type":"textarea","required":true}}}'::jsonb),
  ('link',        'link',                    'Link',                    'Relationship between entities',                                                     'pack',   '{"scope":"account","views":{"default_list":{"type":"list","label":"Links","fields":{"link_type":{"sortable":true,"display_type":"badge"},"source_type":{"sortable":true,"display_type":"text"},"target_type":{"sortable":true,"display_type":"text"}},"display":"table"},"default_detail":{"type":"detail","label":"Link","sections":[{"title":"Relationship","fields":["source_type","target_type","link_type","is_active"]},{"title":"Metadata","fields":["created_at"]}]}},"fields":{"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"link_type":{"label":"Link Type","system":true,"required":false,"data_type":"text"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"source_type":{"label":"Source Type","system":true,"required":true,"data_type":"text"},"target_type":{"label":"Target Type","system":true,"required":true,"data_type":"text"}},"record_permissions":{"member":["create","read"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"is_active":{"data_type":"boolean","required":true},"link_type":{"data_type":"text","required":false},"created_at":{"data_type":"datetime","required":false},"source_type":{"data_type":"text","required":true},"target_type":{"data_type":"text","required":true}}}'::jsonb),
  ('message',     'message',                 'Message',                 'Individual message in a thread',                                                    'pack',   '{"scope":"platform","views":{"default_list":{"type":"list","label":"Messages","fields":{"content":{"sortable":false,"display_type":"text"},"sequence":{"sortable":true,"display_type":"number"},"direction":{"sortable":true,"display_type":"badge"}},"display":"table"},"default_detail":{"type":"detail","label":"Message","sections":[{"title":"Content","fields":["content","direction","sequence","visibility"]},{"title":"Metadata","fields":["created_at"]}]}},"fields":{"content":{"label":"Content","system":true,"required":true,"data_type":"textarea"},"sequence":{"label":"Sequence","system":true,"required":true,"data_type":"number"},"direction":{"label":"Direction","system":true,"required":true,"data_type":"text"},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"visibility":{"label":"Visibility","system":true,"required":false,"data_type":"text"},"message_type":{"label":"Message Type","system":true,"required":false,"data_type":"text"}},"record_permissions":{"member":["read","create"],"support":["read","create","update","delete"],"system_admin":["read","create","update","delete"]}}'::jsonb, '{"fields":{"content":{"data_type":"textarea","required":true},"sequence":{"data_type":"number","required":true},"direction":{"data_type":"text","required":true},"is_active":{"data_type":"boolean","required":true},"created_at":{"data_type":"datetime","required":false},"visibility":{"data_type":"text","required":false},"message_type":{"data_type":"text","required":false}}}'::jsonb),
  ('progress',    'course_lesson_progress',  'Course Lesson Progress',  'Tracks per-student progress through a course lesson',                              'pack',   '{"scope":"account","views":{"default_list":{"type":"list","label":"Progress Records","fields":{"score":{"sortable":true,"display_type":"number"},"title":{"sortable":true,"display_type":"text"},"status":{"sortable":true,"display_type":"badge"},"updated_at":{"sortable":true,"display_type":"timestamp"}},"display":"table"},"default_detail":{"type":"detail","label":"Progress Record","sections":[{"title":"Overview","fields":["title","description","status","score"]},{"title":"Activity","fields":["attempts","time_spent","last_position","started_at","completed_at"]},{"title":"Metadata","fields":["is_active","created_at","updated_at"]}]}},"fields":{"score":{"label":"Score","system":true,"required":false,"data_type":"number","validation":{"max":100,"min":0,"integer":true}},"title":{"label":"Title","system":true,"readonly":true,"required":false,"data_type":"text"},"status":{"label":"Status","system":true,"options":["not_started","in_progress","completed"],"required":true,"data_type":"select"},"attempts":{"label":"Attempts","required":false,"data_type":"number","validation":{"min":0,"integer":true}},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"started_at":{"label":"Started At","readonly":true,"required":false,"data_type":"datetime"},"time_spent":{"label":"Time Spent (s)","required":false,"data_type":"number","validation":{"min":0,"integer":true}},"updated_at":{"label":"Updated","system":true,"readonly":true,"required":false,"data_type":"datetime"},"description":{"label":"Description","system":true,"readonly":true,"required":false,"data_type":"textarea"},"completed_at":{"label":"Completed At","readonly":true,"required":false,"data_type":"datetime"},"last_position":{"label":"Last Position (s)","required":false,"data_type":"number","validation":{"min":0,"integer":true}}},"pipeline":["not_started","in_progress","completed"],"record_permissions":{"member":["create","read","update"],"support":["create","read","update"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"score":{"data_type":"number","required":false,"max":100,"min":0,"integer":true},"title":{"data_type":"text","required":false},"status":{"data_type":"select","required":true,"options":["not_started","in_progress","completed"]},"attempts":{"data_type":"number","required":false,"min":0,"integer":true},"is_active":{"data_type":"boolean","required":true},"created_at":{"data_type":"datetime","required":false},"started_at":{"data_type":"datetime","required":false},"time_spent":{"data_type":"number","required":false,"min":0,"integer":true},"updated_at":{"data_type":"datetime","required":false},"description":{"data_type":"textarea","required":false},"completed_at":{"data_type":"datetime","required":false},"last_position":{"data_type":"number","required":false,"min":0,"integer":true}}}'::jsonb),
  ('thread',      'thread',                  'Thread',                  'Conversation thread for items or entities',                                         'pack',   '{"scope":"platform","views":{"default_list":{"type":"list","label":"Threads","fields":{"title":{"sortable":true,"display_type":"text"},"status":{"sortable":true,"display_type":"badge"},"visibility":{"sortable":true,"display_type":"badge"},"target_type":{"sortable":true,"display_type":"badge"}},"display":"table"},"default_detail":{"type":"detail","label":"Thread","sections":[{"title":"Overview","fields":["title","target_type","visibility","status","is_active"]},{"title":"Metadata","fields":["created_at","updated_at"]}]}},"fields":{"title":{"label":"Title","system":true,"required":false,"data_type":"text"},"status":{"label":"Status","system":true,"required":true,"data_type":"text"},"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"updated_at":{"label":"Updated","system":true,"readonly":true,"required":false,"data_type":"datetime"},"visibility":{"label":"Visibility","system":true,"required":true,"data_type":"text"},"target_type":{"label":"Target Type","system":true,"required":true,"data_type":"text"}},"ai_routing":{"agent_id":{"type":"string","label":"Agent ID"},"prompt_config_id":{"type":"string","label":"Prompt Config ID"}},"record_permissions":{"member":["read","create"],"support":["read","create","update","delete"],"system_admin":["read","create","update","delete"]}}'::jsonb, '{"fields":{"title":{"data_type":"text","required":false},"status":{"data_type":"text","required":true},"is_active":{"data_type":"boolean","required":true},"created_at":{"data_type":"datetime","required":false},"updated_at":{"data_type":"datetime","required":false},"visibility":{"data_type":"text","required":true},"target_type":{"data_type":"text","required":true}}}'::jsonb),
  ('watcher',     'watcher',                 'Watcher',                 'Entity watcher subscription',                                                       'pack',   '{"scope":"account","views":{"default_list":{"type":"list","label":"Watchers","fields":{"is_active":{"sortable":true,"display_type":"badge"},"watch_type":{"sortable":true,"display_type":"badge"},"target_type":{"sortable":true,"display_type":"text"},"notification_level":{"sortable":true,"display_type":"badge"}},"display":"table"},"default_detail":{"type":"detail","label":"Watcher","sections":[{"title":"Watch Settings","fields":["target_type","watch_type","notification_level","is_active"]},{"title":"Metadata","fields":["created_at","updated_at"]}]}},"fields":{"is_active":{"label":"Active","system":true,"required":true,"data_type":"boolean"},"created_at":{"label":"Created","system":true,"readonly":true,"required":false,"data_type":"datetime"},"updated_at":{"label":"Updated","system":true,"readonly":true,"required":false,"data_type":"datetime"},"watch_type":{"label":"Watch Type","system":true,"required":false,"data_type":"text"},"target_type":{"label":"Target Type","system":true,"required":true,"data_type":"text"},"notification_level":{"label":"Notification Level","system":true,"required":true,"data_type":"text"}},"record_permissions":{"member":["create","read","delete"],"support":["create","read","delete"],"system_admin":["create","read","update","delete"]}}'::jsonb, '{"fields":{"is_active":{"data_type":"boolean","required":true},"created_at":{"data_type":"datetime","required":false},"updated_at":{"data_type":"datetime","required":false},"watch_type":{"data_type":"text","required":false},"target_type":{"data_type":"text","required":true},"notification_level":{"data_type":"text","required":true}}}'::jsonb)
) AS t(kind, slug, name, description, ownership, design_schema, validation_schema)
CROSS JOIN (SELECT id FROM public.apps WHERE slug = 'spine-core') AS a
ON CONFLICT (app_id, kind, slug) DO UPDATE
  SET design_schema = EXCLUDED.design_schema,
      validation_schema = EXCLUDED.validation_schema,
      name = EXCLUDED.name,
      description = EXCLUDED.description;

-- NOTE: No link types are seeded here. All link types are app-owned.
-- Cortex seeds: account_signals, account_opportunities, analyzed_by, tagged_with
-- See custom/apps/cortex/seed/link-types.json
