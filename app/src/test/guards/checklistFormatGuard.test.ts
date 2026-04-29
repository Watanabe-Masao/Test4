/**
 * Checklist Format Guard
 *
 * `projects/<id>/checklist.md` の規格適合を機械的に検証する。
 * 規約: `references/03-guides/project-checklist-governance.md` §3。
 *
 * 検出する違反:
 *
 * - **F1: 必須ファイル欠落** — config/project.json で entrypoints.checklist が
 *   指す checklist.md が存在しない
 * - **F2: 形式違反 checkbox** — `* [x]` / `* [ ]` 以外の checkbox 表記
 * - **F3: 「やってはいけないこと」セクション内の checkbox** — 完了判定の入力に
 *   混ぜるとぶれる
 * - **F4: 「常時チェック」セクション内の checkbox** — 同上
 * - **F5: 「最重要項目」セクション内の checkbox** — 同上
 *
 * **Phase D Wave 3 (2026-04-28)**: canonicalization-domain-consolidation Phase D で
 * `app-domain/integrity/` 経由の adapter 化。filesystemRegistry (live project 列挙) +
 * checkPathExistence (F1) + checkRatchet (FORMAT_EXEMPT 0 baseline) 経由に切替。
 * F2-F5 の section-aware checkbox 走査は markdown 専用 logic として caller 残置。
 * 動作同一性は 3 既存 test で検証済。
 *
 * `projects/_template/` および `projects/completed/` 配下は別ルールで扱う:
 * - `_template` は placeholder のため checklist が空でも OK
 * - `completed` は archive 済みなので checklist の編集を期待しない
 *
 * 2026-04-13: `pure-calculation-reorg` の checklist を純化（やってはいけないこと
 * / 常時チェック / 最重要項目 を plan.md 等に移動）した結果、FORMAT_EXEMPT は
 * 空集合になった。project: aag-collector-purification で実施。
 *
 * @see references/03-guides/project-checklist-governance.md §3 §10
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  filesystemRegistry,
  checkPathExistence,
  checkRatchet,
  type FileEntry,
  type RegisteredPath,
} from '@app-domain/integrity'

const RULE_ID = 'checklistFormatGuard'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const PROJECTS_DIR = path.join(PROJECT_ROOT, 'projects')

/**
 * ratchet-down EXEMPT — 本 guard 制定前から存在する project の互換例外。
 *
 * 2026-04-13: 全 project が規格適合したため空集合に設定。増やしてはいけない
 * （ratchet 方向: 0 のみ）。新規 project は `projects/_template/` を正本として
 * 作成すること。
 */
const FORMAT_EXEMPT_PROJECT_IDS: ReadonlySet<string> = new Set<string>()

interface ProjectJson {
  readonly projectId: string
  readonly entrypoints: {
    readonly checklist: string
  }
}

interface ProjectInfo {
  readonly projectId: string
  readonly configPath: string
  readonly checklistPath: string
  readonly checklistAbsPath: string
}

function listLiveProjects(): ProjectInfo[] {
  // Phase D Wave 3: live project 列挙を filesystemRegistry に整える
  if (!fs.existsSync(PROJECTS_DIR)) return []
  const fileEntries: FileEntry[] = []
  for (const entry of fs.readdirSync(PROJECTS_DIR)) {
    if (entry === 'completed' || entry.startsWith('_')) continue
    const entryPath = path.join(PROJECTS_DIR, entry)
    if (!fs.statSync(entryPath).isDirectory()) continue
    fileEntries.push({ name: entry, absPath: entryPath, displayPath: `projects/${entry}` })
  }
  const projectRegistry = filesystemRegistry(fileEntries, 'projects/')

  const out: ProjectInfo[] = []
  for (const fe of projectRegistry.entries.values()) {
    const configPath = path.join(fe.absPath, 'config/project.json')
    if (!fs.existsSync(configPath)) continue
    let project: ProjectJson
    try {
      project = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectJson
    } catch {
      continue
    }
    out.push({
      projectId: project.projectId,
      configPath,
      checklistPath: project.entrypoints.checklist,
      checklistAbsPath: path.join(PROJECT_ROOT, project.entrypoints.checklist),
    })
  }
  return out
}

interface FormatViolation {
  readonly projectId: string
  readonly file: string
  readonly line: number
  readonly code: string
  readonly message: string
}

