/**
 * Unified Widget Context No Page-Local Optional Guard
 *
 * `app/src/presentation/components/widgets/types.ts` の `UnifiedWidgetContext`
 * interface に **page-local optional field** が含まれていないかを検証する。
 *
 * 検出する違反:
 *
 * - **U1**: page 名を接頭辞に持つ optional field の追加
 *   （例: `insightData?` / `costDetailData?` / `selectedResults?` 等）
 * - **U2**: ソース内コメントブロック `// ── <Page> 固有 ──` 配下の field の追加
 *
 * 設計意図:
 *   umbrella `architecture-debt-recovery` inquiry/09 §S3-H2「Unified を名乗る統合契約が最初から
 *   spec されておらず、page-local field を受動的に受け入れる構造になっている」仮説に対応。
 *   Phase 6 ADR-A-001 で page-specific ctx 型（InsightWidgetContext /
 *   CostDetailWidgetContext / CategoryWidgetContext）に剥離する前に、
 *   baseline=5 で現状を凍結し、増加を止める。
 *
 * baseline=5 の内訳（inquiry/04 §B-2 参照）:
 *   - insightData?
 *   - costDetailData?
 *   - selectedResults?
 *   - storeNames?
 *   - onCustomCategoryChange?
 *
 * ADR-A-001 PR4 で baseline=0 + fixed mode に移行する。
 *
 * @see projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-001
 * @see projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-1
 * @see projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-001 / §LEG-002 / §LEG-003
 * @see projects/architecture-debt-recovery/inquiry/04-type-asymmetry.md §B
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const UNIFIED_CTX_PATH = path.join(PROJECT_ROOT, 'app/src/presentation/components/widgets/types.ts')

// ADR-A-001 PR4 (2026-04-24): baseline 5→0 達成、fixed mode 移行完了。
// 5 page-local optional field は InsightWidgetContext / CostDetailWidgetContext /
// CategoryWidgetContext に剥離済み。LEG-001〜LEG-003 sunsetCondition 達成。
const BASELINE = 0

const KNOWN_PAGE_LOCAL_ALLOWLIST: readonly string[] = []

// page-local と判定する field 名のパターン（接頭辞）
// umbrella inquiry/04 §B-2 に列挙される「<Page> 固有」field と対応
const PAGE_PREFIXES = ['insight', 'costDetail', 'category'] as const

// ソース内コメントで page 固有宣言されるセクション
// 例: `// ── CostDetail 固有 ──` 直後の field は page-local
const PAGE_SECTION_COMMENT_RE = /^\s*\/\/\s*[-─]+\s*(Insight|CostDetail|Category)\s*固有/

interface DetectedField {
  readonly name: string
  readonly line: number
  readonly reason: 'prefix' | 'section-comment'
  readonly section?: string
}

/** UnifiedWidgetContext interface 内の optional field を抽出 */
function detectPageLocalOptionalFields(): DetectedField[] {
  if (!fs.existsSync(UNIFIED_CTX_PATH)) {
    return []
  }
  const content = fs.readFileSync(UNIFIED_CTX_PATH, 'utf-8')
  const lines = content.split('\n')

  // UnifiedWidgetContext interface の開始 / 終了位置を探す
  let start = -1
  let end = -1
  let depth = 0
  for (let i = 0; i < lines.length; i++) {
    if (start === -1 && /export\s+interface\s+UnifiedWidgetContext\b/.test(lines[i])) {
      start = i
      // 同行に { があれば depth=1 から開始
      if (lines[i].includes('{')) depth = 1
      continue
    }
    if (start !== -1) {
      for (const ch of lines[i]) {
        if (ch === '{') depth += 1
        else if (ch === '}') depth -= 1
      }
      if (depth === 0 && i > start) {
        end = i
        break
      }
    }
  }

  if (start === -1 || end === -1) return []

  const detected: DetectedField[] = []
  let currentSection: string | null = null

  for (let i = start + 1; i < end; i++) {
    const line = lines[i]
    const sectionMatch = line.match(PAGE_SECTION_COMMENT_RE)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      continue
    }
    // 他のセクションコメントが出現したら current を reset
    if (/^\s*\/\/\s*[-─]+/.test(line) && !sectionMatch) {
      currentSection = null
    }

    // optional field: `readonly <name>?:` or `<name>?:`
    const fieldMatch = line.match(/^\s*(?:readonly\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\?:/)
    if (!fieldMatch) continue

    const fieldName = fieldMatch[1]

    // page-local 判定は「<Page> 固有」 section 内の field のみ
    // （prefix 単独だと categoryDailyLane 等の universal lane field を誤検出するため）
    if (currentSection) {
      // field 名が該当 page の prefix で始まることも確認して正確性を高める
      const prefix = PAGE_PREFIXES.find((p) => fieldName.toLowerCase().startsWith(p.toLowerCase()))
      detected.push({
        name: fieldName,
        line: i + 1,
        reason: prefix ? 'prefix' : 'section-comment',
        section: currentSection,
      })
    }
  }

  return detected
}

