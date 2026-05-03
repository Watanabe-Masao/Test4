/**
 * Architecture Rule ヘルパー関数
 *
 * - Lookup: getRuleById, getRulesByGuardTag, getRulesByDetectionType, getRuleByResponsibilityTag
 * - メッセージ: formatViolationMessage, checkRatchetDown
 * - AAG レスポンス: buildAagResponse — rule-aware wrapper
 *
 * Feedback 層単一性 (= aag/operational-classification.md §6 の通知統一原則):
 *   AagResponse 型 + renderAagResponse + buildObligationResponse は
 *   `tools/architecture-health/src/aag-response.ts` を canonical 正本とし、
 *   本 file からは re-export のみ。app/ と tools/ の compilation context が
 *   分離されているため `@tools` alias 経由で import (= app vitest config + tsconfig
 *   paths で resolved)。`aagResponseFeedbackUnificationGuard.test.ts` が両 file
 *   間の drift を構造的に拒否する。
 *
 * @responsibility R:unclassified
 */

import type { ArchitectureRule, AagSlice, DetectionType } from './types'
import { ARCHITECTURE_RULES } from './merged'
import {
  type AagResponse,
  renderAagResponse,
  buildObligationResponse,
} from '@tools/architecture-health/aag-response'

// AagResponse 型 + renderer は Feedback 層 canonical (tools/) から re-export
// (= 本 file の consumer が後方互換的に import 可能、内部統一は guard 検証)
export type { AagResponse }
export { renderAagResponse, buildObligationResponse }

// ─── Lookup 関数 ─────────────────────────────────────────

const ruleById = new Map(ARCHITECTURE_RULES.map((r) => [r.id, r]))

export function getRuleById(id: string): ArchitectureRule | undefined {
  return ruleById.get(id)
}

export function getRulesByGuardTag(tag: string): readonly ArchitectureRule[] {
  return ARCHITECTURE_RULES.filter((r) => r.guardTags.includes(tag))
}

export function getRulesByDetectionType(type: DetectionType): readonly ArchitectureRule[] {
  return ARCHITECTURE_RULES.filter((r) => r.detection.type === type)
}

export function getRuleByResponsibilityTag(tag: string): ArchitectureRule | undefined {
  return ARCHITECTURE_RULES.find((r) => r.responsibilityTags?.includes(tag))
}

// ─── メッセージフォーマット ──────────────────────────────

/**
 * 違反メッセージを統一フォーマットで生成する。
 * テストの expect メッセージとして使う。
 */
/**
 * ratchet-down チェック: 実測値がベースラインを下回ったら更新を促す。
 * テストの expect 後に呼ぶ。
 */
export function checkRatchetDown(
  rule: ArchitectureRule,
  actual: number,
  baselineKey: string,
): void {
  const baseline = rule.detection.baseline
  if (baseline === undefined) return
  if (actual < baseline) {
    console.log(
      `\n[ratchet-down] ${rule.id}: ${baselineKey} が ${baseline} → ${actual} に減少。` +
        `\narchitectureRules.ts の ${rule.id} の baseline を ${actual} に更新してください。`,
    )
  }
}

/**
 * AAG 標準違反レスポンス生成器
 *
 * 違反時に返す 5 項目:
 * 1. 何が止まったか（what）
 * 2. なぜ止まったか（why）
 * 3. 今やること（migrationRecipe.steps）
 * 4. 例外がありうるか（decisionCriteria.exceptions）
 * 5. 深掘り先（doc）
 *
 * @see aag/_internal/architecture.md
 */
export function formatViolationMessage(
  rule: ArchitectureRule,
  violations: readonly string[],
): string {
  // AAG 統一レスポンス経由で出力（全入口共通フォーマット）
  return `[${rule.id}] ${renderAagResponse(buildAagResponse(rule, violations))}`
}

/** ArchitectureRule + 違反一覧 → AagResponse (= rule-aware wrapper、guard 入口で使用) */
export function buildAagResponse(
  rule: ArchitectureRule,
  violations: readonly string[],
  source: AagResponse['source'] = 'guard',
): AagResponse {
  return {
    source,
    fixNow: rule.fixNow ?? 'debt',
    slice: (rule.slice as AagSlice | undefined) ?? null,
    summary: rule.what,
    reason: rule.why,
    steps: rule.migrationRecipe.steps,
    exceptions: rule.decisionCriteria?.exceptions ?? null,
    deepDive: rule.doc ?? null,
    violations,
  }
}

// AAG 統一レスポンス構造 (= AagResponse / renderAagResponse / buildObligationResponse) は
// `tools/architecture-health/src/aag-response.ts` を canonical 正本とする (= file 冒頭で
// re-export 済)。本 file 内では rule-aware wrapper である `buildAagResponse` のみを定義する。
