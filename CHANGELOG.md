# 変更履歴（CHANGELOG）

本プロジェクトの主要な変更を記録します。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠します。

## [v1.2.0] - 2026-02-28

### アーキテクチャリファクタリング -- 設計思想の体系化と構造改善

#### アーキテクチャ改善

- **Zustand ストア移行**: `AppStateContext`（useReducer）から 3 つの Zustand ストア（`dataStore`, `settingsStore`, `uiStore`）へ移行。最小セレクタによる購読で不要な再レンダーを排除
- **ユースケース層の導入**: `application/usecases/` に計算・インポート・説明責任・エクスポート・カテゴリ時間帯・部門 KPI のユースケースを分離
- **ポートインターフェース**: `ExportPort` による依存性逆転。具体実装の差し替えをコンポジションルートのみで完結
- **Web Worker**: 計算パイプラインの非同期実行（メインスレッド非ブロック）
- **アーキテクチャガードテスト**: `architectureGuard.test.ts` がレイヤー間依存を機械的に検証

#### コンポーネント改善

- **フック抽出**: `useCostDetailData`, `useDrilldownData` 等のデータ変換フックを描画コンポーネントから分離
- **スタイル分離**: styled-components 定義を `*.styles.ts` ファイルに分離
- **React.memo**: 純粋描画コンポーネントをメモ化で保護
- **バレル re-export**: ファイル分割時に既存の import パスを維持

#### インフラストラクチャ

- **i18n**: メッセージカタログ（`messages.ts`）による文字列の一元管理。`useI18n` フック経由で参照
- **PWA**: サービスワーカー登録（`pwa/registerSW.ts`）
- **DuckDB セキュリティ**: SQL インジェクション防止（`storeIdFilter`、Branded Type `ValidatedDateKey`）
- **エラーハンドリング強化**: `QuotaExceededError` の構造化検出、`ChartErrorBoundary` によるチャート例外捕捉

#### テスト

- テストファイル数: 45 → **90**（v1.2.0 時点）→ 現在 **171 ファイル / 3,121 テスト**（2026-03-07 計測）
- アーキテクチャガードテスト、DuckDB クエリテスト、ストアテスト、不変条件テストを追加

#### ドキュメント

- **設計思想 16 原則** を `CLAUDE.md` に体系化（機械的検証、境界バリデーション、エラー伝播、変更頻度分離、不変条件テスト、コンポジションルート、バレル re-export、i18n、描画純粋性、最小セレクタ、Command/Query 分離、Contract 管理、型粒度、全パターン統一、パス配置、Raw データ唯一源泉）
- 全ドキュメント（README, architecture.md, development-guide.md, CONTRIBUTING.md）をリファクタリング後の構成に同期

---

## [v1.1.0] - 2026-02-27

### DuckDB-WASM Phase 2 -- 高度分析チャート 14 種追加

#### 追加された機能

- **累積売上チャート** (`useDuckDBDailyCumulative`): 日別売上の累積推移を可視化
- **前年比日次比較** (`useDuckDBYoyDaily`): 当年と前年の日別売上を重ね合わせ表示
- **部門トレンド** (`useDuckDBDeptKpiTrend`): 部門別 KPI の月次推移
- **曜日パターン** (`useDuckDBDowPattern`): 曜日ごとの売上パターン分析
- **時間帯プロファイル** (`useDuckDBHourlyProfile`): 時間帯別の売上構成比
- **時間帯別集約** (`useDuckDBHourlyAggregation`): 時間帯別の数量・金額集約
- **ヒートマップ** (`useDuckDBHourDowMatrix`): 時間帯 x 曜日のマトリクス分析
- **部門別時間帯** (`useDuckDBDeptKpi`): 部門 KPI ランキング + サマリー一括取得
- **店舗別時間帯** (`useDuckDBStoreAggregation`): 店舗別 x 時間帯の集約分析
- **カテゴリトレンド** (`useDuckDBCategoryDailyTrend`): カテゴリ別日次売上推移
- **カテゴリ時間帯** (`useDuckDBCategoryHourly`): カテゴリ別 x 時間帯集約
- **カテゴリ構成比** (`useDuckDBCategoryMixWeekly`): カテゴリ構成比の週次推移
- **店舗ベンチマーク** (`useDuckDBStoreBenchmark`): 店舗間の週次ランキング推移
- **DateRangePicker**: 日付範囲選択 UI コンポーネント

