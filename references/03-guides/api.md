# 内部 API リファレンス

本システムの主要な内部 API（DuckDB クエリ関数、フック、コンテキスト）の一覧です。
外部 API は存在しません（ブラウザ完結型 SPA）。

## データフロー概要

```
File Import -> IndexedDB -> DuckDB -> Query Module -> Hook -> Chart/Widget
```

1. **File Import**: ユーザーがファイルをドラッグ & ドロップでインポート
2. **IndexedDB**: `DataRepository` がインポートデータをブラウザ内に永続化
3. **DuckDB**: `useDuckDB` フックが IndexedDB のデータを DuckDB テーブルにロード
4. **Query Module**: SQL クエリで集約・分析を実行
5. **Hook**: `application/hooks/duckdb/` の各フックがクエリ結果を React ステートとして管理
6. **Chart/Widget**: Recharts ベースのチャートコンポーネントが表示用データを描画

---

## 1. DuckDB クエリランナー (`queryRunner.ts`)

SQL 実行と結果変換のユーティリティ関数群。

### `queryToObjects<T>(conn, sql): Promise<readonly T[]>`

SQL を実行し、結果を camelCase 変換済みの JavaScript オブジェクト配列として返す。
- Arrow Table の StructRow を plain object に変換
- snake_case カラム名を camelCase に自動変換（例: `total_amount` -> `totalAmount`）
- BigInt 値を number に自動変換

### `queryScalar<T>(conn, sql): Promise<T | null>`

スカラー値（1 行 1 列）を取得する。結果がなければ `null` を返す。

### `buildWhereClause(conditions: readonly (string | null)[]): string`

SQL の WHERE 句を生成するヘルパー。`null` でない条件のみを AND で結合する。
- 全条件が `null` の場合は空文字列を返す
- 例: `buildWhereClause(["year = 2026", null, "store_id = '001'"])` -> `"WHERE year = 2026 AND store_id = '001'"`

### `storeIdFilter(storeIds: readonly string[] | undefined): string | null`

`store_id IN (...)` 条件を生成する。
- storeIds が空または未指定なら `null`（条件なし）を返す
- SQL インジェクション対策としてシングルクォートをエスケープ

---

## 2. DuckDB スキーマ (`schemas.ts`)

### テーブル一覧（12 テーブル）

| テーブル名 | ソース | 主要カラム |
|---|---|---|
| `schema_meta` | 内部管理 | version, created_at |
| `classified_sales` | 分類別売上 CSV | year, month, day, store_id, sales_amount, discount_71-74, is_prev_year |
| `category_time_sales` | 分類別時間帯 CSV | year, month, day, store_id, dept_code/name, line_code/name, klass_code/name, total_quantity, total_amount, dow |
| `time_slots` | 時間帯展開 | year, month, day, store_id, dept_code, line_code, klass_code, hour, quantity, amount |
| `purchase` | 仕入 Excel | year, month, store_id, day, supplier_code/name, cost, price |
| `special_sales` | 花 / 産直 Excel | year, month, store_id, day, type('flowers'\|'directProduce'), cost, price, customers |
| `transfers` | 移動 Excel | year, month, store_id, day, direction, cost, price |
| `consumables` | 消耗品データ | year, month, store_id, day, cost |
| `department_kpi` | 部門 KPI | year, month, dept_code/name, 各種 KPI 指標 |
| `budget` | 予算データ | year, month, store_id, budget_amount |
| `inventory_config` | 棚卸設定 | year, month, store_id, 棚卸関連設定 |
| `app_settings` | アプリ設定 | key, value |

### VIEW / マテリアライズドテーブル

| 名前 | 説明 |
|---|---|
| `store_day_summary` | classified_sales を基準に 6 テーブルを LEFT JOIN で結合した店舗 x 日サマリー |
| `store_day_summary_mat` | store_day_summary のマテリアライズド版（クエリ高速化用） |

全テーブル共通で `year`, `month`, `day`, `date_key` カラムを持ち、
`date_key BETWEEN` による月跨ぎクエリに対応する。

---

## 3. クエリモジュール一覧

全クエリ関数は `app/src/infrastructure/duckdb/queries/` に配置。
`AsyncDuckDBConnection` を第 1 引数に受け取り、SQL を実行して型付き結果を返す。

