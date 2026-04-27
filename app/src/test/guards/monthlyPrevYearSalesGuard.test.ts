/**
 * @responsibility R:unclassified
 */

// monthlyPrevYearSalesGuard — 「月間」ラベルで期間スコープ値の混入を機械検出する
//
// `ConditionSummaryEnhanced` ヘッダー「月間前年売上」や予算達成シミュレーター
// 「前年合計 (月)」など **月間粒度** のラベル配下で、取り込み期間キャップされた
// 期間スコープ値 (`FreePeriodReadModel.comparisonSummary.totalSales` /
// `prevYear.totalSales` 等) が使われる回帰を禁止する。
//
// ## 背景
//
// 「月間」ラベルと「期間」(= 取り込み期間) スコープを混同すると、下チャート
// の前年データ読込で `comparisonSummary` が ready になった瞬間に
// ヘッダーの値が月全体 → elapsed 日合計に切り替わる silent regression が
// 発生する。型では区別できないため、月間ラベル配下のファイルを allowlist で
// 固定し、期間スコープ値の import / 読み出しを機械的に禁止する。
//
// ## 監視対象ファイル (月間ラベルで値を確定する場所)
//
//   - presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx
//     (ヘッダー「月間前年売上」「予算前年比」)
//   - presentation/pages/Dashboard/widgets/conditionSummaryCardBuilders.ts
//     (buildBudgetHeader 実装)
//   - features/budget/application/buildBudgetSimulatorScenario.ts
//     (予算シミュレーター「前年合計 (月)」= extractFullMonthLyDaily)
//
// ## 禁止パターン (コメントを除いた本体コードで検出)
//
//   - `selectPrevYearSummaryFromFreePeriod` — 期間スコープ射影 selector
//   - `preferFreePeriodPrevYearSummary` — 期間スコープ優先 composer
//   - `comparisonSummary.totalSales` — freePeriod 経由の期間合計
//   - `prevYearMonthlyKpi.monthlyTotal.sales` / `prevYearMonthlyKpi.sameDow.sales`
//     — selector を経由しないバラ参照。必ず `selectMonthlyPrevYearSales` 経由にする
//
// 注: `prevYear.totalSales` は period-scoped YoY カード等で正当に使用されるため
// 広域監視対象にはしない (PrevYearData の period scope は期間比較系の正しい用途)。
//
// ## 必須パターン
//
//   - `selectMonthlyPrevYearSales` を実 import している
//
// ## 回避が必要になったら
//
// ここで例外を増やすのではなく、新しい「月間」用 selector を
// `application/readModels/prevYear/` に追加して allowlist を更新する。
// 「期間」スコープが必要な用途は別 widget (`ExecSummaryBarWidget` 等) で扱う。
//
// @see app/src/application/readModels/prevYear/selectMonthlyPrevYearSales.ts
// @see features/comparison/application/comparisonTypes.ts `PrevYearMonthlyTotal`
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '../..')

interface GuardEntry {
  readonly path: string
  readonly reason: string
  /** selector を直接 import する場所 (builder / hook 本体) か、facade (widget) か。
   *  facade は delegation するため selector import は要求せず、禁止パターン検出のみ行う */
  readonly role: 'compute' | 'facade'
}

const MONTHLY_LABEL_FILES: readonly GuardEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx',
    reason: 'ヘッダー「月間前年売上」「予算前年比」— buildBudgetHeader 経由の facade',
    role: 'facade',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/conditionSummaryCardBuilders.ts',
    reason: 'buildBudgetHeader は月間固定の予算コンテキストを構築する',
    role: 'compute',
  },
  {
    path: 'features/budget/application/buildBudgetSimulatorScenario.ts',
    reason:
      '予算達成シミュレーターの「前年合計 (月)」/「前年比」は月全体を対象とする (extractFullMonthLyDaily)',
    role: 'compute',
  },
]

