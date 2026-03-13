# TS 側 Calculation-like Code 監査リスト

作成日: 2026-03-13
判定基準: `references/engine-boundary-policy.md` の Pure / Authoritative 判定ルール

## 監査対象と分類結果

### Category A: Pure + Authoritative（domain/ 移管対象）

同一の業務意味を持つ計算が複数の `application/usecases` に存在する状態は
責務境界違反であり、将来の engine 分離の障害となる。

| ファイル | 関数 | 行 | 現状 | 判断理由 | 対応 |
|----------|------|---|------|----------|------|
| `application/usecases/calculation/storeAssembler.ts` | `calculateMarkupRates()` | 49-66 | inline helper | 値入率は正式業務値。domain/ に移管すべき | **Step 3.1** |
| `application/usecases/calculation/storeAssembler.ts` | `calculateTransferTotals()` | 34-46 | inline helper | 移動合計は StoreResult フィールドを決定する | **Step 3.2** |
| `application/usecases/calculation/periodMetricsCalculator.ts` | `calculatePeriodMetrics()` 内の値入率計算 | 170-180 | inline | storeAssembler と同一パターンの重複。domain/ の共通関数に統合 | **Step 3.1** |
| `application/usecases/calculation/periodMetricsCalculator.ts` | `calculatePeriodMetrics()` 内のコスト集計 | 155-164 | inline | storeAssembler と同一パターンの重複 | **Step 3.2** |
| `application/usecases/calculation/collectionAggregator.ts` | `calculateMarkupRates()` | - | export | 別シグネチャだが同じ業務意味の値入率計算 | **Step 3.1** |

### Category B: Pure + Exploration（現状維持 or rawAggregation 統合）

| ファイル | 関数 | 行 | 現状 | 判断 |
|----------|------|---|------|------|
| `application/hooks/duckdb/jsAggregationLogic.ts` | `computeDowPattern()` | 33-75 | export | 探索用統計。rawAggregation 統合候補 |
| `application/hooks/duckdb/jsAggregationLogic.ts` | `computeDailyFeatures()` | 87-176 | export | rawAggregation 関数を活用済み。現状維持可 |
| `application/hooks/duckdb/jsAggregationLogic.ts` | `computeYoyDaily()` / `computeYoyDailyV2()` | 189-237 | export | Comparison 層に委譲。現状維持 |
| `application/hooks/duckdb/jsAggregationLogic.ts` | `computeHourlyProfile()` | 247-294 | export | 探索用。rawAggregation 統合候補 |
| `application/hooks/duckdb/conditionMatrixLogic.ts` | `avgMetrics()`, `cell()`, `rateCell()`, `buildRow()` | - | export | 探索用比較。現状維持可 |
| `application/hooks/duckdb/categoryBenchmarkLogic.ts` | `classifyProductType()`, `computePi()`, `buildCategoryBenchmarkScores()` | - | export | 探索用分類。現状維持可 |

**注記:** `jsAggregationLogic.ts` は `StoreDaySummaryRow` 等の infrastructure 型を直接 import している。
domain/ 移管時はインターフェース分離が必要（将来課題）。

### Category C: Pure + UI 専用（TS 残留許可）

| ファイル | 関数 | 判断 |
|----------|------|------|
| `presentation/components/charts/*/*.vm.ts` | 各 `buildViewModel` | ViewModel 変換。TS 残留 |
| `application/usecases/dailySalesTransform.ts` | `buildBaseDayItems()`, `buildWaterfallData()` | 表示データ構築。TS 残留 |
| `application/comparison/comparisonVm.ts` | `toYoyDailyRowVm()` | VM 変換。TS 残留 |
| `application/usecases/calculation/periodMetricsCalculator.ts` | `aggregateSummaryRows()` | SQL結果形状（`DaySummaryInput`）を集約する処理。domain/ はインフラ型を知るべきでないため application 残留 |
| `application/usecases/explanation/*` | 各 explanation builder | メタデータ登録。TS 残留 |
| `application/usecases/departmentKpi/indexBuilder.ts` | 加重平均・ランキング計算 | 探索用表示。TS 残留 |
| `application/hooks/useBudgetChartData.ts` | 累積チャートデータ構築 | ViewModel。TS 残留 |
| `application/hooks/useShapleyTimeSeries.ts` | domain の decompose2() に委譲 | delegation + memoization。TS 残留 |
| `application/hooks/useFactorDecomposition.ts` | domain の decompose 関数群に委譲 | delegation + memoization。TS 残留 |
| `application/hooks/useDowGapAnalysis.ts` | domain の analyzeDowGap() に委譲 | delegation + memoization。TS 残留 |

### Category D: Pure だが責務過大（TS 残留・分解候補）

| ファイル | 関数 | 行 | 判断 |
|----------|------|---|------|
| `application/usecases/calculation/dailyBuilder.ts` | `buildDailyRecords()` | 17-223 | **Phase 2-3 + 残留 Task 1 で分解完了。** 319行→223行。`dailyBuilderHelpers.ts` に3関数を抽出: `buildTransferBreakdown()`, `aggregateSupplierDay()`, `accumulateDay()` |

