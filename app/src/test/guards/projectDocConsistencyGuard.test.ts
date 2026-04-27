/**
 * Project Doc Consistency Guard
 *
 * 各 active project の HANDOFF.md / checklist.md / config/project.json の
 * 整合性を機械的に検証する。「人が気をつける」で終わらせず、
 * Phase gate を仕組みで止める層。
 *
 * 検出する違反:
 *
 * - **D1: HANDOFF 現在地 と checklist 最大完了 Phase の矛盾** —
 *   HANDOFF §1「現在地」の記述が checklist の実態（最大完了 Phase）より
 *   古い / 新しい状態を指している（例: HANDOFF は「Phase 0 未着手」と書いているが
 *   checklist 上は Phase 2 まで完了）
 * - **D2: Phase 着手前に前 Phase review checkbox が残っている** —
 *   Phase N の checkbox が [x] になっているのに Phase N-1 の
 *   「architecture ロール review 完了」が [ ] のまま（governance ゲートを
 *   迂回した状態）。ADR-D-006 PR3 の要件を満たす。
 * - **D3 (ADR-D-006 PR2): config/project.json.status と checklist 実態の矛盾** —
 *   `status: "active"` なのに checkbox 一切 [x] 無し / `status: "completed"` なのに
 *   最終レビュー [x] が付いていない等、project lifecycle の説明不能な状態を検出
 * - **D4 (ADR-D-006 PR4): plan.md が参照する inquiry file が存在する** —
 *   plan.md に `inquiry/NN-*.md` の参照があるが実在しない（stale 参照）を検出
 *
 * 既存 projectCompletionConsistencyGuard（C1-C4 / L1-L3）を補完する。
 * 本 guard は「project 内部の文書整合性」、既存 guard は「project 間の path 整合性」
 * を担当する。
 *
 * 対象: `projects/<id>/` 直下の全 active project（archive 済みは除外）。
 *
 * @see references/03-guides/project-checklist-governance.md §3 §6
 * @see projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-006
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

interface ActiveProject {
  readonly projectId: string
  readonly handoffPath: string
  readonly checklistPath: string
  readonly projectJsonPath: string
  readonly planPath: string
  readonly rootDir: string
}

function listActiveProjects(): ActiveProject[] {
  if (!fs.existsSync(PROJECTS_DIR)) return []
  const out: ActiveProject[] = []
  for (const entry of fs.readdirSync(PROJECTS_DIR)) {
    if (entry.startsWith('_')) continue
    if (entry === 'completed') continue
    const entryPath = path.join(PROJECTS_DIR, entry)
    if (!fs.statSync(entryPath).isDirectory()) continue
    const handoff = path.join(entryPath, 'HANDOFF.md')
    const checklist = path.join(entryPath, 'checklist.md')
    if (!fs.existsSync(handoff) || !fs.existsSync(checklist)) continue
    out.push({
      projectId: entry,
      handoffPath: handoff,
      checklistPath: checklist,
      projectJsonPath: path.join(entryPath, 'config', 'project.json'),
      planPath: path.join(entryPath, 'plan.md'),
      rootDir: entryPath,
    })
  }
  return out
}

/** checklist から Phase ヘッダごとの [x] / [ ] カウントを抽出 */
interface PhaseStatus {
  readonly name: string
  readonly index: number
  readonly checked: number
  readonly unchecked: number
  readonly hasReviewLine: boolean
  readonly reviewChecked: boolean
}

const PHASE_HEADER_RE = /^##\s+(Phase\s+\d+[:：].*)$/
const CHECKBOX_RE = /^\*\s+\[([ x])\]\s+(.+)$/
const REVIEW_KEYWORD_RE = /architecture\s*ロール\s*review\s*完了/i

