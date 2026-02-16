# 仕入荒利管理システム - 要件定義書

## 1. プロジェクト概要

### 1.1 目的

既存の単一HTMLファイル（`shiire_arari_v10_multistore_flowview_ES5_20260216_022229_fixed_v23.html`、約364KB）で実装されている**仕入荒利管理システム**を、保守性・拡張性・型安全性を備えたモダンなTypeScript Webアプリケーションへリファクタリングする。

### 1.2 現行システムの課題

| # | 課題 | 影響 |
|---|------|------|
| 1 | 単一HTMLファイルに全コード（CSS/JS/HTML）が密結合 | 保守・テスト不能 |
| 2 | ES5 + グローバル変数によるステート管理 | 名前衝突・デバッグ困難 |
| 3 | 型定義なし（全てany相当） | ランタイムエラーの原因 |
| 4 | テストコードなし | 計算ロジックの信頼性が不明 |
| 5 | 変数名が略称・不統一（`v9_`, `v22_`, etc.） | コード理解に時間がかかる |
| 6 | ビジネスロジックとUIが密結合 | ロジック変更時にUI破壊のリスク |
| 7 | 参照外部モジュール（`features/import/*.js`, `state/*.js`）が欠落 | 不完全な状態 |

### 1.3 ゴール

- GitHub Pagesで静的にホスティング可能
- TypeScriptによる完全な型安全
- テストカバレッジ（ビジネスロジック80%以上）
- コンポーネント単位の分離（関心の分離）
- 将来的なバックエンド統合を考慮したアーキテクチャ

---

## 2. 技術スタック

| カテゴリ | 選定技術 | 理由 |
|----------|----------|------|
| 言語 | TypeScript 5.x (strict mode) | 型安全、IDE支援、リファクタリング容易 |
| UIフレームワーク | React 18 | コンポーネント指向、豊富なエコシステム |
| ビルドツール | Vite 6.x | 高速HMR、TypeScript native対応 |
| スタイリング | styled-components | CSS-in-JS、動的テーマ、型安全なスタイル |
| テスト | Vitest + React Testing Library | Vite互換・高速、Jest互換API |
| ファイル解析 | SheetJS (xlsx) | Excel/CSV読み込み（既存と同じ） |
| チャート | SVG自前実装 → 将来Chart.js/Recharts検討 | 既存SVGロジック移植、段階的改善 |
| デプロイ | GitHub Pages + GitHub Actions | 自動ビルド・デプロイ |
| Linter/Formatter | ESLint + Prettier | コード品質統一 |
| 状態管理 | React Context + useReducer → 将来Zustand検討 | 軽量から開始、必要に応じて拡張 |

---

## 3. 機能要件

### 3.1 データインポート機能

#### 3.1.1 対応ファイル形式
- Excel (.xlsx, .xls)
- CSV (.csv)

#### 3.1.2 データ種別と入力

| # | データ種別 | キー名 | 必須 | 説明 |
|---|-----------|--------|------|------|
| 1 | 仕入データ | `purchase` | **必須** | 取引先別・日別の原価金額・売価金額 |
| 2 | 売上データ | `sales` | **必須** | 店舗別・日別の販売金額 |
| 3 | 売変データ | `discount` | 任意 | 値引・割引額 |
| 4 | 初期設定 | `initialSettings` | 任意 | 期首在庫・期末在庫・粗利予算 |
| 5 | 予算データ | `budget` | 任意 | 店舗別・日別予算配分 |
| 6 | 消耗品データ | `consumables` | 任意 | 消耗品費（複数ファイル可、追加/上書きモード） |
| 7 | 店間入データ | `interStoreIn` | 任意 | 他店舗からの入荷 |
| 8 | 店間出データ | `interStoreOut` | 任意 | 他店舗への出荷 |
| 9 | 花データ | `flowers` | 任意 | 花売上（売価×掛け率=原価） |
| 10 | 産直データ | `directProduce` | 任意 | 産直売上（売価×掛け率=原価） |

