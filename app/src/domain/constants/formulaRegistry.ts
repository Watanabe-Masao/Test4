/**
 * FORMULA_REGISTRY — 登録済み数学公式レジストリ
 *
 * 全ての計算ロジックはこのレジストリに登録された公式のみ使用可能。
 * CI テストが FORMULA_REGISTRY とコードの整合を検証する。
 *
 * 不変条件:
 *   - domain/calculations/ 内の全 export 関数はいずれかの FormulaId に紐づく
 *   - 未登録の除算（raw `/`）は統計プリミティブ内のみ許容
 *   - METRIC_DEFS の各指標は formulaRef で本レジストリを参照する
 *
 * inputs（接点ルール）:
 *   各公式の入力パラメータに対して source を定義する。
 *   「売上という係数が存在するなら、売上はここから取得する」
 *   というバインディングルールにより、データの取り違えを構造的に防ぐ。
 *
 *   source の表記規約:
 *     - 'StoreResult.fieldName' — 計算済み店舗結果
 *     - 'InventoryConfig.fieldName' — 棚卸設定
 *     - 'BudgetData.fieldName' — 予算データ
 *     - 'CTS.fieldName' — CategoryTimeSalesRecord 集約値
 *     - 'DailyRecord.fieldName' — 日次レコード
 *     - '(引数)' — 呼び出し側が動的に決定（汎用公式）
 */
import type { FormulaId, FormulaMeta } from '../models/Formula'