function parsePhaseStatuses(content: string): PhaseStatus[] {
  const lines = content.split('\n')
  const phases: PhaseStatus[] = []
  let current: { name: string; index: number; lines: string[] } | null = null
  let phaseIndex = 0
  for (const line of lines) {
    const phaseMatch = line.match(PHASE_HEADER_RE)
    if (phaseMatch) {
      if (current) phases.push(summarizePhase(current.name, current.index, current.lines))
      phaseIndex += 1
      current = { name: phaseMatch[1], index: phaseIndex, lines: [] }
      continue
    }
    if (/^##\s+/.test(line)) {
      // 別セクションに入ったので現在の Phase を閉じる
      if (current) phases.push(summarizePhase(current.name, current.index, current.lines))
      current = null
      continue
    }
    if (current) current.lines.push(line)
  }
  if (current) phases.push(summarizePhase(current.name, current.index, current.lines))
  return phases
}

function summarizePhase(name: string, index: number, lines: string[]): PhaseStatus {
  let checked = 0
  let unchecked = 0
  let hasReviewLine = false
  let reviewChecked = false
  for (const l of lines) {
    const m = l.match(CHECKBOX_RE)
    if (!m) continue
    const mark = m[1]
    const text = m[2]
    if (mark === 'x') checked += 1
    else unchecked += 1
    if (REVIEW_KEYWORD_RE.test(text)) {
      hasReviewLine = true
      reviewChecked = mark === 'x'
    }
  }
  return { name, index, checked, unchecked, hasReviewLine, reviewChecked }
}

function maxCompletedPhaseIndex(phases: PhaseStatus[]): number {
  let max = 0
  for (const p of phases) {
    if (p.unchecked === 0 && p.checked > 0) max = p.index
    else break
  }
  return max
}

interface HandoffCurrent {
  readonly hasSection: boolean
  readonly firstLine: string // "## 1. 現在地" の次の非空行
}

function extractHandoffCurrent(content: string): HandoffCurrent {
  const lines = content.split('\n')
  let inSection = false
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (/^##\s+1\.\s+現在地/.test(l)) {
      inSection = true
      continue
    }
    if (inSection) {
      const trimmed = l.trim()
      if (trimmed === '') continue
      if (trimmed.startsWith('##')) break
      return { hasSection: true, firstLine: trimmed }
    }
  }
  return { hasSection: false, firstLine: '' }
}

function extractPhaseNumbersMentioned(text: string): number[] {
  // "Phase 5" / "Phase 1-5" / "Phase 1〜5" / "Phase 1–5" / "Phase 1 to 5" を全て捉える
  const matches = text.matchAll(/Phase\s+(\d+)(?:\s*[-~〜–]\s*(\d+))?/g)
  const nums = new Set<number>()
  for (const m of matches) {
    nums.add(parseInt(m[1], 10))
    if (m[2]) nums.add(parseInt(m[2], 10))
  }
  return [...nums].sort((a, b) => a - b)
}

interface Violation {
  readonly code: 'D1' | 'D2' | 'D3' | 'D4'
  readonly project: string
  readonly message: string
  readonly hint: string
}

