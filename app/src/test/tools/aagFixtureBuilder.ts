/**
 * Minimal fixture repo builder for collector / resolver contract tests
 *
 * Phase 6 では collector / resolver の契約を fixture ベースで検証する。
 * 大規模 fixture repo を避け、各テストが必要最小限の構造を tmpdir に
 * 組み立てて collector に渡す方式を使う。
 *
 * @see references/03-implementation/governance-final-placement-plan.md
 * @responsibility R:unclassified
 */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

export interface FixtureOptions {
  /** projectId として使う値（既定: "fx-project"） */
  readonly projectId?: string
  /**
   * 追加で書き込みたいファイル。key はリポジトリルートからの相対パス、
   * value はファイル内容。
   */
  readonly extraFiles?: Readonly<Record<string, string>>
  /**
   * overlay で書き込むルール以外に BaseRule へ書き込みたい id の配列。
   * 既定の 5 ルール以外の変種を検証する場合に使う。
   */
  readonly baseRuleIds?: readonly string[]
  /**
   * 既定テンプレートを上書きしたい場合に指定する。
   * key は既定ファイルの相対パス。
   */
  readonly overrideFiles?: Readonly<Record<string, string>>
  /** quote スタイル（既定: 'single'） */
  readonly quoteStyle?: 'single' | 'double'
}

export interface Fixture {
  /** 絶対パスの repo root */
  readonly repoRoot: string
  /** projectId */
  readonly projectId: string
  /** teardown — テスト終了時に呼ぶこと */
  readonly cleanup: () => void
}

const DEFAULT_BASE_RULE_IDS = ['AR-A', 'AR-B', 'AR-C', 'AR-D', 'AR-E'] as const

/**
 * base-rules.ts のテンプレートを作成する。
 * BaseRule 5 件を含み、I1 タグ参照と sunsetCondition / protectedHarm を
 * 一部のルールに含めて collector の正規表現検出を固定できるようにする。
 */
function renderBaseRules(ids: readonly string[], quote: "'" | '"'): string {
  const q = quote
  const rules = ids.map((id, idx) => {
    const includeSunset = idx === 0
    const includeProtectedHarm = idx === 1 || idx === 2
    const isHeuristicGate = idx === 3
    const parts: string[] = [
      `  {`,
      `    id: ${q}${id}${q},`,
      `    principleRefs: [${q}F1${q}],`,
      `    guardTags: [${q}F1${q}],`,
      `    slice: ${q}governance-ops${q},`,
      `    ruleClass: ${q}${isHeuristicGate ? 'heuristic' : 'invariant'}${q},`,
      `    confidence: ${q}high${q},`,
      `    maturity: ${q}stable${q},`,
      `    doc: ${q}references/fixture.md${q},`,
      `    what: ${q}fx-${id}${q},`,
      `    why: ${q}fx-${id}-why${q},`,
      `    correctPattern: { description: ${q}ok${q} },`,
      `    detection: { type: ${q}custom${q}, severity: ${q}${isHeuristicGate ? 'gate' : 'warn'}${q} },`,
      `    decisionCriteria: { when: ${q}fx${q}, exceptions: ${q}${q}, escalation: ${q}fx${q} },`,
      `    migrationRecipe: { steps: [${q}fx${q}] },`,
    ]
    if (includeSunset) parts.push(`    sunsetCondition: ${q}fx${q},`)
    if (includeProtectedHarm) parts.push(`    protectedHarm: { prevents: [${q}fx${q}] },`)
    parts.push(`  },`)
    return parts.join('\n')
  })
  return [
    '// fixture base-rules.ts',
    "import type { BaseRule } from '@/test/architectureRules/types'",
    '',
    'export const ARCHITECTURE_RULES: readonly BaseRule[] = [',
    ...rules,
    '] as const satisfies readonly BaseRule[]',
    '',
  ].join('\n')
}

/**
 * execution-overlay.ts のテンプレートを作成する。
 * 各 ruleId に対して fixNow を "now" / "debt" / "review" に分散させ、
 * reviewPolicy と lifecyclePolicy を付与する。
 * インデックス % 3 で fixNow を割り当てる:
 *   0 → now, 1 → debt, 2 → review
 */