export const FORMULA_REGISTRY: Readonly<Record<FormulaId, FormulaMeta>> = {
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

  // ═══════════════════════════════════════════════════════
  // 要因分解（シャープリー値）
  // ═══════════════════════════════════════════════════════

  shapley2Factor: {
    label: '2要素シャープリー分解',
    category: 'decomposition',
    expression: 'S=C×T → φ_C = ΔC × ½(T₀+T₁), φ_T = ΔT × ½(C₀+C₁)',
    description:
      '売上差（ΔS）を客数効果（φ_C）と客単価効果（φ_T）の2要素に分解する。' +
      'シャープリー値により、交差項を公平に分配し、φ_C + φ_T = ΔS が厳密に成立する。',
    usage:
      'ウォーターフォールチャートの基本ビュー（客数・客単価分解）で使用。' +
      '点数データがない場合のフォールバック分解としても機能する。',
    inputs: [
      { name: 'prevSales', label: '前年売上', source: 'StoreResult.totalSales（前年）' },
      { name: 'curSales', label: '当年売上', source: 'StoreResult.totalSales（当年）' },
      { name: 'prevCust', label: '前年客数', source: 'StoreResult.totalCustomers（前年）' },
      { name: 'curCust', label: '当年客数', source: 'StoreResult.totalCustomers（当年）' },
    ],
    implementedBy: 'decompose2',
    module: 'factorDecomposition',
  },

  shapley3Factor: {
    label: '3要素シャープリー分解',
    category: 'decomposition',
    expression: 'S=C×Q×P̄ → weights (2,1,1,2)/6 の完全シャープリー値',
    description:
      '売上差を客数効果・点数効果（PI値変動）・単価効果（点単価変動）の3要素に分解する。' +
      '3変数のシャープリー値は 24通りの順列の平均を重み (2,1,1,2)/6 で効率計算する。' +
      '不変条件: φ_C + φ_Q + φ_P̄ = ΔS',
    usage:
      'ウォーターフォールチャートの3要素ビュー（客数・点数・単価）で使用。' +
      'CTS（部門別時間帯売上）データから総点数が取得可能な場合に適用。',
    inputs: [
      { name: 'prevSales', label: '前年売上', source: 'StoreResult.totalSales（前年）' },
      { name: 'curSales', label: '当年売上', source: 'StoreResult.totalSales（当年）' },
      { name: 'prevCust', label: '前年客数', source: 'StoreResult.totalCustomers（前年）' },
      { name: 'curCust', label: '当年客数', source: 'StoreResult.totalCustomers（当年）' },
      { name: 'prevTotalQty', label: '前年総点数', source: 'CTS.totalQuantity（前年合計）' },
      { name: 'curTotalQty', label: '当年総点数', source: 'CTS.totalQuantity（当年合計）' },
    ],
    implementedBy: 'decompose3',
    module: 'factorDecomposition',
  },

  shapleyPriceMix: {
    label: '価格/構成比シャープリー分解',
    category: 'decomposition',
    expression: 'φ_price = ½[Σ(Δpᵢ)s₀ᵢ + Σ(Δpᵢ)s₁ᵢ], φ_mix = ½[Σp₀ᵢ(Δsᵢ) + Σp₁ᵢ(Δsᵢ)]',
    description:
      '平均単価の変動を「各カテゴリの単価変化（価格効果）」と' +
      '「カテゴリ構成比の変化（ミックス効果）」に分離する。' +
      '部門別の単価 pᵢ と数量シェア sᵢ をシャープリー値で公平分配する。',
    usage:
      'decompose5 の内部で呼ばれ、decompose3 の単価効果をさらに2分割する。' +
      '「単品が高くなったのか、高い商品の比率が増えたのか」を区別するために使用。',
    inputs: [
      {
        name: 'curCategories',
        label: '当年カテゴリ別数量・金額',
        source: 'CTS → CategoryQtyAmt[]（当年）',
      },
      {
        name: 'prevCategories',
        label: '前年カテゴリ別数量・金額',
        source: 'CTS → CategoryQtyAmt[]（前年）',
      },
    ],
    implementedBy: 'decomposePriceMix',
    module: 'factorDecomposition',
  },

  shapley5Factor: {
    label: '5要素複合分解',
    category: 'decomposition',
    expression: 'decompose3 + priceMix → 客数/点数/価格/構成比 の4効果',
    description:
      'decompose3（3要素）の単価効果を shapleyPriceMix で価格効果と構成比効果に分割し、' +
      '合計4つの独立した効果を算出する複合分解。' +
      '不変条件: φ_C + φ_Q + φ_price + φ_mix = ΔS',
    usage:
      'ウォーターフォールチャートの5要素ビュー（最詳細）で使用。' +
      '部門別CTSデータが前年・当年の両方で揃っている場合のみ適用可能。',
    inputs: [
      { name: 'prevSales', label: '前年売上', source: 'StoreResult.totalSales（前年）' },
      { name: 'curSales', label: '当年売上', source: 'StoreResult.totalSales（当年）' },
      { name: 'prevCust', label: '前年客数', source: 'StoreResult.totalCustomers（前年）' },
      { name: 'curCust', label: '当年客数', source: 'StoreResult.totalCustomers（当年）' },
      { name: 'prevTotalQty', label: '前年総点数', source: 'CTS.totalQuantity（前年合計）' },
      { name: 'curTotalQty', label: '当年総点数', source: 'CTS.totalQuantity（当年合計）' },
      {
        name: 'curCategories',
        label: '当年カテゴリ別数量・金額',
        source: 'CTS → CategoryQtyAmt[]（当年）',
      },
      {
        name: 'prevCategories',
        label: '前年カテゴリ別数量・金額',
        source: 'CTS → CategoryQtyAmt[]（前年）',
      },
    ],
    implementedBy: 'decompose5',
    module: 'factorDecomposition',
  },

  // ═══════════════════════════════════════════════════════
  // 回帰・予測
  // ═══════════════════════════════════════════════════════

  olsLinearRegression: {
    label: '最小二乗法線形回帰',
    category: 'regression',
    expression: 'slope = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²), R² = 1 − SS_res/SS_tot',
    description:
      '日次売上データに最もフィットする直線 y = slope×x + intercept を求める。' +
      '残差二乗和を最小化するOLS法で傾き・切片・決定係数R²を算出する。',
    usage:
      '月末予測の3手法の1つとして使用。' +
      '傾き（slope）から日次の増減トレンドを定量化し、残日数分を外挿して月末売上を予測する。',
    inputs: [
      { name: 'dailySales', label: '日次売上配列', source: 'DailyRecord.totalSales（日次系列）' },
    ],
    implementedBy: 'linearRegression',
    module: 'algorithms/advancedForecast',
  },

  monthEndProjection: {
    label: '月末予測（複合法）',
    category: 'regression',
    expression: '(線形外挿 + WMA + 回帰) / 3 ± z₉₅ × (σ/√n) × 残日数',
    description:
      '3つの独立した予測手法（日平均線形外挿・WMA・回帰）の平均を最良推定値とする。' +
      '95%信頼区間を付与し、予測の不確実性を定量的に表現する。',
    usage:
      '予算達成率の着地予測（projectedSales, projectedAchievement）の算出で使用。' +
      'ダッシュボードの月末予測カード・予算進捗チャートに表示される。',
    inputs: [
      { name: 'year', label: '年' },
      { name: 'month', label: '月' },
      { name: 'dailySales', label: '日次売上配列', source: 'DailyRecord.totalSales（日次系列）' },
    ],
    implementedBy: 'calculateMonthEndProjection',
    module: 'algorithms/advancedForecast',
  },

  // ═══════════════════════════════════════════════════════
  // 会計計算
  // ═══════════════════════════════════════════════════════

  inventoryMethodCogs: {
    label: '在庫法売上原価',
    category: 'accounting',
    expression: '売上原価 = 期首在庫 + 仕入原価 − 期末在庫',
    description:
      '実地棚卸に基づく売上原価の確定計算。期首在庫原価に当期仕入原価を加え、' +
      '期末在庫原価を差し引くことで、販売に消費された原価を逆算する。' +
      '実績値のため推定法より信頼性が高い。',
    usage:
      '月次の粗利計算（在庫法 = 実績粗利）で使用。' +
      '棚卸データ（期首・期末）が存在する場合に適用され、推定法に優先する。',
    inputs: [
      {
        name: 'openingInventory',
        label: '期首在庫原価',
        source: 'InventoryConfig.openingInventory',
      },
      { name: 'purchaseCost', label: '仕入原価', source: 'StoreResult.inventoryCost' },
      {
        name: 'closingInventory',
        label: '期末在庫原価',
        source: 'InventoryConfig.closingInventory',
      },
      { name: 'totalSales', label: '総売上', source: 'StoreResult.totalSales' },
    ],
    implementedBy: 'calculateInvMethod',
    module: 'invMethod',
  },

  estimationMethodCogs: {
    label: '推定法売上原価',
    category: 'accounting',
    expression: '総売上 = コア売上/(1−売変率), 推定原価 = 総売上×(1−値入率) + 消耗品',
    description:
      '棚卸データがない場合に値入率から売上原価を推定する計算。' +
      '売変率で粗売上を復元し、値入率の逆数で原価率を算出する。' +
      '推定値のため在庫法が利用可能な場合はそちらを優先する。',
    usage:
      '日次の推定粗利計算で使用。棚卸前の速報値として、' +
      '日々の粗利状況のモニタリングに活用される。期末在庫の推定にも使用。',
    inputs: [
      { name: 'coreSales', label: 'コア売上', source: 'StoreResult.totalCoreSales' },
      { name: 'discountRate', label: '売変率', source: 'StoreResult.discountRate' },
      { name: 'markupRate', label: '値入率', source: 'StoreResult.averageMarkupRate' },
      { name: 'costInclusionCost', label: '原価算入費', source: 'StoreResult.totalCostInclusion' },
      {
        name: 'openingInventory',
        label: '期首在庫原価',
        source: 'InventoryConfig.openingInventory',
      },
      { name: 'purchaseCost', label: '仕入原価', source: 'StoreResult.inventoryCost' },
    ],
    implementedBy: 'calculateEstMethod',
    module: 'estMethod',
  },

  discountLossCost: {
    label: '売変影響額',
    category: 'accounting',
    expression: '(1−値入率) × コア売上 × 売変率/(1−売変率)',
    description:
      '値引き（売変）による粗利へのマイナス影響額を算出する。' +
      '売変によって失われた粗利を原価ベースで定量化し、' +
      '値引き戦略の収益性評価に使用する。',
    usage:
      '売変影響分析で使用。因果チェーン分析の売変ステップで、' +
      '各売変タイプ（71見切り〜74値下げ）がもたらした粗利減少額を表示する。',
    inputs: [
      { name: 'coreSales', label: 'コア売上', source: 'StoreResult.totalCoreSales' },
      { name: 'markupRate', label: '値入率', source: 'StoreResult.averageMarkupRate' },
      { name: 'discountRate', label: '売変率', source: 'StoreResult.discountRate' },
    ],
    implementedBy: 'calculateDiscountImpact',
    module: 'discountImpact',
  },

  // ═══════════════════════════════════════════════════════
  // 比率・集計
  // ═══════════════════════════════════════════════════════

  ratioCalculation: {
    label: '汎用比率計算',
    category: 'ratio',
    expression: 'A / B → safeDivide(A, B, fallback)',
    description:
      '2つの値の比率を安全に算出する汎用パターン。' +
      '内部で safeDivide を使用し、分母ゼロ時はフォールバック値を返す。' +
      '達成率・粗利率・客単価など、A÷Bの形式の全指標に適用。',
    usage:
      'METRIC_DEFS で formulaRef: "ratioCalculation" として参照される最多パターン。' +
      '予算達成率、売変率、粗利率、日平均売上、客単価、PI値、点単価など。',
    inputs: [
      { name: 'numerator', label: '分子（具体的な source は MetricMeta 側で決定）' },
      { name: 'denominator', label: '分母（具体的な source は MetricMeta 側で決定）' },
    ],
    implementedBy: 'safeDivide',
    module: 'utils',
  },

  salesWeightedAverage: {
    label: '売上加重平均',
    category: 'ratio',
    expression: 'Σ(rateᵢ × salesᵢ) / Σsalesᵢ',
    description:
      '各店舗の率指標を売上高で重み付けして平均する。' +
      '売上の大きい店舗の率がより大きく全体平均に反映される。' +
      '単純平均より実態に即した全店平均値を算出する。',
    usage:
      '全店集計での平均値入率・平均粗利率の計算で使用。' +
      '小規模店舗の極端な率に引きずられない、売上規模を考慮した平均値を提供する。',
    inputs: [
      { name: 'stores', label: '店舗結果配列', source: 'StoreResult[]' },
      { name: 'rateGetter', label: '率取得関数（例: r => r.averageMarkupRate）' },
      { name: 'salesGetter', label: '売上取得関数（例: r => r.totalSales）' },
    ],
    implementedBy: 'weightedAverageBySales',
    module: 'aggregation',
  },

  seasonalIndex: {
    label: '季節指数',
    category: 'ratio',
    expression: '月平均売上 / 全体月平均',
    description:
      '各月の売上水準を年間平均に対する比率で表す。' +
      '1.0 を超える月は平均より好調、下回る月は閑散期を意味する。' +
      '季節変動パターンの定量化に使用する。',
    usage:
      'トレンド分析（analyzeTrend）内の季節性検出で使用。' +
      '月別の売上傾向を可視化し、前年同月比較の文脈を補足する。',
    inputs: [
      {
        name: 'dataPoints',
        label: '月別売上データ配列',
        source: 'MonthlyDataPoint[]（年月+売上）',
      },
    ],
    implementedBy: 'analyzeTrend',
    module: 'algorithms/trendAnalysis',
  },
} as const