### Category E: Non-pure（TS 残留）

| ファイル | 関数 | 判断 |
|----------|------|------|
| `application/hooks/duckdb/useJsAggregationQueries.ts` | 各 hook | React hook wrapper。TS 残留 |
| `application/hooks/monthlyHistoryLogic.ts` | 月次履歴構築 | state 依存あり。TS 残留 |

## 実施済み対応

### Phase 2-1: markupRate 重複解消 ✅

- `domain/calculations/markupRate.ts` を新設
- 3箇所（storeAssembler, periodMetricsCalculator, collectionAggregator）の重複を統合
- 統一インターフェース `MarkupRateInput` → `MarkupRateResult`

### Phase 2-2: costAggregation 重複解消 ✅

- `domain/calculations/costAggregation.ts` を新設
- 2箇所（storeAssembler, periodMetricsCalculator）の重複を統合
- `calculateTransferTotals()` + `calculateInventoryCost()`

### Phase 2-3: dailyBuilder 分解準備 ✅

- `dailyBuilderHelpers.ts` を新設し2つの pure 関数を抽出:
  - `buildTransferBreakdown()` — 移動内訳の集計+明細変換
  - `aggregateSupplierDay()` — 取引先内訳の日次集約
- dailyBuilder.ts: 319行 → 224行

---

## Phase 3: jsAggregationLogic.ts 整理結果

### 関数別所属確定

| 関数 | 責務 | 分類 | rawAggregation 統合 | infrastructure 型依存 |
|---|---|---|---|---|
| `computeDowPattern()` | 曜日パターン集計 | Pure + Exploration | ✅ 統合候補 | `StoreDaySummaryRow` → 使用フィールド: `storeId`, `dow`, `sales`, `customers` |
| `computeDailyFeatures()` | 日次特徴量計算 | Pure + Exploration | ✅ 統合候補 | `StoreDaySummaryRow` → 使用フィールド: `storeId`, `dateKey`, `sales` |
| `computeHourlyProfile()` | 時間帯プロファイル | Pure + Exploration | ✅ 統合候補 | generic signature（`{ storeId, hour, amount }[]`）。型依存なし |
| `computeYoyDaily()` | YoY日次比較 | Application 調整 | ❌ 残留 | `StoreDaySummaryRow` + comparison 層に委譲 |
| `computeYoyDailyV2()` | YoY日次比較 v2 | Application 調整 | ❌ 残留 | `StoreDaySummaryRow` + ViewModel 変換含む |

### rawAggregation 統合方針

3関数（`computeDowPattern`, `computeDailyFeatures`, `computeHourlyProfile`）は
`domain/calculations/rawAggregation/` への統合候補。ただし以下の前提条件を満たす必要がある:

1. **interface 分離**: `StoreDaySummaryRow` への直接依存を解消し、
   使用フィールドのみの minimal interface を定義する
   - `computeDowPattern` → `{ storeId: string; dow: number; sales: number; customers: number }`
   - `computeDailyFeatures` → `{ storeId: string; dateKey: string; sales: number }`
   - `computeHourlyProfile` → 既に generic（変更不要）

2. **出力型の分離**: `DowPatternRow`, `DailyFeatureRow`, `HourlyProfileRow` は現在
   `infrastructure/duckdb/queries/` に定義されている。domain/ 移管時は
   `domain/calculations/rawAggregation/` に同等の型を定義し、
   infrastructure 側は re-export または adapter で対応

3. **rawAggregation 関数の再利用**: `computeDailyFeatures` は既に
   `movingAverage`, `stddevPop`, `zScore`, `coefficientOfVariation` を使用。
   統合時の依存関係は自然

### 統合の実施時期

**現時点ではコード移動は行わない。** 理由:
- infrastructure 型依存の解消は interface 分離を伴い、影響範囲が広い
- 出力型が infrastructure 層に定義されており、移動には複数ファイルの変更が必要
- まず方針を固め、別タスクとして実施する

---

## Phase 4: Authoritative 候補確定 + FFI 契約整理

### Authoritative モジュール（正式業務値を決定する）