#### 3.1.3 インポート方式
- ドラッグ＆ドロップ（複数ファイル同時対応）
- ファイル選択ダイアログ（カード型UI）
- 自動ファイル種別判定（ヘッダー解析）
- インポート進捗表示
- データ検証＆警告（検証モーダル付き）

### 3.2 計算エンジン

#### 3.2.1 粗利計算

```
■ 在庫法（実績）
  売上原価 = 期首在庫 + 総仕入高 - 期末在庫
  粗利益 = 売上高 - 売上原価
  粗利率 = 粗利益 / 売上高

■ 推定法（予測）
  コア売上（花・産直除く） = 総売上 - 花売価 - 産直売価
  粗売上 = コア売上 / (1 - 売変率)
  推定原価 = 粗売上 × (1 - 値入率) + 納品原価 + 消耗品費
  推定粗利 = 売上高 - 推定原価
  推定粗利率 = 推定粗利 / 売上高

■ 売変影響額
  売変ロス原価 = (1 - 値入率) × コア売上 × 売変率 / (1 - 売変率)
```

#### 3.2.2 予算分析
- 月間予算消化率（日別累計 vs 予算累計）
- 営業日ベースの進捗率
- 月末予測（営業日平均 × 残日数）
- 予算達成率

#### 3.2.3 週間予測
- 月間カレンダー（月曜始まり）
- 週単位の売上・粗利集計
- 曜日別平均
- 異常値検出（平均±標準偏差からの乖離）

#### 3.2.4 全店集計
- 個別店舗データの自動合算
- 日別・帳合別・取引先別の集計
- 店間移動の集約

### 3.3 表示機能（ビュー）

| # | ビュー名 | ID | 説明 |
|---|----------|-----|------|
| 1 | ダッシュボード | `dashboard` | エグゼクティブバー、KPIカード、レンジパネル、チャート |
| 2 | 帳合別 | `category` | 帳合（市場/LFC/サラダクラブ/加工品等）ごとの展開セクション |
| 3 | 週間予測 | `forecast` | 月間カレンダー、週別サマリー、曜日別平均 |
| 4 | 予算分析 | `analysis` | 予算vs実績テーブル、チャート |
| 5 | 日別推移 | `daily` | 日別明細テーブル、累計カラム |
| 6 | 荒利計算 | `summary` | 在庫計算、推定在庫、取引先別合計 |
| 7 | レポート | `reports` | 6種類のレポート生成（日別/週別/月別/帳合別/取引先別/在庫） |

### 3.4 設定機能

| 設定項目 | デフォルト値 | 説明 |
|----------|-------------|------|
| 目標粗利率 | 25.00% | 成功/警告の閾値 |
| 警告しきい値 | 23.00% | この値以下で警告 |
| 花掛け率 | 0.80 | 花の原価率（売価×0.80=原価） |
| 産直掛け率 | 0.85 | 産直の原価率（売価×0.85=原価） |
| デフォルト値入率 | 0.26 | コア商品の値入率 |
| デフォルト予算 | 6,450,000 | 予算ファイル未読込時のフォールバック |

- 全設定はlocalStorageに永続化
- 取引先別の個別設定（値入率、帳合分類）

### 3.5 エクスポート機能
- Excel出力（XLSX形式）
- 印刷対応（@media print最適化）
- レポートプレビューモーダル

### 3.6 UI/UX

- ダーク/ライトテーマ切替（localStorage永続化）
- レスポンシブデザイン（700px / 900px / 1100px / 1200px ブレークポイント）
- トースト通知
- ツールチップ
- ドラッグ＆ドロップ（ファイル、カラム並び替え）

---

## 4. 非機能要件

### 4.1 パフォーマンス
- 初期表示: 1秒以内（静的アセット配信後）
- 計算処理: 10店舗×31日のデータで500ms以内
- メモリ: 200MB以下（大規模データセット処理時）

