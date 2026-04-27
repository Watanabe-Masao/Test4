/**
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
 *
 * @responsibility R:unclassified
 */
// Domain layer — 全サブモジュールを re-export（F1: バレルで後方互換）
export * from './models'
export * from './calculations'
export * from './constants'
export * from './formatting'
export * from './patterns'
export * from './ports'
export * from './repositories'
export * from './scopeResolution'
export * from './utilities'