| 優先度 | モジュール | FFI Tier | 入力 | 出力 | 依存 | 備考 |
|---|---|---|---|---|---|---|
| 1 | factorDecomposition | Tier 1 ✅ | scalar + `readonly CategoryQtyAmt[]` | plain object | utils (safeDivide) | Shapley 恒等式検証可。Map/Set 内部のみ |
| 2 | markupRate | Tier 1 ✅ | `MarkupRateInput` (全 scalar) | `MarkupRateResult` (全 scalar) | utils (safeDivide) | Phase 2-1 で抽出済み |
| 3 | costAggregation | Tier 1 ✅ | `TransferTotalsInput` (全 scalar) | `TransferTotalsResult` (全 scalar) | なし | Phase 2-2 で抽出済み |
| 4 | invMethod | Tier 1 ✅ | `InvMethodInput` (scalar + null) | `InvMethodResult` (scalar + null) | utils (safeDivide) | 在庫法粗利計算 |
| 5 | estMethod | Tier 1 ✅ | `EstMethodInput` (scalar + null) | `EstMethodResult` (scalar + null) | utils (safeDivide) | 推定法粗利計算 |
| 6 | discountImpact | Tier 1 ✅ | `DiscountImpactInput` (scalar) | `DiscountImpactResult` (scalar) | utils (safeDivide) | 売変インパクト |
| 7 | pinIntervals | Tier 1 ✅ | scalar + array | `PinInterval[]` (plain object) | なし | ピン間隔計算 |
| 8 | forecast | Tier 2 ⚠️ | `ReadonlyMap<number, number>` 入力 | plain object array | utils (safeDivide) | 入力アダプタ必要 |
| 9 | budgetAnalysis | Tier 3 ❌ | `ReadonlyMap` 入力 | `ReadonlyMap` 出力 | utils (safeDivide) | 入出力とも非 serializable |

### Pure Analytics Substrate（分析基盤。authoritative ではないが pure）

| モジュール | FFI Tier | 入力 | 出力 | 備考 |
|---|---|---|---|---|
| rawAggregation | Tier 1 ✅ | readonly array | plain object array | 23関数。統計処理基盤 |
| correlation | Tier 1 ✅ | array | plain object | 相関・正規化・乖離検出 |
| trendAnalysis | Tier 1 ✅ | `MonthlyDataPoint[]` | `TrendAnalysisResult` | トレンド分析 |
| sensitivity | Tier 1 ✅ | `SensitivityBase` (plain) | plain object | 感度分析・弾力性 |
| advancedForecast | Tier 2 ⚠️ | 一部 `ReadonlyMap` | plain object | WMA・線形回帰 |

### 補助モジュール（Authoritative でも Substrate でもない）

| モジュール | 性質 | 理由 |
|---|---|---|
| utils.ts | 共通ユーティリティ | 全モジュールの依存基盤（safeDivide 等） |
| aggregation.ts | StoreResult 集約 | StoreResult 依存。Application 寄り |
| causalChain.ts / causalChainSteps.ts / causalChainFormatters.ts | 因果チェーン構築 | StoreResult 依存。説明責務 |
| rules/alertSystem.ts | アラート評価 | StoreResult 依存、Map 出力 |
| dataDetection.ts | データ検知 | ReadonlyMap 入力。補助 |
| divisor.ts / averageDivisor.ts | 除数計算 | Map/Set in interface。探索寄り |
| inventoryCalc.ts | 在庫計算 | ReadonlyMap + DailyRecord 依存。Tier 2 |
| dowGapAnalysis.ts | 曜日ギャップ分析 | 内部 Map/Set。出力は serializable |

### FFI 適合性サマリ

| Tier | 定義 | 該当数 | モジュール |
|---|---|---|---|
| **Tier 1** | 入出力とも JSON serializable。そのまま FFI 境界にできる | 7 Authoritative + 4 Substrate | factorDecomposition, markupRate, costAggregation, invMethod, estMethod, discountImpact, pinIntervals / rawAggregation, correlation, trendAnalysis, sensitivity |
| **Tier 2** | 入力に ReadonlyMap あり。出力は serializable。入力アダプタで対応可 | 1 Authoritative + 1 Substrate | forecast / advancedForecast |
| **Tier 3** | 入出力とも非 serializable。FFI 化には型リファクタリングが必要 | 1 Authoritative | budgetAnalysis |

### Tier 2/3 の FFI 化方針

**forecast (Tier 2):**
- **変更不要。** `buildForecastInput()` が既に ReadonlyMap → Record 変換を担当。呼び出し元6箇所で安定
- 出力はそのまま serializable

**budgetAnalysis (Tier 3):**
- 入力: `budgetDaily`, `salesDaily` が ReadonlyMap → Record に変換
- 出力: `dailyCumulative: ReadonlyMap` → `Record` または `Array<{day, sales, budget}>` に変更
- **型リファクタリングが必要**。別タスクとして実施

### 依存グラフ

```
Authoritative モジュール群
├── factorDecomposition ─→ utils (safeDivide)
├── markupRate ──────────→ utils (safeDivide)
├── costAggregation ─────→ (依存なし)
├── invMethod ───────────→ utils (safeDivide)
├── estMethod ───────────→ utils (safeDivide)
├── discountImpact ──────→ utils (safeDivide)
├── forecast ────────────→ utils (safeDivide)
├── budgetAnalysis ──────→ utils (safeDivide)
└── pinIntervals ────────→ (依存なし)

Pure Analytics Substrate
├── rawAggregation ──────→ (依存なし)
├── correlation ─────────→ (依存なし)
├── trendAnalysis ───────→ (依存なし)
├── sensitivity ─────────→ (依存なし)
└── advancedForecast ────→ (依存なし)

utils.ts は全 Authoritative モジュールの共通依存。
FFI 移管時は utils も一緒に移管する必要がある。
```
