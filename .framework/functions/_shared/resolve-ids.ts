// Slug-based ID resolution utilities
// Custom app code must never hardcode UUIDs — IDs differ on every fresh install.
// All functions that need entity IDs must call resolveIds() at request time.

import { adminDb } from './db'

interface ResolvedIds {
  types: Record<string, string>
  linkTypes: Record<string, string>
  accounts: Record<string, string>
}

// Resolve type IDs by (kind, slug) pairs
export async function resolveTypeIds(
  pairs: Array<{ kind: string; slug: string }>
): Promise<Record<string, string>> {
  if (pairs.length === 0) return {}

  const { data, error } = await adminDb
    .from('types')
    .select('id, kind, slug')
    .in('slug', pairs.map(p => p.slug))
    .in('kind', [...new Set(pairs.map(p => p.kind))])

  if (error) throw new Error(`resolveTypeIds failed: ${error.message}`)

  const result: Record<string, string> = {}
  for (const row of data || []) {
    const key = `${row.kind}/${row.slug}`
    result[key] = row.id
  }

  for (const pair of pairs) {
    const key = `${pair.kind}/${pair.slug}`
    if (!result[key]) throw new Error(`Type not found: ${key}`)
  }

  return result
}

// Resolve a single type ID — throws if not found
export async function resolveTypeId(kind: string, slug: string): Promise<string> {
  const ids = await resolveTypeIds([{ kind, slug }])
  return ids[`${kind}/${slug}`]
}

// Resolve link type IDs by slug
export async function resolveLinkTypeIds(slugs: string[]): Promise<Record<string, string>> {
  if (slugs.length === 0) return {}

  const { data, error } = await adminDb
    .from('link_types')
    .select('id, slug')
    .in('slug', slugs)

  if (error) throw new Error(`resolveLinkTypeIds failed: ${error.message}`)

  const result: Record<string, string> = {}
  for (const row of data || []) {
    result[row.slug] = row.id
  }

  for (const slug of slugs) {
    if (!result[slug]) throw new Error(`Link type not found: ${slug}`)
  }

  return result
}

// Resolve account ID by slug
export async function resolveAccountId(slug: string): Promise<string> {
  const { data, error } = await adminDb
    .from('accounts')
    .select('id')
    .eq('slug', slug)
    .single()

  if (error || !data) throw new Error(`Account not found: ${slug}`)
  return data.id
}

// Resolve AI agent ID by name
export async function resolveAgentId(name: string): Promise<string> {
  const { data, error } = await adminDb
    .from('ai_agents')
    .select('id')
    .eq('name', name)
    .eq('is_active', true)
    .single()

  if (error || !data) throw new Error(`AI agent not found: ${name}`)
  return data.id
}

// Resolve prompt config ID by slug
export async function resolvePromptConfigId(slug: string): Promise<string> {
  const { data, error } = await adminDb
    .from('prompt_configs')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) throw new Error(`Prompt config not found: ${slug}`)
  return data.id
}
