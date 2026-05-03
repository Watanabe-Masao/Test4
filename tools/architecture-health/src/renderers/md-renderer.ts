/**
 * MD Renderer — HealthReport を人間可読な Markdown レポートに変換
 *
 * 正本は JSON。これはビュー。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { HealthReport, HealthKpi, KpiCategory } from '../types.js'

const STATUS_ICON: Record<string, string> = {
  ok: 'OK',
  warn: 'WARN',
  fail: 'FAIL',
}

const CATEGORY_LABEL: Record<KpiCategory, string> = {
  allowlist: '許可リスト',
  compatibility_debt: '後方互換負債',
  complexity: '複雑性',
  boundary: '層境界',
  guard: 'ガードテスト',
  docs: 'ドキュメント整合',
  build_perf: 'ビルド性能',
  bundle_perf: 'バンドル性能',
  query_perf: 'クエリ性能',
  e2e_perf: 'E2E 性能',
}

function formatValue(kpi: HealthKpi): string {
  const v = `${kpi.value}`
  if (kpi.budget !== undefined) {
    return `${v} / ${kpi.budget}`
  }
  return v
}

function groupByCategory(kpis: readonly HealthKpi[]): Map<KpiCategory, HealthKpi[]> {
  const map = new Map<KpiCategory, HealthKpi[]>()
  for (const kpi of kpis) {
    const list = map.get(kpi.category) ?? []
    list.push(kpi)
    map.set(kpi.category, list)
  }
  return map
}

export function renderMd(report: HealthReport, repoRoot: string): string {
  const lines: string[] = []

  lines.push('# Architecture Health Report')
  lines.push('')
  lines.push(`> Generated: ${report.timestamp}`)
  lines.push(`> Schema: v${report.schemaVersion}`)
  lines.push(`> 正本: \`references/04-tracking/generated/architecture-health.json\``)
  lines.push('')

  // Summary
  lines.push('## Summary')
  lines.push('')
  lines.push(`| 指標 | 値 |`)
  lines.push(`|---|---|`)
  lines.push(`| Total KPIs | ${report.summary.totalKpis} |`)
  lines.push(`| OK | ${report.summary.ok} |`)
  lines.push(`| WARN | ${report.summary.warn} |`)
  lines.push(`| FAIL | ${report.summary.fail} |`)
  lines.push(`| Hard Gate | ${report.summary.hardGatePass ? 'PASS' : 'FAIL'} |`)
  lines.push('')

  // By category
  const grouped = groupByCategory(report.kpis)

  for (const [category, kpis] of grouped) {
    const label = CATEGORY_LABEL[category] ?? category
    lines.push(`## ${label}`)
    lines.push('')
    lines.push('| ID | 指標 | 値 | 状態 |')
    lines.push('|---|---|---|---|')
    for (const kpi of kpis) {
      lines.push(
        `| ${kpi.id} | ${kpi.label} | ${formatValue(kpi)} | ${STATUS_ICON[kpi.status]} |`,
      )
    }
    lines.push('')
  }

  // Doc links (collapsed)
  lines.push('## Doc Links')
  lines.push('')
  lines.push('<details>')
  lines.push('<summary>KPI → ドキュメント対応表</summary>')
  lines.push('')
  lines.push('| KPI | Kind | Path |')
  lines.push('|---|---|---|')
  for (const kpi of report.kpis) {
    for (const ref of kpi.docRefs) {
      const sec = ref.section ? ` #${ref.section}` : ''
      lines.push(`| ${kpi.id} | ${ref.kind} | ${ref.path}${sec} |`)
    }
  }
  lines.push('')
  lines.push('</details>')
  lines.push('')

  const content = lines.join('\n')
  const outPath = resolve(
    repoRoot,
    'references/04-tracking/generated/architecture-health.generated.md',
  )
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, content, 'utf-8')
  return outPath
}

/**
 * CLAUDE.md / technical-debt-roadmap.md 内の generated section 用の
 * コンパクトなサマリーを生成する
 */
export function renderInlineSection(report: HealthReport): string {
  const lines: string[] = []
  const s = report.summary

  lines.push(`| 区分 | OK | WARN | FAIL |`)
  lines.push(`|---|---|---|---|`)

  const grouped = groupByCategory(report.kpis)
  for (const [category, kpis] of grouped) {
    const label = CATEGORY_LABEL[category] ?? category
    const ok = kpis.filter((k) => k.status === 'ok').length
    const warn = kpis.filter((k) => k.status === 'warn').length
    const fail = kpis.filter((k) => k.status === 'fail').length
    lines.push(`| ${label} | ${ok} | ${warn} | ${fail} |`)
  }

  lines.push('')
  lines.push(`**Hard Gate: ${s.hardGatePass ? 'PASS' : 'FAIL'}** — 合計 ${s.totalKpis} KPI (OK ${s.ok} / WARN ${s.warn} / FAIL ${s.fail})`)
  lines.push('')
  lines.push(`> 生成日時: ${report.timestamp} — 正本: \`references/04-tracking/generated/architecture-health.json\``)

  return lines.join('\n')
}
