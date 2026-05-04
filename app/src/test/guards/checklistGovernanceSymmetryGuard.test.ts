/**
 * Checklist Governance Symmetry Guard
 *
 * 規約（`references/05-aag-interface/operations/project-checklist-governance.md` §3）と実装
 * (`tools/architecture-health/src/collectors/project-checklist-collector.ts`)
 * の**対称性**を機械検証する。
 *
 * 背景: 2026-04 以前は collector 側に heading 抑制ロジックがあり、
 * 「やってはいけないこと」「常時チェック」「最重要項目」の見出し配下を
 * 集計から除外していた。一方で governance §3 は「これらの項目を checklist に
 * 書かない」と定めていた。つまり規約と実装が逆向きで、「format guard が
 * 通る範囲」と「collector が集計する範囲」が一致しない構造的非対称が存在した。
 *
 * 2026-04-13 (project: aag-collector-purification) で collector の heading 抑制
 * ロジックを削除し、checklistFormatGuard を strict 化した (F3/F4/F5 を全 project
 * に適用)。本 guard はその対称性を恒久的に保証する最終防波堤である。
 *
 * 検出する違反:
 * - **S1**: live project の checklist.md に「やってはいけないこと」見出しが存在する
 * - **S2**: live project の checklist.md に「常時チェック」見出しが存在する
 * - **S3**: live project の checklist.md に「最重要項目」見出しが存在する
 *
 * `projects/_template/` および `projects/completed/` 配下は対象外:
 * - `_template` は placeholder
 * - `completed` は archive 済み
 *
 * @see references/05-aag-interface/operations/project-checklist-governance.md §3 §8
 * @see tools/architecture-health/src/collectors/project-checklist-collector.ts
 * @see app/src/test/guards/checklistFormatGuard.test.ts (F3/F4/F5)
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

interface ProjectJson {
  readonly projectId: string
  readonly entrypoints: {
    readonly checklist: string
  }
}

interface ProjectInfo {
  readonly projectId: string
  readonly checklistPath: string
  readonly checklistAbsPath: string
}

function listLiveProjects(): ProjectInfo[] {
  const out: ProjectInfo[] = []
  if (!fs.existsSync(PROJECTS_DIR)) return out
  // R6b (DA-α-007b、2026-05-03): projects/active/<id>/ split に対応。
  const activeDir = path.join(PROJECTS_DIR, 'active')
  const scanDir = fs.existsSync(activeDir) ? activeDir : PROJECTS_DIR
  for (const entry of fs.readdirSync(scanDir)) {
    if (entry === 'completed' || entry === 'active' || entry.startsWith('_')) continue
    const entryPath = path.join(scanDir, entry)
    if (!fs.statSync(entryPath).isDirectory()) continue
    const configPath = path.join(entryPath, 'config/project.json')
    if (!fs.existsSync(configPath)) continue
    let project: ProjectJson
    try {
      project = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectJson
    } catch {
      continue
    }
    out.push({
      projectId: project.projectId,
      checklistPath: project.entrypoints.checklist,
      checklistAbsPath: path.join(PROJECT_ROOT, project.entrypoints.checklist),
    })
  }
  return out
}

interface SymmetryViolation {
  readonly projectId: string
  readonly file: string
  readonly line: number
  readonly code: 'S1' | 'S2' | 'S3'
  readonly heading: string
  readonly message: string
}

/** 禁止見出しと対応コードの一覧 (governance §3 由来) */
const FORBIDDEN_HEADINGS: ReadonlyArray<{
  readonly pattern: RegExp
  readonly code: 'S1' | 'S2' | 'S3'
  readonly label: string
  readonly moveTo: string
}> = [
  {
    pattern: /やってはいけないこと/,
    code: 'S1',
    label: 'やってはいけないこと',
    moveTo: 'projects/<id>/plan.md の「禁止事項テーブル」または「不可侵原則」',
  },
  {
    pattern: /常時チェック/,
    code: 'S2',
    label: '常時チェック',
    moveTo: 'CONTRIBUTING.md の「PR 作成前のローカル確認」',
  },
  {
    pattern: /最重要項目/,
    code: 'S3',
    label: '最重要項目',
    moveTo: 'projects/<id>/plan.md の完了後確認項目セクション',
  },
]

function checkChecklist(info: ProjectInfo): SymmetryViolation[] {
  const violations: SymmetryViolation[] = []
  if (!fs.existsSync(info.checklistAbsPath)) return violations

  const md = fs.readFileSync(info.checklistAbsPath, 'utf-8')
  const lines = md.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    // 見出し行 (`#` で始まる) のみを検査する
    if (!trimmed.startsWith('#')) continue
    for (const forbidden of FORBIDDEN_HEADINGS) {
      if (forbidden.pattern.test(trimmed)) {
        violations.push({
          projectId: info.projectId,
          file: info.checklistPath,
          line: i + 1,
          code: forbidden.code,
          heading: forbidden.label,
          message:
            `checklist.md に「${forbidden.label}」見出しが存在します。` +
            `completion 判定の入力に混ぜるとぶれるため、${forbidden.moveTo} に移動してください。` +
            ' 詳細: references/05-aag-interface/operations/project-checklist-governance.md §3。',
        })
      }
    }
  }
  return violations
}

function formatViolations(violations: readonly SymmetryViolation[]): string {
  if (violations.length === 0) return ''
  const lines: string[] = []
  lines.push(`対称性違反 (${violations.length} 件):`)
  for (const v of violations) {
    lines.push(`  [${v.code}] ${v.file}:${v.line}`)
    lines.push(`    project: ${v.projectId}`)
    lines.push(`    heading: ${v.heading}`)
    lines.push(`    ${v.message}`)
  }
  lines.push('')
  lines.push('修正手順:')
  lines.push('  1. 対象見出しとその配下 checkbox を plan.md / CONTRIBUTING.md 等へ移動する')
  lines.push('  2. checklist.md から見出しを削除する')
  lines.push('  3. `cd app && npm run docs:generate` で project-health を再生成する')
  lines.push(
    '  4. `cd app && npm run test:guards` で本 guard + checklistFormatGuard が PASS することを確認する',
  )
  lines.push('')
  lines.push('なぜ禁止: governance §3 は checklist を required checkbox のみに純化することで、')
  lines.push('「format guard が通る範囲 = collector が集計する範囲」の対称性を保つよう定めている。')
  lines.push(
    '本 guard は collector 側の heading 抑制ロジック削除 (aag-collector-purification project, 2026-04-13)',
  )
  lines.push('の再発防止として追加された。')
  return lines.join('\n')
}

describe('Checklist Governance Symmetry Guard', () => {
  const projects = listLiveProjects()

  it('全 live project に config/project.json がある', () => {
    expect(projects.length).toBeGreaterThan(0)
  })

  it('全 live project の checklist.md に governance §3 禁止見出しが存在しない', () => {
    const allViolations: SymmetryViolation[] = []
    for (const project of projects) {
      allViolations.push(...checkChecklist(project))
    }
    expect(allViolations, formatViolations(allViolations)).toEqual([])
  })
})
