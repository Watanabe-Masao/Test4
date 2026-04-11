/**
 * GuardMetadataView — ARCHITECTURE_RULES + GUARD_CATEGORY_MAP からの導出 view
 *
 * 正本を増やさず、既存の2つの正本から full metadata 相当の一覧を導出する。
 * 手編集禁止（semanticViews.ts と同じ原則）。
 *
 * 層: Execution（派生物）
 * 導出元: architectureRules.ts（Schema 正本）+ guardCategoryMap.ts（Schema 正本）
 *
 * @responsibility R:utility
 * @see app/src/test/aagSchemas.ts — AagGuardMetadata 型定義
 */

import { ARCHITECTURE_RULES } from './architectureRules'
import { GUARD_CATEGORY_MAP } from './guardCategoryMap'
import type { AagGuardMetadata } from './aagSchemas'

export type DerivedGuardMetadata = Omit<AagGuardMetadata, 'sourceOfTruth' | 'targetArea'> & {
  readonly sourceOfTruth: string | null
  readonly targetArea: string | null
}

function deriveGuardMetadata(): readonly DerivedGuardMetadata[] {
  return ARCHITECTURE_RULES.map((rule) => {
    const categoryEntry = GUARD_CATEGORY_MAP[rule.id]

    return {
      ruleId: rule.id,
      category: categoryEntry?.category ?? 'ratchet-legacy-control',
      layer: categoryEntry?.layer ?? 'execution',
      severity:
        rule.detection.severity === 'gate'
          ? 'gate'
          : rule.detection.severity === 'block-merge'
            ? 'gate'
            : ('warn' as const),
      sourceOfTruth: rule.doc ?? null,
      enforcement:
        rule.detection.severity === 'gate'
          ? 'hard'
          : typeof rule.detection.baseline === 'number'
            ? 'ratchet'
            : ('soft' as const),
      targetArea: rule.outdatedPattern.codeSignals?.[0] ?? null,
      description: rule.what,
      canAutoFix: rule.migrationPath?.effort === 'trivial',
      sunsetCondition: rule.sunsetCondition ?? null,
    } satisfies DerivedGuardMetadata
  })
}

/** ARCHITECTURE_RULES + GUARD_CATEGORY_MAP から導出した full metadata view */
export const GUARD_METADATA_VIEW = deriveGuardMetadata()
