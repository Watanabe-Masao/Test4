/**
 * Architecture Rule ヘルパー関数
 *
 * - Lookup: getRuleById, getRulesByGuardTag, getRulesByDetectionType, getRuleByResponsibilityTag
 * - メッセージ: formatViolationMessage, checkRatchetDown
 * - AAG レスポンス: buildAagResponse, renderAagResponse, buildObligationResponse
 *
 * @responsibility R:unclassified
 */

import type { ArchitectureRule, AagSlice, DetectionType } from './types'
import { SLICE_GUIDANCE } from './types'
import { ARCHITECTURE_RULES } from './merged'

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
 * @see references/01-principles/aag/architecture.md
 */
export function formatViolationMessage(
  rule: ArchitectureRule,
  violations: readonly string[],
): string {
  // AAG 統一レスポンス経由で出力（全入口共通フォーマット）
  return `[${rule.id}] ${renderAagResponse(buildAagResponse(rule, violations))}`
}

// ── AAG 統一レスポンス構造（Phase 3） ──────────────────────────

/**
 * AAG 統一レスポンス — guard / obligation / health / pre-commit 共通
 *
 * どこで止まっても同じ情報構造で返る。
 * @see references/01-principles/aag/architecture.md
 */
export interface AagResponse {
  /** 情報源: guard / obligation / health / pre-commit */
  readonly source: 'guard' | 'obligation' | 'health' | 'pre-commit'
  /** 運用区分 */
  readonly fixNow: 'now' | 'debt' | 'review'
  /** 関心スライス */
  readonly slice: AagSlice | null
  /** 1. 何が止まったか */
  readonly summary: string
  /** 2. なぜ止まったか */
  readonly reason: string
  /** 3. 今やること */
  readonly steps: readonly string[]
  /** 4. 例外がありうるか */
  readonly exceptions: string | null
  /** 5. 深掘り先 */
  readonly deepDive: string | null
  /** 違反の詳細一覧 */
  readonly violations: readonly string[]
}

/** ArchitectureRule + 違反一覧 → AagResponse */
export function buildAagResponse(
  rule: ArchitectureRule,
  violations: readonly string[],
  source: AagResponse['source'] = 'guard',
): AagResponse {
  return {
    source,
    fixNow: rule.fixNow ?? 'debt',
    slice: rule.slice ?? null,
    summary: rule.what,
    reason: rule.why,
    steps: rule.migrationRecipe.steps,
    exceptions: rule.decisionCriteria?.exceptions ?? null,
    deepDive: rule.doc ?? null,
    violations,
  }
}

/** AagResponse → 人間可読文字列（テスト出力・PR コメント・pre-commit 共通） */
export function renderAagResponse(resp: AagResponse): string {
  const fixLabel =
    resp.fixNow === 'now'
      ? '⚡ 今すぐ修正'
      : resp.fixNow === 'debt'
        ? '📋 構造負債として管理'
        : '🔍 観測・レビュー対象'

  const sliceLabel = resp.slice ? ` [${resp.slice}]` : ''
  const guidance = resp.slice ? SLICE_GUIDANCE[resp.slice] : null

  const lines = [`${fixLabel}${sliceLabel}`, `  ${resp.summary}`, `  理由: ${resp.reason}`]

  if (guidance) {
    lines.push(`  方向: ${guidance}`)
  }

  // fixNow ごとに返す内容の性格を分ける
  switch (resp.fixNow) {
    case 'now':
      // この diff で直す手順を短く返す
      if (resp.steps.length > 0) {
        lines.push('  修正手順:')
        for (const step of resp.steps) lines.push(`    ${step}`)
      }
      break
    case 'debt':
      // allowlist / active-debt / removalCondition 側へ誘導
      lines.push('  対応: allowlist に登録して計画的に返済する')
      if (resp.steps.length > 0) {
        lines.push('  解消手順（返済時）:')
        for (const step of resp.steps) lines.push(`    ${step}`)
      }
      break
    case 'review':
      // コード修正ではなく、レビューや見直しに回す
      lines.push('  対応: コード修正不要。Discovery Review で評価する')
      if (resp.deepDive) {
        lines.push(`  レビュー先: ${resp.deepDive}`)
      }
      break
  }

  if (resp.exceptions) {
    lines.push(`  例外: ${resp.exceptions}`)
  }

  if (resp.fixNow !== 'review' && resp.deepDive) {
    lines.push(`  詳細: ${resp.deepDive}`)
  }

  if (resp.violations.length > 0) {
    const maxShow = resp.fixNow === 'review' ? 3 : resp.violations.length
    lines.push(`  違反 (${resp.violations.length} 件):`)
    for (const v of resp.violations.slice(0, maxShow)) lines.push(`    ${v}`)
    if (resp.violations.length > maxShow) {
      lines.push(`    ... 他 ${resp.violations.length - maxShow} 件`)
    }
  }

  return lines.join('\n')
}

/** Obligation 違反用の AagResponse 生成（rule を持たないケース） */
export function buildObligationResponse(
  obligationId: string,
  label: string,
  triggerPath: string,
): AagResponse {
  return {
    source: 'obligation',
    fixNow: 'now',
    slice: 'governance-ops',
    summary: label,
    reason: `${triggerPath} が変更されたため、関連ドキュメントの更新が必要`,
    steps: [
      '1. cd app && npm run docs:generate',
      '2. git add references/02-status/generated/ CLAUDE.md',
    ],
    exceptions: null,
    deepDive: 'tools/architecture-health/src/collectors/obligation-collector.ts',
    violations: [`obligation: ${obligationId}`],
  }
}