/** 最終レビュー section の checkbox 状態を抽出 */
function finalReviewChecked(content: string): boolean | null {
  const lines = content.split('\n')
  let inFinal = false
  for (const l of lines) {
    if (/^##\s+最終レビュー/.test(l)) {
      inFinal = true
      continue
    }
    if (inFinal) {
      if (/^##\s+/.test(l)) break
      const m = l.match(CHECKBOX_RE)
      if (m) return m[1] === 'x'
    }
  }
  return null
}

/** checklist から derivedStatus を計算 */
function computeDerivedStatus(content: string): 'draft' | 'active' | 'completed' {
  const checked = (content.match(/^\* \[x\]/gm) ?? []).length
  const unchecked = (content.match(/^\* \[ \]/gm) ?? []).length
  const finalChecked = finalReviewChecked(content)
  if (checked === 0) return 'draft'
  if (finalChecked === true && unchecked === 0) return 'completed'
  return 'active'
}

/**
 * plan.md 内から本 project 内の `inquiry/XX-*.md` 参照を抽出。
 * 他 project への cross-project 参照（`projects/<other>/inquiry/...`）は除外。
 */
function extractInquiryReferences(planContent: string): string[] {
  // negative lookbehind: 'projects/...' で始まる cross-project 参照は除外
  const matches = planContent.matchAll(/(?<!projects\/[^\s]+\/)inquiry\/([\w-]+\.md)/g)
  const refs = new Set<string>()
  for (const m of matches) refs.add(m[1])
  return [...refs].sort()
}

function checkConsistency(): Violation[] {
  const violations: Violation[] = []
  for (const proj of listActiveProjects()) {
    const handoff = fs.readFileSync(proj.handoffPath, 'utf-8')
    const checklist = fs.readFileSync(proj.checklistPath, 'utf-8')
    const phases = parsePhaseStatuses(checklist)
    if (phases.length === 0) continue
    const maxCompleted = maxCompletedPhaseIndex(phases)
    const maxPhaseIndex = phases[phases.length - 1]?.index ?? 0

    // D1: HANDOFF 現在地 が checklist の最大完了 Phase より極端に古い状態を示すか
    const current = extractHandoffCurrent(handoff)
    if (current.hasSection && maxCompleted > 0) {
      const mentioned = extractPhaseNumbersMentioned(current.firstLine)
      const latestMentioned = mentioned.length > 0 ? Math.max(...mentioned) : 0
      // HANDOFF が言及する最大 Phase が checklist の実態より 2 以上古い場合は矛盾
      if (latestMentioned > 0 && latestMentioned < maxCompleted - 1) {
        violations.push({
          code: 'D1',
          project: proj.projectId,
          message:
            `'projects/${proj.projectId}/HANDOFF.md §1 現在地' が Phase ${latestMentioned} 付近を示すが、` +
            `checklist では Phase ${maxCompleted} まで完了している`,
          hint:
            'HANDOFF.md §1 を checklist の実態（最大完了 Phase）と整合するよう更新してください。' +
            ' 規約: references/03-guides/project-checklist-governance.md §3.2',
        })
      }
    }

    // D2: Phase N が完了しているが Phase N-1 以前の review checkbox が未チェック
    for (const phase of phases) {
      if (phase.unchecked !== 0) continue
      if (phase.checked === 0) continue
      // この Phase は完了扱い。これより前の Phase に未 review が残っていれば違反
      for (const earlier of phases) {
        if (earlier.index >= phase.index) break
        if (earlier.hasReviewLine && !earlier.reviewChecked) {
          violations.push({
            code: 'D2',
            project: proj.projectId,
            message:
              `'projects/${proj.projectId}/checklist.md' で '${phase.name}' が完了扱いだが、` +
              `'${earlier.name}' の architecture ロール review が未チェック`,
            hint:
              'Phase N 着手前に Phase N-1 以前の review checkbox を [x] にする必要があります。' +
              ' governance ゲート迂回を禁止（umbrella plan.md §2 不可侵原則）。' +
              ' 規約: references/03-guides/project-checklist-governance.md §6.2',
          })
        }
      }
    }

    // D3: config/project.json.status と checklist 実態の矛盾検出（ADR-D-006 PR2）
    if (fs.existsSync(proj.projectJsonPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(proj.projectJsonPath, 'utf-8'))
        const declaredStatus = config.status as string | undefined
        const derivedStatus = computeDerivedStatus(checklist)
        if (declaredStatus && declaredStatus !== derivedStatus) {
          // 'active' は「進行中」の幅があるので warn せず、draft↔active、active↔completed の
          // 明確な矛盾のみ検出
          const isInconsistent =
            (declaredStatus === 'draft' && derivedStatus !== 'draft') ||
            (declaredStatus === 'completed' && derivedStatus !== 'completed')
          if (isInconsistent) {
            violations.push({
              code: 'D3',
              project: proj.projectId,
              message:
                `'projects/${proj.projectId}/config/project.json.status = ${declaredStatus}' が、` +
                `checklist から計算した derivedStatus = ${derivedStatus} と矛盾`,
              hint:
                'config/project.json.status を checklist 実態と整合させてください。' +
                ' draft = checkbox 全て [ ] / active = 一部 [x] / completed = 全 [x] + 最終レビュー [x]。' +
                ' 規約: references/03-guides/project-checklist-governance.md §6',
            })
          }
        }
      } catch {
        // JSON parse エラーは docCodeConsistencyGuard 側で検出される想定
      }
    }

    // D4: plan.md が参照する inquiry file が実在するか（ADR-D-006 PR4）
    // 自 project に inquiry/ dir がある場合のみ対象（sub-project など inquiry を持たない
    // project の plan.md 内の cross-project 参照は scope 外）
    const inquiryDir = path.join(proj.rootDir, 'inquiry')
    if (fs.existsSync(proj.planPath) && fs.existsSync(inquiryDir)) {
      const plan = fs.readFileSync(proj.planPath, 'utf-8')
      const refs = extractInquiryReferences(plan)
      const missing: string[] = []
      for (const ref of refs) {
        if (!fs.existsSync(path.join(inquiryDir, ref))) missing.push(ref)
      }
      if (missing.length > 0) {
        violations.push({
          code: 'D4',
          project: proj.projectId,
          message:
            `'projects/${proj.projectId}/plan.md' が存在しない inquiry file を参照: ` +
            missing.join(', '),
          hint:
            '参照先 file を作成するか、stale 参照を plan.md から削除してください。' +
            ' Phase 1-3 の inquiry は archive 対象なので、completion 時は HANDOFF / plan から言及を外す。',
        })
      }
    }

    // 参照を明示的に使うための noop（maxPhaseIndex は将来の拡張用）
    void maxPhaseIndex
  }
  return violations
}

