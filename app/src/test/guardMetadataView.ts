/**
 * GuardMetadataView — ARCHITECTURE_RULES + GUARD_CATEGORY_MAP からの導出 view
 *
 * 正本を増やさず、既存の2つの正本から full metadata 相当の一覧を導出する。
 * 手編集禁止（semanticViews.ts と同じ原則）。
 *
 * 導出解釈:
 * - severity は AAG 表示用の正規化（block-merge → gate に統合）
 * - enforcement は rule 定義からの導出解釈（gate → hard, baseline あり → ratchet）
 * - note は guardCategoryMap.ts の再編メタ情報をそのまま通す
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
  /** guardCategoryMap.ts の再編メタ情報（標準プレフィックス付き） */
  readonly note: string | null
}

function deriveGuardMetadata(): readonly DerivedGuardMetadata[] {
  return ARCHITECTURE_RULES.map((rule) => {
    const categoryEntry = GUARD_CATEGORY_MAP[rule.id]
    if (!categoryEntry) {
      throw new Error(
        `${rule.id} が guardCategoryMap に未登録。architectureRuleGuard のテストで検出されるべき`,
      )
    }

    return {
      ruleId: rule.id,
      category: categoryEntry.category,
      layer: categoryEntry.layer,
      severity:
        rule.detection.severity === 'gate' || rule.detection.severity === 'block-merge'
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
      canAutoFix: rule.executionPlan?.effort === 'trivial',
      sunsetCondition: rule.sunsetCondition ?? null,
      note: categoryEntry.note,
    } satisfies DerivedGuardMetadata
  })
}

/** ARCHITECTURE_RULES + GUARD_CATEGORY_MAP から導出した full metadata view */
export const GUARD_METADATA_VIEW = deriveGuardMetadata()
