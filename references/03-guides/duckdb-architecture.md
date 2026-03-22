# DuckDB-WASM インブラウザ分析

> 本ドキュメントは CLAUDE.md から詳細を分離したものである。

### 概要

DuckDB-WASM をインブラウザ SQL エンジンとして統合し、月制約を超えた自由日付範囲での
分析を可能にした。時間帯・カテゴリ等の多次元集約は DuckDB が担い、
KPI・粗利等の権威的指標計算は JS 計算パイプライン（`StoreResult`）が担う。

### アーキテクチャ

```
  IndexedDB           OPFS              DuckDB-WASM             React hooks         UI
 ┌──────────┐      ┌──────────┐      ┌──────────────┐        ┌──────────────┐    ┌──────────┐
 │ 保存済み  │      │ DB ファイル│      │ engine.ts    │        │ useDuckDB    │    │ DuckDB   │
 │ インポート│ load │ Parquet   │ fast │ schemas.ts   │ query  │ hooks/duckdb/│    │ ウィジェ │
 │ データ   │──→  │ キャッシュ │──→  │ dataLoader.ts│──→    │ (~28 hooks)  │──→│ ット群   │
 └──────────┘      └──────────┘      │ queries/*.ts │        │ (12ファイル) │    │ (15個)   │
                                     └──────────────┘        └──────────────┘    └──────────┘
```

**データフロー:**
1. ユーザーがファイルインポート → IndexedDB に保存（既存フロー）
2. `useDuckDB` フックが IndexedDB → DuckDB テーブルにデータ投入（`dataLoader.ts`）
3. DuckDB に SQL クエリを発行し、集約済み結果を取得（`queries/*.ts`）
4. `hooks/duckdb/` 配下の各フックが SQL 結果を React ステートとして返す
5. DuckDB ウィジェットはフックの戻り値のみを参照して描画

### レイヤー配置

| レイヤー | ファイル | 責務 |
|---|---|---|
| **Infrastructure** | `duckdb/engine.ts` | DB 初期化、接続ライフサイクル管理 |
| | | `duckdb/schemas.ts` | テーブル DDL（13テーブル + `store_day_summary` VIEW）、`SCHEMA_VERSION` 管理 |
| | `duckdb/dataLoader.ts` | IndexedDB → DuckDB バルクロード |
| | `duckdb/queryRunner.ts` | 汎用 `runQuery<T>()` ユーティリティ |
| | `duckdb/queryParams.ts` | SQL パラメータのバリデーション（Branded Type 連携） |
| | `duckdb/queryProfiler.ts` | クエリパフォーマンス計測 |
| | `duckdb/arrowIO.ts` | Arrow フォーマット I/O |
| | `duckdb/recovery.ts` | DuckDB エラーリカバリ・自動回復 |
| | `duckdb/opfsPersistence.ts` | OPFS 永続化戦略判定、Parquet キャッシュ管理 |
| | `duckdb/migrations/` | スキーママイグレーション（DDL バージョン管理） |
| | `duckdb/queries/*.ts` | SQL クエリ関数（11 モジュール） |
| **Application** | `hooks/useDuckDB.ts` | DB 初期化 + データロード管理フック |
| | `hooks/duckdb/*.ts` | クエリフック群（11ファイル、~29フック、`useAsyncQuery` ベース） |
| | `hooks/useDuckDBQuery.ts` | バレル re-export（後方互換） |
| **Presentation** | `charts/*.tsx` | 15 個のチャートウィジェット |
| | `charts/DateRangePicker.tsx` | 自由日付範囲セレクタ |

#### DuckDB テーブル一覧

DuckDB スキーマは以下の基本テーブルと VIEW で構成される:

| テーブル | DDL 定数 | 用途 |
|---|---|---|
| `classified_sales` | `CLASSIFIED_SALES_DDL` | 分類別売上 |
| `category_time_sales` | `CATEGORY_TIME_SALES_DDL` | 分類別時間帯売上 |
| `time_slots` | `TIME_SLOTS_DDL` | 時間帯マスタ |
| `purchase` | `PURCHASE_DDL` | 仕入データ |
| `special_sales` | `SPECIAL_SALES_DDL` | 花・産直等の特殊売上 |
| `transfers` | `TRANSFERS_DDL` | 移動データ |
| `consumables` | `CONSUMABLES_DDL` | 消耗品データ |
| `department_kpi` | `DEPARTMENT_KPI_DDL` | 部門別KPI |
| `budget` | `BUDGET_DDL` | 予算データ |
| `inventory_config` | `INVENTORY_CONFIG_DDL` | 在庫設定 |
| `app_settings` | `APP_SETTINGS_DDL` | アプリケーション設定 |
| `weather_hourly` | `WEATHER_HOURLY_DDL` | 気象庁 ETRN 時間別天気データ（API 取得→DuckDB キャッシュ） |
| `store_day_summary` | — (VIEW) | 上記テーブルの LEFT JOIN による日次サマリ **VIEW** |

