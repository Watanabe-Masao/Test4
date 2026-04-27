/**
 * FORMULA_REGISTRY — 算術基本・統計数学カテゴリ
 *
 * safeDivide, safeNumber（算術基本）と
 * 標準偏差, 相関, Z スコア, 移動平均など（統計数学）の公式定義。
 *
 * @responsibility R:unclassified
 */
import type { FormulaId, FormulaMeta } from '../models/Formula'

export const FORMULA_REGISTRY_CORE: Readonly<
  Record<
    Extract<
      FormulaId,
      | 'safeDivide'
      | 'safeNumber'
      | 'populationStdDev'
      | 'pearsonCorrelation'
      | 'cosineSimilarity'
      | 'zScore'
      | 'minMaxNormalize'
      | 'simpleMovingAverage'
      | 'weightedMovingAverage'
    >,
    FormulaMeta
  >
> = {
  // ═══════════════════════════════════════════════════════
  // 算術基本
  // ═══════════════════════════════════════════════════════

  safeDivide: {
    label: '安全除算',
    category: 'arithmetic',
    expression: 'a ÷ b （b=0 → fallback）',
    description:
      '分母がゼロの場合に NaN/Infinity を返さず、指定したフォールバック値（デフォルト0）を返す除算。' +
      '全ての比率計算の基盤となり、ゼロ除算バグを構造的に排除する。',
    usage:
      '粗利率・達成率・客単価・PI値など、分母が0になりうる全ての除算で使用。' +
      '直接の `/` 演算子の代わりに必ずこの関数を経由する。',
    inputs: [
      { name: 'numerator', label: '分子' },
      { name: 'denominator', label: '分母' },
      { name: 'fallback', label: 'フォールバック値（デフォルト0）' },
    ],
    implementedBy: 'safeDivide',
    module: 'utils',
  },

  safeNumber: {
    label: '安全数値変換',
    category: 'arithmetic',
    expression: 'unknown → number （null/undefined/NaN → 0）',
    description:
      '外部データ（CSV取込・localStorage）から読み込んだ値を安全に number へ変換する。' +
      'null/undefined/NaN は全て 0 に正規化される。',
    usage:
      'インフラ層からドメイン層へデータを渡す境界で使用。' +
      '取込データの欠損値を0として扱い、後続の計算でNaN汚染を防ぐ。',
    inputs: [{ name: 'n', label: '変換対象の値', source: '外部データ（CSV/localStorage）' }],
    implementedBy: 'safeNumber',
    module: 'utils',
  },

  // ═══════════════════════════════════════════════════════
  // 統計数学
  // ═══════════════════════════════════════════════════════

  populationStdDev: {
    label: '母標準偏差',
    category: 'statistics',
    expression: 'σ = √(Σ(xᵢ − μ)² / N)',
    description:
      '母集団の標準偏差。データ全体のばらつき（散布度）を測る。' +
      '平均からの二乗偏差の平均の平方根として計算する。',
    usage:
      '異常値検出（Z スコア算出の前段）、月末予測の信頼区間計算で使用。' +
      '日次売上のばらつきを定量化し、予測精度の指標となる。',
    inputs: [{ name: 'values', label: '数値配列', source: 'DailyRecord.totalSales（日次系列）' }],
    implementedBy: 'calculateStdDev',
    module: 'forecast',
  },

  pearsonCorrelation: {
    label: 'ピアソン相関係数',
    category: 'statistics',
    expression: 'r = Σ(xᵢ−x̄)(yᵢ−ȳ) / √(Σ(xᵢ−x̄)² × Σ(yᵢ−ȳ)²)',
    description:
      '2つの変数間の線形相関の強さと方向を -1〜+1 で表す。' +
      '+1 は完全正相関、-1 は完全負相関、0 は無相関を意味する。',
    usage:
      '売上と客数、売上と気温など指標間の関連性分析で使用。' +
      '相関行列ヒートマップの各セル値の算出に適用される。',
    inputs: [
      { name: 'xs', label: '系列X（数値配列）' },
      { name: 'ys', label: '系列Y（数値配列）' },
    ],
    implementedBy: 'pearsonCorrelation',
    module: 'algorithms/correlation',
  },

  cosineSimilarity: {
    label: 'コサイン類似度',
    category: 'statistics',
    expression: 'cos(θ) = (A·B) / (|A| × |B|)',
    description:
      '2つのベクトル間の角度に基づく類似度。0〜1（正規化後）で表し、' +
      '1 に近いほどパターンが類似していることを意味する。',
    usage:
      '店舗間の売上パターン類似度、曜日別売上パターンの比較で使用。' +
      '絶対値の大きさに影響されず、形状の類似性を評価する。',
    inputs: [
      { name: 'a', label: 'ベクトルA（数値配列）' },
      { name: 'b', label: 'ベクトルB（数値配列）' },
    ],
    implementedBy: 'cosineSimilarity',
    module: 'algorithms/correlation',
  },

  zScore: {
    label: 'Z スコア',
    category: 'statistics',
    expression: 'z = (x − μ) / σ',
    description:
      '各データ点が平均から標準偏差何個分離れているかを表す標準化スコア。' +
      '|z| > 2 は通常、統計的に有意な外れ値とみなされる。',
    usage:
      '日次売上の異常値検出（detectAnomalies）で使用。' +
      '平均±2σ を超える日を自動フラグし、調査対象として提示する。',
    inputs: [{ name: 'values', label: '数値配列', source: 'DailyRecord.totalSales（日次系列）' }],
    implementedBy: 'calculateZScores',
    module: 'algorithms/correlation',
  },

  minMaxNormalize: {
    label: 'Min-Max 正規化',
    category: 'statistics',
    expression: '(x − min) / (max − min) × 100',
    description:
      'データ系列を 0〜100 のスケールに正規化する。' +
      '異なるスケールの指標を同一チャート上で比較可能にする。',
    usage:
      '乖離検出（detectDivergence）の前処理として使用。' +
      '売上と客数など単位の異なる系列を同一スケールに揃え、乖離度を計算する。',
    inputs: [{ name: 'values', label: '数値配列' }],
    implementedBy: 'normalizeMinMax',
    module: 'algorithms/correlation',
  },

  simpleMovingAverage: {
    label: '単純移動平均',
    category: 'statistics',
    expression: 'SMA_k = Σ(x_{i−k+1}…x_i) / k',
    description:
      '直近 k 個のデータ点の算術平均。短期的なノイズを平滑化し、' +
      'トレンドの方向性を視覚的に把握しやすくする。',
    usage:
      '日次売上チャートのトレンドライン表示、週次集計の平滑化で使用。' +
      'ウィンドウサイズ 7（週間）や 30（月間）が一般的。',
    inputs: [
      { name: 'values', label: '数値配列', source: 'DailyRecord.totalSales（日次系列）' },
      { name: 'window', label: 'ウィンドウサイズ' },
    ],
    implementedBy: 'calculateMovingAverage',
    module: 'utils',
  },

  weightedMovingAverage: {
    label: '加重移動平均',
    category: 'statistics',
    expression: 'WMA = Σ(wᵢ × xᵢ) / Σwᵢ （wᵢ = i, 線形増加）',
    description:
      '直近のデータほど大きな重みを付与する移動平均。' +
      '単純移動平均より最近のトレンド変化に敏感に反応する。',
    usage: '月末予測の3手法の1つとして使用。' + '直近の売上傾向を重視した短期予測値を算出する。',
    inputs: [
      { name: 'dailySales', label: '日次売上配列', source: 'DailyRecord.totalSales（日次系列）' },
      { name: 'window', label: 'ウィンドウサイズ（デフォルト5）' },
    ],
    implementedBy: 'calculateWMA',
    module: 'algorithms/advancedForecast',
  },
} as const
