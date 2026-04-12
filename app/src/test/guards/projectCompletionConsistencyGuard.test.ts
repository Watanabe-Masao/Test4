/**
 * Project Completion Consistency Guard
 *
 * project の derivedStatus と物理配置・参照状態の整合を機械的に検証する。
 * 規約: `references/03-guides/project-checklist-governance.md` §6 (lifecycle)。
 *
 * 検出する違反:
 *
 * - **C1: completed 状態だが archive 未実施** —
 *   `projects/<id>/checklist.md` が 100% 完了しているのに `projects/<id>/`
 *   が active 配置のまま。§6.2 archive プロセスを実行せよ
 * - **C2: CURRENT_PROJECT.md の active が実在しない** —
 *   指された project ディレクトリが存在しない、または config が読めない
 * - **C3: CURRENT_PROJECT.md の active が archive 済みを指している** —
 *   archived project を current にしてはならない
 * - **C4: dead-link to projects/** —
 *   references/ 文書中で `projects/<id>/...` を参照しているが、
 *   その project ディレクトリが存在しない（typo / archive 漏れ検出）
 *
 * @see references/03-guides/project-checklist-governance.md §6 §10
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const PROJECTS_DIR = path.join(PROJECT_ROOT, 'projects')
const REFERENCES_DIR = path.join(PROJECT_ROOT, 'references')
const CURRENT_PROJECT_MD = path.join(PROJECT_ROOT, 'CURRENT_PROJECT.md')

type ProjectKind = 'project' | 'collection'

interface ProjectJson {
  readonly projectId: string
  readonly kind?: ProjectKind
  readonly entrypoints: {
    readonly checklist: string
  }
}

interface ProjectInfo {
  readonly projectId: string
  readonly isArchived: boolean
  readonly kind: ProjectKind
  readonly entryDir: string // 物理位置
  readonly checklistAbsPath: string
}

function listAllProjects(): ProjectInfo[] {
  const out: ProjectInfo[] = []
  if (!fs.existsSync(PROJECTS_DIR)) return out

  for (const entry of fs.readdirSync(PROJECTS_DIR)) {
    if (entry.startsWith('_')) continue
    const entryPath = path.join(PROJECTS_DIR, entry)
    if (!fs.statSync(entryPath).isDirectory()) continue

    if (entry === 'completed') {
      if (!fs.existsSync(entryPath)) continue
      for (const sub of fs.readdirSync(entryPath)) {
        const subPath = path.join(entryPath, sub)
        if (!fs.statSync(subPath).isDirectory()) continue
        const meta = readProjectInfo(subPath, true)
        if (meta) out.push(meta)
      }
      continue
    }

    const meta = readProjectInfo(entryPath, false)
    if (meta) out.push(meta)
  }

  return out
}

function readProjectInfo(entryDir: string, isArchived: boolean): ProjectInfo | undefined {
  const configPath = path.join(entryDir, 'config/project.json')
  if (!fs.existsSync(configPath)) return undefined
  let project: ProjectJson
  try {
    project = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectJson
  } catch {
    return undefined
  }
  return {
    projectId: project.projectId,
    isArchived,
    kind: project.kind ?? 'project',
    entryDir,
    checklistAbsPath: path.join(PROJECT_ROOT, project.entrypoints.checklist),
  }
}

interface CheckboxCounts {
  readonly total: number
  readonly checked: number
}

function countChecklistCheckboxes(checklistPath: string): CheckboxCounts {
  if (!fs.existsSync(checklistPath)) return { total: 0, checked: 0 }
  const md = fs.readFileSync(checklistPath, 'utf-8')
  const lines = md.split(/\r?\n/)
  let total = 0
  let checked = 0
  let suppress = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('#')) {
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
    const m = line.match(/^[*-]\s+\[([ xX])\]\s/)
    if (!m) continue
    total += 1
    if (m[1].toLowerCase() === 'x') checked += 1
  }
  return { total, checked }
}

function readCurrentProjectActive(): string | undefined {
  if (!fs.existsSync(CURRENT_PROJECT_MD)) return undefined
  const content = fs.readFileSync(CURRENT_PROJECT_MD, 'utf-8')
  const match = content.match(/^active:\s*([\w-]+)/m)
  return match?.[1]
}

function collectReferencesProjectLinks(): { file: string; ref: string }[] {
  if (!fs.existsSync(REFERENCES_DIR)) return []
  const out: { file: string; ref: string }[] = []
  walkMd(REFERENCES_DIR, (file) => {
    const content = fs.readFileSync(file, 'utf-8')
    // Markdown link / inline code 中の `projects/<id>/...` を拾う
    // 行頭が ../ 付きでも相対でも対応するため `projects/` を直接探す
    const re = /projects\/([\w-]+)(?:\/[\w./-]*)?/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const projectId = m[1]
      // テンプレート / completed / 特殊 directory はスキップ
      if (projectId === '_template' || projectId === 'completed') continue
      out.push({ file: path.relative(PROJECT_ROOT, file), ref: projectId })
    }
  })
  return out
}

function walkMd(dir: string, visitor: (filePath: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'generated' || entry.name === '99-archive') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkMd(fullPath, visitor)
    } else if (entry.name.endsWith('.md')) {
      visitor(fullPath)
    }
  }
}

interface ConsistencyViolation {
  readonly code: string
  readonly message: string
  readonly hint: string
}

function checkConsistency(): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = []
  const projects = listAllProjects()
  const projectIds = new Set(projects.map((p) => p.projectId))
  const archivedIds = new Set(projects.filter((p) => p.isArchived).map((p) => p.projectId))

  // C1: completed 状態だが archive 未実施
  for (const p of projects) {
    if (p.isArchived) continue
    // collection は完了概念を持たないので skip
    if (p.kind === 'collection') continue
    const counts = countChecklistCheckboxes(p.checklistAbsPath)
    if (counts.total > 0 && counts.checked === counts.total) {
      violations.push({
        code: 'C1',
        message: `project '${p.projectId}' は checklist 100% 完了 (${counts.checked}/${counts.total}) ですが projects/completed/ に移されていません`,
        hint:
          '次のステップで archive してください:\n' +
          `  1. mv ${path.relative(PROJECT_ROOT, p.entryDir)} projects/completed/${p.projectId}\n` +
          `  2. projects/completed/${p.projectId}/config/project.json の status を "archived" に書き換える\n` +
          '  3. CURRENT_PROJECT.md が当 project を指していないことを確認する\n' +
          '  4. references/02-status/open-issues.md の active 索引から外し、解決済みテーブルに追加する\n' +
          `  5. HANDOFF.md 末尾に \`Archived: ${new Date().toISOString().slice(0, 10)}\` を追加する\n` +
          '  6. 関連正本（references/03-guides/* 等）の状態更新が必要なら同 commit で対応する\n' +
          '  7. cd app && npm run docs:generate で project-health に反映する\n' +
          '  詳細: references/03-guides/project-checklist-governance.md §6.2',
      })
    }
  }

  // C2 / C3: CURRENT_PROJECT.md の active 妥当性
  const active = readCurrentProjectActive()
  if (active) {
    if (!projectIds.has(active)) {
      violations.push({
        code: 'C2',
        message: `CURRENT_PROJECT.md の active='${active}' は実在 project を指していない`,
        hint:
          'CURRENT_PROJECT.md を編集して実在する projectId を指すか、project を新規作成してください。' +
          ' 詳細: references/03-guides/project-checklist-governance.md §5。',
      })
    } else if (archivedIds.has(active)) {
      violations.push({
        code: 'C3',
        message: `CURRENT_PROJECT.md の active='${active}' は archive 済みの project を指している`,
        hint:
          'CURRENT_PROJECT.md を編集して active な project に切り替えてください。' +
          ' archive 済み project は projects/completed/ 配下にあり、live 作業対象ではありません。',
      })
    }
  }

  // C4: dead-link to projects/
  // 既知の偽陽性パターンを除外
  const IGNORE_REFS = new Set<string>([
    '<id>', // governance ガイドのプレースホルダ
    '<新', // governance ガイドの bash example の中
    '<PROJECT-ID>', // テンプレート文書中の placeholder
  ])
  const seenDeadLinks = new Set<string>()
  for (const link of collectReferencesProjectLinks()) {
    if (IGNORE_REFS.has(link.ref)) continue
    if (projectIds.has(link.ref)) continue
    const key = `${link.file}::${link.ref}`
    if (seenDeadLinks.has(key)) continue
    seenDeadLinks.add(key)
    violations.push({
      code: 'C4',
      message: `references/ 文書 '${link.file}' に projects/${link.ref}/ への参照があるが、その project ディレクトリが存在しない`,
      hint:
        '「未完了の課題はこちらへ」の導線が dead-link になっている可能性があります。' +
        ' typo を修正するか、archive 済みなら projects/completed/<id>/ への参照に書き換えるか、' +
        ' project を新規作成してください。',
    })
  }

  return violations
}

function formatViolations(violations: readonly ConsistencyViolation[]): string {
  if (violations.length === 0) return ''
  const lines: string[] = []
  lines.push(`違反 (${violations.length} 件):`)
  for (const v of violations) {
    lines.push('')
    lines.push(`  [${v.code}] ${v.message}`)
    lines.push(`    ${v.hint}`)
  }
  return lines.join('\n')
}

describe('Project Completion Consistency Guard', () => {
  it('全 active project の derivedStatus と物理配置・参照状態が整合している', () => {
    const violations = checkConsistency()
    expect(violations, formatViolations(violations)).toEqual([])
  })
})
