# 仕入荒利管理システム - アーキテクチャ設計書

## 1. アーキテクチャ概要

本システムは **4層レイヤードアーキテクチャ** を採用している。
各層は明確に分離され、依存方向は厳格に制御される。

### 1.1 技術スタック

| カテゴリ | 技術 |
|----------|------|
| 言語 | TypeScript 5.9 (strict mode) |
| UIフレームワーク | React 19 |
| ビルドツール | Vite 7 |
| スタイリング | styled-components 6 |
| チャート | Recharts |
| テスト | Vitest + React Testing Library |
| ファイル解析 | SheetJS (xlsx) |
| SQL エンジン | DuckDB-WASM (インメモリ分析) |
| 永続化 | IndexedDB + localStorage |

### 1.2 レイヤー構成図

```
┌─────────────────────────────────────────────────────────┐
│               Presentation 層                           │
│   React Components / Pages / Charts / Theme             │
│   107 ファイル                                          │
├─────────────────────────────────────────────────────────┤
│               Application 層                            │
│   Context / Hooks / Services / Orchestrator             │
│   28 ファイル                                           │
├─────────────────────────────────────────────────────────┤
│                 Domain 層                               │
│   Models / Calculations / Constants                     │
│   38 ファイル  ★ フレームワーク非依存・純粋関数         │
├─────────────────────────────────────────────────────────┤
│             Infrastructure 層                           │
│   File I/O / DataProcessing / Storage / Export / DuckDB │
│   50+ ファイル                                          │
└─────────────────────────────────────────────────────────┘
```

### 1.3 依存方向の原則

```
  Presentation ──→ Application ──→ Domain ←── Infrastructure
       │                │             ▲            │
       │                │             │            │
       └────────────────┴─────────────┘            │
                                      └────────────┘
```

- **Presentation → Application → Domain**: 上位層は下位層に依存する
- **Infrastructure → Domain**: インフラ層はDomain層の型定義に依存する
- **Domain層は他のどの層にも依存しない**（依存性逆転の原則）
- Domain層はReact、xlsx、IndexedDB等のフレームワーク/ライブラリを一切importしない

### 1.4 設計原則

| 原則 | 適用箇所 |
|------|----------|
| 単一責任原則 (SRP) | 各Processorは1種類のデータのみ処理 |
| 開放閉鎖原則 (OCP) | カテゴリ追加時にCalculation変更不要 |
| 依存性逆転 (DIP) | Domain層はインフラに依存しない |
| インターフェース分離 (ISP) | Parserインターフェースを細分化 |
| 純粋関数 | 全計算ロジックは副作用なし |
| イミュータブル | Readonly型の活用、状態変更はReducer経由 |

---

## 2. 各層の責務

### 2.1 Domain層 (`app/src/domain/`)

**役割**: ビジネスロジックとドメインモデルの定義。フレームワークに一切依存しない純粋なTypeScriptコード。

#### models/ --- 型定義・ドメインモデル

| ファイル | 説明 |
|----------|------|
| `ImportedData.ts` | データ集約ルート。全インポートデータを保持する最上位インターフェース |
| `Store.ts` | 店舗モデル (id, code, name) |
| `Supplier.ts` | 取引先モデル + 取引先別合計 (SupplierTotal) |
| `StoreResult.ts` | 店舗別計算結果。在庫法/推定法/予算/KPI等を含む約80フィールド |
| `DailyRecord.ts` | 日別取引レコード + 移動明細行 (TransferBreakdownEntry) |
| `BudgetData.ts` | 予算データ + 在庫設定 (InventoryConfig) |
| `Settings.ts` | アプリ設定 (AppSettings), ビュー種別 (ViewType), データ種別 (DataType) |
| `DataTypes.ts` | StoreDayRecord<T>パターン、各データ種別の型定義 (Purchase/Sales/Discount/Transfer/SpecialSales/Consumable/CategoryTimeSales/DepartmentKpi) |
| `CategoryType.ts` | 帳合カテゴリ列挙型 (11種) |
| `CostPricePair.ts` | 原価/売価ペア + ゼロ値定数 + 加算関数 |
| `ConsumableItem.ts` | 消耗品明細 + 日別レコード |
| `TransferDetail.ts` | 店間/部門間移動の詳細 + 集計 |
| `ValidationMessage.ts` | バリデーション結果 (error/warning/info) |

