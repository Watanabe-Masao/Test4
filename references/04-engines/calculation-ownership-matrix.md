# 計算関数オーナーシップ表

Issue-1: 各計算関数の責務・実装先・権威性を一覧化し、新規実装時の配置基準を固定する。

## 分類基準

| 役割 | 定義 | 配置先 |
|---|---|---|
| **authoritative-metric** | 正式な業務確定値を導く計算 | TS domain（将来 Rust/WASM 移行候補含む） |
| **aggregate-source** | 明細からの前段集約・素材生成 | TS → 将来 DuckDB/SQL 移行候補 |
| **math-kernel** | 高反復・純粋数理計算 | Rust/WASM（TS fallback 維持） |
| **utility** | 汎用ヘルパー（除算安全化、フォーマット等） | TS domain |
| **orchestration** | 結果の組み立て・採用判断 | TS application |

| 権威性 | 定義 |
|---|---|
| **authoritative** | この関数が返す値が正式値 |
| **exploratory** | 探索・可視化用途（正式値ではない） |
| **derived** | 他の authoritative 値から導出 |
| **infrastructure** | 計算基盤（直接の業務値ではない） |

---

## オーナーシップ表

### 1. 粗利計算系 — authoritative-metric / TS → Rust 候補

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `invMethod.ts` | `calculateInvMethod` | authoritative-metric | TS → Rust | authoritative | **模範パターン**: null 返却で計算不能を表現 |
| `estMethod.ts` | `calculateEstMethod` | authoritative-metric | TS → Rust | authoritative | **要改善**: safeDivide fallback が意味を潰す（Issue-5） |
| `estMethod.ts` | `calculateCoreSales` | authoritative-metric | TS → Rust | authoritative | isOverDelivery フラグあり（Issue-7 で warning 統合候補） |
| `estMethod.ts` | `calculateDiscountRate` | authoritative-metric | TS → Rust | authoritative | safeDivide(_, _, 0) |
| `discountImpact.ts` | `calculateDiscountImpact` | authoritative-metric | TS → Rust | authoritative | **要改善**: 分母ゼロ時 fallback が強引（Issue-5） |
| `markupRate.ts` | `calculateMarkupRates` | authoritative-metric | TS → Rust | authoritative | **要改善**: corePrice=0 時 defaultMarkupRate fallback |
| `costAggregation.ts` | `calculateTransferTotals` | authoritative-metric | TS → Rust | authoritative | 単純合計、安定 |
| `costAggregation.ts` | `calculateInventoryCost` | authoritative-metric | TS → Rust | authoritative | 単純減算、安定 |

### 2. 予算分析系 — authoritative-metric / TS

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `budgetAnalysis.ts` | `calculateBudgetAnalysis` | authoritative-metric | TS | authoritative | **要改善**: 営業日/カレンダー日混在（Issue-4） |
| `budgetAnalysis.ts` | `calculateGrossProfitBudget` | authoritative-metric | TS | authoritative | **要改善**: 同上（Issue-4） |

### 3. 要因分解系 — math-kernel / Rust

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `factorDecomposition.ts` | `decompose2` | math-kernel | Rust（TS fallback） | authoritative | 恒等式テスト済み、シャープリー値分解 |
| `factorDecomposition.ts` | `decompose3` | math-kernel | Rust（TS fallback） | authoritative | 同上 |
| `factorDecomposition.ts` | `decompose5` | math-kernel | Rust（TS fallback） | authoritative | null 返却あり（カテゴリ qty ≤ 0） |
| `factorDecomposition.ts` | `decomposePriceMix` | math-kernel | Rust（TS fallback） | authoritative | null 返却あり |

