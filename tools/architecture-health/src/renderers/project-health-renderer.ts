/**
 * Project Health Renderer
 *
 * `collectProjectChecklists` の出力を JSON / Markdown 2 形態に展開する。
 * 出力先:
 *   - `references/02-status/generated/project-health.json`
 *   - `references/02-status/generated/project-health.md`
 *
 * 詳細仕様: `references/03-guides/project-checklist-governance.md`
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type {
  ProjectChecklistResult,
  DerivedStatus,
} from '../collectors/project-checklist-collector.js'

export interface ProjectHealthSnapshot {
  readonly schemaVersion: '1.0.0'
  readonly timestamp: string
  readonly summary: {
    readonly active: number
    readonly archived: number
    readonly inProgress: number
    readonly completedNotArchived: number
    readonly empty: number
    readonly collection: number
    readonly totalCheckboxes: number
    readonly checkedCheckboxes: number
  }
  readonly projects: readonly {
    readonly projectId: string
    readonly title: string
    readonly kind: string
    readonly declaredStatus: string
    readonly derivedStatus: DerivedStatus
    readonly checked: number
    readonly total: number
    readonly progress: number // 0-1
    readonly entrypoint: string
    readonly checklistPath: string
  }[]
}

/**
 * project-health.json を生成して返す。
 */
export function buildProjectHealthSnapshot(
  results: readonly ProjectChecklistResult[],
): ProjectHealthSnapshot {
  const summary = {
    active: results.filter((r) => r.derivedStatus !== 'archived').length,
    archived: results.filter((r) => r.derivedStatus === 'archived').length,
    inProgress: results.filter((r) => r.derivedStatus === 'in_progress').length,
    completedNotArchived: results.filter((r) => r.derivedStatus === 'completed').length,
    empty: results.filter((r) => r.derivedStatus === 'empty').length,
    collection: results.filter((r) => r.derivedStatus === 'collection').length,
    totalCheckboxes: results.reduce((sum, r) => sum + r.total, 0),
    checkedCheckboxes: results.reduce((sum, r) => sum + r.checked, 0),
  }

  const projects = results.map((r) => ({
    projectId: r.meta.projectId,
    title: r.meta.title,
    kind: r.meta.kind,
    declaredStatus: r.meta.status,
    derivedStatus: r.derivedStatus,
    checked: r.checked,
    total: r.total,
    progress: r.total === 0 ? 0 : Math.round((r.checked / r.total) * 1000) / 1000,
    entrypoint: r.meta.aiContextPath,
    checklistPath: r.meta.checklistPath,
  }))

  return {
    schemaVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    summary,
    projects,
  }
}

/**
 * project-health.json を書き出す。
 */
export function renderProjectHealthJson(
  snapshot: ProjectHealthSnapshot,
  repoRoot: string,
): string {
  const outPath = resolve(repoRoot, 'references/02-status/generated/project-health.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8')
  return outPath
}

/**
 * project-health.md を書き出す（人間可読 view）。
 */
export function renderProjectHealthMd(
  snapshot: ProjectHealthSnapshot,
  repoRoot: string,
): string {
  const outPath = resolve(repoRoot, 'references/02-status/generated/project-health.md')
  mkdirSync(dirname(outPath), { recursive: true })

  const md = renderProjectHealthMdContent(snapshot)
  writeFileSync(outPath, md, 'utf-8')
  return outPath
}

/**
 * Markdown 本体（generated section の埋め込みにも使用）。
 */
export function renderProjectHealthMdContent(snapshot: ProjectHealthSnapshot): string {
  const lines: string[] = []
  lines.push('# Project Health — generated artifact')
  lines.push('')
  lines.push(
    '> **役割: 生成された project KPI 正本（生成後手編集禁止）。**',
  )
  lines.push(
    '> 規約: [`references/03-guides/project-checklist-governance.md`](../../03-guides/project-checklist-governance.md)',
  )
  lines.push('')
  lines.push(`> 生成: ${snapshot.timestamp}`)
  lines.push('')

  lines.push('## サマリー')
  lines.push('')
  lines.push('| 指標 | 値 |')
  lines.push('|---|---|')
  lines.push(`| active project 数（archive 未実施を含む） | ${snapshot.summary.active} |`)
  lines.push(`| archived project 数 | ${snapshot.summary.archived} |`)
  lines.push(`| in_progress project 数 | ${snapshot.summary.inProgress} |`)
  lines.push(
    `| checklist 完了済みだが archive 未実施 | ${snapshot.summary.completedNotArchived} |`,
  )
  lines.push(`| checkbox 空 (placeholder / 立ち上げ直後) | ${snapshot.summary.empty} |`)
  lines.push(`| collection (continuous, 終わらない) | ${snapshot.summary.collection} |`)
  lines.push(
    `| 全 project の required checkbox 総数 | ${snapshot.summary.totalCheckboxes} |`,
  )
  lines.push(
    `| 全 project の checked checkbox 総数 | ${snapshot.summary.checkedCheckboxes} |`,
  )
  lines.push('')

  lines.push('## projects')
  lines.push('')
  lines.push('| projectId | title | derivedStatus | progress | entrypoint |')
  lines.push('|---|---|---|---|---|')
  for (const p of snapshot.projects) {
    const progressLabel =
      p.total === 0
        ? '—'
        : `${p.checked}/${p.total} (${Math.round(p.progress * 100)}%)`
    lines.push(
      `| \`${p.projectId}\` | ${p.title} | **${p.derivedStatus}** | ${progressLabel} | [\`${p.entrypoint}\`](../../../${p.entrypoint}) |`,
    )
  }
  lines.push('')

  return lines.join('\n')
}