function renderOverlay(ids: readonly string[], quote: "'" | '"', lastReviewedAt: string): string {
  const q = quote
  const fixNowFor = (i: number): 'now' | 'debt' | 'review' => {
    const m = i % 3
    if (m === 0) return 'now'
    if (m === 1) return 'debt'
    return 'review'
  }
  const entries = ids.map((id, idx) => {
    const fn = fixNowFor(idx)
    const lifecycleBlock =
      idx === 0
        ? `    lifecyclePolicy: {\n` +
          `      introducedAt: ${q}${lastReviewedAt}${q},\n` +
          `      observeForDays: 30,\n` +
          `      promoteIf: [${q}fx${q}],\n` +
          `      withdrawIf: [${q}fx${q}],\n` +
          `    },\n`
        : ''
    return (
      `  ${q}${id}${q}: {\n` +
      `    fixNow: ${q}${fn}${q},\n` +
      `    executionPlan: { effort: ${q}small${q}, priority: 1 },\n` +
      `    reviewPolicy: {\n` +
      `      owner: ${q}fx${q},\n` +
      `      lastReviewedAt: ${q}${lastReviewedAt}${q},\n` +
      `      reviewCadenceDays: 90,\n` +
      `    },\n` +
      lifecycleBlock +
      `  },`
    )
  })
  return [
    '// fixture execution-overlay.ts',
    'export const EXECUTION_OVERLAY = {',
    ...entries,
    '};',
    '',
  ].join('\n')
}

/**
 * fixture repo を tmpdir に構築する。
 *
 * 内容:
 * - CURRENT_PROJECT.md
 * - projects/<id>/config/project.json
 * - projects/<id>/aag/execution-overlay.ts
 * - app-domain/gross-profit/rule-catalog/base-rules.ts
 * - app/src/test/guards/sample.test.ts（file count 用）
 * - app/src/test/guardTagRegistry.ts（REVIEW_ONLY_TAGS 正規表現の対象）
 * - app/src/test/allowlists/architecture.ts（active-debt count 用、空）
 */
export function createFixture(options: FixtureOptions = {}): Fixture {
  const projectId = options.projectId ?? 'fx-project'
  const baseRuleIds = options.baseRuleIds ?? DEFAULT_BASE_RULE_IDS
  const quoteChar: "'" | '"' = options.quoteStyle === 'double' ? '"' : "'"

  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aag-fixture-'))

  const write = (rel: string, content: string): void => {
    const abs = path.join(repoRoot, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content, 'utf-8')
  }

  // Default fixture files
  const files: Record<string, string> = {
    'CURRENT_PROJECT.md': `# Current Project\n\nactive: ${projectId}\n`,
    [`projects/${projectId}/config/project.json`]: JSON.stringify(
      {
        projectId,
        title: `fixture ${projectId}`,
        overlayRoot: `projects/${projectId}/aag`,
        overlayEntry: `projects/${projectId}/aag/execution-overlay.ts`,
      },
      null,
      2,
    ),
    [`projects/${projectId}/aag/execution-overlay.ts`]: renderOverlay(
      baseRuleIds,
      quoteChar,
      '2026-04-01',
    ),
    'app-domain/gross-profit/rule-catalog/base-rules.ts': renderBaseRules(baseRuleIds, quoteChar),
    'app/src/test/guards/sample.test.ts': `// fixture guard`,
    'app/src/test/guardTagRegistry.ts': `export const REVIEW_ONLY_TAGS = ['C1', 'C4']\n`,
    'app/src/test/allowlists/architecture.ts': `// empty fixture\n`,
    'app/src/test/allowlists/complexity.ts': `// empty fixture\n`,
    'app/src/test/allowlists/responsibility.ts': `// empty fixture\n`,
    'app/src/test/allowlists/size.ts': `// empty fixture\n`,
    'app/src/test/allowlists/misc.ts': `// empty fixture\n`,
  }

  if (options.overrideFiles) {
    Object.assign(files, options.overrideFiles)
  }
  if (options.extraFiles) {
    Object.assign(files, options.extraFiles)
  }

  for (const [rel, content] of Object.entries(files)) {
    write(rel, content)
  }

  const cleanup = (): void => {
    try {
      fs.rmSync(repoRoot, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }

  return { repoRoot, projectId, cleanup }
}
