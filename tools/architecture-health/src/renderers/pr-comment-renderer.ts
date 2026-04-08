/**
 * PR Comment Renderer — health report を PR コメント用 Markdown に変換
 */
import type { HealthReport, HealthKpi } from '../types.js'
import type { ObligationRule } from '../collectors/obligation-collector.js'

import { AAG_FIX_HINTS } from '../config/aag-fix-hints.js'

const STATUS_EMOJI: Record<string, string> = {
  ok: '✅',
  warn: '⚠️',
  fail: '❌',
}

function formatDelta(kpi: HealthKpi, previous?: HealthKpi): string {
  if (!previous) return ''
  const delta = kpi.value - previous.value
  if (delta === 0) return ' (±0)'
  const sign = delta > 0 ? '+' : ''
  return ` (${sign}${delta})`
}

export function renderPrComment(
  report: HealthReport,
  obligations: { rule: ObligationRule; satisfied: boolean }[],
  previous?: HealthReport,
): string {
  const lines: string[] = []

  lines.push('## Architecture Health')
  lines.push('')

  // --- Hard Gate ---
  const hardFails = report.kpis.filter((k) => k.status === 'fail')
  if (hardFails.length > 0) {
    lines.push('### ❌ Hard Gate FAIL')
    lines.push('')
    for (const kpi of hardFails) {
      lines.push(`- **${kpi.label}**: ${kpi.value} (budget: ${kpi.budget})`)
      // AAG Response: KPI に対応する修正手順を表示
      const fixHint = AAG_FIX_HINTS[kpi.id]
      if (fixHint) {
        lines.push(`  - ⚡ **対応**: ${fixHint.action}`)
        if (fixHint.doc) lines.push(`  - 📄 ${fixHint.doc}`)
      }
    }
    lines.push('')
  } else {
    lines.push('### ✅ Hard Gate PASS')
    lines.push('')
  }

  // --- Soft Gate ---
  const warns = report.kpis.filter((k) => k.status === 'warn')
  if (warns.length > 0) {
    lines.push('### ⚠️ Soft Gate')
    lines.push('')
    const prevMap = new Map(previous?.kpis.map((k) => [k.id, k]))
    for (const kpi of warns) {
      const prev = prevMap.get(kpi.id)
      lines.push(`- **${kpi.label}**: ${kpi.value}/${kpi.budget}${formatDelta(kpi, prev)}`)
    }
    lines.push('')
  }

  // --- Key Metrics ---
  lines.push('### Key Metrics')
  lines.push('')
  lines.push('| 指標 | 値 | 状態 |')
  lines.push('|---|---|---|')

  const keyIds = [
    'allowlist.total',
    'compat.bridge.count',
    'complexity.nearLimit.count',
    'guard.files.count',
    'perf.bundle.totalJsKb',
    'perf.bundle.mainJsKb',
  ]

  const prevMap = new Map(previous?.kpis.map((k) => [k.id, k]))
  for (const id of keyIds) {
    const kpi = report.kpis.find((k) => k.id === id)
    if (!kpi) continue
    const prev = prevMap.get(id)
    const budgetStr = kpi.budget !== undefined ? `/${kpi.budget}` : ''
    lines.push(
      `| ${kpi.label} | ${kpi.value}${budgetStr}${formatDelta(kpi, prev)} | ${STATUS_EMOJI[kpi.status]} |`,
    )
  }
  lines.push('')

  // --- Obligations ---
  if (obligations.length > 0) {
    lines.push('### Doc Obligations')
    lines.push('')
    for (const { rule, satisfied } of obligations) {
      const icon = satisfied ? '✅' : '❌'
      lines.push(`- ${icon} ${rule.label}`)
    }
    lines.push('')
  }

  // --- Summary ---
  const s = report.summary
  lines.push(`---`)
  lines.push(`*${s.totalKpis} KPIs: ${s.ok} OK / ${s.warn} WARN / ${s.fail} FAIL*`)

  return lines.join('\n')
}