### 4.2 セキュリティ
- 全データはクライアントサイド処理（サーバー送信なし）
- XSS対策（React標準のエスケープ + DOMPurify検討）
- localStorage暗号化は将来検討

### 4.3 アクセシビリティ
- セマンティックHTML
- WAI-ARIA属性
- キーボードナビゲーション
- カラーコントラスト比4.5:1以上

### 4.4 ブラウザ対応
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

---

## 5. アーキテクチャ設計

### 5.1 ディレクトリ構造

```
src/
├── main.tsx                      # エントリーポイント
├── App.tsx                       # ルートコンポーネント
├── vite-env.d.ts
│
├── domain/                       # ★ ドメイン層（フレームワーク非依存）
│   ├── models/                   # 型定義・ドメインモデル
│   │   ├── Store.ts              #   店舗
│   │   ├── Supplier.ts           #   取引先
│   │   ├── DailyRecord.ts        #   日別レコード
│   │   ├── CategoryTotal.ts      #   帳合別合計
│   │   ├── TransferDetail.ts     #   店間/部門間移動
│   │   ├── StoreResult.ts        #   店舗別計算結果
│   │   ├── BudgetData.ts         #   予算データ
│   │   ├── Settings.ts           #   アプリ設定
│   │   └── index.ts
│   │
│   ├── calculations/             # ★ ビジネスロジック（純粋関数）
│   │   ├── grossProfit.ts        #   粗利計算
│   │   ├── estimatedCogs.ts      #   推定原価計算
│   │   ├── budgetAnalysis.ts     #   予算分析
│   │   ├── forecast.ts           #   予測・異常値検出
│   │   ├── aggregation.ts        #   全店集計
│   │   ├── discountImpact.ts     #   売変影響分析
│   │   └── index.ts
│   │
│   └── constants/                # 定数
│       ├── categories.ts         #   帳合カテゴリ
│       └── defaults.ts           #   デフォルト値
│
├── infrastructure/               # ★ インフラ層
│   ├── fileImport/               # ファイル読み込み
│   │   ├── FileTypeDetector.ts   #   ファイル種別判定
│   │   ├── CsvParser.ts          #   CSV解析
│   │   ├── XlsxParser.ts         #   Excel解析
│   │   ├── ImportService.ts      #   インポート統合サービス
│   │   └── errors.ts             #   インポートエラー型
│   │
│   ├── dataProcessing/           # データ加工
│   │   ├── PurchaseProcessor.ts  #   仕入データ処理
│   │   ├── SalesProcessor.ts     #   売上データ処理
│   │   ├── DiscountProcessor.ts  #   売変データ処理
│   │   ├── SettingsProcessor.ts  #   初期設定処理
│   │   ├── BudgetProcessor.ts    #   予算データ処理
│   │   ├── TransferProcessor.ts  #   店間移動処理
│   │   ├── SpecialSalesProcessor.ts # 花・産直処理
│   │   └── ConsumableProcessor.ts   # 消耗品処理
│   │
│   ├── export/                   # エクスポート
│   │   ├── ExcelExporter.ts
│   │   └── ReportGenerator.ts
│   │
│   └── storage/                  # 永続化
│       └── LocalStorageAdapter.ts
│
├── application/                  # ★ アプリケーション層
│   ├── hooks/                    # カスタムフック
│   │   ├── useAppState.ts        #   グローバル状態管理
│   │   ├── useFileImport.ts      #   ファイルインポート
│   │   ├── useCalculation.ts     #   計算実行
│   │   ├── useSettings.ts        #   設定管理
│   │   ├── useTheme.ts           #   テーマ切替
│   │   └── useStoreSelection.ts  #   店舗選択
│   │
│   ├── context/                  # Reactコンテキスト
│   │   ├── AppStateContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   └── services/                 # アプリケーションサービス
│       └── CalculationOrchestrator.ts # 計算フロー制御
│
├── presentation/                 # ★ プレゼンテーション層
│   ├── components/               # 共通UIコンポーネント
│   │   ├── Layout/
│   │   │   ├── AppShell.tsx      #   3カラムレイアウト
│   │   │   ├── NavBar.tsx        #   左ナビ
│   │   │   ├── Sidebar.tsx       #   サイドバー
│   │   │   └── TopBar.tsx        #   トップバー
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── DropZone.tsx
│   │   │
│   │   ├── charts/
│   │   │   ├── BudgetVsActualChart.tsx
│   │   │   ├── GrossProfitRateChart.tsx
│   │   │   ├── DailySalesChart.tsx
│   │   │   └── InventoryChart.tsx
│   │   │
│   │   ├── kpi/
│   │   │   ├── KpiCard.tsx
│   │   │   ├── KpiGrid.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── ExecutiveBar.tsx
│   │   │
│   │   └── fileImport/
│   │       ├── UploadGrid.tsx
│   │       ├── UploadCard.tsx
│   │       └── FileDropZone.tsx
│   │
│   ├── views/                    # ページビュー
│   │   ├── DashboardView.tsx
│   │   ├── CategoryView.tsx
│   │   ├── ForecastView.tsx
│   │   ├── BudgetAnalysisView.tsx
│   │   ├── DailyTrendView.tsx
│   │   ├── GrossProfitCalcView.tsx
│   │   └── ReportsView.tsx
│   │
│   ├── modals/                   # モーダルダイアログ
│   │   ├── SettingsModal.tsx
│   │   ├── SupplierSettingsModal.tsx
│   │   ├── ConsumableModal.tsx
│   │   ├── ValidationModal.tsx
│   │   ├── ReportPreviewModal.tsx
│   │   └── ColumnConfigModal.tsx
│   │
│   └── styles/                   # グローバルスタイル
│       ├── theme.ts              #   テーマ定義（dark/light）
│       ├── GlobalStyle.ts        #   styled-components グローバル
│       └── mixins.ts             #   共通スタイルMixin
│
├── __tests__/                    # テスト
│   ├── domain/
│   │   ├── calculations/
│   │   │   ├── grossProfit.test.ts
│   │   │   ├── estimatedCogs.test.ts
│   │   │   ├── budgetAnalysis.test.ts
│   │   │   ├── forecast.test.ts
│   │   │   └── aggregation.test.ts
│   │   └── models/
│   │       └── StoreResult.test.ts
│   │
│   ├── infrastructure/
│   │   ├── fileImport/
│   │   │   ├── CsvParser.test.ts
│   │   │   ├── FileTypeDetector.test.ts
│   │   │   └── ImportService.test.ts
│   │   └── dataProcessing/
│   │       ├── PurchaseProcessor.test.ts
│   │       ├── SalesProcessor.test.ts
│   │       └── DiscountProcessor.test.ts
│   │
│   └── presentation/
│       └── components/
│           ├── KpiCard.test.tsx
│           └── DataTable.test.tsx
│
└── types/                        # グローバル型定義
    └── xlsx.d.ts                 #   SheetJS型拡張
```

