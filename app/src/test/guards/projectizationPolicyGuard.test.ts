/**
 * Projectization Policy Guard (AAG-COA)
 *
 * AAG-COA (Change Operation Assessment) が要求する `projectization` metadata と
 * Level 別 required / forbidden artifacts を機械的に検証する。
 *
 * 規約: `references/03-guides/projectization-policy.md`
 *
 * ## 検出する違反
 *
 * - **PZ-1: `projectization` metadata 欠落** — `config/project.json` に
 *   `projectization` フィールドが無い（kind=collection は除外）。
 *   導入期は baseline 運用（ratchet-down: 減少のみ許可）。
 * - **PZ-2: `projectization.level` が 0〜4 以外** — 値の妥当性（hard fail）。
 * - **PZ-4: Level 1 なのに Phase 0〜7 full structure** — checklist.md に
 *   `Phase 7` 相当の見出しが存在する（過剰 project 化の検出）。
 * - **PZ-5: Level 1 なのに `inquiry/` が存在する** — 過剰 project 化。
 * - **PZ-6: Level 2 なのに `sub-project-map.md` が存在する** — umbrella 化は Level 4 のみ。
 * - **PZ-7: `breakingChange=true` なのに `breaking-changes.md` がない（Level 3+）**
 * - **PZ-8: `requiresLegacyRetirement=true` なのに `legacy-retirement.md` がない（Level 3+）**
 * - **PZ-10: `requiresHumanApproval=true` なのに checklist に最終レビュー checkbox がない**
 * - **PZ-11: Level 4 なのに `sub-project-map.md` がない**
 * - **PZ-12: Level 2+ なのに `nonGoals` が未定義または空**
 *
 * ## scope
 *
 * - `projects/<id>/config/project.json`（active のみ）
 * - `projects/<id>/checklist.md`（該当 check で必要時）
 * - **除外**: `projects/completed/**`（archive 済みに retroactive 適用しない）
 * - **除外**: `projects/_template/**`（schema 検証は別 test の対象）
 * - **除外**: `kind: "collection"` の project（例: `projects/quick-fixes/`）
 *
 * ## baseline 運用
 *
 * PZ-1 のみ導入期の既存 active project を吸収するため baseline を持つ。
 * 以降は **ratchet-down**（増加禁止、減少のみ許可）。baseline を下回ったら
 * 定数を更新して新 baseline を固定する（通常の allowlist と同じ運用）。
 * その他の検出コードは metadata が存在する project のみが対象のため、
 * 新規に metadata を書く project は完全形を求められる。
 *
 * @see references/03-guides/projectization-policy.md §12
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const PROJECTS_DIR = path.join(PROJECT_ROOT, 'projects')

/**
 * PZ-1 baseline: `projectization` metadata を持たない active project の件数。
 * ratchet-down: 減少のみ許可。0 に到達したら guard を strict 化できる。
 * 初期値: 2026-04-24 時点の active project（kind=collection を除く）= 9。
 */
const PZ1_MISSING_METADATA_BASELINE = 9

type Level = 0 | 1 | 2 | 3 | 4

interface ProjectizationMetadata {
  readonly level: Level
  readonly changeType?: string
  readonly implementationScope?: readonly string[]
  readonly breakingChange?: boolean
  readonly requiresLegacyRetirement?: boolean
  readonly requiresGuard?: boolean
  readonly requiresHumanApproval?: boolean
  readonly nonGoals?: readonly string[]
}

interface ProjectConfig {
  readonly projectId?: string
  readonly kind?: string
  readonly projectization?: ProjectizationMetadata
}

interface ActiveProject {
  readonly projectId: string
  readonly absDir: string
  readonly relDir: string
  readonly config: ProjectConfig | null
  readonly rawConfigText: string | null
}

function listActiveProjects(): ActiveProject[] {
  const out: ActiveProject[] = []
  if (!fs.existsSync(PROJECTS_DIR)) return out

  for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name === 'completed') continue
    if (entry.name === '_template') continue
    const absDir = path.join(PROJECTS_DIR, entry.name)
    const relDir = path.relative(PROJECT_ROOT, absDir).replace(/\\/g, '/')
    const configPath = path.join(absDir, 'config/project.json')
    if (!fs.existsSync(configPath)) continue

    const rawConfigText = fs.readFileSync(configPath, 'utf-8')
    let config: ProjectConfig | null = null
    try {
      config = JSON.parse(rawConfigText) as ProjectConfig
    } catch {
      // JSON parse error は別 guard の責務。ここでは null として扱う。
      config = null
    }
    out.push({ projectId: entry.name, absDir, relDir, config, rawConfigText })
  }
  return out
}

interface Violation {
  readonly projectId: string
  readonly code: string
  readonly message: string
  readonly hint: string
}

function isCollection(p: ActiveProject): boolean {
  return p.config?.kind === 'collection'
}