#### calculations/ --- 計算モジュール（純粋関数）

| ファイル | 説明 |
|----------|------|
| `invMethod.ts` | **在庫法**: 実績粗利計算 (全体スコープ)。売上原価 = 期首在庫 + 総仕入高 - 期末在庫 |
| `estMethod.ts` | **推定法**: 推定粗利・推定在庫 (在庫販売スコープ)。コア売上算出、売変率算出を含む |
| `budgetAnalysis.ts` | 予算分析: 消化率、進捗率、達成率、月末予測 |
| `forecast.ts` | 週間予測: 週別サマリー、曜日別平均、異常値検出 (標準偏差ベース) |
| `aggregation.ts` | 全店集計: 金額→単純合計、率→売上高加重平均 |
| `discountImpact.ts` | 売変影響分析: 売変ロス原価の算出 |
| `pinIntervals.ts` | ピン止め区間計算 |
| `utils.ts` | 安全数値変換 (safeNumber)、ゼロ除算防止 (safeDivide)、フォーマット関数群 |

#### constants/ --- 定数定義

| ファイル | 説明 |
|----------|------|
| `categories.ts` | カテゴリ表示名 (CATEGORY_LABELS) と表示順序 (CATEGORY_ORDER)。11種: 市場, LFC, サラダクラブ, 加工品, 直伝, 花, 産直, 消耗品, 店間移動, 部門間移動, その他 |
| `defaults.ts` | デフォルト設定生成 (createDefaultSettings)、月日数算出、掛け率範囲 (0〜1.2)、全店集計ID ("all") |

**デフォルト値一覧**:

| 設定項目 | デフォルト値 |
|----------|-------------|
| 目標粗利率 | 0.25 (25%) |
| 警告しきい値 | 0.23 (23%) |
| 花掛け率 | 0.80 |
| 産直掛け率 | 0.85 |
| デフォルト値入率 | 0.26 |
| デフォルト予算 | 6,450,000 |

---

### 2.2 Application層 (`app/src/application/`)

**役割**: ドメインロジックとUI層を橋渡しする。Zustand ストアによる状態管理、カスタムフック、ユースケース。

#### stores/ --- Zustand ストア（状態管理）

状態は 3 つの Zustand ストアに分離されている。各ストアは最小セレクタで購読し、不要な再レンダーを防ぐ。

```
stores/
  ├── dataStore.ts      → data, storeResults, validationMessages
  ├── settingsStore.ts  → AppSettings
  └── uiStore.ts        → selectedStoreIds, currentView, isCalculated, isImporting
```

対応するフック:
- `useDataStore((s) => s.data)` --- データのスライスを購読
- `useSettingsStore((s) => s.settings)` --- 設定のスライスを購読
- `useUiStore((s) => s.isCalculated)` --- UI状態のスライスを購読

#### context/AppStateContext.tsx --- レガシー互換

旧 useReducer ベースの状態管理。後方互換のために残置されているが、新規コードでは Zustand ストアを使用する。

#### usecases/ --- ユースケース

| ディレクトリ | 説明 |
|----------|------|
| `calculation/` | 計算パイプライン（dailyBuilder, storeAssembler, aggregateResults） |
| `explanation/` | 説明責任（ExplanationService: 指標の計算式・入力値・ドリルダウン生成） |
| `import/` | ファイルインポート（FileImportService: バリデーション・データソース乖離検出） |
| `export/` | データエクスポート |
| `categoryTimeSales/` | カテゴリ時間帯売上のインデックス構築・フィルタ・除数計算 |
| `departmentKpi/` | 部門 KPI のインデックス構築 |

#### ports/ --- ポートインターフェース

| ファイル | 説明 |
|----------|------|
| `ExportPort.ts` | エクスポート機能の抽象インターフェース（依存性逆転） |

#### hooks/ --- カスタムフック