`SCHEMA_VERSION` によりテーブル定義のバージョンが管理され、
`migrations/` 配下のマイグレーションスクリプトでスキーマ変更を適用する。
`schema_meta` テーブルはマイグレーション追跡用のメタテーブルとして別途存在する。

#### DuckDB フック構成

フックは `application/hooks/duckdb/` 配下に責務別に分割されている
（設計思想4「変更頻度が異なるものは分離する」に従い、旧 `useDuckDBQuery.ts` から分割）:

```
hooks/duckdb/
├── index.ts                       # バレル re-export
├── useAsyncQuery.ts               # 基盤フック（シーケンス番号によるキャンセル制御）
├── useJsAggregationQueries.ts     # JS集約フック（SQL→JS移行済み、5フック）★新規
├── useCtsQueries.ts               # 時間帯売上クエリ（9フック）
├── useDeptKpiQueries.ts           # 部門KPIクエリ（2フック）
├── useSummaryQueries.ts           # サマリクエリ（2フック、内部でJS版に委譲）
├── useYoyQueries.ts               # 前年比較クエリ（2フック、日別はJS版に委譲）
├── useFeatureQueries.ts           # 特徴量クエリ（3フック、全てJS版に委譲）
├── useAdvancedQueries.ts          # 高度分析クエリ（2フック）
├── useMetricsQueries.ts           # 指標クエリ（3フック）
├── useDailyRecordQueries.ts       # 日次レコードクエリ（3フック）
├── useComparisonContextQuery.ts   # 比較コンテキストクエリ
└── useConditionMatrix.ts          # 条件マトリクスクエリ
```

`useJsAggregationQueries.ts` は DuckDB から `SELECT * WHERE` で生データを取得し、
`domain/calculations/rawAggregation.ts` の純粋関数で集約を実行する。
既存フック（`useSummaryQueries`, `useFeatureQueries`, `useYoyQueries`）は
内部で JS 版に委譲し、外部 API は変更なし（後方互換維持）。

`hooks/useDuckDBQuery.ts` は後方互換のためバレル re-export として残存している。

### クエリモジュール一覧

| モジュール | 主要クエリ関数 | 用途 |
|---|---|---|
| `categoryTimeSales.ts` | `queryHourlyAggregation`, `queryLevelAggregation`, `queryStoreAggregation`, `queryHourDowMatrix`, `queryDistinctDayCount`, `queryCategoryDailyTrend`, `queryCategoryHourly`, `queryDowDivisorMap` | 時間帯集約、カテゴリ分析 |
| `departmentKpi.ts` | `queryDeptKpiRanked`, `queryDeptKpiSummary`, `queryDeptKpiMonthlyTrend` | 部門 KPI |
| `storeDaySummary.ts` | `queryStoreDaySummary`, `queryAggregatedRates`, `queryDailyCumulative`, `materializeSummary` | 累積売上、指標推移、VIEW 構築 |
| `yoyComparison.ts` | `queryYoyDailyComparison`, `queryYoyCategoryComparison` | 前年比較 |
| `features.ts` | `queryDailyFeatures`, `queryHourlyProfile`, `queryDowPattern`, `queryDeptDailyTrend` | 特徴量、時間帯プロファイル、曜日パターン |
| `advancedAnalytics.ts` | `queryCategoryMixWeekly`, `queryStoreBenchmark` | 構成比推移、店舗ベンチマーク |
| `budgetAnalysis.ts` | `queryDailyCumulativeBudget`, `queryBudgetAnalysisSummary` | 予算分析、累積予算対実績 |
| `dailyRecords.ts` | `queryDailyRecords`, `queryPrevYearDailyRecords`, `queryAggregatedDailyRecords` | 日次レコード詳細、前年日次データ |
| `storePeriodMetrics.ts` | `queryStorePeriodMetrics`, `queryStorePeriodMetricsSingle` | 店舗期間メトリクス |
| `conditionMatrix.ts` | `queryConditionMatrix` | 条件マトリクス集約 |
| `weatherQueries.ts` | `queryWeatherHourly`, `queryWeatherHourlyAvg`, `queryWeatherCacheCount`, `deleteWeatherCache` | 天気データ取得・時間帯別平均・キャッシュ管理 |

### チャートウィジェット一覧（15個）