### 3.1 categoryTimeSales.ts（8 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryHourlyAggregation(conn, params)` | `HourlyAggregationRow[]` | 時間帯別の数量・金額集約 |
| `queryLevelAggregation(conn, params)` | `LevelAggregationRow[]` | 部門/ライン/クラス階層での集約 |
| `queryStoreAggregation(conn, params)` | `StoreAggregationRow[]` | 店舗別 x 時間帯集約 |
| `queryHourDowMatrix(conn, params)` | `HourDowMatrixRow[]` | 時間帯 x 曜日マトリクス |
| `queryDistinctDayCount(conn, params)` | `number` | distinct 日数カウント |
| `queryDowDivisorMap(conn, params)` | `Map<number, number>` | 曜日別除数マップ |
| `queryCategoryDailyTrend(conn, params)` | `CategoryDailyTrendRow[]` | カテゴリ別日次トレンド |
| `queryCategoryHourly(conn, params)` | `CategoryHourlyRow[]` | カテゴリ別 x 時間帯集約 |

**共通パラメータ型 `CtsFilterParams`**:

```typescript
interface CtsFilterParams {
  dateFrom: string              // date_key 開始
  dateTo: string                // date_key 終了
  storeIds?: readonly string[]  // 店舗フィルタ（省略時: 全店）
  deptCode?: string             // 部門コード
  lineCode?: string             // ラインコード
  klassCode?: string            // クラスコード
  isPrevYear?: boolean          // 前年フラグ
}
```

### 3.2 storeDaySummary.ts（4 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryStoreDaySummary(conn, params)` | `StoreDaySummaryRow[]` | 店舗 x 日の全指標サマリー |
| `queryAggregatedRates(conn, params)` | `AggregatedRatesRow \| null` | 期間集約レート |
| `queryDailyCumulative(conn, params)` | `DailyCumulativeRow[]` | 日別累積売上 |
| `materializeSummary(conn)` | `void` | VIEW をテーブルにマテリアライズ（パフォーマンス最適化用） |

### 3.3 departmentKpi.ts（3 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryDeptKpiRanked(conn, params)` | `DeptKpiRankedRow[]` | RANK() OVER によるランキング付き KPI |
| `queryDeptKpiSummary(conn, params)` | `DeptKpiSummaryRow \| null` | 部門 KPI サマリー（全体集約） |
| `queryDeptKpiMonthlyTrend(conn, params)` | `DeptKpiMonthlyTrendRow[]` | 月次 KPI トレンド |

### 3.4 yoyComparison.ts（2 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryYoyDailyComparison(conn, params)` | `YoyDailyRow[]` | 日次前年比較（FULL OUTER JOIN） |
| `queryYoyCategoryComparison(conn, params)` | `YoyCategoryRow[]` | カテゴリ別前年比較 |

### 3.5 features.ts（4 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryDailyFeatures(conn, params)` | `DailyFeatureRow[]` | MA3/7/28, CV, Z スコア, スパイク検出 |
| `queryHourlyProfile(conn, params)` | `HourlyProfileRow[]` | 時間帯別売上シェア（%） |
| `queryDowPattern(conn, params)` | `DowPatternRow[]` | 曜日別季節指数 |
| `queryDeptDailyTrend(conn, params)` | `DeptDailyTrendRow[]` | 部門別日次トレンド |

### 3.6 advancedAnalytics.ts（2 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryCategoryMixWeekly(conn, params)` | `CategoryMixWeeklyRow[]` | カテゴリ構成比の週次推移（LAG 付き） |
| `queryStoreBenchmark(conn, params)` | `StoreBenchmarkRow[]` | 店舗ランキング週次推移（RANK OVER） |

### 3.7 budgetAnalysis.ts（2 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryDailyCumulativeBudget(conn, params)` | `DailyCumulativeBudgetRow[]` | 日別累積予算 vs 実績の推移 |
| `queryBudgetAnalysisSummary(conn, params)` | `BudgetAnalysisSummaryRow[]` | 予算分析サマリ（達成率・消化率等） |