| フック | 説明 |
|--------|------|
| `useImport` | ファイルインポートフロー制御。ドロップ/選択からパース・検証・状態格納まで |
| `useCalculation` | 計算トリガー。CalculationOrchestratorの呼び出しとStoreResult配信 |
| `useStoreSelection` | 店舗選択・切替ロジック |
| `useSettings` | 設定変更・永続化 (localStorage連携) |
| `usePrevYearData` | 前年データのIndexedDBからの自動読み込み |
| `usePrevYearCategoryTimeSales` | 前年分類別時間帯売上の読み込み |
| `useAutoLoadPrevYear` | 前年データの自動ロードトリガー |
| `useKeyboardShortcuts` | キーボードショートカット制御 |
| `useUndoRedo` | 操作のUndo/Redo管理 |
| `usePersistence` | IndexedDB永続化フロー |
| `useDuckDB` | DuckDB-WASM エンジン初期化・データロード・マルチ月対応 |
| `useDuckDBQuery*` (20個) | DuckDB クエリフック群（時間帯・階層・店舗・前年比較・特徴量等） |

#### services/ --- アプリケーションサービス

| ファイル | 説明 |
|----------|------|
| `calculationCache.ts` | 計算結果のキャッシュ管理（ハッシュベース差分検出） |
| `murmurhash.ts` | 高速ハッシュ関数 |
| `diffCalculator.ts` | データ差分計算 |
| `dataSummary.ts` | データサマリー生成 |

#### workers/ --- Web Worker

| ファイル | 説明 |
|----------|------|
| `calculationWorker.ts` | 計算パイプラインの非同期実行（メインスレッドをブロックしない） |

---

### 2.3 Infrastructure層 (`app/src/infrastructure/`)

**役割**: 外部システム（ファイルI/O、ブラウザAPI、永続化）との接続。Domainモデルへの変換を担当。

#### dataProcessing/ --- 10種のデータプロセッサ

| プロセッサ | 対応データ | 説明 |
|------------|-----------|------|
| `PurchaseProcessor` | 仕入 (purchase) | 取引先コード(7桁)・店舗コード(4桁)を抽出、原価/売価ペア構築 |
| `SalesProcessor` | 売上 (sales) | 店舗別・日別売上金額の解析 |
| `DiscountProcessor` | 売変 (discount) | 売変額を絶対値で格納、売上0行スキップ |
| `SettingsProcessor` | 初期設定 (initialSettings) | 期首/期末在庫、粗利予算の読み込み |
| `BudgetProcessor` | 予算 (budget) | 店舗別・日別予算配分 |
| `TransferProcessor` | 店間入/出 (interStore) | 店間移動・部門間移動の判定 (同一店舗コード→部門間) |
| `SpecialSalesProcessor` | 花/産直 (flowers/directProduce) | 売価×掛け率による原価算出 |
| `ConsumableProcessor` | 消耗品 (consumables) | 勘定コード81257フィルタ、ファイル名先頭2桁→店舗判定 |
| `CategoryTimeSalesProcessor` | 分類別時間帯売上 | 部門/ライン/クラス階層と時間帯別数量・金額 |
| `DepartmentKpiProcessor` | 部門別KPI | 部門別粗利率/値入率/売変率/売上/在庫 |

#### fileImport/ --- ファイル読み込み基盤

| ファイル | 説明 |
|----------|------|
| `FileTypeDetector.ts` | ファイル種別自動判定。16ルール定義: ファイル名パターン → ヘッダーパターンの優先順で判定。プレフィックス規約 (0\_〜9\_, 998\_) にも対応 |
| `tabularReader.ts` | CSV/Excel共通の2次元配列読み込み。Shift_JIS/UTF-8自動判定。RFC 4180準拠CSVパーサー |
| `dateParser.ts` | 日付パーサー。Excelシリアル値、日本語形式、ISO形式、スラッシュ形式に対応 |
| `errors.ts` | インポートエラー型定義 |

**ファイル種別判定フロー**:

```
ファイル名 → 特殊パターン (8.分類別, 9.分類別, 01消耗品)
         → キーワードマッチ (FILE_TYPE_RULES: 16ルール)
         → プレフィックス番号 (PREFIX_RULES: 0_〜998_)
         → ヘッダー行パターンマッチ (先頭3行を検査)
         → 判定不能 (type: null)
```

#### storage/ --- IndexedDB永続化

| ファイル | 説明 |
|----------|------|
| `IndexedDBStore.ts` | IndexedDB操作。DB名: `shiire-arari-db` v1、ストア: `monthlyData` + `metadata` |
| `diffCalculator.ts` | インポート時の差分計算 |

