/**
 * domain/calculations/ 正本化分類レジストリ
 *
 * 全ファイルを「必須」「検討」「不要」に分類し、
 * 未分類のファイルが存在しないことをガードテストで保証する。
 *
 * 新規ファイルを domain/calculations/ に追加する場合は、
 * 必ずこのレジストリに登録すること。
 *
 * @see references/01-principles/calculation-canonicalization-map.md
 */

export type CanonTag = 'required' | 'review' | 'not-needed'

export interface CanonEntry {
  readonly tag: CanonTag
  readonly reason: string
  /** Zod 契約が追加済みか */
  readonly zodAdded: boolean
}

/**
 * domain/calculations/ の全ファイルの正本化分類。
 *
 * キー: domain/calculations/ からの相対パス（例: 'invMethod.ts'）
 * バレル（index.ts 等）も含む。
 */
export const CALCULATION_CANON_REGISTRY: Readonly<Record<string, CanonEntry>> = {
  // ── 必須: 正本化済み（readModel or Zod 契約あり） ──
  'invMethod.ts': {
    tag: 'required',
    reason: '在庫法粗利（calculateGrossProfit 経由）',
    zodAdded: true,
  },
  'estMethod.ts': {
    tag: 'required',
    reason: '推定法マージン（calculateGrossProfit 経由）',
    zodAdded: true,
  },
  'budgetAnalysis.ts': {
    tag: 'required',
    reason: '予算分析（StoreResult 統一済み）',
    zodAdded: true,
  },
  'factorDecomposition.ts': {
    tag: 'required',
    reason: 'シャープリー値分解（calculateFactorDecomposition）',
    zodAdded: true,
  },
  'discountImpact.ts': { tag: 'required', reason: '売変ロス原価', zodAdded: true },
  'costAggregation.ts': { tag: 'required', reason: '移動合計・在庫仕入原価', zodAdded: true },
  'markupRate.ts': { tag: 'required', reason: '値入率', zodAdded: true },
  'remainingBudgetRate.ts': { tag: 'required', reason: '残予算必要達成率', zodAdded: true },
  'inventoryCalc.ts': { tag: 'required', reason: '日別推定在庫推移', zodAdded: true },
  'observationPeriod.ts': { tag: 'required', reason: '観測期間ステータス', zodAdded: true },
  'pinIntervals.ts': { tag: 'required', reason: '在庫確定区間の粗利', zodAdded: true },

  // ── 検討: Zod 入出力契約の追加を検討 ──
  'timeSlotCalculations.ts': {
    tag: 'review',
    reason: 'コアタイム・ターンアラウンド',
    zodAdded: false,
  },
  'algorithms/advancedForecast.ts': {
    tag: 'review',
    reason: 'WMA・回帰・天気調整予測',
    zodAdded: false,
  },
  'algorithms/sensitivity.ts': { tag: 'review', reason: 'What-if 分析', zodAdded: false },
  'algorithms/trendAnalysis.ts': { tag: 'review', reason: 'MoM/YoY/トレンド', zodAdded: false },
  'algorithms/correlation.ts': { tag: 'review', reason: '相関・類似度', zodAdded: false },
  'forecast.ts': { tag: 'review', reason: '週次サマリー・異常値検出', zodAdded: false },
  'dowGapAnalysis.ts': { tag: 'review', reason: '曜日ギャップ分析', zodAdded: false },
  'dowGapActualDay.ts': { tag: 'review', reason: '実日数マッピング', zodAdded: false },
  'temporal/computeMovingAverage.ts': { tag: 'review', reason: '移動平均', zodAdded: false },

  // ── 不要: プリミティブ・ユーティリティ・バレル ──
  'utils.ts': { tag: 'not-needed', reason: 'safeDivide 等のプリミティブ', zodAdded: false },
  'divisor.ts': { tag: 'not-needed', reason: '除数計算ユーティリティ', zodAdded: false },
  'averageDivisor.ts': { tag: 'not-needed', reason: '平均除数ユーティリティ', zodAdded: false },
  'aggregation.ts': { tag: 'not-needed', reason: '多店舗集約ユーティリティ', zodAdded: false },
  'rawAggregation/statisticalFunctions.ts': {
    tag: 'not-needed',
    reason: '標準偏差/Z-score',
    zodAdded: false,
  },
  'dowGapStatistics.ts': { tag: 'not-needed', reason: 'dowGap 内部ヘルパー', zodAdded: false },
  'decomposition.ts': { tag: 'not-needed', reason: 're-export モジュール', zodAdded: false },
  'factorDecompositionDto.ts': {
    tag: 'not-needed',
    reason: '型定義のみ（Rust FFI）',
    zodAdded: false,
  },
  'grossProfit.ts': { tag: 'not-needed', reason: 'バレルエクスポート', zodAdded: false },
  'index.ts': { tag: 'not-needed', reason: 'バレルエクスポート', zodAdded: false },
  'forecast.barrel.ts': { tag: 'not-needed', reason: 'バレルエクスポート', zodAdded: false },
  'algorithms/index.ts': { tag: 'not-needed', reason: 'バレルエクスポート', zodAdded: false },
  'temporal/index.ts': { tag: 'not-needed', reason: 'バレルエクスポート', zodAdded: false },
} as const