### 5.2 レイヤードアーキテクチャ

```
┌─────────────────────────────────────────────┐
│            Presentation Layer               │
│   (React Components, Views, Styled)         │
├─────────────────────────────────────────────┤
│            Application Layer                │
│   (Hooks, Context, Orchestrator)            │
├─────────────────────────────────────────────┤
│              Domain Layer                   │
│   (Models, Calculations, Constants)         │
│   ★ フレームワーク非依存・純粋関数          │
├─────────────────────────────────────────────┤
│          Infrastructure Layer               │
│   (File I/O, Parsers, Export, Storage)      │
└─────────────────────────────────────────────┘
```

**依存方向**: Presentation → Application → Domain ← Infrastructure

Domain層は他のどの層にも依存しない（依存性逆転の原則）。

### 5.3 設計原則

| 原則 | 適用箇所 |
|------|----------|
| **単一責任原則 (SRP)** | 各Processorは1種類のデータのみ処理 |
| **開放閉鎖原則 (OCP)** | カテゴリ追加時にCalculation変更不要 |
| **依存性逆転 (DIP)** | Domain層はインフラに依存しない |
| **インターフェース分離 (ISP)** | Parserインターフェースを細分化 |
| **純粋関数** | 全計算ロジックは副作用なし |
| **イミュータブル** | Readonly型の活用、状態変更はReducer経由 |