**IndexedDBストア構成**:

```
shiire-arari-db (v1)
  ├── monthlyData    年月×データ種別ごとにキー "YYYY-MM_dataType" で保存
  │     例: "2026-02_purchase", "2026-02_sales", ...
  └── metadata       lastSession (最終保存セッション情報)
```

- 単一トランザクションによる原子的保存
- Map型はplain objectに変換して保存、読み込み時にMapへ復元
- スキーマ検証付きの安全な読み込み

#### export/ --- エクスポート

| ファイル | 説明 |
|----------|------|
| `index.ts` | エクスポートユーティリティ |

#### duckdb/ --- DuckDB-WASM SQL エンジン

ブラウザ内で DuckDB-WASM を使用した高速 SQL 分析基盤。

| ファイル | 説明 |
|----------|------|
| `engine.ts` | DuckDB-WASM エンジンの初期化・ライフサイクル管理 |
| `schemas.ts` | 8 テーブル + 1 VIEW の DDL 定義 |
| `dataLoader.ts` | ImportedData → DuckDB テーブルへのデータロード |
| `queryRunner.ts` | クエリ実行ヘルパー（Arrow → JS 変換、snake_case → camelCase） |

**クエリモジュール** (`queries/`):

| ファイル | 関数数 | 説明 |
|----------|:------:|------|
| `categoryTimeSales.ts` | 8 | 時間帯集計、階層集計、店舗×時間帯マトリクス、曜日除数 |
| `storeDaySummary.ts` | 4 | 日次サマリー、累積売上、期間集約率 |
| `departmentKpi.ts` | 3 | 部門 KPI ランキング・トレンド |
| `yoyComparison.ts` | 2 | 前年比較（日次・カテゴリ） |
| `features.ts` | 4 | 特徴量（移動平均・CV・Z スコア・スパイク検出） |
| `advancedAnalytics.ts` | 2 | カテゴリミックス週次・店舗ベンチマーク |

**テーブルスキーマ（8 テーブル + 1 VIEW）**:

| テーブル | 目的 |
|----------|------|
| `classified_sales` | 分類別売上（基準値） |
| `category_time_sales` | 分類別時間帯売上 |
| `time_slots` | 時間帯別内訳 |
| `purchase` | 仕入 |
| `special_sales` | 花・産直 |
| `transfers` | 移動 |
| `consumables` | 消耗品 |
| `department_kpi` | 部門 KPI |
| `store_day_summary` (VIEW) | 6 テーブル LEFT JOIN の日次サマリー |

全テーブルに `year`, `month`, `day`, `date_key` カラムを持たせ、月跨ぎクエリを `date_key BETWEEN` で実現。

---

### 2.4 Presentation層 (`app/src/presentation/`)

**役割**: ユーザーインターフェースの描画とインタラクション処理。

#### pages/ --- 10ページ

| ページ | ViewType | 説明 |
|--------|----------|------|
| `Dashboard/DashboardPage.tsx` | `dashboard` | エグゼクティブサマリー、KPIカード、予実対比、カレンダー、ヒートマップ等のウィジェット群 |
| `Daily/DailyPage.tsx` | `daily` | 日別明細テーブル、累計カラム |
| `Analysis/AnalysisPage.tsx` | `analysis` | 予算vs実績テーブル、比較ビュー、チャート |
| `Category/CategoryPage.tsx` | `category` | 帳合別展開セクション、比較チャート |
| `Summary/SummaryPage.tsx` | `summary` | 在庫法/推定法の荒利計算、取引先別合計 |
| `Forecast/ForecastPage.tsx` | `forecast` | 月間カレンダー、週別サマリー、曜日別平均、予測チャート |
| `Transfer/TransferPage.tsx` | `transfer` | 店間移動・部門間移動の明細と集計 |
| `Consumable/ConsumablePage.tsx` | `consumable` | 消耗品費の明細と集計 |
| `Reports/ReportsPage.tsx` | `reports` | レポート生成 |
| `Admin/AdminPage.tsx` | `admin` | ストレージ管理、前年マッピング設定 |

#### components/charts/ --- チャートコンポーネント (Recharts)

24個のチャート関連コンポーネント:

| コンポーネント | 説明 |
|---------------|------|
| `DailySalesChart` | 日別売上推移 |
| `BudgetVsActualChart` | 予算vs実績累計折れ線 |
| `GrossProfitRateChart` | 日別粗利率棒グラフ |
| `GrossProfitAmountChart` | 粗利額推移 |
| `CategoryPieChart` | 帳合別構成比円グラフ |
| `CategorySalesBreakdownChart` | 帳合別売上内訳 |
| `SalesPurchaseComparisonChart` | 売上/仕入対比 |
| `EstimatedInventoryDetailChart` | 推定在庫詳細 |
| `InventoryTrendChart` | 在庫推移 |
| `PrevYearComparisonChart` | 前年比較 |
| `DiscountTrendChart` | 売変推移 |
| `BudgetDiffTrendChart` | 予算差異推移 |
| `CustomerTrendChart` | 客数推移 |
| `TransactionValueChart` | 客単価推移 |
| `TimeSlotSalesChart` | 時間帯別売上 |
| `TimeSlotHeatmapChart` | 時間帯ヒートマップ |
| `DeptHourlyPatternChart` | 部門別時間帯パターン |
| `TimeSlotKpiSummary` | 時間帯KPIサマリー |
| `StoreTimeSlotComparisonChart` | 店舗間時間帯比較 |
| `TimeSlotYoYComparisonChart` | 時間帯前年比較 |
| `CategoryHierarchyExplorer` | 分類階層エクスプローラー |
| `DayRangeSlider` | 日付範囲スライダー |
| `PeriodFilter` | 期間フィルター |
| `WaterfallChart` (widgets内) | ウォーターフォールチャート |

共通テーマ: `chartTheme.ts` でRechartsの配色・書式を統一管理。

#### components/common/ --- 共通UIコンポーネント

| コンポーネント | 説明 |
|---------------|------|
| `Button` | 汎用ボタン |
| `Card` | カードコンテナ |
| `Chip` | タグ・ラベル |
| `Modal` | モーダルダイアログ基盤 |
| `Toast` / `ToastProvider` | トースト通知 (成功/警告/エラー/情報) |
| `KpiCard` | KPI表示カード |
| `DataTable` | データテーブル |
| `FileDropZone` | ドラッグ&ドロップ領域 |
| `UploadCard` | ファイルアップロードカード |
| `ImportProgressBar` | インポート進捗バー |
| `SettingsModal` | 設定モーダル |
| `ValidationModal` | バリデーション結果モーダル |
| `DiffConfirmModal` | 差分確認モーダル |
| `RestoreDataModal` | データ復元確認モーダル |

#### components/Layout/ --- レイアウト

| コンポーネント | 説明 |
|---------------|------|
| `AppShell` | アプリケーション全体のレイアウトシェル (ナビ + サイドバー + メインコンテンツ) |
| `NavBar` | 左側ナビゲーションバー (ビュー切替 + テーマトグル) |
| `Sidebar` | 右側サイドバー |
| `MainContent` | メインコンテンツ領域 |

#### theme/ --- テーマ定義

| ファイル | 説明 |
|----------|------|
| `theme.ts` | Dark/Light テーマ定義 (darkTheme, lightTheme) |
| `GlobalStyle.ts` | styled-components グローバルスタイル |
| `tokens.ts` | デザイントークン |
| `semanticColors.ts` | セマンティックカラー定義 |

---

## 3. 状態管理

### 3.1 Zustand ストア（現行）

状態管理は 3 つの Zustand ストアに分離されている。
コンポーネントは最小セレクタで必要なスライスのみを購読し、不要な再レンダーを防ぐ。

```
stores/
  ├── dataStore.ts      → data, storeResults, validationMessages
  ├── settingsStore.ts  → AppSettings
  └── uiStore.ts        → selectedStoreIds, currentView, isCalculated, isImporting
```

**使用パターン:**
```typescript
// スライスセレクタで最小購読
const data = useDataStore((s) => s.data)
const targetYear = useSettingsStore((s) => s.settings.targetYear)
const isCalculated = useUiStore((s) => s.isCalculated)
```

### 3.2 レガシー Context（後方互換）

旧 useReducer ベースの `AppStateContext` は後方互換のために残置されている。
新規コードでは Zustand ストアを使用し、既存コードは段階的に移行する。

