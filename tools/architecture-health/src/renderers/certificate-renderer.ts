/**
 * Certificate Renderer — 健康診断書を1枚の Markdown に生成する
 *
 * 構成:
 *   1. 総合判定
 *   2. Hard Gate
 *   3. 健康指標サマリ（6本）
 *   4. 危険箇所トップ3
 *   5. 直近の変化
 *   6. 推奨アクション
 *
 * 正本は architecture-health.json。この文書はビュー。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { AAG_FIX_HINTS } from '../config/aag-fix-hints.js'
import { resolve, dirname } from 'node:path'
import type { HealthReport } from '../types.js'
import type {
  OverallAssessment,
  CompositeIndicator,
  RiskItem,
  ChangeItem,
  RecommendedAction,
} from '../diagnostics.js'

// ---------------------------------------------------------------------------
// Verdict rendering
// ---------------------------------------------------------------------------

const VERDICT_ICON: Record<string, string> = {
  Healthy: 'Healthy',
  Watch: 'Watch',
  Risk: 'RISK',
}

const TREND_ICON: Record<string, string> = {
  Improved: 'Improved',
  Flat: 'Flat',
  Regressed: 'Regressed',
}

const STATUS_BADGE: Record<string, string> = {
  ok: 'OK',
  warn: 'WARN',
  fail: 'FAIL',
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

export interface CertificateInput {
  readonly report: HealthReport
  readonly assessment: OverallAssessment
  readonly indicators: readonly CompositeIndicator[]
  readonly risks: readonly RiskItem[]
  readonly changes: readonly ChangeItem[]
  readonly actions: readonly RecommendedAction[]
  readonly hardGateDetails: readonly { label: string; pass: boolean; kpiId?: string }[]
}

export function renderCertificate(input: CertificateInput, repoRoot: string): string {
  const lines: string[] = []

  // ── Title ──
  lines.push('# Architecture Health Report')
  lines.push('')

  // ── 1. 総合判定 ──
  lines.push('## 総合判定')
  lines.push('')
  lines.push('| 項目 | 値 |')
  lines.push('|---|---|')
  lines.push(`| **総合評価** | **${VERDICT_ICON[input.assessment.verdict]}** |`)
  lines.push(`| 前回比 | ${TREND_ICON[input.assessment.trend]} |`)
  lines.push(`| リリース影響 | ${input.assessment.affectsRelease ? 'Yes' : 'No'} |`)
  lines.push(`| 最終更新 | ${input.assessment.timestamp} |`)
  lines.push('')

  // ── 2. Hard Gate ──
  lines.push('## Hard Gate')
  lines.push('')
  if (input.hardGateDetails.every((g) => g.pass)) {
    lines.push('**PASS** — 全ゲート通過')
  } else {
    lines.push('**FAIL**')
  }
  lines.push('')
  for (const gate of input.hardGateDetails) {
    const icon = gate.pass ? 'PASS' : 'FAIL'
    lines.push(`- ${icon}: ${gate.label}`)
    // AAG Response: FAIL 時に修正手順を案内
    if (!gate.pass) {
      const hint = AAG_FIX_HINTS[gate.kpiId ?? '']
      if (hint) {
        lines.push(`  - ⚡ 対応: ${hint.action}`)
      }
    }
  }
  lines.push('')

  // ── 3. 健康指標サマリ ──
  lines.push('## Health Metrics')
  lines.push('')
  lines.push('| 指標 | 状態 | 詳細 |')
  lines.push('|---|---|---|')

  for (const ind of input.indicators) {
    const badge = STATUS_BADGE[ind.worstStatus]
    const details = ind.items
      .map((item) => {
        const budgetStr = item.budget !== undefined ? `/${item.budget}` : ''
        const deltaStr = item.delta !== undefined && item.delta !== 0
          ? ` (${item.delta > 0 ? '+' : ''}${item.delta})`
          : ''
        return `${item.label}: ${item.value}${budgetStr}${deltaStr}`
      })
      .join(' / ')
    lines.push(`| **${ind.name}** | ${badge} | ${details} |`)
  }
  lines.push('')

  // ── 4. 危険箇所トップ3 ──
  if (input.risks.length > 0) {
    lines.push('## Top Risks')
    lines.push('')
    for (let i = 0; i < input.risks.length; i++) {
      const risk = input.risks[i]
      lines.push(`**${i + 1}. ${risk.label}**`)
      lines.push(`- 状態: ${risk.reason}`)
      lines.push(`- ファイル: \`${risk.file}\``)
      lines.push(`- 定義書: \`${risk.definition}\``)
      lines.push('')
    }
  }

  // ── 5. 直近の変化 ──
  if (input.changes.length > 0) {
    lines.push('## Recent Changes')
    lines.push('')
    lines.push('| 指標 | 前回 | 今回 | 変化 |')
    lines.push('|---|---|---|---|')
    for (const change of input.changes) {
      const sign = change.delta > 0 ? '+' : ''
      const dir = change.direction === 'worse' ? ' !' : change.direction === 'better' ? ' +' : ''
      lines.push(`| ${change.label} | ${change.previous} | ${change.current} | ${sign}${change.delta}${dir} |`)
    }
    lines.push('')
  }

  // ── 6. 推奨アクション ──
  if (input.actions.length > 0) {
    lines.push('## Recommended Actions')
    lines.push('')
    for (let i = 0; i < input.actions.length; i++) {
      lines.push(`${i + 1}. ${input.actions[i].action}`)
    }
    lines.push('')
  }

  // ── Footer ──
  lines.push('---')
  lines.push('')
  lines.push(`*正本: \`references/02-status/generated/architecture-health.json\` — ${input.report.summary.totalKpis} KPIs*`)
  lines.push(`*詳細: \`references/02-status/generated/architecture-health.md\`*`)
  lines.push('')

  const content = lines.join('\n')
  const outPath = resolve(
    repoRoot,
    'references/02-status/generated/architecture-health-certificate.md',
  )
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, content, 'utf-8')
  return outPath
}

/**
 * Generated section 用のコンパクト版（CLAUDE.md / roadmap 埋め込み用）
 */
export function renderCertificateInline(input: CertificateInput): string {
  const lines: string[] = []
  const a = input.assessment

  // 1行サマリ
  lines.push(`**${VERDICT_ICON[a.verdict]}** | 前回比: ${TREND_ICON[a.trend]} | Hard Gate: ${input.report.summary.hardGatePass ? 'PASS' : 'FAIL'}`)
  lines.push('')

  // 6本の指標
  lines.push('| 指標 | 状態 | 詳細 |')
  lines.push('|---|---|---|')
  for (const ind of input.indicators) {
    const badge = STATUS_BADGE[ind.worstStatus]
    const details = ind.items
      .map((item) => {
        const budgetStr = item.budget !== undefined ? `/${item.budget}` : ''
        const deltaStr = item.delta !== undefined && item.delta !== 0
          ? `(${item.delta > 0 ? '+' : ''}${item.delta})`
          : ''
        return `${item.value}${budgetStr}${deltaStr}`
      })
      .join(' / ')
    lines.push(`| ${ind.name} | ${badge} | ${details} |`)
  }
  lines.push('')

  // 推奨アクション（あれば）
  if (input.actions.length > 0) {
    lines.push('**Next:**')
    for (const action of input.actions) {
      lines.push(`- ${action.action}`)
    }
  }

  lines.push('')
  lines.push(`> 生成: ${a.timestamp} — 正本: \`references/02-status/generated/architecture-health.json\``)

  return lines.join('\n')
}