### 5.4 状態管理設計

```typescript
// アプリケーション状態の型定義
interface AppState {
  // データ
  rawData: RawDataState;
  stores: ReadonlyMap<string, Store>;
  suppliers: ReadonlyMap<string, Supplier>;

  // 計算結果
  storeResults: ReadonlyMap<string, StoreResult>;

  // UI状態
  ui: {
    currentStoreId: string;         // 'all' | store ID
    currentView: ViewType;
    theme: 'dark' | 'light';
  };

  // 設定
  settings: AppSettings;
}

type AppAction =
  | { type: 'IMPORT_DATA'; payload: { dataType: DataType; rows: unknown[][] } }
  | { type: 'SET_STORE'; payload: string }
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'CALCULATE'; payload: CalculationResult }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'TOGGLE_THEME' }
  | { type: 'RESET' };
```

---

## 6. 変数名・命名規則の見直し

### 6.1 命名変換マップ（主要なもの）

| 旧名（現行HTML） | 新名（TypeScript） | 型 | 説明 |
|-------------------|--------------------|----|------|
| `DATA` | `rawData` | `RawDataState` | 生データストア |
| `STORES` | `stores` | `Map<string, Store>` | 店舗マスタ |
| `SUPPLIERS` | `suppliers` | `Map<string, Supplier>` | 取引先マスタ |
| `STORE_INVENTORY` | `storeInventory` | `Map<string, InventoryConfig>` | 在庫設定 |
| `STORE_BUDGET` | `storeBudget` | `Map<string, BudgetConfig>` | 予算設定 |
| `result` | `storeResults` | `Map<string, StoreResult>` | 計算結果 |
| `currentStore` | `currentStoreId` | `string` | 選択中店舗 |
| `currentView` | `currentView` | `ViewType` | 表示中ビュー |
| `shiire` | `purchase` | - | 仕入 → 購入 |
| `uriage` | `sales` | - | 売上 |
| `baihen` | `discount` | - | 売変 → 値引 |
| `tenkanIn/Out` | `interStoreIn/Out` | - | 店間移動 |
| `catTotals` | `categoryTotals` | `Map<string, CategoryTotal>` | 帳合別合計 |
| `supTotals` | `supplierTotals` | `Map<string, SupplierTotal>` | 取引先別合計 |
| `invStart/invEnd` | `openingInventory/closingInventory` | `number` | 期首/期末在庫 |
| `gpBudget` | `grossProfitBudget` | `number` | 粗利予算 |
| `gpRateBudget` | `grossProfitRateBudget` | `number` | 粗利率予算 |
| `estimatedCogs` | `estimatedCostOfGoodsSold` | `number` | 推定原価 |
| `baihenLossCost` | `discountLossCost` | `number` | 売変ロス原価 |
| `coreMarginRate` | `coreMarkupRate` | `number` | コア値入率 |
| `hanaRate` | `flowerCostRate` | `number` | 花掛け率 |
| `sanchokuRate` | `directProduceCostRate` | `number` | 産直掛け率 |

### 6.2 命名規約

| 対象 | 規約 | 例 |
|------|------|-----|
| 型/インターフェース | PascalCase | `StoreResult`, `DailyRecord` |
| 変数/関数 | camelCase | `calculateGrossProfit()` |
| 定数 | UPPER_SNAKE_CASE | `DEFAULT_MARKUP_RATE` |
| ファイル名 | PascalCase (コンポーネント), camelCase (関数) | `KpiCard.tsx`, `grossProfit.ts` |
| テストファイル | `*.test.ts` / `*.test.tsx` | `grossProfit.test.ts` |
| 型ファイル | PascalCase | `StoreResult.ts` |
| Enum値 | PascalCase | `ViewType.Dashboard` |
| boolean変数 | `is`/`has`/`should` prefix | `isLoaded`, `hasData` |

