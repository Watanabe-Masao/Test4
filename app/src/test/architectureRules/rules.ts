/**
 * Architecture Rules — re-export facade（旧位置、物理正本は app-domain 側）
 *
 * BaseRule 配列の物理正本は
 * `app-domain/gross-profit/rule-catalog/base-rules.ts` に移動済み。
 *
 * このファイルは後方互換のための薄い re-export に過ぎない。
 * consumer は **必ず** `../architectureRules`（facade）経由で参照すること。
 * 直 import は `AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT` で禁止される。
 *
 * 例外的に直接参照してよいファイル:
 * - architectureRules/merged.ts（正本合成点）
 * - guards/executionOverlayGuard.test.ts（BaseRule vs overlay 整合検証）
 *
 * @responsibility R:unclassified
 * @see references/03-implementation/governance-final-placement-plan.md
 * @see app-domain/gross-profit/rule-catalog/base-rules.ts — 物理正本
 */

export { ARCHITECTURE_RULES } from '@app-domain/gross-profit/rule-catalog/base-rules'