| ウィジェット | 分析内容 | サイズ |
|---|---|---|
| `FeatureChart` | 日次特徴量分析 | full |
| `CumulativeChart` | 累積売上推移 | full |
| `YoYChart` | 前年同期比較 | full |
| `DeptTrendChart` | 部門 KPI トレンド | full |
| `TimeSlotChart` | 時間帯別売上（前年比較付き） | full |
| `HeatmapChart` | 時間帯×曜日ヒートマップ | full |
| `DeptHourlyChart` | 部門別時間帯パターン | full |
| `StoreHourlyChart` | 店舗×時間帯比較 | full |
| `DowPatternChart` | 曜日パターン分析 | half |
| `HourlyProfileChart` | 時間帯プロファイル | half |
| `CategoryTrendChart` | カテゴリ別日次売上推移 | full |
| `CategoryHourlyChart` | カテゴリ×時間帯ヒートマップ | full |
| `CategoryMixChart` | カテゴリ構成比の週次推移 | full |
| `StoreBenchmarkChart` | 店舗ベンチマーク（ランキング推移） | full |
| `DateRangePicker` | 自由日付範囲セレクタ（ウィジェットではなくコントロール） | — |

### 2つの計算エンジンの責務分離

本システムには2つの計算エンジンがあり、それぞれ**異なる責務**を持つ。
両方で同じことをやる「二重実装」は一貫性を欠き、保守コストを倍増させるため禁止する。

```
┌────────────────────────────────┐  ┌────────────────────────────────┐
│  JS 計算エンジン               │  │  DuckDB 探索エンジン            │
│  (domain/calculations)         │  │  (infrastructure/duckdb)       │
│                                │  │                                │
│  役割: 権威的な指標計算         │  │  役割: 自由範囲の探索・集約      │
│                                │  │                                │
│  ・シャープリー分解             │  │  ・月跨ぎ時系列分析             │
│  ・在庫法/推定法 粗利計算       │  │  ・時間帯×曜日×カテゴリ集約     │
│  ・予算達成率/消化率            │  │  ・異常検出 (Zスコア)           │
│  ・感度分析/回帰               │  │  ・店舗ベンチマーク             │
│  ・因果チェーン                │  │  ・カテゴリドリルダウン          │
│                                │  │                                │
│  出力: StoreResult             │  │  出力: SQL 集約結果             │
│  スコープ: 単月確定値           │  │  スコープ: 任意日付範囲          │
└────────────────────────────────┘  └────────────────────────────────┘
```

**JS 計算エンジンでなければならないもの:**
- `StoreResult` を生成する計算パイプライン（dailyBuilder, storeAssembler）
- シャープリー恒等式を満たす要因分解（不変条件テストが JS で検証）
- 在庫法・推定法の粗利計算（数学的正確性の保証が JS テストに依存）
- KPI カード、ウォーターフォール、感度分析等の `StoreResult` 消費ウィジェット

**DuckDB でなければならないもの:**
- `category_time_sales` / `time_slots` の多次元集約（行数が多く SQL GROUP BY でのデータ削減が有効）
- 大量レコードの集約（10万件超の走査は SQL が JS より効率的）

**JS で実行するもの（DuckDB は SELECT * のみ）:**
- `store_day_summary` 系の集約（日別累積、移動平均、Zスコア、曜日パターン等）
  → `rawAggregation.ts` の純粋関数 + `useJsAggregationQueries.ts` のフック
- 前年比較（日別）: 2回の SELECT * → JS で yoyMerge
- Hybrid: SQL GROUP BY でデータ削減 → JS でウィンドウ関数（share, rank）

**やってはならないこと:**
- 同じ集約ロジックを JS と SQL の両方に実装する（二重実装）
- SQL→JS 移行時に既存フック名・型を変更する（委譲パターンで後方互換維持）

### OPFS 永続化戦略

DuckDB-WASM は OPFS（Origin Private File System）を永続ストレージとして使用する。
起動時に `checkIntegrity` で OPFS DB の整合性を検証し、最適なリロード戦略を自動選択する。

```
起動 → checkIntegrity()
  │
  ├─ schemaValid && monthCount > 0 → 'opfs-valid'（再ロード不要）
  │
  ├─ hasParquetCache → 'parquet-restore'（Parquet から高速リストア）
  │
  └─ それ以外 → 'full-reload'（IndexedDB から通常ロード）
```

| 戦略 | 条件 | 処理 | 起動速度 |
|---|---|---|---|
| `opfs-valid` | OPFS DB にスキーマ整合 + データあり | 何もしない | 最速 |
| `parquet-restore` | OPFS に Parquet キャッシュあり | `importParquet()` | 高速（列指向読込） |
| `full-reload` | OPFS が空 or スキーマ不一致 | IndexedDB → JSON → `loadMonth()` | 通常 |

**関連ファイル:**
- `opfsPersistence.ts` — `determineReloadStrategy()`, `scheduleParquetExport()`, `clearParquetCache()`
- `worker/duckdbWorker.ts` — `checkIntegrity`, `exportParquet`, `importParquet` ハンドラ
- `worker/types.ts` — `IntegrityCheckResult`, `ParquetExportResult`, `ParquetImportResult`