---

## 7. 型設計（主要モデル）

### 7.1 コアモデル

```typescript
// 店舗
interface Store {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

// 取引先
interface Supplier {
  readonly code: string;
  readonly name: string;
  readonly category: CategoryType;
  readonly markupRate?: number;
}

// 帳合カテゴリ
type CategoryType =
  | 'market'           // 市場
  | 'lfc'              // LFC
  | 'saladClub'        // サラダクラブ
  | 'processed'        // 加工品
  | 'directDelivery'   // 直伝
  | 'flowers'          // 花
  | 'directProduce'    // 産直
  | 'consumables'      // 消耗品
  | 'interStore'       // 店間移動
  | 'interDepartment'  // 部門間移動
  | 'other';           // その他

// 日別レコード
interface DailyRecord {
  readonly day: number;                              // 1-31
  readonly sales: number;                            // 売上高
  readonly purchase: CostPricePair;                  // 仕入（原価/売価）
  readonly interStoreIn: CostPricePair;             // 店間入
  readonly interStoreOut: CostPricePair;            // 店間出
  readonly interDepartmentIn: CostPricePair;        // 部門間入
  readonly interDepartmentOut: CostPricePair;       // 部門間出
  readonly flowers: CostPricePair;                  // 花
  readonly directProduce: CostPricePair;            // 産直
  readonly consumable: ConsumableDailyRecord;       // 消耗品
  readonly discountAmount: number;                  // 売変額
  readonly discountAbsolute: number;                // 売変絶対値
  readonly grossSales: number;                      // 粗売上
  readonly coreSales: number;                       // コア売上
  readonly supplierBreakdown: ReadonlyMap<string, CostPricePair>;
}

// 原価・売価ペア
interface CostPricePair {
  readonly cost: number;    // 原価金額
  readonly price: number;   // 売価金額
}

// 消耗品日別
interface ConsumableDailyRecord {
  readonly cost: number;
  readonly items: readonly ConsumableItem[];
}

// 店舗別計算結果
interface StoreResult {
  readonly storeId: string;

  // 在庫
  readonly openingInventory: number;
  readonly closingInventory: number;

  // 売上・原価
  readonly totalSales: number;
  readonly totalCoreSales: number;
  readonly totalCost: number;
  readonly coreCost: number;
  readonly deliverySalesCost: number;

  // 粗利
  readonly grossProfit: number;
  readonly grossProfitRate: number;
  readonly estimatedGrossProfit: number;
  readonly estimatedGrossProfitRate: number;
  readonly estimatedCostOfGoodsSold: number;

  // 売変
  readonly totalDiscount: number;
  readonly discountRateOnSales: number;
  readonly discountRateOnCost: number;
  readonly discountLossCost: number;

  // 値入率
  readonly averageMarkupRate: number;
  readonly coreMarkupRate: number;

  // 予算
  readonly budget: number;
  readonly grossProfitBudget: number;
  readonly grossProfitRateBudget: number;
  readonly budgetDaily: ReadonlyMap<number, number>;

  // 日別データ
  readonly daily: ReadonlyMap<number, DailyRecord>;

  // 集計
  readonly categoryTotals: ReadonlyMap<CategoryType, CostPricePair>;
  readonly supplierTotals: ReadonlyMap<string, SupplierTotal>;
  readonly transferDetails: TransferDetails;

  // 予測・KPI
  readonly elapsedDays: number;
  readonly salesDays: number;
  readonly averageDailySales: number;
  readonly projectedSales: number;
  readonly projectedAchievement: number;
  readonly totalConsumable: number;
  readonly consumableRate: number;
}
```

---

## 8. フェーズ別実装計画

### Phase 1: プロジェクト基盤構築

