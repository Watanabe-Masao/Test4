/**
 * Project Checklist Collector
 *
 * `projects/<id>/config/project.json` を列挙し、`entrypoints.checklist` で
 * 指定された checklist.md から required checkbox を機械的に数える。
 *
 * `derivedStatus` を「open required checkbox の有無」だけから導出する。
 * project.json の `status` フィールド（人間が宣言した値）には依存しない。
 *
 * 詳細仕様: `references/03-guides/project-checklist-governance.md`
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import type { HealthKpi } from '../types.js'

// ── 型定義 ───────────────────────────────────────────────────────────

export interface ProjectMeta {
  readonly projectId: string
  readonly title: string
  readonly status: string // 人間宣言値（active / paused / archived）
  readonly projectRoot: string // repo 相対
  readonly checklistPath: string // repo 相対
  readonly aiContextPath: string
  readonly handoffPath: string
  readonly planPath: string
}

export type DerivedStatus =
  | 'completed' // 全 required checkbox が [x]
  | 'in_progress' // open checkbox が 1 つ以上ある
  | 'empty' // checkbox が 1 つもない（新規 / placeholder）
  | 'archived' // projects/completed/ 配下に物理配置されている

export interface ProjectChecklistResult {
  readonly meta: ProjectMeta
  readonly checked: number
  readonly total: number
  readonly derivedStatus: DerivedStatus
}

interface ProjectJson {
  readonly projectId: string
  readonly title: string
  readonly status?: string
  readonly projectRoot: string
  readonly entrypoints: {
    readonly aiContext: string
    readonly handoff: string
    readonly plan: string
    readonly checklist: string
  }
}

// ── 公開 API ─────────────────────────────────────────────────────────

/**
 * 全 project（active + completed）を列挙し、それぞれの checklist 状態を返す。
 */
export function collectProjectChecklists(repoRoot: string): ProjectChecklistResult[] {
  const projectsDir = resolve(repoRoot, 'projects')
  if (!existsSync(projectsDir)) {
    return []
  }
  const results: ProjectChecklistResult[] = []
  for (const project of listProjectDirectories(projectsDir, repoRoot)) {
    const result = readProjectChecklist(project, repoRoot)
    if (result) {
      results.push(result)
    }
  }
  return results.sort((a, b) => a.meta.projectId.localeCompare(b.meta.projectId))
}

/**
 * checkbox 状態と project 配置状態を統合した KPI を返す。
 */
export function collectFromProjectChecklists(repoRoot: string): HealthKpi[] {
  const results = collectProjectChecklists(repoRoot)

  const active = results.filter((r) => r.derivedStatus !== 'archived').length
  const archived = results.filter((r) => r.derivedStatus === 'archived').length
  const completedNotArchived = results.filter(
    (r) => r.derivedStatus === 'completed',
  ).length
  const inProgress = results.filter((r) => r.derivedStatus === 'in_progress').length
  const empty = results.filter((r) => r.derivedStatus === 'empty').length

  const allChecked = results.reduce((sum, r) => sum + r.checked, 0)
  const allTotal = results.reduce((sum, r) => sum + r.total, 0)

  const projectImplRefs = results.map((r) => r.meta.checklistPath)

  const docRefs = [
    {
      kind: 'definition' as const,
      path: 'references/03-guides/project-checklist-governance.md',
    },
  ]

  return [
    {
      id: 'project.checklist.activeCount',
      label: 'active project 数（archive 未実施を含む）',
      category: 'docs',
      value: active,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: projectImplRefs,
    },
    {
      id: 'project.checklist.archivedCount',
      label: 'archived project 数（projects/completed/ 配下）',
      category: 'docs',
      value: archived,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: [],
    },
    {
      id: 'project.checklist.completedNotArchivedCount',
      label: 'checklist 完了済みだが archive 未実施の project 数',
      category: 'docs',
      value: completedNotArchived,
      unit: 'count',
      // hard gate 対象（後で health-rules に追加）。0 が望ましい
      status: completedNotArchived > 0 ? 'warn' : 'ok',
      budget: 0,
      owner: 'documentation-steward',
      docRefs,
      implRefs: projectImplRefs,
    },
    {
      id: 'project.checklist.inProgressCount',
      label: 'in_progress な project 数（open required checkbox あり）',
      category: 'docs',
      value: inProgress,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: projectImplRefs,
    },
    {
      id: 'project.checklist.emptyCount',
      label: 'checkbox 空の project 数（placeholder / 立ち上げ直後）',
      category: 'docs',
      value: empty,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: projectImplRefs,
    },
    {
      id: 'project.checklist.totalCheckboxes',
      label: '全 project の required checkbox 総数',
      category: 'docs',
      value: allTotal,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: projectImplRefs,
    },
    {
      id: 'project.checklist.checkedCheckboxes',
      label: '全 project の checked checkbox 総数',
      category: 'docs',
      value: allChecked,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: projectImplRefs,
    },
  ]
}