### 4. 統計・予測系 — math-kernel / Rust 候補

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `algorithms/correlation.ts` | `pearsonCorrelation` | math-kernel | TS → Rust 候補 | exploratory | r=0 fallback, [-1,1] clamp |
| `algorithms/correlation.ts` | `correlationMatrix` | math-kernel | TS → Rust 候補 | exploratory | 上三角行列 |
| `algorithms/correlation.ts` | `normalizeMinMax` | math-kernel | TS → Rust 候補 | infrastructure | 全等値時 50 |
| `algorithms/correlation.ts` | `detectDivergence` | math-kernel | TS | exploratory | 正規化ベース |
| `algorithms/correlation.ts` | `cosineSimilarity` | math-kernel | TS → Rust 候補 | exploratory | [0,1] |
| `algorithms/correlation.ts` | `movingAverage` | math-kernel | TS | infrastructure | |
| `algorithms/correlation.ts` | `calculateZScores` | math-kernel | TS | infrastructure | stdDev=0 → all 0 |
| `algorithms/sensitivity.ts` | `calculateSensitivity` | math-kernel | TS → Rust 候補 | exploratory | 4x safeDivide |
| `algorithms/sensitivity.ts` | `calculateElasticity` | math-kernel | TS → Rust 候補 | exploratory | sensitivity の4変動 |
| `algorithms/sensitivity.ts` | `extractSensitivityBase` | utility | TS | infrastructure | 純粋型変換 |
| `algorithms/advancedForecast.ts` | `calculateWMA` | math-kernel | TS → Rust 候補 | exploratory | 加重移動平均 |
| `algorithms/advancedForecast.ts` | `linearRegression` | math-kernel | TS → Rust 候補 | exploratory | 最小二乗法 |
| `algorithms/advancedForecast.ts` | `projectDowAdjusted` | math-kernel | TS | exploratory | DOW 調整予測 |
| `algorithms/advancedForecast.ts` | `calculateMonthEndProjection` | math-kernel | TS | exploratory | 月末予測（複数手法） |
| `algorithms/trendAnalysis.ts` | `analyzeTrend` | math-kernel | TS | exploratory | MoM, YoY, MA, 季節性 |

### 5. 予測系 — math-kernel / TS

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `forecast.ts` | `calculateStdDev` | math-kernel | TS | infrastructure | safeDivide(_, _, 0) |
| `forecast.ts` | `getWeekRanges` | utility | TS | infrastructure | 月曜始まり週分割 |
| `forecast.ts` | `calculateWeeklySummaries` | aggregate-source | TS | exploratory | 週別集計 |
| `forecast.ts` | `calculateDayOfWeekAverages` | aggregate-source | TS | exploratory | 曜日別平均 |
| `forecast.ts` | `detectAnomalies` | math-kernel | TS | exploratory | Z-score 異常検出 |

### 6. 曜日ギャップ・因果分析系 — authoritative-metric / TS

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `dowGapAnalysis.ts` | `countDowsInMonth` | utility | TS | infrastructure | 7 要素配列 |
| `dowGapAnalysis.ts` | `analyzeDowGap` | authoritative-metric | TS | authoritative | warning 返却あり |
| `dowGapAnalysis.ts` | `analyzeDowGapActualDay` | authoritative-metric | TS | authoritative | ゼロ値 fallback |
| `causalChain.ts` | `buildCausalSteps` | orchestration | TS | derived | StoreResult → 因果ステップ |
| `causalChain.ts` | `storeResultToCausalPrev` | utility | TS | infrastructure | 純粋型変換 |
| `causalChainSteps.ts` | `buildGrossProfitStep` | orchestration | TS | derived | 粗利ステップ構築 |
| `causalChainSteps.ts` | `buildFactorDecompositionStep` | orchestration | TS | derived | 要因分解ステップ構築 |
| `causalChainSteps.ts` | `buildDiscountBreakdownStep` | orchestration | TS | derived | 売変明細ステップ |
| `causalChainSteps.ts` | `buildSummaryStep` | orchestration | TS | derived | サマリステップ |
| `causalChainFormatters.ts` | `fmtPct`, `fmtComma`, etc. | utility | TS | infrastructure | 表示フォーマッタ |

### 7. 集約系 — aggregate-source / TS → SQL 移行候補

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `aggregation.ts` | `sumStoreValues` | aggregate-source | TS | derived | 全店合計 |
| `aggregation.ts` | `sumNullableValues` | aggregate-source | TS | derived | null 考慮合計 |
| `aggregation.ts` | `weightedAverageBySales` | **authoritative-metric** | TS | authoritative | **最終採用ルール**: 売上加重平均率 |
| `divisor.ts` | `computeDivisor` | utility | TS | infrastructure | 除数（≥1 保証） |
| `divisor.ts` | `countDistinctDays` | aggregate-source | TS → SQL 候補 | infrastructure | 日数カウント |
| `divisor.ts` | `computeDowDivisorMap` | utility | TS | infrastructure | 曜日別除数 |
| `divisor.ts` | `filterByStore` | utility | TS | infrastructure | 店舗フィルタ |