**レガシーフック（非推奨）:**
- `useAppState()` --- 全状態を取得（3ストア全結合、パフォーマンス非推奨）
- `useAppUi()` / `useAppData()` / `useAppSettings()` --- Context 分割版

### 3.3 ストア設計原則

- **「何を購読するか」は「何を描画するか」と一致させる**: 広すぎる購読は不要な再レンダーの温床
- **dispatch 互換層**: 既存の `dispatch({ type: 'SET_IMPORTED_DATA', ... })` パターンは
  `dispatchCompat` で Zustand アクションに変換される

### 3.4 永続化

| データ | ストレージ | キー |
|--------|-----------|------|
| アプリ設定 (AppSettings) | localStorage | `shiire-arari-settings` |
| UI状態 (currentView) | localStorage | `shiire-arari-ui` |
| テーマ (dark/light) | localStorage | `theme` |
| インポートデータ (ImportedData) | IndexedDB | `shiire-arari-db` v1 |

---

## 4. データフロー

### 4.1 インポートフロー

```
ファイルドロップ / ファイル選択
     │
     ▼
readTabularFile (tabularReader.ts)
  CSV: Shift_JIS/UTF-8自動判定 → SheetJS でパース
  Excel: SheetJS で直接パース
     │
     ▼
detectFileType (FileTypeDetector.ts)
  ファイル名パターン(16ルール) → ヘッダーパターン → プレフィックス番号
     │
     ▼
対応する Processor (dataProcessing/)
  PurchaseProcessor / SalesProcessor / DiscountProcessor / ...
  生データ → 型付きドメインオブジェクトへ変換
     │
     ▼
dispatch({ type: 'SET_IMPORTED_DATA', payload: ImportedData })
     │
     ▼
IndexedDB に自動保存 (usePersistence)
```

### 4.2 計算フロー

```
「フォーマット作成」ボタン押下 / useCalculation.calculate()
     │
     ▼
CalculationOrchestrator.calculateAllStores()
     │
     ├─── 各店舗ループ ──────────────────────────────┐
     │                                                │
     │  buildDailyRecords (dailyBuilder.ts)           │
     │    日1〜31: 仕入/売上/花/産直/売変/店間 集計   │
     │         │                                      │
     │         ▼                                      │
     │  assembleStoreResult (storeAssembler.ts)       │
     │    invMethod: 在庫法粗利 (全体スコープ)        │
     │    estMethod: 推定法粗利 (在庫販売スコープ)    │
     │    discountImpact: 売変影響                    │
     │    budgetAnalysis: 予算分析                    │
     │    forecast: 予測・KPI                         │
     │         │                                      │
     │         ▼                                      │
     │  StoreResult (店舗別計算結果)                   │
     │                                                │
     └────────────────────────────────────────────────┘
     │
     ▼
aggregateStoreResults (全店集計: 加重平均)
     │
     ▼
dispatch({ type: 'SET_STORE_RESULTS', payload: Map<string, StoreResult> })
     │
     ▼
UI再描画 (DataContext更新 → 各ページコンポーネントが再レンダリング)
```

### 4.3 計算ロジックのスコープ