// ── 内部実装 ─────────────────────────────────────────────────────────

interface ProjectLocation {
  readonly configPath: string
  readonly isArchived: boolean
}

function listProjectDirectories(
  projectsDir: string,
  repoRoot: string,
): ProjectLocation[] {
  const out: ProjectLocation[] = []

  for (const entry of readdirSync(projectsDir)) {
    const entryPath = resolve(projectsDir, entry)
    if (!statSync(entryPath).isDirectory()) continue

    // テンプレート directory は project ではないのでスキップ
    if (entry === '_template' || entry.startsWith('_')) continue

    if (entry === 'completed') {
      // 再帰的に completed/ 配下の project を列挙
      for (const sub of readdirSync(entryPath)) {
        const subPath = resolve(entryPath, sub)
        if (!statSync(subPath).isDirectory()) continue
        const config = resolve(subPath, 'config/project.json')
        if (existsSync(config)) {
          out.push({ configPath: config, isArchived: true })
        }
      }
      continue
    }

    const config = resolve(entryPath, 'config/project.json')
    if (existsSync(config)) {
      out.push({ configPath: config, isArchived: false })
    }
  }

  return out
}

function readProjectChecklist(
  location: ProjectLocation,
  repoRoot: string,
): ProjectChecklistResult | undefined {
  let project: ProjectJson
  try {
    project = JSON.parse(readFileSync(location.configPath, 'utf-8')) as ProjectJson
  } catch {
    return undefined
  }

  const checklistPath = resolve(repoRoot, project.entrypoints.checklist)
  let total = 0
  let checked = 0
  if (existsSync(checklistPath)) {
    const md = readFileSync(checklistPath, 'utf-8')
    const counts = countCheckboxes(md)
    total = counts.total
    checked = counts.checked
  }

  let derivedStatus: DerivedStatus
  if (location.isArchived) {
    derivedStatus = 'archived'
  } else if (total === 0) {
    derivedStatus = 'empty'
  } else if (checked === total) {
    derivedStatus = 'completed'
  } else {
    derivedStatus = 'in_progress'
  }

  const meta: ProjectMeta = {
    projectId: project.projectId,
    title: project.title,
    status: project.status ?? 'unknown',
    projectRoot: project.projectRoot,
    checklistPath: project.entrypoints.checklist,
    aiContextPath: project.entrypoints.aiContext,
    handoffPath: project.entrypoints.handoff,
    planPath: project.entrypoints.plan,
  }

  return { meta, checked, total, derivedStatus }
}

/**
 * Markdown から `* [x]` / `* [ ]` 形式の checkbox を数える。
 *
 * **意図的に「やってはいけないこと」「常時チェック」セクション内の
 * checkbox は除外する**（completion 判定の入力として混ぜるとぶれるため）。
 * セクション除外の規格化は checklistFormatGuard 側で強制する。
 */
export function countCheckboxes(markdown: string): { total: number; checked: number } {
  const lines = markdown.split(/\r?\n/)
  let total = 0
  let checked = 0
  let suppress = false

  for (const raw of lines) {
    const line = raw.trim()

    // セクション境界
    if (line.startsWith('#')) {
      // 「やってはいけないこと」「常時チェック」「最重要項目」セクションは
      // completion の入力に含めない
      if (
        /やってはいけないこと/.test(line) ||
        /常時チェック/.test(line) ||
        /最重要項目/.test(line)
      ) {
        suppress = true
      } else {
        suppress = false
      }
      continue
    }

    if (suppress) continue

    // `* [x]` / `* [ ]` / `- [x]` / `- [ ]` を許容
    const m = line.match(/^[*-]\s+\[([ xX])\]\s/)
    if (!m) continue

    total += 1
    if (m[1].toLowerCase() === 'x') {
      checked += 1
    }
  }

  return { total, checked }
}