function hasProjectizationField(p: ActiveProject): boolean {
  return Boolean(p.config && p.config.projectization)
}

function checkPZ2(p: ActiveProject): Violation[] {
  if (!p.config?.projectization) return []
  const level = p.config.projectization.level
  if (typeof level !== 'number' || ![0, 1, 2, 3, 4].includes(level)) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-2',
        message: `config/project.json の projectization.level が 0〜4 以外です (現値: ${JSON.stringify(level)})`,
        hint:
          '0, 1, 2, 3, 4 のいずれかを指定してください。' +
          ' 詳細: references/03-guides/projectization-policy.md §3。',
      },
    ]
  }
  return []
}

function checkPZ4(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m || m.level !== 1) return []
  const checklist = path.join(p.absDir, 'checklist.md')
  if (!fs.existsSync(checklist)) return []
  const content = fs.readFileSync(checklist, 'utf-8')
  // Phase 6 / Phase 7 相当の見出しが存在すれば過剰 (Level 1 は full phase 構造禁止)
  if (/^#{1,6}\s+Phase\s+[67]\b/im.test(content)) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-4',
        message:
          'Level 1 project の checklist.md に Phase 6 / Phase 7 相当の見出しが存在します（過剰 project 化）',
        hint:
          'Level 1 は軽量 project 用の level です。full Phase 構造が必要なら Level 3+ に escalate し、\n' +
          ' projectization.md §5 に escalate 理由を記載、config/project.json の projectization.level を更新してください。\n' +
          ' 詳細: references/03-guides/projectization-policy.md §3 Level 1。',
      },
    ]
  }
  return []
}

function checkPZ5(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m || m.level !== 1) return []
  const inquiryDir = path.join(p.absDir, 'inquiry')
  if (fs.existsSync(inquiryDir) && fs.statSync(inquiryDir).isDirectory()) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-5',
        message: 'Level 1 project に inquiry/ ディレクトリが存在します（過剰 project 化）',
        hint:
          'inquiry/ は Level 2 任意 / Level 3+ 必須です。Level 1 では事実棚卸しは不要。\n' +
          ' 棚卸しが必要なら Level 3 に escalate してください。\n' +
          ' 詳細: references/03-guides/projectization-policy.md §4 早見表。',
      },
    ]
  }
  return []
}

function checkPZ6(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m || m.level !== 2) return []
  if (fs.existsSync(path.join(p.absDir, 'sub-project-map.md'))) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-6',
        message: 'Level 2 project に sub-project-map.md が存在します（umbrella 化は Level 4 のみ）',
        hint:
          'sub-project-map.md は Level 4 (Umbrella Project) 専用の artifact です。\n' +
          ' Level 2 project で複数 sub-project を spawn する必要があるなら Level 4 に escalate してください。\n' +
          ' 詳細: references/03-guides/projectization-policy.md §3 Level 4。',
      },
    ]
  }
  return []
}

function checkPZ7(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m || m.level < 3) return []
  if (!m.breakingChange) return []
  if (!fs.existsSync(path.join(p.absDir, 'breaking-changes.md'))) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-7',
        message:
          'breakingChange=true なのに projects/<id>/breaking-changes.md が存在しません（Level 3+）',
        hint:
          'breaking-changes.md を追加し、破壊対象の公開契約 / 型 / API と移行方針を記載してください。\n' +
          ' 詳細: references/03-guides/projectization-policy.md §5 + §3 Level 3。',
      },
    ]
  }
  return []
}

function checkPZ8(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m || m.level < 3) return []
  if (!m.requiresLegacyRetirement) return []
  if (!fs.existsSync(path.join(p.absDir, 'legacy-retirement.md'))) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-8',
        message:
          'requiresLegacyRetirement=true なのに projects/<id>/legacy-retirement.md が存在しません（Level 3+）',
        hint:
          'legacy-retirement.md を追加し、撤退対象 / 呼び出し元 / 移行先 / 撤退順序 / rollback を記載してください。\n' +
          ' 詳細: references/03-guides/projectization-policy.md §6。',
      },
    ]
  }
  return []
}

function checkPZ10(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m) return []
  if (!m.requiresHumanApproval) return []
  const checklist = path.join(p.absDir, 'checklist.md')
  if (!fs.existsSync(checklist)) return []
  const content = fs.readFileSync(checklist, 'utf-8')
  // 「最終レビュー」「人間承認」のいずれかを含む section 配下に [ ] checkbox があれば OK
  const hasFinalReviewSection = /最終レビュー|人間承認|Human Approval|Final Review/i.test(content)
  const hasCheckbox = /^\s*\*\s+\[\s?\]\s+/m.test(content)
  if (!hasFinalReviewSection || !hasCheckbox) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-10',
        message:
          'requiresHumanApproval=true なのに checklist.md に「最終レビュー (人間承認)」 checkbox がありません',
        hint:
          'checklist.md の最後に次の section を追加してください:\n' +
          '    ## 最終レビュー (人間承認)\n' +
          '    * [ ] 全 Phase の成果物を人間がレビューし archive プロセスへの移行を承認する\n' +
          ' 詳細: references/03-guides/project-checklist-governance.md §3.1 + ' +
          'references/03-guides/projectization-policy.md §8。',
      },
    ]
  }
  return []
}

