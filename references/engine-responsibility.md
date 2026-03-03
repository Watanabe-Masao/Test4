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
| 感度分析・弾力性 | `sensitivity.ts` | 単月 |
| 因果チェーン | `causalChain.ts` | 単月 |
| 予測・異常値検出 | `forecast.ts` | 単月（日次データの週別・曜日別集計） |
| トレンド分析・季節性 | `trendAnalysis.ts` | 複数月（月次粒度の推移分析） |
| 線形回帰・加重移動平均 | `advancedForecast.ts` | 単月（日次データの回帰） |
| 相関分析・正規化 | `correlation.ts` | 汎用統計関数 |
| アラート・閾値評価 | `alertSystem.ts` | 単月（StoreResult からルール評価） |
| 日別推定在庫計算 | `inventoryCalc.ts` | 単月（推定法による在庫推移） |
| 売変影響分析 | `discountImpact.ts` | 単月（売変ロス原価の算出） |
| ピン止め区間粗利計算 | `pinIntervals.ts` | 区間（在庫確定日で区切られた期間） |

### DuckDB 探索エンジン（infrastructure/duckdb/queries/）

任意日付範囲の探索・集約。SQL ウィンドウ関数で月跨ぎ対応。

| 計算内容 | モジュール | スコープ |
|---|---|---|
| 時間帯×曜日×カテゴリ集約 | `categoryTimeSales.ts` | 自由日付範囲 |
| 店舗ベンチマーク | `advancedAnalytics.ts` | 自由日付範囲 |
| カテゴリ構成比推移 | `advancedAnalytics.ts` | 週次集約 |
| 部門 KPI 集約 | `departmentKpi.ts` | 自由日付範囲 |
| 日次累積・指標推移 | `storeDaySummary.ts` | 自由日付範囲 |
| 前年比較 | `yoyComparison.ts` | 自由日付範囲 |
| 特徴量・異常検出（Zスコア） | `features.ts` | 月跨ぎ（28日ウィンドウ関数） |
| 予算累積推移・サマリー | `budgetAnalysis.ts` | 月跨ぎ（日別累積） |
| 日次レコード詳細 | `dailyRecords.ts` | 自由日付範囲 |
| 店舗期間メトリクス | `storePeriodMetrics.ts` | 自由日付範囲 |
| 条件マトリクス集約 | `conditionMatrix.ts` | 自由日付範囲 |

### 両エンジンに存在する概念の区別

以下は同じ名前の概念が両エンジンに存在するが、スコープが異なるため二重実装ではない。

| 概念 | JS（単月確定値） | DuckDB（月跨ぎ探索） |
|---|---|---|
| 予算分析 | `calculateBudgetAnalysis()`: StoreResult から達成率・消化率を算出 | `queryDailyCumulativeBudget()`: 任意期間の日別累積推移 |
| 異常値検出 | `detectAnomalies()`: 単月の日次データのσ乖離検出 | `queryDailyFeatures()`: 28日ウィンドウZスコア |
| トレンド | `analyzeTrend()`: 月次粒度の複数月推移 | `queryStoreDaySummary()`: 日次粒度の累積推移 |

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

| | JS 計算エンジン | DuckDB 探索エンジン |
|---|---|---|
| 出力 | `StoreResult` | SQL 集約結果（行配列） |
| スコープ | 単月確定値 | 任意日付範囲 |
| 定義場所 | `domain/calculations/` | `infrastructure/duckdb/queries/` |
| フック | `application/usecases/` | `application/hooks/duckdb/` |
| テスト | ユニットテスト + 不変条件テスト | integration テスト |

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
