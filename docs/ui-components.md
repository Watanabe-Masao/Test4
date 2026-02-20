# UIコンポーネント仕様書

## 1. ページ一覧（10ページ）

| ページ | ファイル | 概要 |
|--------|----------|------|
| ダッシュボード | `Dashboard/DashboardPage.tsx` | KPIカード、ウィジェット、ドラッグ&ドロップレイアウト、ウィジェット設定パネル |
| 日別推移 | `Daily/DailyPage.tsx` | 日別明細テーブル、累計カラム |
| 分析 | `Analysis/AnalysisPage.tsx` | 粗利分析、売変分析、比較ビュー |
| カテゴリ | `Category/CategoryPage.tsx` | 帳合別分析、円グラフ、YoY比較 |
| サマリー | `Summary/SummaryPage.tsx` | 店舗別メトリクス |
| 予測 | `Forecast/ForecastPage.tsx` | 売上予測チャート、予測ヘルパー |
| 店間移動 | `Transfer/TransferPage.tsx` | 店間/部門間移動追跡 |
| 消耗品 | `Consumable/ConsumablePage.tsx` | 消耗品費追跡 |
| レポート | `Reports/ReportsPage.tsx` | 印刷用レポート（`@media print` 対応） |
| 管理 | `Admin/AdminPage.tsx` | 設定、データ管理、前年マッピング、ストレージ管理 |

### ページ詳細

#### ダッシュボード (`DashboardPage.tsx`)
- ウィジェットベースの構成。`widgets/registry.tsx` にウィジェット定義を集約
- KPIウィジェットとチャートウィジェットを分離してレンダリング
- ドラッグ&ドロップによるウィジェット並べ替え（編集モード切替）
- ウィジェット設定パネルで表示/非表示を制御
- データ駆動ウィジェットの自動注入（カテゴリ時間帯売上、前年比較等のデータ存在時に自動追加）
- `CategoryHierarchyProvider` でカテゴリ階層フィルタリングを提供
- 前年データの自動ロード（IndexedDB から）

#### レポート (`ReportsPage.tsx`)
- `@media print` によるブラウザ印刷対応
- `break-inside: avoid` でセクション分割防止
- 印刷時は白背景・黒文字に切替

#### 管理 (`AdminPage.tsx`)
- `PrevYearMappingTab`: 前年度の店舗マッピング設定
- `StorageManagementTab`: IndexedDB のデータ管理

---

## 2. チャートコンポーネント（27種）

全チャートは `presentation/components/charts/` に配置。Recharts ライブラリベースで実装。

### 予算・売上系

| コンポーネント | 説明 |
|--------------|------|
| `BudgetVsActualChart` | 予算vs実績の累計推移比較チャート |
| `DailySalesChart` | 日次売上チャート |
| `BudgetDiffTrendChart` | 予算差異推移チャート |

### 粗利系

| コンポーネント | 説明 |
|--------------|------|
| `GrossProfitAmountChart` | 粗利額チャート |
| `GrossProfitRateChart` | 粗利率チャート |

### 在庫・仕入系

| コンポーネント | 説明 |
|--------------|------|
| `InventoryTrendChart` | 在庫推移チャート（売上仕入比較チャート連携、推定在庫計算内蔵） |
| `EstimatedInventoryDetailChart` | 推定在庫詳細チャート |
| `SalesPurchaseComparisonChart` | 売上vs仕入比較チャート |

### 売変・値引系

| コンポーネント | 説明 |
|--------------|------|
| `DiscountTrendChart` | 売変率推移チャート |

### カテゴリ系

| コンポーネント | 説明 |
|--------------|------|
| `CategoryPieChart` | カテゴリ別円グラフ |
| `CategorySalesBreakdownChart` | カテゴリ売上内訳チャート |
| `CategoryHierarchyExplorer` | カテゴリ階層ドリルダウンエクスプローラ |

### 客数・客単価系

| コンポーネント | 説明 |
|--------------|------|
| `CustomerTrendChart` | 客数推移チャート |
| `TransactionValueChart` | 客単価分析チャート |

### 時間帯分析系

| コンポーネント | 説明 |
|--------------|------|
| `TimeSlotHeatmapChart` | 時間帯ヒートマップチャート |
| `TimeSlotSalesChart` | 時間帯別売上チャート |
| `TimeSlotYoYComparisonChart` | 時間帯別前年比較チャート |
| `TimeSlotKpiSummary` | 時間帯別KPIサマリー |
| `StoreTimeSlotComparisonChart` | 店舗×時間帯比較チャート |

### 部門分析系

| コンポーネント | 説明 |
|--------------|------|
| `DeptHourlyPatternChart` | 部門別時間帯パターンチャート |

### 比較・前年系

| コンポーネント | 説明 |
|--------------|------|
| `PrevYearComparisonChart` | 前年比較チャート |

### チャート共通機能