**目標**: ビルド・テスト・デプロイのパイプライン確立

| # | タスク | 成果物 |
|---|--------|--------|
| 1-1 | Vite + React + TypeScriptプロジェクト初期化 | `package.json`, `tsconfig.json`, `vite.config.ts` |
| 1-2 | ESLint + Prettier設定 | `.eslintrc.cjs`, `.prettierrc` |
| 1-3 | Vitest設定 | `vitest.config.ts` |
| 1-4 | styled-components設定 + テーマ定義 | `theme.ts`, `GlobalStyle.ts` |
| 1-5 | GitHub Actions CI/CD | `.github/workflows/deploy.yml` |
| 1-6 | GitHub Pages用ビルド設定 | `vite.config.ts` (base path) |
| 1-7 | ディレクトリ構造の作成 | 空の構造 + index.ts |

**完了基準**: `npm run build` 成功 & GitHub Pagesデプロイ動作確認

---

### Phase 2: ドメイン層実装（型定義 + 計算ロジック）

**目標**: フレームワーク非依存のビジネスロジック完成 + テスト

| # | タスク | テスト |
|---|--------|--------|
| 2-1 | 全型定義（models/） | 型チェック通過 |
| 2-2 | 定数定義（categories, defaults） | - |
| 2-3 | `grossProfit.ts` - 粗利計算 | 10+ テストケース |
| 2-4 | `estimatedCogs.ts` - 推定原価計算 | 10+ テストケース |
| 2-5 | `budgetAnalysis.ts` - 予算分析 | 8+ テストケース |
| 2-6 | `forecast.ts` - 予測・異常値検出 | 8+ テストケース |
| 2-7 | `aggregation.ts` - 全店集計 | 5+ テストケース |
| 2-8 | `discountImpact.ts` - 売変影響 | 5+ テストケース |

**完了基準**: 全テスト通過、カバレッジ80%以上

---

### Phase 3: インフラ層実装（ファイル解析 + データ処理）

**目標**: ファイル読み込み → データオブジェクト変換

| # | タスク | テスト |
|---|--------|--------|
| 3-1 | `CsvParser.ts` | 5+ テストケース |
| 3-2 | `XlsxParser.ts` | 3+ テストケース |
| 3-3 | `FileTypeDetector.ts` | 10+ テストケース（全ファイル種別） |
| 3-4 | `ImportService.ts` | 統合テスト |
| 3-5 | `PurchaseProcessor.ts` | 8+ テストケース |
| 3-6 | `SalesProcessor.ts` | 5+ テストケース |
| 3-7 | `DiscountProcessor.ts` | 5+ テストケース |
| 3-8 | `SettingsProcessor.ts` | 3+ テストケース |
| 3-9 | `BudgetProcessor.ts` | 3+ テストケース |
| 3-10 | `TransferProcessor.ts` | 5+ テストケース |
| 3-11 | `SpecialSalesProcessor.ts`（花・産直） | 4+ テストケース |
| 3-12 | `ConsumableProcessor.ts` | 3+ テストケース |
| 3-13 | `ExcelExporter.ts` | 基本テスト |
| 3-14 | `LocalStorageAdapter.ts` | 3+ テストケース |

**完了基準**: CSV/XLSXファイル → 型付きオブジェクト変換テスト通過

---

### Phase 4: アプリケーション層 + 状態管理

**目標**: React Context + Hooks で状態フロー確立

| # | タスク |
|---|--------|
| 4-1 | `AppStateContext.tsx` - Reducer + Provider |
| 4-2 | `ThemeContext.tsx` - テーマ管理 |
| 4-3 | `useAppState.ts` - 状態参照フック |
| 4-4 | `useFileImport.ts` - インポートフロー |
| 4-5 | `useCalculation.ts` - 計算トリガー |
| 4-6 | `useSettings.ts` - 設定永続化 |
| 4-7 | `useTheme.ts` - テーマ切替 |
| 4-8 | `useStoreSelection.ts` - 店舗切替 |
| 4-9 | `CalculationOrchestrator.ts` - 計算フロー統合 |

