/**
 * FORMULA_REGISTRY 型定義
 *
 * 全ての計算は登録済み公式のみ使用可能とする2層レジストリの基盤。
 *
 *   Layer 1: FORMULA_REGISTRY — 数学プリミティブ（本ファイルで型定義）
 *   Layer 2: METRIC_DEFS — ビジネス指標（既存の MetricMeta）
 *
 * METRIC_DEFS の各指標は formulaRef で FORMULA_REGISTRY を参照し、
 * CI テストが「未登録の計算ロジック」を検出・排除する。
 *
 * @responsibility R:unclassified
 */

// ─── FormulaCategory ────────────────────────────────────

/** 公式の分類カテゴリ */
export type FormulaCategory =
  | 'arithmetic' // 算術基本（safeDivide, safeNumber）
  | 'statistics' // 統計数学（stdDev, pearsonR, zScore, cosine）
  | 'decomposition' // 要因分解（シャープリー値）
  | 'regression' // 回帰・予測（OLS, WMA, SMA）
  | 'accounting' // 会計計算（在庫法, 推定法）
  | 'ratio' // 比率・集計（加重平均, 季節指数）

// ─── FormulaId ──────────────────────────────────────────

/** 登録済み公式ID */
export type FormulaId =
  // ── 算術基本 ──
  | 'safeDivide' // a / b (zero-safe, fallback)
  | 'safeNumber' // unknown → number (NaN → 0)

  // ── 統計数学 ──
  | 'populationStdDev' // σ = √(Σ(xᵢ−μ)²/N)
  | 'pearsonCorrelation' // r = cov(X,Y) / (σ_X × σ_Y)
  | 'cosineSimilarity' // cos(θ) = (A·B) / (|A|×|B|)
  | 'zScore' // z = (x − μ) / σ
  | 'minMaxNormalize' // (x − min) / (max − min) × 100
  | 'simpleMovingAverage' // SMA_k = Σ(x_{i−k+1}…x_i) / k
  | 'weightedMovingAverage' // WMA = Σ(wᵢ × xᵢ) / Σwᵢ

  // ── 要因分解（シャープリー値） ──
  | 'shapley2Factor' // φᵢ = Δxᵢ × ½(f₀+f₁)
  | 'shapley3Factor' // S=C×Q×P̄, weights (2,1,1,2)/6
  | 'shapleyPriceMix' // Price/Mix Shapley split
  | 'shapley5Factor' // Composite: 3-factor + price/mix

  // ── 回帰・予測 ──
  | 'olsLinearRegression' // y = slope×x + intercept
  | 'monthEndProjection' // Multi-method composite projection

  // ── 会計計算 ──
  | 'inventoryMethodCogs' // COGS = 期首 + 仕入 − 期末
  | 'estimationMethodCogs' // 総売上/(1−売変率) → 推定COGS
  | 'discountLossCost' // 売変影響額: (1−markup)×core×(disc/(1−disc))

  // ── 比率・集計 ──
  | 'ratioCalculation' // A/B → safeDivide (汎用比率)
  | 'salesWeightedAverage' // Σ(rateᵢ×salesᵢ) / Σsalesᵢ
  | 'seasonalIndex' // 月平均 / 全体平均

// ─── FormulaInput ───────────────────────────────────────

/**
 * 公式の入力パラメータ定義
 *
 * 各公式が「何を入力として受け取るか」を明示する。
 * source フィールドで権威的データソースを指定し、
 * 「売上は必ず StoreResult.totalSales から取得する」
 * というバインディングルールを定義する。
 *
 * 汎用公式（ratioCalculation 等）の場合は source を省略し、
 * 個別の MetricMeta 側で具体的なバインディングを記述する。
 */
export interface FormulaInput {
  /** パラメータ名（実装関数の引数名に対応） */
  readonly name: string
  /** パラメータの意味（日本語） */
  readonly label: string
  /** 権威的データソース（例: 'StoreResult.totalSales'）。汎用公式では省略可 */
  readonly source?: string
}

// ─── FormulaMeta ────────────────────────────────────────

/** 公式のメタデータ */
export interface FormulaMeta {
  /** 日本語名称 */
  readonly label: string
  /** 分類カテゴリ */
  readonly category: FormulaCategory
  /** 数学的表記（人間可読） */
  readonly expression: string
  /** この公式が何を計算するのか（意味・定義） */
  readonly description: string
  /** どのような場面で使われるか（用途・適用先） */
  readonly usage: string
  /** 入力パラメータ定義（接点ルール） */
  readonly inputs: readonly FormulaInput[]
  /** 実装関数名（CI 検証用） */
  readonly implementedBy: string
  /** 実装モジュール（domain/calculations/ からの相対パス） */
  readonly module: string
}