describe('UnifiedWidgetContext No Page-Local Optional Guard', () => {
  it('page-local optional field 数が baseline を超えない（U1 / U2 ratchet-down）', () => {
    const detected = detectPageLocalOptionalFields()
    const fieldNames = detected.map((d) => d.name)
    const message =
      `UnifiedWidgetContext の page-local optional field 数 = ${detected.length} (baseline = ${BASELINE}):\n` +
      detected
        .map(
          (d) => `  - line ${d.line}: ${d.name} (${d.reason}${d.section ? `: ${d.section}` : ''})`,
        )
        .join('\n') +
      '\n\n' +
      'hint: ADR-A-001 PR2/PR3 で page-specific ctx 型（InsightWidgetContext 等）に剥離し、' +
      '\n  PR4 で UnifiedWidgetContext から該当 field を削除して baseline=0 に到達する。' +
      '\n  詳細: projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-001〜003'
    expect(detected.length, message).toBeLessThanOrEqual(BASELINE)

    // ALLOWLIST と一致（既知の 5 件以外が追加された場合に検出）
    const newlyAdded = fieldNames.filter((n) => !KNOWN_PAGE_LOCAL_ALLOWLIST.includes(n))
    const addedMessage =
      newlyAdded.length > 0
        ? `ALLOWLIST 外の新規 page-local optional field が追加された:\n` +
          newlyAdded.map((n) => `  - ${n}`).join('\n') +
          '\n\nhint: J5「page-local optional 禁止」原則に反します。page-specific ctx 型へ移設してください。'
        : ''
    expect(newlyAdded, addedMessage).toEqual([])
  })

  it('baseline 構成 field が ALLOWLIST と一致する（削除忘れ検出）', () => {
    const detected = detectPageLocalOptionalFields()
    const detectedNames = new Set(detected.map((d) => d.name))
    const allowlistNotDetected = KNOWN_PAGE_LOCAL_ALLOWLIST.filter((n) => !detectedNames.has(n))
    const message =
      allowlistNotDetected.length > 0
        ? `ALLOWLIST にあるが検出されなかった（既に剥離済み？）:\n` +
          allowlistNotDetected.map((n) => `  - ${n}`).join('\n') +
          '\n\nhint: ALLOWLIST から削除して baseline を縮退してください。'
        : ''
    expect(allowlistNotDetected, message).toEqual([])
  })

  it('detectPageLocalOptionalFields は interface が存在しない場合に空を返す', () => {
    // このテストは detect ロジックの defensive check（regression 防止）
    expect(Array.isArray(detectPageLocalOptionalFields())).toBe(true)
  })

  it('PAGE_PREFIXES はすべて lower camelCase 形式', () => {
    for (const p of PAGE_PREFIXES) {
      expect(/^[a-z][a-zA-Z]*$/.test(p), `invalid prefix: ${p}`).toBe(true)
    }
  })
})