function checkPZ11(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m || m.level !== 4) return []
  if (!fs.existsSync(path.join(p.absDir, 'sub-project-map.md'))) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-11',
        message: 'Level 4 (Umbrella) project に sub-project-map.md が存在しません',
        hint:
          'sub-project-map.md を追加し、sub-project 一覧 + 依存関係を記載してください。\n' +
          ' 詳細: references/03-guides/projectization-policy.md §3 Level 4。',
      },
    ]
  }
  return []
}

function checkPZ12(p: ActiveProject): Violation[] {
  const m = p.config?.projectization
  if (!m || m.level < 2) return []
  if (!m.nonGoals || m.nonGoals.length === 0) {
    return [
      {
        projectId: p.projectId,
        code: 'PZ-12',
        message:
          'Level 2+ project なのに projectization.nonGoals が未定義または空です',
        hint:
          'projectization.nonGoals に「この project でやらないこと」を 1 件以上列挙してください。\n' +
          ' scope 逸脱の抑止と escalation 判定の基準として機能します。\n' +
          ' 詳細: references/03-guides/projectization-policy.md §10 + projectization.md §4。',
      },
    ]
  }
  return []
}

function checkAllStructural(p: ActiveProject): Violation[] {
  return [
    ...checkPZ2(p),
    ...checkPZ4(p),
    ...checkPZ5(p),
    ...checkPZ6(p),
    ...checkPZ7(p),
    ...checkPZ8(p),
    ...checkPZ10(p),
    ...checkPZ11(p),
    ...checkPZ12(p),
  ]
}

function formatViolations(vs: readonly Violation[]): string {
  if (vs.length === 0) return ''
  const lines: string[] = [`違反 (${vs.length} 件):`]
  for (const v of vs) {
    lines.push('')
    lines.push(`  [${v.code}] ${v.projectId}`)
    lines.push(`    ${v.message}`)
    for (const h of v.hint.split('\n')) {
      lines.push(`    ${h}`)
    }
  }
  return lines.join('\n')
}

describe('Projectization Policy Guard (AAG-COA)', () => {
  const projects = listActiveProjects()

  it('active project が発見できている', () => {
    expect(projects.length).toBeGreaterThan(0)
  })

  it('PZ-1: projectization metadata 欠落数が baseline を超えない（ratchet-down）', () => {
    const missing = projects
      .filter((p) => !isCollection(p))
      .filter((p) => !hasProjectizationField(p))
    const actual = missing.length
    const message =
      actual > PZ1_MISSING_METADATA_BASELINE
        ? `projectization metadata が欠落している active project が ${actual} 件あります ` +
          `(baseline=${PZ1_MISSING_METADATA_BASELINE})。\n` +
          `以下の project に config/project.json へ projectization フィールドを追加してください:\n` +
          missing.map((p) => `  - ${p.projectId}`).join('\n') +
          `\n詳細: references/03-guides/projectization-policy.md §10。`
        : ''
    expect(actual, message).toBeLessThanOrEqual(PZ1_MISSING_METADATA_BASELINE)
  })

  it('PZ-1: baseline が実数を下回っていないこと（ratchet-down 機会の検出）', () => {
    const missing = projects
      .filter((p) => !isCollection(p))
      .filter((p) => !hasProjectizationField(p)).length
    // baseline が実数より十分大きい場合は縮退機会 — baseline を下げるよう促す
    if (missing < PZ1_MISSING_METADATA_BASELINE) {
      const hint =
        `PZ1_MISSING_METADATA_BASELINE = ${PZ1_MISSING_METADATA_BASELINE} ですが、` +
        `実際の欠落は ${missing} 件です。baseline を ${missing} に縮退してください ` +
        `(projectizationPolicyGuard.test.ts 内の定数)。`
      // 情報として expect の message に含める。fail にはしない（ratchet-down の誘導）。
      console.info(`[projectizationPolicyGuard] ${hint}`)
    }
    expect(missing).toBeLessThanOrEqual(PZ1_MISSING_METADATA_BASELINE)
  })

  it('PZ-2〜PZ-12: metadata が存在する project は完全形を満たす', () => {
    const withMetadata = projects.filter((p) => hasProjectizationField(p))
    const violations: Violation[] = []
    for (const p of withMetadata) {
      violations.push(...checkAllStructural(p))
    }
    expect(violations, formatViolations(violations)).toEqual([])
  })
})