### 3.8 conditionMatrix.ts（2 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `computeMidDateKey(fromKey, toKey)` | `string` | 2つの日付キーの中間日を計算 |
| `queryConditionMatrix(conn, params)` | `ConditionMatrixRow[]` | 条件マトリクス（多次元条件分析） |

### 3.9 dailyRecords.ts（4 関数）

| 関数 | 戻り値型 | 説明 |
|---|---|---|
| `queryDailyRecords(conn, params)` | `DailyRecordRow[]` | 日別レコード取得 |
| `queryPrevYearDailyRecords(conn, params)` | `DailyRecordRow[]` | 前年日別レコード取得 |
| `queryAggregatedDailyRecords(conn, params)` | `AggregatedDailyRow[]` | 集約済み日別レコード |
| `dailyRecordTotalCost(row)` | `number` | 日別レコードの合計原価を計算 |

---

## 4. DuckDB フック一覧

フックは `app/src/application/hooks/duckdb/` ディレクトリに分割配置。
`useAsyncQuery<T>` をベースに、ローディング・エラー・データ状態を管理する。

### ファイル構成

| ファイル | 担当 |
|---|---|
| `useAsyncQuery.ts` | 汎用非同期クエリフック（ベース） |
| `useCtsQueries.ts` | カテゴリ時間帯売上クエリ（バレル re-export） |
| `useCtsHierarchyQueries.ts` | カテゴリ階層・日次トレンド・CTS レコード |
| `useCtsAggregationQueries.ts` | 時間帯集約・店舗集約・マトリクス・日数 |
| `useDeptKpiQueries.ts` | 部門 KPI クエリ |
| `useSummaryQueries.ts` | 日別サマリークエリ |
| `useYoyQueries.ts` | 前年比較クエリ |
| `useFeatureQueries.ts` | 特徴量クエリ |
| `useAdvancedQueries.ts` | 高度分析クエリ |
| `useMetricsQueries.ts` | メトリクスクエリ |
| `useComparisonContextQuery.ts` | 比較コンテキストクエリ |
| `useConditionMatrix.ts` | コンディションマトリクスクエリ |
| `useDailyRecordQueries.ts` | 日次レコードクエリ |
| `index.ts` | バレルエクスポート |

> **後方互換:** `application/hooks/useDuckDBQuery.ts` もバレル re-export として残存。

### 戻り値型

```typescript
interface AsyncQueryResult<T> {
  readonly data: T | null       // クエリ結果（未実行時は null）
  readonly isLoading: boolean   // クエリ実行中フラグ
  readonly error: string | null // エラーメッセージ
}
```

### フック一覧（20 個）

| フック | 対応クエリ | 用途 |
|---|---|---|
| `useDuckDBHourlyAggregation` | `queryHourlyAggregation` | 時間帯別集約 |
| `useDuckDBLevelAggregation` | `queryLevelAggregation` | 階層レベル別集約 |
| `useDuckDBStoreAggregation` | `queryStoreAggregation` | 店舗別 x 時間帯 |
| `useDuckDBHourDowMatrix` | `queryHourDowMatrix` | 時間帯 x 曜日マトリクス |
| `useDuckDBDistinctDayCount` | `queryDistinctDayCount` | distinct 日数 |
| `useDuckDBDowDivisorMap` | `queryDowDivisorMap` | 曜日別除数 |
| `useDuckDBCategoryDailyTrend` | `queryCategoryDailyTrend` | カテゴリ別日次トレンド |
| `useDuckDBCategoryHourly` | `queryCategoryHourly` | カテゴリ別 x 時間帯 |
| `useDuckDBDeptKpi` | `queryDeptKpiRanked` + `Summary` | 部門 KPI（ランキング + サマリー） |
| `useDuckDBDeptKpiTrend` | `queryDeptKpiMonthlyTrend` | 部門 KPI 月別トレンド |
| `useDuckDBDailyCumulative` | `queryDailyCumulative` | 日別累積売上 |
| `useDuckDBAggregatedRates` | `queryAggregatedRates` | 期間集約レート |
| `useDuckDBYoyDaily` | `queryYoyDailyComparison` | 日別前年比較 |
| `useDuckDBYoyCategory` | `queryYoyCategoryComparison` | カテゴリ別前年比較 |
| `useDuckDBDailyFeatures` | `queryDailyFeatures` | 日別売上特徴量 |
| `useDuckDBHourlyProfile` | `queryHourlyProfile` | 時間帯別構成比 |
| `useDuckDBDowPattern` | `queryDowPattern` | 曜日パターン |
| `useDuckDBCategoryMixWeekly` | `queryCategoryMixWeekly` | カテゴリ構成比週次 |
| `useDuckDBStoreBenchmark` | `queryStoreBenchmark` | 店舗ベンチマーク |