#### 追加されたクエリモジュール

- `queries/advancedAnalytics.ts`: `queryCategoryMixWeekly`, `queryStoreBenchmark`
- `queries/features.ts`: `queryDailyFeatures`, `queryHourlyProfile`, `queryDowPattern`, `queryDeptDailyTrend`
- `queries/yoyComparison.ts`: `queryYoyDailyComparison`, `queryYoyCategoryComparison`

#### 追加されたフック

- `useDuckDBQuery.ts` に 14 個の専用クエリフックを追加
- 汎用 `useAsyncQuery` による非同期状態管理（loading / error / data）

---

## [v1.0.0] - 2026-02-26

### DuckDB-WASM Phase 1 -- DuckDB クエリエンジン統合

#### 追加された機能

- **DuckDB-WASM エンジン統合**: ブラウザ内で SQL 分析を実行可能に
- **テーブルスキーマ定義** (`schemas.ts`): 8 テーブル + 1 VIEW の DDL
  - `classified_sales`, `category_time_sales`, `time_slots`, `purchase`,
    `special_sales`, `transfers`, `consumables`, `department_kpi`
  - `store_day_summary` VIEW（6 テーブル LEFT JOIN）
- **クエリランナー** (`queryRunner.ts`): Arrow Table -> JS Object 変換、snake_case -> camelCase 自動変換
- **データローダー** (`dataLoader.ts`): ImportedData -> DuckDB テーブルへの一括ロード
- **エンジン管理** (`engine.ts`): DuckDB-WASM のライフサイクル管理（初期化・接続・状態遷移）

#### クエリモジュール（6 モジュール）

- `queries/categoryTimeSales.ts`: 時間帯・階層・店舗別集約、曜日除数マップ
- `queries/storeDaySummary.ts`: 店舗日次サマリー、累積売上、集約レート
- `queries/yoyComparison.ts`: 前年比較（日次・カテゴリ別）
- `queries/features.ts`: 日別特徴量、時間帯プロファイル、曜日パターン
- `queries/advancedAnalytics.ts`: カテゴリ構成比週次、店舗ベンチマーク
- `queries/departmentKpi.ts`: 部門 KPI ランキング、サマリー、月別トレンド

#### フック

- `useDuckDB.ts`: DuckDB ライフサイクル管理フック（初期化・データロード・マルチ月対応）
- `useDuckDBQuery.ts`: DuckDB クエリフック群

#### インフラ

- `infrastructure/duckdb/` レイヤーの新設
- IndexedDB -> DuckDB テーブルへの自動データ同期
- マルチ月データの同一テーブルへの追記ロード

---

## [v0.9.0] - 2026-02-20

### 初期リリース -- ダッシュボード・計算エンジン・ファイルインポート基盤

#### 追加された機能

- **ダッシュボード**: KPI カード、ウォーターフォールチャート、各種分析チャート
- **計算エンジン**: 粗利計算（在庫法・推計法）、値入率、売変率、構成比算出
- **要因分解**: シャープリー値ベースの 2 要素・3 要素・5 要素売上要因分解
- **ファイルインポート**: ドラッグ & ドロップによる複数ファイル種別のインポート
  - 分類別売上 CSV、仕入 Excel、花 Excel、産直 Excel、移動 Excel、時間帯 CSV、部門 KPI
- **説明責任（Explanation）**: 全主要指標に計算式・入力値・ドリルダウンを付与
- **予算分析**: 予算達成率、消化率、予測売上、残余予算
- **テーマ対応**: ダーク / ライトテーマの切替
- **IndexedDB 永続化**: インポートデータのブラウザ内保存
- **Web Worker**: 計算パイプラインの非同期実行

#### アーキテクチャ

- 4 層アーキテクチャ: Domain / Application / Infrastructure / Presentation
- 4 段階データフロー: データソース組み合わせ -> 計算 -> データセット構築 -> 動的フィルタ
- TypeScript strict mode + ESLint + Prettier による品質管理
