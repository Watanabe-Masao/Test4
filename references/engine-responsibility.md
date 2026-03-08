# JS vs DuckDB エンジン責務マトリクス

本システムには2つの計算エンジンがあり、それぞれ排他的な責務を持つ。
同じ集約ロジックを両方に実装する「二重実装」は禁止。

**注意:** 同じ概念（例: 予算分析、Zスコア）が両エンジンに存在する場合がある。
これはスコープが異なるため二重実装には該当しない（単月確定値 vs 月跨ぎ探索）。

## 責務割当

### JS 計算エンジン（domain/calculations/）

StoreResult の確定値を消費する単月計算。全て純粋関数。

| 計算内容 | モジュール | スコープ |
|---|---|---|
| シャープリー要因分解 | `factorDecomposition.ts` | 単月 |
| 在庫法/推定法 粗利計算 | `invMethod.ts`, `estMethod.ts` | 単月 |
| 予算達成率・消化率 | `budgetAnalysis.ts` | 単月（StoreResult 確定値） |
| 感度分析・弾力性 | `algorithms/sensitivity.ts` | 単月 |
| 因果チェーン | `causalChain.ts` | 単月 |
| 予測・異常値検出 | `forecast.ts` | 単月（日次データの週別・曜日別集計） |
| トレンド分析・季節性 | `algorithms/trendAnalysis.ts` | 複数月（月次粒度の推移分析） |
| 線形回帰・加重移動平均 | `algorithms/advancedForecast.ts` | 単月（日次データの回帰） |
| 相関分析・正規化 | `algorithms/correlation.ts` | 汎用統計関数 |
| アラート・閾値評価 | `rules/alertSystem.ts` | 単月（StoreResult からルール評価） |
| 日別推定在庫計算 | `inventoryCalc.ts` | 単月（推定法による在庫推移） |
| 売変影響分析 | `discountImpact.ts` | 単月（売変ロス原価の算出） |
| ピン止め区間粗利計算 | `pinIntervals.ts` | 区間（在庫確定日で区切られた期間） |

### DuckDB 探索エンジン（infrastructure/duckdb/queries/）

任意日付範囲の探索・集約。SQL でフィルタ済みデータを取得し、集約は用途に応じて
SQL または JS で実行する（後述「SQL→JS 移行」参照）。

| 計算内容 | モジュール | 集約方式 | スコープ |
|---|---|---|---|
| 時間帯×曜日×カテゴリ集約 | `categoryTimeSales.ts` | SQL GROUP BY | 自由日付範囲 |
| 店舗ベンチマーク | `advancedAnalytics.ts` | SQL | 自由日付範囲 |
| カテゴリ構成比推移 | `advancedAnalytics.ts` | SQL | 週次集約 |
| 部門 KPI 集約 | `departmentKpi.ts` | SQL（WHERE のみ） | 自由日付範囲 |
| 日次累積・指標推移 | `storeDaySummary.ts` | **JS**（移行済み） | 自由日付範囲 |
| 前年比較（日別） | `yoyComparison.ts` | **JS**（移行済み） | 自由日付範囲 |
| 前年比較（カテゴリ別） | `yoyComparison.ts` | SQL FULL OUTER JOIN | 自由日付範囲 |
| 特徴量・異常検出（Zスコア） | `features.ts` | **JS**（移行済み） | 月跨ぎ |
| 曜日パターン | `features.ts` | **JS**（移行済み） | 自由日付範囲 |
| 時間帯プロファイル | `features.ts` | **Hybrid**（SQL GROUP BY + JS share/rank） | 自由日付範囲 |
| 予算累積推移・サマリー | `budgetAnalysis.ts` | SQL | 月跨ぎ（日別累積） |
| 日次レコード詳細 | `dailyRecords.ts` | SQL | 自由日付範囲 |
| 条件マトリクス集約 | `conditionMatrix.ts` | SQL | 自由日付範囲 |

### 両エンジンに存在する概念の区別

以下は同じ名前の概念が両エンジンに存在するが、スコープが異なるため二重実装ではない。

| 概念 | JS（単月確定値） | DuckDB（月跨ぎ探索） |
|---|---|---|
| 予算分析 | `calculateBudgetAnalysis()`: StoreResult から達成率・消化率を算出 | `queryDailyCumulativeBudget()`: 任意期間の日別累積推移 |
| 異常値検出 | `detectAnomalies()`: 単月の日次データのσ乖離検出 | `queryDailyFeatures()`: 28日ウィンドウZスコア |
| トレンド | `analyzeTrend()`: 月次粒度の複数月推移 | `queryStoreDaySummary()`: 日次粒度の累積推移 |

### SQL→JS 移行（Phase 3）

DuckDB の SQL ウィンドウ関数・集約ロジックの一部を JS 純粋関数に移行した。
DuckDB は**フィルタ済みの生データ取得**（`SELECT * WHERE`）に専念し、
集約計算は `domain/calculations/rawAggregation.ts` の純粋関数で実行する。

**移行パターン:**

```
移行前:  DuckDB SQL (GROUP BY + WINDOW) → Hook → UI
移行後:  DuckDB SQL (SELECT * WHERE)    → JS 純粋関数 → Hook → UI
```

**移行済みフック（`application/hooks/duckdb/useJsAggregationQueries.ts`）:**

