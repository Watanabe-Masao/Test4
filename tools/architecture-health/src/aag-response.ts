/**
 * AAG 統一レスポンスレンダラ — 全入口の単一描画経路
 *
 * app/src/test/architectureRules.ts の renderAagResponse() と同じ出力契約。
 * tools/ 側（obligation-collector, pre-commit CLI）はこのモジュールを経由する。
 *
 * **canonical contract**:
 *   `docs/contracts/aag/aag-response.schema.json` (JSON Schema draft-07)
 *   = 言語非依存 contract。本 file の `AagResponse` interface は同 schema と
 *   structurally identical (`aagContractSchemaSyncGuard.test.ts` で機械検証)。
 *
 * **変更時の注意:** architectureRules.ts 側の renderAagResponse() と
 * 出力フォーマットを一致させること。入口品質テストが drift を検出する。
 * 加えて、本 interface に field を追加 / 変更する際は schema も同期更新
 * すること (sync guard hard fail で検出)。
 *
 * @see docs/contracts/aag/aag-response.schema.json (canonical contract)
 * @see app/src/test/guards/aagContractSchemaSyncGuard.test.ts (sync verification)
 */

export type AagSlice =
  | 'layer-boundary'
  | 'canonicalization'
  | 'query-runtime'
  | 'responsibility-separation'
  | 'governance-ops'

export type FixNow = 'now' | 'debt' | 'review'

export interface AagResponse {
  readonly source: 'guard' | 'obligation' | 'health' | 'pre-commit'
  readonly fixNow: FixNow
  readonly slice: AagSlice | null
  readonly summary: string
  readonly reason: string
  readonly steps: readonly string[]
  readonly exceptions: string | null
  readonly deepDive: string | null
  readonly violations: readonly string[]
}

/** slice ごとの短い誘導文 — 違反時に「向かう先」を 1 行で示す */
export const SLICE_GUIDANCE: Readonly<Record<AagSlice, string>> = {
  'layer-boundary': 'hook / adapter / interface 経由に変更する',
  canonicalization: 'readModel / 正本関数 / path guard 経由に変更する',
  'query-runtime': 'QueryHandler / AnalysisFrame 経由に変更する',
  'responsibility-separation': '責務分離（分割 or active-debt）で対応する',
  'governance-ops': 'docs:generate / rule review で対応する',
}

/** AagResponse → 人間可読文字列（全入口共通の単一描画関数） */
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

  switch (resp.fixNow) {
    case 'now':
      if (resp.steps.length > 0) {
        lines.push('  修正手順:')
        for (const step of resp.steps) lines.push(`    ${step}`)
      }
      break
    case 'debt':
      lines.push('  対応: allowlist に登録して計画的に返済する')
      if (resp.steps.length > 0) {
        lines.push('  解消手順（返済時）:')
        for (const step of resp.steps) lines.push(`    ${step}`)
      }
      break
    case 'review':
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

/** Obligation 違反用の AagResponse 生成 */
export function buildObligationResponse(
  label: string,
  triggerPath: string,
): AagResponse {
  return {
    source: 'obligation',
    fixNow: 'now',
    slice: 'governance-ops',
    summary: label,
    reason: `${triggerPath} の変更が検出されたため、関連ドキュメントの更新が必要`,
    steps: [
      '1. cd app && npm run docs:generate',
      '2. git add references/02-status/generated/ CLAUDE.md',
    ],
    exceptions: null,
    deepDive: 'tools/architecture-health/src/collectors/obligation-collector.ts',
    violations: [],
  }
}
