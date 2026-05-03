/**
 * Project Completion Consistency Guard
 *
 * project の derivedStatus と物理配置・参照状態の整合を機械的に検証する。
 * 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §6 (lifecycle)。
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
 *   文書中で `projects/<id>/...` を参照しているが、その project ディレクトリが
 *   存在しない（typo / archive 漏れ検出）
 * - **L1: stale archived path** —
 *   `projects/<id>/...` を参照しているが `<id>` は archive 済みで、正しくは
 *   `projects/completed/<id>/...` を指すべき（archive 時のリンク追随漏れ検出）
 * - **L2: broken subpath** —
 *   `projects/<id>/<subpath>` の subpath 部分が実ファイル/ディレクトリに解決しない
 *   （リネーム後の古い参照 / typo 検出）
 * - **L3: wrong archive prefix** —
 *   `projects/completed/<id>/...` を参照しているが `<id>` は active project であり、
 *   prefix が誤り
 *
 * L1/L2/L3 は CLAUDE.md / references/ / projects/（active）をスキャンする。
 * CHANGELOG.md / references/04-tracking/generated/ / projects/completed/ /
 * projects/_template/ は除外対象（歴史的文書 or 自動生成）。
 * fenced code block（```/~~~）内は移行手順例として出現するためスキャン対象外。
 *
 * @see references/05-aag-interface/operations/project-checklist-governance.md §6 §10 §4
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
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

interface ProjectLinkMatch {
  readonly file: string // source file (PROJECT_ROOT からの相対パス)
  readonly line: number // 1-based
  readonly literal: string // 実際にマッチした全体（例: 'projects/completed/foo/bar.md'）
  readonly archivePrefix: boolean // true なら 'projects/completed/' で始まる
  readonly projectId: string
  readonly subPath: string // '/config/project.json' / '' / ...
}

const LINK_SKIP_FILES: ReadonlySet<string> = new Set([
  'CHANGELOG.md', // 歴史記録（意図的にその時点の path を保持する）
])

const LINK_SKIP_PATH_PREFIXES: readonly string[] = [
  'references/04-tracking/generated/', // 自動生成
  'projects/completed/', // archived — 内容は凍結
  'projects/_template/', // placeholder
]

function shouldSkipForLinkCheck(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/')
  if (LINK_SKIP_FILES.has(norm)) return true
  for (const prefix of LINK_SKIP_PATH_PREFIXES) {
    if (norm.startsWith(prefix)) return true
  }
  return false
}

/**
 * 同じ行に `projects/<id>` と `projects/completed/<id>` の両方が（同一 id で）
 * 現れる行は migration 命令（`mv projects/foo projects/completed/foo` 等）と
 * みなして link check の対象外にする。これをやらないと archive 命令を書いた
 * checklist 行が L3 偽陽性になる。
 */
function hasMigrationPair(line: string): boolean {
  const matches = Array.from(line.matchAll(/projects\/(completed\/)?([\w-]+)\b/g))
  if (matches.length < 2) return false
  const activeIds = new Set<string>()
  const archivedIds = new Set<string>()
  for (const m of matches) {
    const id = m[2]
    if (id === '_template' || id === 'completed') continue
    if (m[1]) archivedIds.add(id)
    else activeIds.add(id)
  }
  for (const id of activeIds) {
    if (archivedIds.has(id)) return true
  }
  return false
}