| コンポーネント/モジュール | 説明 |
|------------------------|------|
| `chartTheme.ts` | チャート用テーマカラー取得フック（`useChartTheme`）、ツールチップスタイル、数値フォーマッタ（`toManYen`, `toComma`, `toPct`）、店舗色定義 |
| `DayRangeSlider` | 日付範囲スライダー（チャートのフィルタリングに使用） |
| `PeriodFilter` | 期間フィルタ |
| `CategoryHierarchyContext` | カテゴリ階層フィルタリングコンテキスト |
| `inventoryCalc.ts` | チャート表示用の推定在庫計算ヘルパー |

### ダッシュボードウィジェット（チャート以外）

ダッシュボード専用のウィジェットとして `Dashboard/widgets/` に配置:

| ウィジェット | 説明 |
|------------|------|
| `ConditionSummary` | コンディションサマリー |
| `ExecSummaryBarWidget` | エグゼクティブサマリーバー |
| `MonthlyCalendar` | 月間カレンダーウィジェット |
| `PlanActualForecast` | 計画・実績・予測ウィジェット |
| `GrossProfitHeatmap` | 粗利ヒートマップ |
| `WaterfallChart` | ウォーターフォールチャート |
| `ForecastTools` | 予測ツールウィジェット |
| `RangeComparison` | 範囲比較ウィジェット |
| `TableWidgets` | 曜日別平均、週別サマリー、日別店舗売上、部門KPI、日別在庫、店舗KPIの各テーブルウィジェット |

---

## 3. 共通コンポーネント

全共通コンポーネントは `presentation/components/common/` に配置。

### 基本UI

| コンポーネント | 説明 |
|--------------|------|
| `Button` | 汎用ボタン |
| `Card` / `CardTitle` | カード型コンテナとタイトル |
| `Chip` / `ChipGroup` | チップ（タグ/フィルタ用） |
| `Modal` | モーダルダイアログ基盤 |

### メトリクス表示

| コンポーネント | 説明 |
|--------------|------|
| `KpiCard` | KPIカード（ラベル、値、アクセントカラー） |
| `KpiGrid` | KPIカードのグリッドレイアウト |

### テーブル表示

| コンポーネント | 説明 |
|--------------|------|
| `DataTableWrapper` | テーブルコンテナ |
| `DataTableTitle` | テーブルタイトル |
| `DataTable` | テーブル本体 |
| `DataTh` / `DataTd` / `DataTr` | テーブルセル要素 |

### ファイルアップロード

| コンポーネント | 説明 |
|--------------|------|
| `FileDropZone` | ドラッグ&ドロップファイル入力エリア |
| `UploadCard` | ファイルアップロードカード |
| `ImportProgressBar` | インポート進捗バー |

### バリデーション・確認

| コンポーネント | 説明 |
|--------------|------|
| `ValidationModal` | バリデーション結果表示モーダル |
| `DiffConfirmModal` | 差分確認モーダル（既存データとインポートデータの差分表示、上書き/維持の選択） |

### 通知

| コンポーネント | 説明 |
|--------------|------|
| `ToastProvider` / `useToast` | トースト通知のプロバイダとフック |

### データ管理

| コンポーネント | 説明 |
|--------------|------|
| `RestoreDataModal` | データ復元確認モーダル（ページ再訪時に保存済みデータの復元を確認） |
| `SettingsModal` | 設定モーダル |

### サイドバー

| コンポーネント | 説明 |
|--------------|------|
| `DataManagementSidebar` | データ管理サイドバー（ファイルアップロード、進捗表示、復元） |

---

## 4. レイアウト構造

レイアウトコンポーネントは `presentation/components/Layout/` に配置。

### 全体構成

```
┌──────────┬─────────────┬──────────────────────────┐
│          │             │                          │
│  NavBar  │   Sidebar   │      MainContent         │
│  (56px)  │   (260px)   │       (残り幅)           │
│          │             │                          │
│          │             │                          │
│          │             │                          │
│          │             │                          │
└──────────┴─────────────┴──────────────────────────┘
```

### AppShell

メインコンテナ。CSS Grid による3カラムレイアウト:
- `grid-template-columns: navWidth sidebarWidth 1fr`
- `height: 100vh`, `overflow: hidden`
- md以下のブレークポイントでサイドバーを非表示にし、2カラムに切替

### NavBar

左端の縦型ナビゲーションバー:
- ロゴ（「荒」アイコン）
- 9つのビューナビゲーションボタン（ダッシュボード、カテゴリ、予測、分析、日別、移動、消耗品、サマリ、レポート）
- 管理ボタン（下部）
- テーマ切替ボタン（最下部、ダーク/ライト切替）

### Sidebar

データ管理用サイドバー:
- セクションタイトル
- ファイルアップロード、インポート進捗、データ復元等の操作エリア
- md以下のブレークポイントで `display: none`

### MainContent

スクロール可能なメインコンテンツエリア:
- ページタイトル
- 店舗名バッジ（選択中の店舗表示）
- アクション領域（ページごとの操作ボタン）
- コンテンツ本体

---

## 5. テーマシステム

テーマ定義は `presentation/theme/` に配置。styled-components の `ThemeProvider` を介して全コンポーネントに提供。

### テーマモード