### コアフック

| フック | ファイル | 説明 |
|---|---|---|
| `useDuckDB(data, year, month, repo)` | `useDuckDB.ts` | エンジン初期化 + データロード。`conn`, `dataVersion`, `loadedMonthCount` を返す |

---

## 5. WidgetContext プロパティ概要

ダッシュボードウィジェットは `WidgetContext` を介してデータを受け取る。

```typescript
interface WidgetContext {
  // 計算結果
  result: StoreResult
  allStoreResults: ReadonlyMap<string, StoreResult>

  // 期間情報
  year: number
  month: number
  daysInMonth: number
  elapsedDays: number | undefined
  dataEndDay: number | undefined

  // 設定
  targetRate: number          // 目標粗利率
  warningRate: number         // 警告しきい値

  // 前年データ
  prevYear: PrevYearData

  // インデックス（O(1) ルックアップ）
  ctsIndex: CategoryTimeSalesIndex
  prevCtsIndex: CategoryTimeSalesIndex
  departmentKpi: DepartmentKpiIndex

  // 日付範囲
  currentDateRange: DateRange
  prevYearDateRange: DateRange | undefined
  selectedStoreIds: ReadonlySet<string>

  // 予算チャートデータ
  budgetChartData: BudgetChartData

  // 説明責任
  explanations: Map<MetricId, Explanation>
  onExplain: (metricId: MetricId) => void

  // 過去月データ
  monthlyHistory: MonthlyDataPoint[]

  // DuckDB 統合
  duckConn: AsyncDuckDBConnection | null
  duckDataVersion: number
  duckLoadedMonthCount: number
  duckDateRange: DateRange

  // メタデータ
  storeKey: string
  stores: ReadonlyMap<string, Store>
  dataMaxDay: number | undefined
}
```

---

## 6. ウィジェット定義 API

### WidgetDef

```typescript
interface WidgetDef {
  id: string                                    // 一意識別子
  label: string                                 // 表示名
  group: string                                 // グループ分類
  size: 'kpi' | 'half' | 'full'               // レイアウトサイズ
  render: (ctx: WidgetContext) => ReactNode     // 描画関数
  isVisible?: (ctx: WidgetContext) => boolean   // データ有無による表示制御
}
```

### レイアウト管理関数

| 関数 | 説明 |
|---|---|
| `loadLayout()` | localStorage からウィジェット配列を読み込み |
| `saveLayout(ids)` | localStorage にウィジェット配列を保存 |
| `autoInjectDataWidgets(ids, ctx)` | データ駆動ウィジェットの自動注入 |

---

## 7. 計算パイプライン API

### CalculationOrchestrator

```typescript
// 全店舗の計算を実行
calculateAllStores(data: ImportedData, settings: AppSettings): Map<string, StoreResult>

// 単一店舗の計算
calculateStoreResult(storeId: string, data: ImportedData, settings: AppSettings): StoreResult
```

### 計算モジュール（domain/calculations/）

| 関数 | 説明 |
|---|---|
| `calculateInvMethod(params)` | 在庫法粗利計算 |
| `calculateEstMethod(params)` | 推定法粗利計算 |
| `analyzeBudget(params)` | 予算分析（消化率・達成率・予測） |
| `calculateForecast(params)` | 週間予測（曜日別平均・異常値検出） |
| `aggregateStoreResults(results)` | 全店集計（加重平均） |
| `calculateDiscountImpact(params)` | 売変影響分析 |
| `decompose2(prev, cur)` | 2 要素分解（客数 x 客単価） |
| `decompose3(prev, cur)` | 3 要素分解（客数 x 点数 x 単価） |
| `decompose5(prev, cur, categories)` | 5 要素分解（客数 x 点数 x 価格 x 構成比） |