function formatViolations(violations: Violation[]): string {
  return violations.map((v) => `  [${v.code}] ${v.message}\n    hint: ${v.hint}`).join('\n')
}

describe('Project Doc Consistency Guard: HANDOFF / checklist / governance の整合', () => {
  it('HANDOFF §1 現在地 と checklist 最大完了 Phase が矛盾しない (D1)', () => {
    const violations = checkConsistency().filter((v) => v.code === 'D1')
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('Phase N 完了時に Phase N-1 以前の review checkbox が未チェックではない (D2)', () => {
    const violations = checkConsistency().filter((v) => v.code === 'D2')
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('config/project.json.status と checklist derivedStatus が矛盾しない (D3)', () => {
    const violations = checkConsistency().filter((v) => v.code === 'D3')
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('plan.md が参照する inquiry file が全て実在する (D4)', () => {
    const violations = checkConsistency().filter((v) => v.code === 'D4')
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('parsePhaseStatuses は Phase ヘッダ単位で checkbox を正しく集計する', () => {
    const sample = [
      '## Phase 1: foo',
      '* [x] bar',
      '* [ ] baz',
      '',
      '## Phase 2: qux',
      '* [x] architecture ロール review 完了',
      '',
      '## 最終レビュー',
      '* [ ] human approve',
    ].join('\n')
    const phases = parsePhaseStatuses(sample)
    expect(phases.length).toBe(2)
    expect(phases[0].name).toContain('Phase 1')
    expect(phases[0].checked).toBe(1)
    expect(phases[0].unchecked).toBe(1)
    expect(phases[0].hasReviewLine).toBe(false)
    expect(phases[1].name).toContain('Phase 2')
    expect(phases[1].checked).toBe(1)
    expect(phases[1].unchecked).toBe(0)
    expect(phases[1].hasReviewLine).toBe(true)
    expect(phases[1].reviewChecked).toBe(true)
  })

  it('maxCompletedPhaseIndex は未完了 Phase に到達するまでの連続完了を数える', () => {
    const phases: PhaseStatus[] = [
      {
        name: 'Phase 1',
        index: 1,
        checked: 2,
        unchecked: 0,
        hasReviewLine: false,
        reviewChecked: false,
      },
      {
        name: 'Phase 2',
        index: 2,
        checked: 1,
        unchecked: 0,
        hasReviewLine: true,
        reviewChecked: true,
      },
      {
        name: 'Phase 3',
        index: 3,
        checked: 0,
        unchecked: 3,
        hasReviewLine: true,
        reviewChecked: false,
      },
      {
        name: 'Phase 4',
        index: 4,
        checked: 1,
        unchecked: 0,
        hasReviewLine: true,
        reviewChecked: true,
      },
    ]
    expect(maxCompletedPhaseIndex(phases)).toBe(2)
  })
})