| フック | 移行前の SQL | JS 代替 |
|---|---|---|
| `useJsDailyCumulative` | `SUM() OVER (ORDER BY date_key)` | `aggregateByDay` + `cumulativeSum` |
| `useJsDailyFeatures` | `AVG/STDDEV_POP OVER (ROWS 3/7/28)` | `movingAverage` + `stddevPop` + `zScore` |
| `useJsDowPattern` | `AVG(sales) GROUP BY dow` + `STDDEV_POP` | `dowAggregate` + `stddevPop` + `coefficientOfVariation` |
| `useJsYoyDaily` | `FULL OUTER JOIN` (当年 × 前年) | 2回の `SELECT *` + `yoyMerge` |
| `useJsHourlyProfile` | `SUM() OVER` + `RANK()` | SQL GROUP BY (store_id, hour) + JS `categoryShare` + `rankBy` |

**既存フックは委譲パターンで後方互換維持:**
```typescript
// useSummaryQueries.ts — 外部 API は変更なし
export function useDuckDBDailyCumulative(...) {
  return useJsDailyCumulative(...)  // 内部で JS 版に委譲
}
```

**未移行（SQL 維持）:**
- `category_time_sales` 系: データ量が多く SQL GROUP BY によるデータ削減が有効
- `advancedAnalytics` 系: 複雑な SQL（LAG, 週次集約）が密結合
- `budgetAnalysis` 系: SQL 累積計算が効率的
- `departmentKpi` 系: 集約なし（WHERE + ORDER BY のみ）で移行不要

**純粋関数の配置:**
- `domain/calculations/rawAggregation.ts` — 統計計算（aggregateByDay, cumulativeSum, movingAverage, stddevPop, zScore, rankBy, yoyMerge 等）
- `domain/calculations/rawAggregation.test.ts` — 23テストで全関数をカバー

## 判定フロー

```
この計算は…
├── StoreResult の確定値を消費するか？
│   └── Yes → JS（domain/calculations/ or application/usecases/）
├── 月跨ぎクエリか？
│   └── Yes → DuckDB（infrastructure/duckdb/queries/）
├── 多次元集約（GROUP BY 3変数以上）か？
│   └── Yes → DuckDB
├── 10万件超の走査が必要か？
│   └── Yes → DuckDB
└── 上記いずれでもない → JS が妥当（シンプルな計算は JS に寄せる）
```

## 出力の違い

| | JS 計算エンジン（確定値） | JS 集約エンジン（探索値） | DuckDB SQL |
|---|---|---|---|
| 出力 | `StoreResult` | 集約結果（行配列） | SQL 集約結果（行配列） |
| スコープ | 単月確定値 | 任意日付範囲 | 任意日付範囲 |
| 定義場所 | `domain/calculations/` | `domain/calculations/rawAggregation.ts` | `infrastructure/duckdb/queries/` |
| フック | `application/usecases/` | `application/hooks/duckdb/useJsAggregationQueries.ts` | `application/hooks/duckdb/` |
| テスト | ユニットテスト + 不変条件テスト | ユニットテスト（23テスト） | integration テスト |
| データ取得 | IndexedDB → 計算パイプライン | DuckDB `SELECT * WHERE` → JS | DuckDB SQL 集約 |

## DuckDB の位置づけ — 5層データモデルにおける派生キャッシュ

DuckDB は **normalized_records（IndexedDB）から派生するキャッシュ層** である。
詳細は `data-model-layers.md` を参照。

```
normalized_records (IndexedDB)
  ↓ dataLoader.loadMonth()
DuckDB tables (in-memory + OPFS)
  ↓ queries/*.ts
SQL 集約結果 → UI
```

**鉄則:**
1. DuckDB が壊れても `rebuildFromIndexedDB()` で完全再構築可能
2. DuckDB のクエリ結果を IndexedDB に書き戻すことは禁止（Architecture Guard で保証）
3. UI が DuckDB に直接書き込むことは禁止
4. DuckDB は探索（読み取り専用）にのみ使用する

**Architecture Guard:**
- `storage/` は `duckdb/queries/` に依存しない（書き戻し禁止）
- `presentation/` は `duckdb/` を直接参照しない（`application/hooks` 経由）

## 永続化とトランスポート（計算エンジンの外側）

以下は「計算」ではなく「データの保存・転送」であり、エンジン責務の外側に位置する。

| 機能 | 層 | 説明 |
|---|---|---|
| **Parquet キャッシュ** | infrastructure | DuckDB テーブルを OPFS に Parquet 形式で保存。列指向 + ZSTD 圧縮で次回起動時の高速リストアを実現。**計算は行わない**（データの保存形式変換のみ） |
| **reportExportWorker** | application/workers | CSV レポートの文字列生成を Worker スレッドで実行。SQL クエリ結果 → CSV 変換のトランスポート層。**新しい集約は行わない** |
| **OPFS 永続化** | infrastructure | `opfs://shiire-arari.duckdb` に DuckDB DB ファイルを永続保存。起動時の整合性チェックでリロード戦略を判定 |

**注意:** Parquet は「ストレージフォーマット」であり「計算エンジン」ではない。
Parquet 導入は二重実装禁止に抵触しない。

## データ契約によるエンジン間整合性保証

`dataContract.test.ts` がエンジン間のデータ構造整合性を機械的に検証する:

- **Domain → DuckDB**: `ClassifiedSalesRecord` の全フィールドが `classified_sales` テーブルの
  対応カラムに存在するか
- **Import → Domain**: `FILE_TYPE_REGISTRY` の構造制約（minRows/minCols）が想定値と一致するか
- **DuckDB → Parquet**: 全テーブルカラム型が Parquet 互換型であるか

これにより、一方のエンジンのスキーマ変更が他方との不整合を引き起こした場合、
テストが即座に失敗する（設計原則 #1「機械で守る」）。