function collectAllProjectLinks(): ProjectLinkMatch[] {
  const out: ProjectLinkMatch[] = []
  // `projects/[completed/]<id>[/<subpath>]` を拾う
  const re = /projects\/(completed\/)?([\w-]+)(\/[\w./-]+)?/g

  const scanFile = (absFile: string): void => {
    const relPath = path.relative(PROJECT_ROOT, absFile)
    if (shouldSkipForLinkCheck(relPath)) return

    const content = fs.readFileSync(absFile, 'utf-8')
    const lines = content.split(/\r?\n/)
    // fenced code block（```foo / ~~~）を skip — 移行例に project path が出るため
    let fenceOpen: string | undefined
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]
      const fenceMatch = raw.match(/^\s*(`{3,}|~{3,})/)
      if (fenceMatch) {
        const marker = fenceMatch[1]
        if (fenceOpen === undefined) {
          fenceOpen = marker[0] // '`' or '~'
        } else if (marker[0] === fenceOpen) {
          fenceOpen = undefined
        }
        continue
      }
      if (fenceOpen !== undefined) continue

      // migration 命令行（同一行に active path と archive path が両方ある）は skip
      if (hasMigrationPair(raw)) continue

      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(raw)) !== null) {
        const archivePrefix = Boolean(m[1])
        const projectId = m[2]
        const subPath = m[3] ?? ''
        // 特殊 directory: _template / bare 'completed' / 汎用語
        if (projectId === '_template' || projectId === 'completed') continue
        out.push({
          file: relPath.replace(/\\/g, '/'),
          line: i + 1,
          literal: m[0],
          archivePrefix,
          projectId,
          subPath,
        })
      }
    }
  }

  // CLAUDE.md
  const claudeMd = path.join(PROJECT_ROOT, 'CLAUDE.md')
  if (fs.existsSync(claudeMd)) scanFile(claudeMd)

  // references/
  if (fs.existsSync(REFERENCES_DIR)) walkMd(REFERENCES_DIR, scanFile)

  // projects/（active のみ — projects/completed/ と _template/ は shouldSkip で除外）
  if (fs.existsSync(PROJECTS_DIR)) walkMd(PROJECTS_DIR, scanFile)

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
          '  4. references/04-tracking/open-issues.md の active 索引から外し、解決済みテーブルに追加する\n' +
          `  5. HANDOFF.md 末尾に \`Archived: ${new Date().toISOString().slice(0, 10)}\` を追加する\n` +
          '  6. 関連正本（references/03-implementation/* 等）の状態更新が必要なら同 commit で対応する\n' +
          '  7. cd app && npm run docs:generate で project-health に反映する\n' +
          '  詳細: references/05-aag-interface/operations/project-checklist-governance.md §6.2',
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
          ' 詳細: references/05-aag-interface/operations/project-checklist-governance.md §5。',
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

  // C4 / L1 / L2 / L3: cross-reference integrity
  // 既知の偽陽性パターンを除外
  const IGNORE_REFS = new Set<string>([
    '<id>', // governance ガイドのプレースホルダ
    '<新', // governance ガイドの bash example の中
    '<PROJECT-ID>', // テンプレート文書中の placeholder
  ])
  const projectsById = new Map(projects.map((p) => [p.projectId, p]))
  const seenViolationKeys = new Set<string>()
  for (const link of collectAllProjectLinks()) {
    if (IGNORE_REFS.has(link.projectId)) continue

    // 重複抑制キー — 同じ file 内の同じ literal は 1 回だけ報告
    const dedupeKey = `${link.file}::${link.literal}`
    if (seenViolationKeys.has(dedupeKey)) continue

    const project = projectsById.get(link.projectId)

    // C4: 未知の project id
    if (!project) {
      seenViolationKeys.add(dedupeKey)
      violations.push({
        code: 'C4',
        message: `'${link.file}:${link.line}' に '${link.literal}' があるが、その project は存在しない`,
        hint:
          '典型原因: typo / 未作成 / rename 漏れ。' +
          ' 正しい projectId に書き換えるか、project を新規作成してください。' +
          ' 詳細: references/05-aag-interface/operations/project-checklist-governance.md §10。',
      })
      continue
    }

    // L1: project は archived だが reference は active path
    if (project.isArchived && !link.archivePrefix) {
      seenViolationKeys.add(dedupeKey)
      const correctLiteral = `projects/completed/${link.projectId}${link.subPath}`
      violations.push({
        code: 'L1',
        message:
          `'${link.file}:${link.line}' に stale archived path があります:\n` +
          `       found: ${link.literal}\n` +
          `    expected: ${correctLiteral}`,
        hint:
          `'${link.literal}' → '${correctLiteral}' に置換してください。` +
          ` project '${link.projectId}' は archive 済みで projects/completed/ 配下にあります。` +
          ' 詳細: references/05-aag-interface/operations/project-checklist-governance.md §6.2。',
      })
      continue
    }

    // L3: project は active だが reference は projects/completed/ prefix
    if (!project.isArchived && link.archivePrefix) {
      seenViolationKeys.add(dedupeKey)
      const correctLiteral = `projects/${link.projectId}${link.subPath}`
      violations.push({
        code: 'L3',
        message:
          `'${link.file}:${link.line}' に wrong archive prefix があります:\n` +
          `       found: ${link.literal}\n` +
          `    expected: ${correctLiteral}`,
        hint:
          `'${link.literal}' → '${correctLiteral}' に置換してください。` +
          ` project '${link.projectId}' は active で projects/ 直下にあります。`,
      })
      continue
    }

    // L2: subPath が実ファイル/ディレクトリに解決しない
    // literal そのものを PROJECT_ROOT 起点で resolve する
    const absTarget = path.join(PROJECT_ROOT, link.literal)
    if (!fs.existsSync(absTarget)) {
      seenViolationKeys.add(dedupeKey)
      violations.push({
        code: 'L2',
        message: `'${link.file}:${link.line}' の '${link.literal}' が実ファイル/ディレクトリに解決しません`,
        hint:
          '典型原因: リネーム / 削除後の古い参照 / typo。' +
          ' 正しいパスに修正するか、参照を削除してください。',
      })
      continue
    }
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

  // ── 検出ロジック自体のユニットテスト（回帰防止） ──
  describe('detection primitives', () => {
    it('hasMigrationPair は `projects/X` と `projects/completed/X` が同じ id で並ぶ行を検出する', () => {
      // mv 命令
      expect(hasMigrationPair('mv projects/foo projects/completed/foo')).toBe(true)
      // 逆方向
      expect(hasMigrationPair('mv projects/completed/foo projects/foo')).toBe(true)
      // 自然文
      expect(hasMigrationPair('See projects/foo which will become projects/completed/foo')).toBe(
        true,
      )
      // 違う id は pair ではない
      expect(hasMigrationPair('mv projects/foo projects/completed/bar')).toBe(false)
      // 片方だけ
      expect(hasMigrationPair('projects/foo only')).toBe(false)
      expect(hasMigrationPair('projects/completed/foo only')).toBe(false)
    })

    it('shouldSkipForLinkCheck は CHANGELOG / generated / projects/completed / _template を除外する', () => {
      expect(shouldSkipForLinkCheck('CHANGELOG.md')).toBe(true)
      expect(
        shouldSkipForLinkCheck('references/04-tracking/generated/project-health.generated.md'),
      ).toBe(true)
      expect(
        shouldSkipForLinkCheck('projects/completed/docs-and-governance-cohesion/plan.md'),
      ).toBe(true)
      expect(shouldSkipForLinkCheck('projects/_template/AI_CONTEXT.md')).toBe(true)
      // 除外しないケース
      expect(shouldSkipForLinkCheck('CLAUDE.md')).toBe(false)
      expect(
        shouldSkipForLinkCheck(
          'references/05-aag-interface/operations/project-checklist-governance.md',
        ),
      ).toBe(false)
      expect(shouldSkipForLinkCheck('projects/pure-calculation-reorg/AI_CONTEXT.md')).toBe(false)
    })
  })
})
