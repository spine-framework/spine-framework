import { SpineConfig } from '../types'

let globalConfig: SpineConfig | null = null

export function configureSpine(config: SpineConfig): void {
  globalConfig = config
}

export function getSpineConfig(): SpineConfig | null {
  return globalConfig
}

export function mergeConfig(base: SpineConfig, override: Partial<SpineConfig>): SpineConfig {
  return {
    database: { ...base.database, ...override.database },
    auth: { ...base.auth, ...override.auth },
    apps: { ...base.apps, ...override.apps },
    ai: base.ai && override.ai ? { ...base.ai, ...override.ai } : base.ai || override.ai
  }
}