function checkChecklist(info: ProjectInfo): FormatViolation[] {
  const violations: FormatViolation[] = []

  // F1: 必須ファイル欠落 (domain 経由の checkPathExistence)
  const paths: RegisteredPath[] = [
    { absPath: info.checklistAbsPath, displayPath: info.checklistPath },
  ]
  const f1Reports = checkPathExistence(paths, fs.existsSync, {
    ruleId: RULE_ID,
    registryLabel: `${info.projectId} entrypoints.checklist`,
  })
  if (f1Reports.length > 0) {
    violations.push({
      projectId: info.projectId,
      file: info.checklistPath,
      line: 0,
      code: 'F1',
      message:
        '必須ファイル欠落: config/project.json の entrypoints.checklist が指す checklist.md が存在しない。' +
        ' projects/_template/checklist.md をコピーするか、references/03-guides/project-checklist-governance.md §10 を参照。',
    })
    return violations
  }

  if (FORMAT_EXEMPT_PROJECT_IDS.has(info.projectId)) {
    // 互換例外（ratchet-down 対象）— format check はスキップする
    return violations
  }

  const md = fs.readFileSync(info.checklistAbsPath, 'utf-8')
  const lines = md.split(/\r?\n/)
  let suppressSection: string | undefined
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    const lineNo = i + 1

    if (line.startsWith('#')) {
      if (/やってはいけないこと/.test(line)) {
        suppressSection = 'やってはいけないこと'
      } else if (/常時チェック/.test(line)) {
        suppressSection = '常時チェック'
      } else if (/最重要項目/.test(line)) {
        suppressSection = '最重要項目'
      } else {
        suppressSection = undefined
      }
      continue
    }

    // 「正しい checkbox」を判定: `* [x]` / `* [ ]` / `- [x]` / `- [ ]`
    const validCheckbox = line.match(/^[*-]\s+\[([ xX])\]\s+/)
    // 「broken checkbox っぽい行」: `* [` で始まるが上記に該当しない
    const looksLikeCheckbox = line.match(/^[*-]\s+\[/)

    if (looksLikeCheckbox && !validCheckbox) {
      violations.push({
        projectId: info.projectId,
        file: info.checklistPath,
        line: lineNo,
        code: 'F2',
        message:
          '形式違反 checkbox: `* [x]` / `* [ ]` 以外の表記を検出。半角スペース 1 個 + ` ` または `x` のみ許可する。' +
          ' 詳細: references/03-guides/project-checklist-governance.md §3。',
      })
      continue
    }

    if (validCheckbox && suppressSection) {
      const codeMap: Record<string, string> = {
        やってはいけないこと: 'F3',
        常時チェック: 'F4',
        最重要項目: 'F5',
      }
      violations.push({
        projectId: info.projectId,
        file: info.checklistPath,
        line: lineNo,
        code: codeMap[suppressSection] ?? 'F3',
        message:
          `「${suppressSection}」セクション内に checkbox があります。completion 判定の入力に混ぜるとぶれるため、` +
          ' plan.md に書くか、別セクションに移してください。詳細: references/03-guides/project-checklist-governance.md §3。',
      })
    }
  }

  return violations
}

function formatViolations(violations: readonly FormatViolation[]): string {
  if (violations.length === 0) return ''
  const lines: string[] = []
  lines.push(`違反 (${violations.length} 件):`)
  for (const v of violations) {
    lines.push(`  [${v.code}] ${v.file}:${v.line}`)
    lines.push(`    project: ${v.projectId}`)
    lines.push(`    ${v.message}`)
  }
  lines.push('')
  lines.push('修正手順: projects/_template/checklist.md を参照して規格に揃えるか、')
  lines.push('references/03-guides/project-checklist-governance.md §3 (書き方の規格) を読む。')
  return lines.join('\n')
}

describe('Checklist Format Guard', () => {
  const projects = listLiveProjects()

  it('全 live project に config/project.json がある', () => {
    expect(projects.length).toBeGreaterThan(0)
  })

  it('全 live project の checklist.md が規格に準拠している', () => {
    const allViolations: FormatViolation[] = []
    for (const project of projects) {
      allViolations.push(...checkChecklist(project))
    }
    expect(allViolations, formatViolations(allViolations)).toEqual([])
  })

  it('FORMAT_EXEMPT 互換例外は ratchet-down のため減らすこと（増やしてはいけない）', () => {
    const ratchet = checkRatchet(FORMAT_EXEMPT_PROJECT_IDS.size, {
      ruleId: RULE_ID,
      counterLabel: 'FORMAT_EXEMPT_PROJECT_IDS',
      baseline: 0,
    })
    if (ratchet.ratchetDownHint) console.log(ratchet.ratchetDownHint)
    expect(FORMAT_EXEMPT_PROJECT_IDS.size).toBeLessThanOrEqual(0)
  })
})