### 8. Raw 集約系 — aggregate-source / TS → SQL 移行候補

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `rawAggregation/dailyAggregation.ts` | `aggregateByDay` | aggregate-source | TS → SQL | exploratory | 日別集計 |
| `rawAggregation/dailyAggregation.ts` | `cumulativeSum` | aggregate-source | TS → SQL | exploratory | 累計 |
| `rawAggregation/dailyAggregation.ts` | `movingAverage` | aggregate-source | TS → SQL | exploratory | 移動平均 |
| `rawAggregation/dailyAggregation.ts` | `dowAggregate` | aggregate-source | TS → SQL | exploratory | 曜日別集計 |
| `rawAggregation/aggregationUtilities.ts` | `hourlyAggregate` | aggregate-source | TS → SQL | exploratory | 時間帯別 |
| `rawAggregation/aggregationUtilities.ts` | `aggregatePeriodRates` | aggregate-source | TS → SQL | exploratory | 期間率集計 |
| `rawAggregation/aggregationUtilities.ts` | `rankBy` | utility | TS | infrastructure | ランキング |
| `rawAggregation/aggregationUtilities.ts` | `yoyMerge` | aggregate-source | TS | exploratory | 前年比マージ |
| `rawAggregation/aggregationUtilities.ts` | `categoryShare` | aggregate-source | TS → SQL | exploratory | カテゴリ構成比 |
| `rawAggregation/statisticalFunctions.ts` | `stddevPop` | math-kernel | TS | infrastructure | 母標準偏差 |
| `rawAggregation/statisticalFunctions.ts` | `zScore` | math-kernel | TS | infrastructure | Z スコア |
| `rawAggregation/statisticalFunctions.ts` | `coefficientOfVariation` | math-kernel | TS | infrastructure | 変動係数 |
| `rawAggregation/featureAggregation.ts` | `computeDowPattern` | aggregate-source | TS → SQL | exploratory | 曜日パターン |
| `rawAggregation/featureAggregation.ts` | `computeDailyFeatures` | aggregate-source | TS → SQL | exploratory | 日別特徴量 |
| `rawAggregation/featureAggregation.ts` | `computeHourlyProfile` | aggregate-source | TS → SQL | exploratory | 時間帯プロファイル |

### 9. アラートシステム — orchestration / TS

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `rules/alertSystem.ts` | `evaluateAlerts` | orchestration | TS | derived | ルールベース閾値判定 |
| `rules/alertSystem.ts` | `evaluateAllStoreAlerts` | orchestration | TS | derived | 全店アラート |

### 10. 在庫推計・ピン区間 — authoritative-metric / TS

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `inventoryCalc.ts` | `computeEstimatedInventory` | authoritative-metric | TS | authoritative | 推定在庫推移 |
| `inventoryCalc.ts` | `computeEstimatedInventoryDetails` | authoritative-metric | TS | authoritative | 推定在庫明細 |
| `pinIntervals.ts` | `calculatePinIntervals` | authoritative-metric | TS | authoritative | ピン区間計算 |

### 11. データ検出 — utility / TS

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `dataDetection.ts` | `maxDayOfRecord` | utility | TS | infrastructure | 最大日検出 |
| `dataDetection.ts` | `detectDataMaxDay` | utility | TS | infrastructure | 複数ソース最大日 |
| `averageDivisor.ts` | `computeAverageDivisor` | utility | TS | infrastructure | 平均除数（≥1 保証） |
| `averageDivisor.ts` | `computeActiveDowDivisorMap` | utility | TS | infrastructure | 曜日別除数 |

### 12. 汎用ユーティリティ — utility / TS