| モード | 背景色 | テキスト色 |
|--------|--------|-----------|
| Dark | `#09090b` (bg), `#0f1117` (bg2), `#16181f` (bg3), `#1c1f28` (bg4) | `#f4f4f5` (text), `#a1a1aa` (text2), `#71717a` (text3), `#52525b` (text4) |
| Light | `#f8fafc` (bg), `#ffffff` (bg2), `#f1f5f9` (bg3), `#e2e8f0` (bg4) | `#0f172a` (text), `#475569` (text2), `#64748b` (text3), `#94a3b8` (text4) |

### カラーパレット

30以上のセマンティックカラーを定義:

| カテゴリ | カラー |
|---------|--------|
| Primary | `#6366f1` (indigo), `#4f46e5` (dark) |
| Success | `#34d399`, `#22c55e`, `#16a34a` |
| Warning | `#fbbf24`, `#f59e0b`, `#d97706` |
| Danger | `#f87171`, `#ef4444`, `#dc2626` |
| Info | `#38bdf8`, `#0ea5e9` |
| Extended | purple, cyan, pink, lime, orange, blue, slate |

#### 色覚多様性対応（Color Universal Design）

Wong (2011) パレットをベースに、色覚特性に関わらず判別可能な色ペアを提供:
- **Positive**: Sky Blue (`#0ea5e9`) -- 良好・プラス指標
- **Negative**: Orange (`#f97316`) -- 注意・マイナス指標
- **Caution**: Yellow (`#eab308`) -- 警告・中間

`semanticColors.ts` の `sc` ユーティリティで条件分岐による色選択を提供:
- `sc.cond(isPositive)`: 2値判定
- `sc.cond3(isPositive, isCaution)`: 3値判定
- `sc.achievement(rate)`: 達成率に応じた色
- `sc.gpRate(rate, target, warning)`: 粗利率に応じた色

### カテゴリグラデーション（17種）

各カテゴリに `linear-gradient(135deg, ...)` のグラデーションを定義:

| キー | カテゴリ | カラー |
|-----|---------|--------|
| `ti` | TI（店入） | 緑系 (#4ade80 → #22c55e) |
| `to` | TO（店出） | 赤系 (#fb7185 → #f43f5e) |
| `bi` | BI（部入） | 青系 (#60a5fa → #3b82f6) |
| `bo` | BO（部出） | 紫系 (#c084fc → #a855f7) |
| `daily` | デイリー | 黄系 (#fbbf24 → #f59e0b) |
| `market` | 市場 | 黄系 (#fbbf24 → #f59e0b) |
| `lfc` | LFC | 青系 (#60a5fa → #3b82f6) |
| `salad` | サラダ | 緑系 (#4ade80 → #22c55e) |
| `kakou` | 加工 | 紫系 (#c084fc → #a855f7) |
| `chokuden` | 直伝 | シアン系 (#22d3ee → #06b6d4) |
| `hana` | 花 | ピンク系 (#f472b6 → #ec4899) |
| `sanchoku` | 産直 | ライム系 (#a3e635 → #84cc16) |
| `consumable` | 消耗品 | オレンジ系 (#f97316 → #ea580c) |
| `tenkan` | 店間 | 赤系 (#fb7185 → #f43f5e) |
| `bumonkan` | 部門間 | 紫系 (#a78bfa → #8b5cf6) |
| `other` | その他 | グレー系 (#94a3b8 → #64748b) |

### タイポグラフィ

- **プライマリフォント**: `'Noto Sans JP', sans-serif`
- **等幅フォント**: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`
- フォントサイズ: xs(0.55rem) 〜 3xl(1.4rem) の7段階
- フォントウェイト: normal(400) 〜 extrabold(800) の5段階

### グローバルスタイル (`GlobalStyle.ts`)

- `box-sizing: border-box` の全要素適用
- カスタムスクロールバー（6px幅、角丸）
- カスタム選択色（primary色の透過）
- フォーカスアウトライン（primary色、2px）
- 印刷時のスタイルリセット（白背景、黒文字）

---

## 6. レスポンシブ対応

### ブレークポイント

| トークン | 値 |
|---------|-----|
| `sm` | `700px` |
| `md` | `900px` |
| `lg` | `1100px` |
| `xl` | `1200px` |

### レスポンシブ挙動

| 画面幅 | レイアウト |
|--------|-----------|
| xl以上 (>1200px) | NavBar + Sidebar + MainContent の3カラム |
| md〜xl (900px〜1200px) | NavBar + Sidebar + MainContent の3カラム |
| md以下 (<900px) | Sidebar非表示、NavBar + MainContent の2カラム |

### サイドバー

- `md` ブレークポイント以下で `display: none` により完全非表示
- AppShell のグリッドも2カラム（`navWidth 1fr`）に切替

### グリッド

- ダッシュボードのウィジェットグリッド: 画面幅に応じたカラム数調整
- チャートウィジェット: full幅またはhalf幅（2カラム並列）

### 印刷対応 (`@media print`)

- レポートページ専用の印刷スタイル
- `break-inside: avoid` でセクションの途中改ページ防止
- 白背景・黒文字への自動切替
- 不要なUI要素（ナビゲーション等）の非表示
