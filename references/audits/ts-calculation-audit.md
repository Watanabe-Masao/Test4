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
| `application/usecases/calculation/periodMetricsCalculator.ts` | `aggregateSummaryRows()` | 92-134 | export | pure な行集約。データ構成処理として domain/ 候補 | **将来** |
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
| `application/usecases/explanation/*` | 各 explanation builder | メタデータ登録。TS 残留 |
| `application/usecases/departmentKpi/indexBuilder.ts` | 加重平均・ランキング計算 | 探索用表示。TS 残留 |
| `application/hooks/useBudgetChartData.ts` | 累積チャートデータ構築 | ViewModel。TS 残留 |
| `application/hooks/useShapleyTimeSeries.ts` | domain の decompose2() に委譲 | delegation + memoization。TS 残留 |
| `application/hooks/useFactorDecomposition.ts` | domain の decompose 関数群に委譲 | delegation + memoization。TS 残留 |
| `application/hooks/useDowGapAnalysis.ts` | domain の analyzeDowGap() に委譲 | delegation + memoization。TS 残留 |

### Category D: Pure だが責務過大（TS 残留・分解候補）

| ファイル | 関数 | 行 | 判断 |
|----------|------|---|------|
| `application/usecases/calculation/dailyBuilder.ts` | `buildDailyRecords()` | 23-318 | 引数のみを読み戻り値を返す構造のため **pure である**。ただし責務が大きい（300行超のループに集約・構成・集計が混在）。内部の集計ロジックはより小さな pure function への分解候補。将来の移管容易性のためにも分解が望ましい |

### Category E: Non-pure（TS 残留）

| ファイル | 関数 | 判断 |
|----------|------|------|
| `application/hooks/duckdb/useJsAggregationQueries.ts` | 各 hook | React hook wrapper。TS 残留 |
| `application/hooks/monthlyHistoryLogic.ts` | 月次履歴構築 | state 依存あり。TS 残留 |

## 重点確認事項

1. **`calculateMarkupRates()` の重複**: `storeAssembler.ts:49-66` と `collectionAggregator.ts` の
   `calculateMarkupRates` は同名だが入力型が異なる。domain/ で統一インターフェースを設計する必要あり

2. **`periodMetricsCalculator.ts` と `storeAssembler.ts` の並行計算パス**: 同一のビジネスロジック
   （値入率、コスト算出、在庫法/推定法委譲）が2箇所に存在。共通 pure 関数への集約が必要

3. **`jsAggregationLogic.ts` の infrastructure/ 型依存**: `StoreDaySummaryRow` 等の
   infrastructure 型を直接 import。domain/ 移管時はインターフェース分離が必要（将来課題）

## 対応優先順位

| 優先度 | 対象 | Step | 理由 |
|--------|------|------|------|
| 1 | markupRate 重複解消 | Step 3.1 | 3箇所に散在。authoritative logic の重複定義 |
| 2 | costAggregation 重複解消 | Step 3.2 | 2箇所に散在。StoreResult フィールドを決定 |
| 3 | dailyBuilder 分解 | 将来 | 責務過大だが現状動作に問題なし |
| 4 | jsAggregationLogic の型依存解消 | 将来 | exploration 用。緊急度低い |
