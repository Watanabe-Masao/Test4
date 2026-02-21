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
│   File I/O / DataProcessing / Storage / Export          │
│   36 ファイル                                           │
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

**役割**: ドメインロジックとUI層を橋渡しする。React Context/Hooks によるアプリケーション状態管理、計算フロー制御。

#### context/AppStateContext.tsx --- Redux-like 状態管理

状態はuseReducerで管理し、パフォーマンス最適化のためContextを4つに分割している。

```
AppStateProvider
  ├── AppDispatchContext  → dispatch関数
  ├── AppStateContext     → 全状態（後方互換）
  ├── UiContext           → UI状態のみ
  ├── DataContext         → データ＋計算結果のみ
  └── SettingsContext     → 設定のみ
```

対応するフック:
- `useAppState()` --- 全状態を取得（既存互換用）
- `useAppUi()` --- UI状態のみ（selectedStoreIds, currentView, isCalculated, isImporting）
- `useAppData()` --- データ状態のみ（data, storeResults, validationMessages）
- `useAppSettings()` --- 設定のみ
- `useAppDispatch()` --- dispatch関数

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

#### services/ --- アプリケーションサービス

| ファイル | 説明 |
|----------|------|
| `CalculationOrchestrator.ts` | 計算フロー統合の公開API。`calculateStoreResult()`, `calculateAllStores()` |
| `calculation/dailyBuilder.ts` | 日次レコード構築 |
| `calculation/storeAssembler.ts` | StoreResult組み立て |
| `calculation/aggregateResults.ts` | 全店集約 (aggregateStoreResults) |
| `FileImportService.ts` | ファイルインポートの統合サービス |

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

### 3.1 AppState構造

```typescript
interface AppState {
  // ─── データ ───────────────────────────
  data: ImportedData              // 全インポートデータ
  storeResults: ReadonlyMap<string, StoreResult>  // 計算結果
  validationMessages: readonly ValidationMessage[]

  // ─── UI状態 ───────────────────────────
  ui: {
    selectedStoreIds: ReadonlySet<string>  // 選択中店舗
    currentView: ViewType                  // 表示中ビュー
    isCalculated: boolean                  // 計算済みフラグ
    isImporting: boolean                   // インポート中フラグ
  }

  // ─── 設定 ─────────────────────────────
  settings: AppSettings
}
```

### 3.2 アクション一覧

| アクション | ペイロード | 説明 |
|-----------|-----------|------|
| `SET_IMPORTED_DATA` | `ImportedData` | インポートデータの設定（isCalculated→false） |
| `SET_STORE_RESULTS` | `ReadonlyMap<string, StoreResult>` | 計算結果の設定（isCalculated→true） |
| `SET_VALIDATION_MESSAGES` | `readonly ValidationMessage[]` | バリデーション結果の設定 |
| `TOGGLE_STORE` | `string` (storeId) | 店舗の選択/解除トグル |
| `SELECT_ALL_STORES` | なし | 全店舗選択（selectedStoreIdsを空Setに） |
| `SET_CURRENT_VIEW` | `ViewType` | 表示ビューの切替 |
| `SET_IMPORTING` | `boolean` | インポート中フラグの切替 |
| `UPDATE_SETTINGS` | `Partial<AppSettings>` | 設定の部分更新（isCalculated→false） |
| `UPDATE_INVENTORY` | `{ storeId, config }` | 在庫設定の更新（isCalculated→false） |
| `SET_PREV_YEAR_AUTO_DATA` | `{ prevYearSales, prevYearDiscount, prevYearCategoryTimeSales }` | 前年データの自動設定 |
| `RESET` | なし | 全状態を初期状態にリセット |

### 3.3 Context分割によるパフォーマンス最適化

```
AppStateProvider (useReducer)
  │
  ├── AppDispatchContext ──→ dispatch関数のみ
  │     再レンダリング: なし（dispatch参照は不変）
  │
  ├── UiContext ──→ selectedStoreIds, currentView, isCalculated, isImporting
  │     再レンダリング: UI操作時のみ
  │
  ├── DataContext ──→ data, storeResults, validationMessages
  │     再レンダリング: データ変更/計算完了時のみ（useMemoで最適化）
  │
  └── SettingsContext ──→ AppSettings
        再レンダリング: 設定変更時のみ
```

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
├── App.tsx                           # ルートコンポーネント + ViewRouter
├── styled.d.ts                       # styled-components 型拡張
│
├── domain/                           # ★ ドメイン層
│   ├── models/                       #   型定義 (14ファイル)
│   ├── calculations/                 #   計算モジュール (8ファイル + テスト)
│   └── constants/                    #   定数 (2ファイル)
│
├── application/                      # ★ アプリケーション層
│   ├── context/                      #   AppStateContext (状態管理)
│   ├── hooks/                        #   カスタムフック (10個)
│   └── services/                     #   CalculationOrchestrator + FileImportService
│       └── calculation/              #   計算サブモジュール
│
├── infrastructure/                   # ★ インフラ層
│   ├── fileImport/                   #   ファイル読み込み (4ファイル)
│   ├── dataProcessing/               #   データプロセッサ (10個)
│   ├── storage/                      #   IndexedDB永続化
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
│   │   ├── charts/                   #     24チャートコンポーネント
│   │   ├── common/                   #     共通UI (Button, Card, Modal, Toast, etc.)
│   │   └── DataManagementSidebar.tsx
│   └── theme/                        #     テーマ + GlobalStyle + トークン
│
└── test/
    └── setup.ts                      # テスト設定
```

---

## 9. テスト戦略

| 対象 | テストファイル数 | テスト数 | カバー範囲 |
|------|:---------------:|:-------:|-----------|
| domain/calculations | 8 | 約200 | 在庫法、推定法、予算、予測、集計、売変影響、ピン区間、ユーティリティ |
| domain/models | 2 | 約20 | CostPricePair, ImportedData |
| domain/constants | 1 | 約10 | デフォルト設定 |
| infrastructure/dataProcessing | 8 | 約100 | 全プロセッサ |
| infrastructure/fileImport | 2 | 約30 | FileTypeDetector, dateParser |
| infrastructure/storage | 2 | 約20 | IndexedDBStore, diffCalculator |
| application/context | 1 | 約15 | AppStateContext reducer |
| application/hooks | 3 | 約20 | useImport, useSettings, usePrevYearData |
| application/services | 2 | 約20 | CalculationOrchestrator, FileImportService |
| presentation (widgets) | 8 | 約30 | ダッシュボードウィジェット、チャート |
| **合計** | **約45** | **約467** | |

テストはドメイン層・インフラ層のビジネスロジックを中心に整備されている。