**完了基準**: フック経由でデータインポート→計算→結果取得のフローが動作

---

### Phase 5: プレゼンテーション層（UI実装）

**目標**: 全ビューのUI実装

| # | サブフェーズ | コンポーネント |
|---|-------------|---------------|
| 5-1 | レイアウト基盤 | AppShell, NavBar, Sidebar, TopBar |
| 5-2 | 共通コンポーネント | Button, Card, Modal, Toast, DataTable, DropZone, etc. |
| 5-3 | ファイルインポートUI | UploadGrid, UploadCard, FileDropZone |
| 5-4 | ダッシュボード | ExecutiveBar, KpiGrid, KpiCard, チャート |
| 5-5 | 帳合別ビュー | CategoryView + 展開セクション |
| 5-6 | 週間予測ビュー | ForecastView + カレンダー |
| 5-7 | 予算分析ビュー | BudgetAnalysisView + テーブル |
| 5-8 | 日別推移ビュー | DailyTrendView + チャート |
| 5-9 | 荒利計算ビュー | GrossProfitCalcView |
| 5-10 | レポートビュー | ReportsView + レポートモーダル |
| 5-11 | モーダル群 | Settings, Supplier, Consumable, Validation, etc. |

**完了基準**: 全画面が表示され、データ入力→計算→表示の全フローが動作

---

### Phase 6: チャート・ビジュアライゼーション

**目標**: SVGチャートの実装

| # | タスク |
|---|--------|
| 6-1 | BudgetVsActualChart（予算vs実績累計折れ線） |
| 6-2 | GrossProfitRateChart（日別粗利率棒グラフ） |
| 6-3 | DailySalesChart（売上推移＋売変率オーバーレイ） |
| 6-4 | InventoryChart（在庫推移） |

---

### Phase 7: 品質向上 + 最終調整

| # | タスク |
|---|--------|
| 7-1 | E2Eテスト（Playwright検討） |
| 7-2 | パフォーマンス最適化（React.memo, useMemo） |
| 7-3 | アクセシビリティ対応 |
| 7-4 | レスポンシブ最終調整 |
| 7-5 | 印刷スタイル対応 |
| 7-6 | エラーバウンダリ実装 |
| 7-7 | ドキュメント整備 |

---

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 元HTMLの計算ロジックにバグがある可能性 | 高 | テストケースで既存挙動を検証後、修正 |
| XLSX外部ライブラリのバンドルサイズ | 中 | 遅延読み込み + tree shaking |
| 大量データでのパフォーマンス劣化 | 中 | Web Worker検討、計算結果キャッシュ |
| styled-componentsのSSR非対応 | 低 | GitHub Pages（SPA）では問題なし |
| 元HTMLの未ドキュメント仕様の見落とし | 高 | テストファーストで既存挙動を記録 |

---

## 10. 用語集

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 仕入 | Purchase | 商品の仕入れ（原価・売価） |
| 売上 | Sales | 販売金額 |
| 粗利/荒利 | Gross Profit | 売上 - 売上原価 |
| 粗利率 | Gross Profit Rate | 粗利 / 売上 |
| 値入率 | Markup Rate | (売価 - 原価) / 売価 |
| 売変 | Discount / Price Adjustment | 値引・割引 |
| 帳合 | Category / Supplier Group | 取引先の分類 |
| 店間移動 | Inter-store Transfer | 店舗間の商品移動 |
| 部門間移動 | Inter-department Transfer | 部門間の商品移動 |
| 花 | Flowers | 花卉（特殊原価計算） |
| 産直 | Direct Produce | 産地直送品（特殊原価計算） |
| 消耗品 | Consumables | 消耗品費（直接経費） |
| 期首在庫 | Opening Inventory | 月初の在庫金額 |
| 期末在庫 | Closing Inventory | 月末の在庫金額 |
| 掛け率 | Cost Rate | 売価に対する原価の比率 |