const FORBIDDEN_PERIOD_SCOPE_PATTERNS: readonly {
  readonly pattern: RegExp
  readonly label: string
}[] = [
  {
    pattern: /\bselectPrevYearSummaryFromFreePeriod\b/g,
    label: 'selectPrevYearSummaryFromFreePeriod (期間スコープ射影)',
  },
  {
    pattern: /\bpreferFreePeriodPrevYearSummary\b/g,
    label: 'preferFreePeriodPrevYearSummary (期間スコープ優先 composer)',
  },
  {
    pattern: /\bcomparisonSummary\.totalSales\b/g,
    label: 'comparisonSummary.totalSales (freePeriod 期間合計)',
  },
  {
    pattern: /\bprevYearMonthlyKpi\.monthlyTotal\.sales\b/g,
    label: 'prevYearMonthlyKpi.monthlyTotal.sales (selector 未経由のバラ参照)',
  },
  {
    pattern: /\bprevYearMonthlyKpi\.sameDow\.sales\b/g,
    label: 'prevYearMonthlyKpi.sameDow.sales (selector 未経由のバラ参照)',
  },
]

const REQUIRED_SELECTOR_IMPORT =
  /import\s+(?:type\s+)?\{[^}]*\bselectMonthlyPrevYearSales\b[^}]*\}\s+from\s+['"][^'"]+['"]/m

function readIfExists(rel: string): string | null {
  const abs = path.join(SRC_DIR, rel)
  if (!fs.existsSync(abs)) return null
  return fs.readFileSync(abs, 'utf-8')
}

/** block / line comment を取り除いた本体コードを返す (禁止パターン検出用) */
function stripComments(src: string): string {
  // block comment /* ... */ (multiline)
  const withoutBlock = src.replace(/\/\*[\s\S]*?\*\//g, '')
  // line comment // ... (行末まで)
  return withoutBlock.replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1')
}

describe('monthlyPrevYearSalesGuard', () => {
  it('月間ラベル配下で期間スコープ値の import / 参照が存在しない', () => {
    const violations: string[] = []

    for (const entry of MONTHLY_LABEL_FILES) {
      const content = readIfExists(entry.path)
      if (content == null) {
        violations.push(`${entry.path}: 監視対象ファイルが存在しない`)
        continue
      }
      const body = stripComments(content)
      for (const { pattern, label } of FORBIDDEN_PERIOD_SCOPE_PATTERNS) {
        const matches = body.match(pattern)
        if (matches && matches.length > 0) {
          violations.push(`${entry.path}: 禁止パターン "${label}" を ${matches.length} 箇所で検出`)
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[monthlyPrevYearSalesGuard] 月間ラベル配下で期間スコープ値が検出されました:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  月間ラベル (「月間前年売上」「予算前年比」「前年合計 (月)」等) は',
            '  必ず selectMonthlyPrevYearSales 経由で値を取得してください',
            '  (取り込み期間キャップを受けない月全体の値が得られます)。',
            '',
            '  期間スコープ値 (selectPrevYearSummaryFromFreePeriod /',
            '  comparisonSummary.totalSales / prevYear.totalSales) は',
            '  期間比較用 widget (ExecSummaryBarWidget 等) でのみ使用可能です。',
            '',
            '詳細: app/src/application/readModels/prevYear/selectMonthlyPrevYearSales.ts',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('compute role のファイルは selectMonthlyPrevYearSales を実 import している', () => {
    const missing: string[] = []

    for (const entry of MONTHLY_LABEL_FILES) {
      if (entry.role !== 'compute') continue
      const content = readIfExists(entry.path)
      if (content == null) {
        missing.push(`${entry.path}: ファイルが存在しない`)
        continue
      }
      if (!REQUIRED_SELECTOR_IMPORT.test(content)) {
        missing.push(`${entry.path}: selectMonthlyPrevYearSales を import していない`)
      }
    }

    expect(
      missing,
      missing.length > 0
        ? [
            '[monthlyPrevYearSalesGuard] 月間ラベル配下で必須 selector が未 import:',
            ...missing.map((v) => '  - ' + v),
            '',
            '解決方法:',
            "  import { selectMonthlyPrevYearSales } from '@/application/readModels/prevYear'",
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('selectMonthlyPrevYearSales selector ファイルが存在する', () => {
    const selectorFile = path.join(
      SRC_DIR,
      'application/readModels/prevYear/selectMonthlyPrevYearSales.ts',
    )
    expect(fs.existsSync(selectorFile)).toBe(true)
    const content = fs.readFileSync(selectorFile, 'utf-8')
    expect(content).toContain('export function selectMonthlyPrevYearSales')
    expect(content).toContain('MonthlyPrevYearSalesProjection')
  })
})