| ファイル | 関数 | 役割 | 実装責務 | 権威性 | 備考 |
|---|---|---|---|---|---|
| `utils.ts` | `safeDivide` | utility | TS | infrastructure | **要注意**: 意味潰しの温床（Issue-3） |
| `utils.ts` | `safeNumber` | utility | TS | infrastructure | unknown → number |
| `utils.ts` | `calculateTransactionValue` | utility | TS | infrastructure | 客単価 = 売上/客数 |
| `utils.ts` | `calculateItemsPerCustomer` | utility | TS | infrastructure | 買上点数 = 数量/客数 |
| `utils.ts` | `calculateAveragePricePerItem` | utility | TS | infrastructure | 一品単価 = 売上/数量 |
| `utils.ts` | `calculateMovingAverage` | utility | TS | infrastructure | 移動平均 |
| `utils.ts` | `getEffectiveGrossProfitRate` | **authoritative-metric** | TS | authoritative | **最終採用ルール**: 在庫法 ?? 推定法 |

---

## バレルファイル構成

| バレル | 責務 | 再 export 元 |
|---|---|---|
| `grossProfit.ts` | 粗利計算の公開面 | utils, invMethod, estMethod, discountImpact, markupRate, costAggregation, divisor, aggregation |
| `decomposition.ts` | 分解・分析の公開面 | factorDecomposition, dowGapAnalysis, causalChain, rules/alertSystem, algorithms/correlation |
| `forecast.barrel.ts` | 予測の公開面 | forecast, algorithms/advancedForecast, algorithms/trendAnalysis, algorithms/sensitivity, inventoryCalc, pinIntervals |
| `rawAggregation/index.ts` | Raw 集約の公開面 | dailyAggregation, statisticalFunctions, aggregationUtilities, featureAggregation |
| `algorithms/index.ts` | アルゴリズムの公開面 | correlation, trendAnalysis, advancedForecast, sensitivity |

---

## 新規実装時の配置基準

### 判定フロー

```
新規関数を追加したい
  │
  ├─ 正式な業務確定値を導く？
  │    YES → authoritative-metric
  │    ├─ 純粋数値計算（Date 非依存、FFI 可能）？ → Rust/WASM 候補（TS fallback 付き）
  │    └─ 業務判断・採用ルール含む？ → TS domain に固定
  │
  ├─ 明細からの集約・素材生成？
  │    YES → aggregate-source
  │    ├─ 任意期間・粒度の柔軟性が必要？ → DuckDB/SQL 候補
  │    └─ 固定パターンの集約？ → TS domain（将来 SQL 移行可）
  │
  ├─ 高反復の数理計算？
  │    YES → math-kernel → Rust/WASM 候補
  │
  └─ それ以外
       ├─ 汎用ヘルパー → utility（TS domain）
       └─ 結果組み立て → orchestration（TS application）
```

### safeDivide 使用時の注意

- `safeDivide(a, b, 0)` を使う前に「分母ゼロは業務上何を意味するか」を確認する
- **0 が正しい**: 分母ゼロ = 実績なし = ゼロ値（例: 客数0 → 客単価0）
- **null が正しい**: 分母ゼロ = 計算不能（例: 在庫データなし → 在庫法粗利 null）
- **invalid が正しい**: 分母ゼロ = 異常状態（例: discountRate=1 → 原価計算不能）
- Issue-3 の `CalculationResult<T>` 導入後は status で区別する

### Rust 移行対象の選定基準

Rust/WASM に移す関数は以下を**全て**満たすこと:
1. 純粋関数（副作用なし）
2. 入出力型が安定（FFI で表現可能）
3. Date 非依存（Date オブジェクト不使用）
4. 業務意味づけ・採用判断を含まない（math kernel のみ）
5. 高反復または計算量が大きい

---

## 要改善箇所サマリ

| 関数 | 問題 | 対応 Issue |
|---|---|---|
| `calculateEstMethod` | discountRate=1 で safeDivide fallback → 意味潰し | Issue-5 |
| `calculateDiscountImpact` | 分母ゼロ時 fallback が強引 | Issue-5 |
| `calculateBudgetAnalysis` | 営業日/カレンダー日の混在 | Issue-4 |
| `calculateGrossProfitBudget` | 同上 | Issue-4 |
| `calculateMarkupRates` | corePrice=0 時の defaultMarkupRate fallback | Issue-3（後続） |
| `calculateCoreSales` | isOverDelivery が downstream で無視されうる | Issue-7 |
