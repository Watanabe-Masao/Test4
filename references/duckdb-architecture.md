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
 └──────────┘      └──────────┘      │ queries/*.ts │        │ (11ファイル) │    │ (15個)   │
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
| | `duckdb/schemas.ts` | テーブル DDL（12テーブル + `store_day_summary` VIEW）、`SCHEMA_VERSION` 管理 |
| | `duckdb/dataLoader.ts` | IndexedDB → DuckDB バルクロード |
| | `duckdb/queryRunner.ts` | 汎用 `runQuery<T>()` ユーティリティ |
| | `duckdb/queryParams.ts` | SQL パラメータのバリデーション（Branded Type 連携） |
| | `duckdb/queryProfiler.ts` | クエリパフォーマンス計測 |
| | `duckdb/arrowIO.ts` | Arrow フォーマット I/O |
| | `duckdb/recovery.ts` | DuckDB エラーリカバリ・自動回復 |
| | `duckdb/opfsPersistence.ts` | OPFS 永続化戦略判定、Parquet キャッシュ管理 |
| | `duckdb/migrations/` | スキーママイグレーション（DDL バージョン管理） |
| | `duckdb/queries/*.ts` | SQL クエリ関数（10 モジュール） |
| **Application** | `hooks/useDuckDB.ts` | DB 初期化 + データロード管理フック |
| | `hooks/duckdb/*.ts` | クエリフック群（11ファイル、~29フック、`useAsyncQuery` ベース） |
| | `hooks/useDuckDBQuery.ts` | バレル re-export（後方互換） |
| **Presentation** | `charts/DuckDB*.tsx` | 15 個の DuckDB ウィジェット |
| | `charts/DuckDBDateRangePicker.tsx` | 自由日付範囲セレクタ |

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
| `store_day_summary` | — (VIEW) | 上記テーブルの LEFT JOIN による日次サマリ **VIEW** |

`SCHEMA_VERSION` によりテーブル定義のバージョンが管理され、
`migrations/` 配下のマイグレーションスクリプトでスキーマ変更を適用する。
`schema_meta` テーブルはマイグレーション追跡用のメタテーブルとして別途存在する。

#### DuckDB フック構成

フックは `application/hooks/duckdb/` 配下に責務別に分割されている
（設計思想4「変更頻度が異なるものは分離する」に従い、旧 `useDuckDBQuery.ts` から分割）:

```
hooks/duckdb/
├── index.ts                  # バレル re-export
├── useAsyncQuery.ts          # 基盤フック（シーケンス番号によるキャンセル制御）
├── useCtsQueries.ts          # 時間帯売上クエリ（9フック）
├── useDeptKpiQueries.ts      # 部門KPIクエリ（2フック）
├── useSummaryQueries.ts      # サマリクエリ（2フック）
├── useYoyQueries.ts          # 前年比較クエリ（2フック）
├── useFeatureQueries.ts      # 特徴量クエリ（3フック）
├── useAdvancedQueries.ts     # 高度分析クエリ（2フック）
├── useMetricsQueries.ts      # 指標クエリ（3フック）
├── useDailyRecordQueries.ts  # 日次レコードクエリ（3フック）
└── useConditionMatrix.ts     # 条件マトリクスクエリ
```

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

### DuckDB ウィジェット一覧（15個）

| ウィジェット | 分析内容 | サイズ |
|---|---|---|
| `DuckDBFeatureChart` | 日次特徴量分析 | full |
| `DuckDBCumulativeChart` | 累積売上推移 | full |
| `DuckDBYoYChart` | 前年同期比較 | full |
| `DuckDBDeptTrendChart` | 部門 KPI トレンド | full |
| `DuckDBTimeSlotChart` | 時間帯別売上（前年比較付き） | full |
| `DuckDBHeatmapChart` | 時間帯×曜日ヒートマップ | full |
| `DuckDBDeptHourlyChart` | 部門別時間帯パターン | full |
| `DuckDBStoreHourlyChart` | 店舗×時間帯比較 | full |
| `DuckDBDowPatternChart` | 曜日パターン分析 | half |
| `DuckDBHourlyProfileChart` | 時間帯プロファイル | half |
| `DuckDBCategoryTrendChart` | カテゴリ別日次売上推移 | full |
| `DuckDBCategoryHourlyChart` | カテゴリ×時間帯ヒートマップ | full |
| `DuckDBCategoryMixChart` | カテゴリ構成比の週次推移 | full |
| `DuckDBStoreBenchmarkChart` | 店舗ベンチマーク（ランキング推移） | full |
| `DuckDBDateRangePicker` | 自由日付範囲セレクタ（ウィジェットではなくコントロール） | — |

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
- 月跨ぎクエリ（JS の CTS インデックスは単月分のみ保持）
- 時間帯×曜日×カテゴリの多次元集約（SQL の GROUP BY が適切）
- 大量レコードの集約（10万件超の走査は SQL が JS より効率的）

**やってはならないこと:**
- 同じ集約ロジックを JS と SQL の両方に実装する（二重実装）
- 一部のウィジェットだけ DuckDB 対応し、同種の他のウィジェットは CTS のまま放置する
  （現状の Unified 5個 + CTS 専用 2個 は一貫性を欠いている）
- CTS インデックスによる JS 集約を「DuckDB のフォールバック」として維持する
  （フォールバックが必要なら全ウィジェットに適用すべきであり、
  一部だけに適用するのは中途半端で保守コストだけが増える）

### 現状の課題: CTS フォールバックの不完全な適用

CTS（CategoryTimeSalesIndex）による JS 集約パスは、DuckDB 導入前の
時間帯・カテゴリ分析の実装である。DuckDB 導入後、5つのウィジェットで
「DuckDB 優先、CTS フォールバック」の Unified パターンが適用されたが、
**同種の残り2つ（CategoryHierarchyExplorer, CategoryPerformanceChart）は
CTS 専用のまま** であり、一貫性がない。

「両方対応する」なら全てに同じことをやらなければならないが、
現状は中途半端であり、コード全体の一貫性に欠ける。

**目標状態:**
- CTS インデックスによる集約パスを廃止し、DuckDB に統一する
- `WidgetContext` から `ctsIndex` / `prevCtsIndex` を除去する
- `useAnalyticsResolver` から `'cts'` ソースを削除する
- CategoryHierarchyExplorer と CategoryPerformanceChart を DuckDB 版に移行する
- 対応する DuckDB クエリ（`queryLevelAggregation`, `queryCategoryHourly` 等）は既に存在する

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
2. **SQL 集約の徹底**: 時系列・カテゴリ分析は DuckDB の SQL で集約済みデータを取得し、
   UI での生レコード走査を排除する。
3. **月跨ぎ対応**: `duckDateRange`（自由日付範囲）を使い、月単位制約を超えた分析が可能。
   `useDuckDB` フックが複数月のデータを DuckDB にロードする。
4. **非同期安全**: `useAsyncQuery` フックがシーケンス番号によるキャンセル制御を内蔵し、
   古いクエリ結果が新しい結果を上書きしない。
5. **可視性制御**: 各ウィジェットの `isVisible` で DuckDB 未準備時（`duckDataVersion === 0`）
   やデータ不足時に非表示。店舗比較系は `stores.size > 1` をガード。
6. **永続化は best-effort**: OPFS / Parquet キャッシュは起動高速化のための最適化であり、
   失敗しても `full-reload` で正常動作する。データの権威は IndexedDB（原本）にある。