```
┌──────────────────────────────────────────────────────────────┐
│ 在庫法 (invMethod) ── スコープ: 全売上・全仕入              │
│                                                              │
│  売上原価  = 期首在庫 + 総仕入高 - 期末在庫                 │
│  粗利益    = 総売上高 - 売上原価                             │
│  粗利率    = 粗利益 / 総売上高                               │
│  ※ 花・産直・売上納品を含む全体の実績値                     │
├──────────────────────────────────────────────────────────────┤
│ 推定法 (estMethod) ── スコープ: 在庫販売のみ（花・産直除外）│
│                                                              │
│  コア売上  = 総売上 - 花売価 - 産直売価                     │
│  粗売上    = コア売上 / (1 - 売変率)                        │
│  推定原価  = 粗売上 × (1 - 値入率) + 消耗品費              │
│  推定マージン = コア売上 - 推定原価                          │
│  推定期末在庫 = 期首在庫 + 在庫仕入原価 - 推定原価          │
│  ※ 推定在庫と実績在庫の比較による異常検知が目的             │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. ルーティング

### 5.1 カスタム ViewType switch

本システムはReact Routerを使用せず、`ViewType` に基づくカスタムルーティングを実装している。

```typescript
// App.tsx 内の ViewRouter コンポーネント
function ViewRouter({ view }: { view: ViewType }) {
  switch (view) {
    case 'dashboard':  return <DashboardPage />
    case 'daily':      return <DailyPage />
    case 'analysis':   return <AnalysisPage />
    case 'category':   return <CategoryPage />
    case 'summary':    return <SummaryPage />
    case 'forecast':   return <ForecastPage />
    case 'transfer':   return <TransferPage />
    case 'consumable': return <ConsumablePage />
    case 'reports':    return <ReportsPage />
    case 'admin':      return <AdminPage />
    default:           return <DashboardPage />
  }
}
```

### 5.2 10ビュー一覧

| ViewType | 表示名 | 機能概要 |
|----------|--------|----------|
| `dashboard` | ダッシュボード | KPI、予実対比、カレンダー、ヒートマップ |
| `daily` | 日別推移 | 日別明細テーブル、累計 |
| `analysis` | 予算分析 | 予算vs実績、比較ビュー |
| `category` | 帳合別 | 帳合カテゴリ別の展開セクション |
| `summary` | 荒利計算 | 在庫法/推定法の計算結果、取引先別 |
| `forecast` | 週間予測 | カレンダー、週別・曜日別集計 |
| `transfer` | 店間移動 | 店間/部門間移動の明細・集計 |
| `consumable` | 消耗品 | 消耗品費の明細・集計 |
| `reports` | レポート | レポート生成・プレビュー |
| `admin` | 管理 | ストレージ管理、前年マッピング |

### 5.3 ビュー切替メカニズム

```
NavBar (ナビゲーションバー)
  │ onViewChange(view)
  ▼
dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
  │
  ├── AppState.ui.currentView が更新
  ├── localStorage (shiire-arari-ui) に永続化
  └── ViewRouter が該当ページコンポーネントをレンダリング
```

---

## 6. コンポーネントツリー

```
App
├── ThemeProvider (styled-components)
│   └── ThemeToggleContext.Provider
│       └── AppStateProvider (useReducer + 4 Context)
│           └── ToastProvider
│               └── AppContent
│                   ├── AppShell
│                   │   ├── NavBar (ビュー切替, テーマトグル)
│                   │   ├── DataManagementSidebar
│                   │   │   ├── FileDropZone
│                   │   │   ├── UploadCard群
│                   │   │   └── SettingsModal
│                   │   └── ViewRouter
│                   │       └── [各ページコンポーネント]
│                   └── RestoreDataModal (条件付き)
```

---

## 7. ダッシュボードウィジェットシステム

DashboardPageは `widgets/registry.tsx` によるウィジェットレジストリパターンを採用している。

```
DashboardPage
  ├── WidgetSettingsPanel (表示/非表示の切替)
  └── ウィジェット群 (registry から動的に描画)
      ├── ExecSummaryBarWidget (エグゼクティブサマリーバー)
      ├── MonthlyCalendar (月間カレンダー)
      ├── GrossProfitHeatmap (粗利ヒートマップ)
      ├── PlanActualForecast (計画/実績/予測)
      ├── ConditionSummary (状況サマリー)
      ├── RangeComparison (期間比較)
      ├── ForecastTools (予測ツール)
      ├── WaterfallChart (ウォーターフォール)
      ├── TableWidgets (テーブルウィジェット群)
      └── DayDetailModal (日別詳細モーダル)