### Parquet 列指向キャッシュ

データロード完了後、全テーブルを OPFS 上の Parquet ファイルに非同期エクスポートする
（fire-and-forget パターン）。Parquet は列指向 + ZSTD 圧縮で、JSON ロードより大幅に
高速なリストアを実現する。

```
データロード完了 → scheduleParquetExport()（非同期・非ブロック）
                    ↓
  COPY <table> TO 'opfs://parquet-cache/<table>.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)
                    ↓
  次回起動時: read_parquet() で高速インポート
```

- エクスポート対象: `app_settings` 以外の全テーブル（10テーブル）
- 保存先: `opfs://parquet-cache/<table_name>.parquet`
- 圧縮: ZSTD（DuckDB ネイティブ対応、高圧縮率 + 高速展開）
- 失敗時: キャッシュは best-effort。失敗しても `full-reload` で動作継続

### Worker メッセージプロトコル

DuckDB Worker は以下のメッセージタイプを処理する:

| メッセージ | 用途 | 戻り値 |
|---|---|---|
| `initialize` | DuckDB-WASM 初期化 + OPFS 永続化試行 | `{ isOpfsPersisted }` |
| `resetTables` | 全テーブル DROP + CREATE | — |
| `loadMonth` | 1ヶ月分の ImportedData を投入 | `LoadResult` |
| `deleteMonth` | 指定月のデータを削除 | — |
| `query` | SQL クエリ実行 → camelCase オブジェクト配列 | `T[]` |
| `checkIntegrity` | OPFS 整合性チェック | `IntegrityCheckResult` |
| `exportParquet` | 全テーブルを Parquet にエクスポート | `ParquetExportResult` |
| `importParquet` | Parquet からテーブルにインポート | `ParquetImportResult` |
| `generateReport` | SQL → CSV 文字列生成（メインスレッド非ブロック） | `ReportGenerateResult` |
| `dispose` | コネクション切断 + Worker 終了 | — |

### データ契約テスト

`dataContract.test.ts`（25テスト）が Domain ↔ DuckDB ↔ Import の構造的整合性を機械的に検証する:

| 検証カテゴリ | テスト内容 |
|---|---|
| DuckDB テーブル定義 | 必須カラムの存在、TABLE_NAMES の網羅性 |
| Domain → DuckDB マッピング | ClassifiedSalesRecord, CategoryTimeSalesRecord, DepartmentKpiRecord の全フィールドが対応 DDL カラムに存在 |
| ファイルインポート構造 | FILE_TYPE_REGISTRY の minRows/minCols が契約値と一致 |
| スキーマバージョン | SCHEMA_VERSION の正当性、マイグレーション連番 |
| Parquet 互換性 | 全 DDL カラム型が Parquet 互換型（INTEGER, DOUBLE, VARCHAR, BOOLEAN） |

入力フォーマット変更時にこのテストが即座に失敗し、層間のデータ契約違反を早期検出する
（設計原則 #1「機械で守る」の実践）。

### 設計原則

1. **エンジンの責務は排他的**: 1つのデータ集約に対して、JS と DuckDB の両方で
   実装してはならない。どちらが担うかを明確にし、一方だけに実装する。
2. **DuckDB はデータ取得、JS は集約**: `store_day_summary` 系の集約は JS 純粋関数
   （`rawAggregation.ts`）で実行し、DuckDB は `SELECT * WHERE` によるフィルタ済み
   データ取得に専念する。`category_time_sales` 系は行数が多いため SQL GROUP BY を維持し、
   ウィンドウ関数（share, rank）のみ JS に移行する（Hybrid パターン）。
3. **月跨ぎ対応**: `duckDateRange`（自由日付範囲）を使い、月単位制約を超えた分析が可能。
   `useDuckDB` フックが複数月のデータを DuckDB にロードする。
4. **非同期安全**: `useAsyncQuery` フックがシーケンス番号によるキャンセル制御を内蔵し、
   古いクエリ結果が新しい結果を上書きしない。
5. **可視性制御**: 各ウィジェットの `isVisible` で DuckDB 未準備時（`duckDataVersion === 0`）
   やデータ不足時に非表示。店舗比較系は `stores.size > 1` をガード。
6. **永続化は best-effort**: OPFS / Parquet キャッシュは起動高速化のための最適化であり、
   失敗しても `full-reload` で正常動作する。データの権威は IndexedDB（原本）にある。
7. **後方互換の委譲パターン**: SQL→JS 移行時、既存フック名（`useDuckDBDailyCumulative` 等）
   は維持し、内部で JS 版（`useJsDailyCumulative` 等）に委譲する。
   チャートコンポーネントの変更は不要。