```

---

## 8. ファイルディレクトリ構造

```
app/src/
├── main.tsx                          # エントリーポイント
├── App.tsx                           # ルートコンポーネント（コンポジションルート）
├── styled.d.ts                       # styled-components 型拡張
│
├── domain/                           # ★ ドメイン層（フレームワーク非依存）
│   ├── models/                       #   型定義・データモデル
│   ├── calculations/                 #   計算モジュール（粗利・予測・要因分解・相関分析等）
│   ├── repositories/                 #   リポジトリインターフェース
│   └── constants/                    #   定数
│
├── application/                      # ★ アプリケーション層
│   ├── context/                      #   React Context（レガシー互換）
│   ├── hooks/                        #   カスタムフック（useDuckDBQuery 含む 20+ 個）
│   ├── stores/                       #   Zustand ストア（data, settings, ui）
│   ├── usecases/                     #   ユースケース
│   │   ├── calculation/              #     計算パイプライン
│   │   ├── explanation/              #     説明責任（ExplanationService）
│   │   ├── import/                   #     ファイルインポート
│   │   ├── export/                   #     データエクスポート
│   │   ├── categoryTimeSales/        #     カテゴリ時間帯集約
│   │   └── departmentKpi/            #     部門 KPI インデックス
│   ├── ports/                        #   ポートインターフェース（ExportPort）
│   ├── services/                     #   計算キャッシュ・ハッシュ
│   └── workers/                      #   Web Worker（計算の非同期実行）
│
├── infrastructure/                   # ★ インフラ層
│   ├── duckdb/                       #   DuckDB-WASM（SQL エンジン・クエリモジュール）
│   ├── fileImport/                   #   ファイル読み込み・種別判定
│   ├── dataProcessing/               #   データプロセッサ（10個）
│   ├── storage/                      #   IndexedDB 永続化
│   ├── i18n/                         #   国際化（メッセージカタログ）
│   ├── pwa/                          #   PWA サービスワーカー登録
│   └── export/                       #   エクスポート
│
├── presentation/                     # ★ プレゼンテーション層
│   ├── pages/                        #   10ページ
│   │   ├── Dashboard/                #     ダッシュボード + widgets/
│   │   ├── Daily/
│   │   ├── Analysis/
│   │   ├── Category/
│   │   ├── Summary/
│   │   ├── Forecast/
│   │   ├── Transfer/
│   │   ├── Consumable/
│   │   ├── Reports/
│   │   └── Admin/
│   ├── components/
│   │   ├── Layout/                   #     AppShell, NavBar, Sidebar, MainContent
│   │   ├── charts/                   #     チャート（従来 27 種 + DuckDB 15 種）
│   │   ├── common/                   #     共通UI (Button, Card, Modal, Toast, etc.)
│   │   └── DataManagementSidebar.tsx
│   ├── hooks/                        #   プレゼンテーション層フック
│   └── theme/                        #     テーマ + GlobalStyle + トークン
│
└── test/
    └── setup.ts                      # テスト設定
```

---

## 9. テスト戦略

| 対象 | テストファイル数 | テスト数 | カバー範囲 |
|------|:---------------:|:-------:|-----------|
| domain/calculations | 12 | 約300 | 在庫法、推定法、予算、予測、集計、売変影響、ピン区間、要因分解、相関分析、トレンド、感度分析、因果連鎖 |
| domain/models | 2 | 約20 | CostPricePair, ImportedData |
| domain/constants | 1 | 約16 | デフォルト設定 |
| infrastructure/dataProcessing | 8 | 約100 | 全プロセッサ |
| infrastructure/fileImport | 3 | 約50 | FileTypeDetector, dateParser, importSchemas |
| infrastructure/storage | 2 | 約25 | IndexedDB, serialization |
| infrastructure/duckdb | 6 | 約180 | アーキテクチャガード、スキーマ、クエリ、パラメータ、WHERE句ビルダー、queryRunner |
| infrastructure/pwa | 1 | 約2 | Service Worker 登録 |
| infrastructure/i18n | 1 | 約6 | 国際化 |
| application/stores | 3 | 約25 | dataStore, settingsStore, uiStore, dispatchCompat |
| application/hooks | 5 | 約55 | useImport, useSettings, usePrevYearData, usePrevYearCategoryTimeSales, useAutoLoadPrevYear |
| application/usecases | 6 | 約110 | CalculationOrchestrator, FileImportService, dailyBuilder, storeAssembler, summaryBuilder, indexBuilder |
| application/services | 2 | 約50 | calculationCache, dataSummary |
| presentation (widgets) | 12 | 約120 | ダッシュボードウィジェット、チャート、レイアウトプリセット、ウィジェット可視性 |
| presentation (hooks) | 2 | 約12 | useIntersectionObserver, usePwaInstall |
| **合計** | **90** | **1,259** | |

テストはドメイン層・インフラ層のビジネスロジックに加え、アーキテクチャガードテスト（レイヤー依存の機械的検証）と不変条件テスト（シャープリー恒等式等）を整備している。
