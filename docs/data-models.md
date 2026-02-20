# 仕入荒利管理システム - データモデル定義書

## 概要

本ドキュメントでは、仕入荒利管理システムで使用される全ての主要な型定義を解説する。
全ての型は `app/src/domain/models/` に定義されており、フレームワーク非依存である。

---

## 1. ImportedData --- データ集約ルート

**ファイル**: `app/src/domain/models/ImportedData.ts`

`ImportedData` はインポートされた全データの集約ルートであり、アプリケーション状態の中核を成す。
各フィールドは対応するプロセッサによってファイルから変換・格納される。

```typescript
/** インポートされた全データの集約 */
export interface ImportedData {
  // ─── マスタデータ ──────────────────────────────────────
  readonly stores: ReadonlyMap<string, Store>
  readonly suppliers: ReadonlyMap<string, { code: string; name: string }>

  // ─── 取引データ (StoreDayRecord パターン) ──────────────
  readonly purchase: PurchaseData           // 仕入 (必須)
  readonly sales: SalesData                 // 売上 (必須)
  readonly discount: DiscountData           // 売変

  // ─── 前年データ ────────────────────────────────────────
  readonly prevYearSales: SalesData         // 前年売上
  readonly prevYearDiscount: DiscountData   // 前年売変

  // ─── 移動データ ────────────────────────────────────────
  readonly interStoreIn: TransferData       // 店間入
  readonly interStoreOut: TransferData      // 店間出

  // ─── 特殊売上 ──────────────────────────────────────────
  readonly flowers: SpecialSalesData        // 花
  readonly directProduce: SpecialSalesData  // 産直

  // ─── その他 ────────────────────────────────────────────
  readonly consumables: ConsumableData      // 消耗品
  readonly categoryTimeSales: CategoryTimeSalesData          // 分類別時間帯売上
  readonly prevYearCategoryTimeSales: CategoryTimeSalesData  // 前年分類別時間帯売上
  readonly departmentKpi: DepartmentKpiData                  // 部門別KPI

  // ─── 設定・予算 ────────────────────────────────────────
  readonly settings: ReadonlyMap<string, InventoryConfig>    // 在庫設定
  readonly budget: ReadonlyMap<string, BudgetData>           // 予算
}
```

**初期化**: `createEmptyImportedData()` で空のインスタンスを生成。全Map/StoreDayRecordは空で初期化される。

**データの関連図**:

```
ImportedData
  ├── stores ──────────── Map<storeId, Store>
  ├── suppliers ────────── Map<supplierCode, {code, name}>
  │
  ├── purchase ─────────── StoreDayRecord<PurchaseDayEntry>
  │     └── PurchaseDayEntry.suppliers → 取引先コードで suppliers と紐づく
  │
  ├── sales ────────────── StoreDayRecord<SalesDayEntry>
  ├── discount ─────────── StoreDayRecord<DiscountDayEntry>
  │
  ├── prevYearSales ────── StoreDayRecord<SalesDayEntry>
  ├── prevYearDiscount ─── StoreDayRecord<DiscountDayEntry>
  │
  ├── interStoreIn ─────── StoreDayRecord<TransferDayEntry>
  ├── interStoreOut ────── StoreDayRecord<TransferDayEntry>
  │
  ├── flowers ──────────── StoreDayRecord<SpecialSalesDayEntry>
  ├── directProduce ────── StoreDayRecord<SpecialSalesDayEntry>
  │
  ├── consumables ──────── StoreDayRecord<ConsumableDailyRecord>
  ├── categoryTimeSales ── { records: CategoryTimeSalesRecord[] }
  ├── prevYearCategoryTimeSales ── { records: CategoryTimeSalesRecord[] }
  ├── departmentKpi ────── { records: DepartmentKpiRecord[] }
  │
  ├── settings ─────────── Map<storeId, InventoryConfig>
  └── budget ──────────── Map<storeId, BudgetData>
```

---

## 2. StoreResult --- 店舗別計算結果

**ファイル**: `app/src/domain/models/StoreResult.ts`

`StoreResult` は1店舗分の全計算結果を保持する。`CalculationOrchestrator` が生成し、
UI層の各ページがこのインターフェースを参照して表示を構築する。

```typescript
/** 店舗別計算結果 */
export interface StoreResult {
  readonly storeId: string

  // ═══════════════════════════════════════════════════════
  // 在庫（実績）
  // ═══════════════════════════════════════════════════════
  readonly openingInventory: number | null   // 期首在庫
  readonly closingInventory: number | null   // 期末在庫（実績）

  // ═══════════════════════════════════════════════════════
  // 売上
  // ═══════════════════════════════════════════════════════
  readonly totalSales: number                // 総売上高（全体 = コア + 花 + 産直 + 売上納品）
  readonly totalCoreSales: number            // コア売上（花・産直・売上納品除外）
  readonly deliverySalesPrice: number        // 売上納品売価
  readonly flowerSalesPrice: number          // 花売価
  readonly directProduceSalesPrice: number   // 産直売価
  readonly grossSales: number                // 粗売上（売変前売価）

  // ═══════════════════════════════════════════════════════
  // 原価
  // ═══════════════════════════════════════════════════════
  readonly totalCost: number                 // 総仕入原価（全体）
  readonly inventoryCost: number             // 在庫仕入原価（売上納品分除外）
  readonly deliverySalesCost: number         // 売上納品原価

  // ═══════════════════════════════════════════════════════
  // 【在庫法】実績粗利 --- スコープ: 全売上・全仕入
  //   売上原価 = 期首在庫 + 総仕入高 - 期末在庫
  //   粗利益   = 総売上高 - 売上原価
  //   粗利率   = 粗利益 / 総売上高
  // ═══════════════════════════════════════════════════════
  readonly invMethodCogs: number | null             // 在庫法: 売上原価
  readonly invMethodGrossProfit: number | null      // 在庫法: 粗利益
  readonly invMethodGrossProfitRate: number | null  // 在庫法: 粗利率（分母=総売上高）

  // ═══════════════════════════════════════════════════════
  // 【推定法】在庫推定指標 --- スコープ: 在庫販売のみ（花・産直除外）
  //   ※ 実粗利ではない。推定期末在庫の算出基礎。
  //   推定原価     = 粗売上 × (1 - 値入率) + 消耗品費
  //   推定マージン = コア売上 - 推定原価
  //   推定期末在庫 = 期首在庫 + 在庫仕入原価 - 推定原価
  // ═══════════════════════════════════════════════════════
  readonly estMethodCogs: number                    // 推定法: 推定原価
  readonly estMethodMargin: number                  // 推定法: 推定マージン ※実粗利ではない
  readonly estMethodMarginRate: number              // 推定法: 推定マージン率 ※実粗利率ではない
  readonly estMethodClosingInventory: number | null // 推定法: 推定期末在庫

  // ═══════════════════════════════════════════════════════
  // 客数
  // ═══════════════════════════════════════════════════════
  readonly totalCustomers: number            // 来店客数合計
  readonly averageCustomersPerDay: number    // 日平均客数

  // ═══════════════════════════════════════════════════════
  // 売変
  // ═══════════════════════════════════════════════════════
  readonly totalDiscount: number             // 売変額合計
  readonly discountRate: number              // 売変率（売価ベース）
  readonly discountLossCost: number          // 売変ロス原価

  // ═══════════════════════════════════════════════════════
  // 値入率
  // ═══════════════════════════════════════════════════════
  readonly averageMarkupRate: number         // 平均値入率（全体）
  readonly coreMarkupRate: number            // コア値入率（在庫販売対象）

  // ═══════════════════════════════════════════════════════
  // 消耗品
  // ═══════════════════════════════════════════════════════
  readonly totalConsumable: number           // 消耗品費合計
  readonly consumableRate: number            // 消耗品率

  // ═══════════════════════════════════════════════════════
  // 予算
  // ═══════════════════════════════════════════════════════
  readonly budget: number                    // 月間売上予算
  readonly grossProfitBudget: number         // 粗利予算
  readonly grossProfitRateBudget: number     // 粗利率予算
  readonly budgetDaily: ReadonlyMap<number, number>  // 日別予算配分
  readonly budgetAchievementRate: number     // 予算達成率（実績/予算）
  readonly budgetProgressRate: number        // 予算消化率（実績/経過予算）
  readonly budgetElapsedRate: number         // 予算経過率（経過予算/月間予算）
  readonly remainingBudget: number           // 残余予算
  readonly dailyCumulative: ReadonlyMap<number, { sales: number; budget: number }>

  // ═══════════════════════════════════════════════════════
  // 日別データ
  // ═══════════════════════════════════════════════════════
  readonly daily: ReadonlyMap<number, DailyRecord>  // day(1-31) → DailyRecord

  // ═══════════════════════════════════════════════════════
  // 集計
  // ═══════════════════════════════════════════════════════
  readonly categoryTotals: ReadonlyMap<CategoryType, CostPricePair>
  readonly supplierTotals: ReadonlyMap<string, SupplierTotal>
  readonly transferDetails: TransferDetails

  // ═══════════════════════════════════════════════════════
  // 予測・KPI
  // ═══════════════════════════════════════════════════════
  readonly elapsedDays: number               // 経過日数
  readonly salesDays: number                 // 営業日数
  readonly averageDailySales: number         // 日平均売上
  readonly projectedSales: number            // 月末予測売上
  readonly projectedAchievement: number      // 予算達成率予測
}
```

**在庫法と推定法の対比**:

| | 在庫法 (`invMethod*`) | 推定法 (`estMethod*`) |
|---|---|---|
| 本質 | 損益計算 | 在庫推定 |
| 目的 | 実際の粗利益を確認 | 推定在庫と実績在庫の比較による異常検知 |
| スコープ | 全売上・全仕入（花・産直含む） | 在庫販売のみ（花・産直除外） |
| 売上の範囲 | totalSales | totalCoreSales |
| null許容 | 期首/期末在庫がnullの場合null | estMethodClosingInventoryのみnull許容 |

---

## 3. DailyRecord --- 日別取引レコード

**ファイル**: `app/src/domain/models/DailyRecord.ts`

1店舗の1日分の全取引データを集約する。`StoreResult.daily` のMap値として保持される。

```typescript
/** 移動明細行（from → to のペア別集計） */
export interface TransferBreakdownEntry {
  readonly fromStoreId: string
  readonly toStoreId: string
  readonly cost: number
  readonly price: number
}

/** 日別レコード */
export interface DailyRecord {
  readonly day: number                    // 1-31
  readonly sales: number                  // 売上高（総売上）
  readonly coreSales: number              // コア売上（花・産直・売上納品除外）
  readonly grossSales: number             // 粗売上（売変前売価）

  readonly purchase: CostPricePair        // 仕入（原価/売価）
  readonly deliverySales: CostPricePair   // 売上納品（原価/売価）

  readonly interStoreIn: CostPricePair         // 店間入
  readonly interStoreOut: CostPricePair        // 店間出
  readonly interDepartmentIn: CostPricePair    // 部門間入
  readonly interDepartmentOut: CostPricePair   // 部門間出

  readonly flowers: CostPricePair         // 花
  readonly directProduce: CostPricePair   // 産直

  readonly consumable: ConsumableDailyRecord   // 消耗品

  readonly customers?: number             // 来店客数

  readonly discountAmount: number         // 売変額
  readonly discountAbsolute: number       // 売変絶対値

  readonly supplierBreakdown: ReadonlyMap<string, CostPricePair>  // 取引先別内訳
  readonly transferBreakdown: {           // 移動明細
    readonly interStoreIn: readonly TransferBreakdownEntry[]
    readonly interStoreOut: readonly TransferBreakdownEntry[]
    readonly interDepartmentIn: readonly TransferBreakdownEntry[]
    readonly interDepartmentOut: readonly TransferBreakdownEntry[]
  }
}
```

**総仕入原価の計算**:

```typescript
/** 日別レコードの総仕入原価を算出する */
export function getDailyTotalCost(rec: DailyRecord): number {
  return (
    rec.purchase.cost +
    rec.interStoreIn.cost +
    rec.interStoreOut.cost +
    rec.interDepartmentIn.cost +
    rec.interDepartmentOut.cost +
    rec.deliverySales.cost
  )
}
```

---

## 4. StoreDayRecord<T> パターン --- 2次元インデックス

**ファイル**: `app/src/domain/models/DataTypes.ts`

全ての日別取引データで使用される共通パターン。`storeId → day → T` の2次元マッピング。

```typescript
/**
 * 店舗×日別の2次元インデックス付きレコード。
 * Excelパース結果の共通パターン: storeId → day → T
 */
export type StoreDayRecord<T> = {
  readonly [storeId: string]: {
    readonly [day: number]: T
  }
}
```

**StoreDayRecord の各データ型**:

```
StoreDayRecord<T>
  │
  ├── PurchaseData  = StoreDayRecord<PurchaseDayEntry>
  │     └── PurchaseDayEntry: { suppliers: {...}, total: {cost, price} }
  │
  ├── SalesData     = StoreDayRecord<SalesDayEntry>
  │     └── SalesDayEntry: { sales: number, customers?: number }
  │
  ├── DiscountData  = StoreDayRecord<DiscountDayEntry>
  │     └── DiscountDayEntry: { sales, discount, customers? }
  │
  ├── TransferData  = StoreDayRecord<TransferDayEntry>
  │     └── TransferDayEntry: { interStoreIn[], interStoreOut[],
  │                              interDepartmentIn[], interDepartmentOut[] }
  │
  ├── SpecialSalesData = StoreDayRecord<SpecialSalesDayEntry>
  │     └── SpecialSalesDayEntry: { price, cost }
  │
  └── ConsumableData   = StoreDayRecord<ConsumableDailyRecord>
        └── ConsumableDailyRecord: { cost, items: ConsumableItem[] }
```

### 4.1 PurchaseDayEntry --- 仕入日別

```typescript
/** 仕入日別レコード */
export interface PurchaseDayEntry {
  readonly suppliers: {
    readonly [supplierCode: string]: {
      readonly name: string
      readonly cost: number    // 原価金額
      readonly price: number   // 売価金額
    }
  }
  readonly total: { readonly cost: number; readonly price: number }
}
```

### 4.2 SalesDayEntry --- 売上日別

```typescript
/** 売上日別レコード */
export interface SalesDayEntry {
  readonly sales: number
  readonly customers?: number   // 客数（売上売変客数ファイルに含まれる場合）
}
```

### 4.3 DiscountDayEntry --- 売変日別

```typescript
/** 売変日別レコード */
export interface DiscountDayEntry {
  readonly sales: number
  readonly discount: number     // 絶対値で格納
  readonly customers?: number   // 客数（売上売変客数ファイルに含まれる場合）
}
```

### 4.4 TransferRecord / TransferDayEntry --- 移動レコード

```typescript
/** 移動レコード */
export interface TransferRecord {
  readonly day: number
  readonly cost: number
  readonly price: number
  readonly fromStoreId: string
  readonly toStoreId: string
  readonly isDepartmentTransfer: boolean  // true: 部門間移動
}

/** 移動日別レコード */
export interface TransferDayEntry {
  readonly interStoreIn: readonly TransferRecord[]
  readonly interStoreOut: readonly TransferRecord[]
  readonly interDepartmentIn: readonly TransferRecord[]
  readonly interDepartmentOut: readonly TransferRecord[]
}
```

**部門間移動の判定**: `fromStoreId === toStoreId` の場合、店間移動ではなく部門間移動として分類される。

### 4.5 SpecialSalesDayEntry --- 花/産直日別

```typescript
/** 花/産直日別レコード */
export interface SpecialSalesDayEntry {
  readonly price: number   // 売価
  readonly cost: number    // 原価（= price × costRate）
}
```

- 花: `cost = Math.round(price * flowerCostRate)` (デフォルト 0.80)
- 産直: `cost = Math.round(price * directProduceCostRate)` (デフォルト 0.85)

---

## 5. CostPricePair --- 原価/売価ペア

**ファイル**: `app/src/domain/models/CostPricePair.ts`

システム全体で最も頻繁に使用される基本型。仕入・移動・花・産直・帳合別合計など、
原価と売価のペアが必要な全ての場面で使用される。

```typescript
/** 原価・売価ペア */
export interface CostPricePair {
  readonly cost: number    // 原価金額
  readonly price: number   // 売価金額
}

/** ゼロ値の CostPricePair */
export const ZERO_COST_PRICE_PAIR: CostPricePair = { cost: 0, price: 0 } as const

/** 2つの CostPricePair を加算 */
export function addCostPricePairs(a: CostPricePair, b: CostPricePair): CostPricePair {
  return { cost: a.cost + b.cost, price: a.price + b.price }
}
```

---

## 6. Store --- 店舗

**ファイル**: `app/src/domain/models/Store.ts`

```typescript
/** 店舗 */
export interface Store {
  readonly id: string     // 店舗ID（例: "1", "2", ...）
  readonly code: string   // 店舗コード（4桁、例: "0001"）
  readonly name: string   // 店舗名
}
```

- 仕入/売上ファイルから `正規表現 /(\d{4}):/` で店舗コードと名称を抽出
- `id` は `String(parseInt(code))` で先頭ゼロを除去した値

---

## 7. Supplier / SupplierTotal --- 取引先

**ファイル**: `app/src/domain/models/Supplier.ts`

```typescript
/** 取引先 */
export interface Supplier {
  readonly code: string             // 取引先コード（7桁）
  readonly name: string             // 取引先名
  readonly category: CategoryType   // 帳合カテゴリ
  readonly markupRate?: number      // 個別値入率（未設定時はグローバルデフォルト使用）
}

/** 取引先別合計 */
export interface SupplierTotal {
  readonly supplierCode: string
  readonly supplierName: string
  readonly category: CategoryType
  readonly cost: number             // 原価合計
  readonly price: number            // 売価合計
  readonly markupRate: number       // 値入率
}
```

---

## 8. BudgetData / InventoryConfig --- 予算・在庫設定

**ファイル**: `app/src/domain/models/BudgetData.ts`

```typescript
/** 予算データ */
export interface BudgetData {
  readonly storeId: string
  readonly daily: ReadonlyMap<number, number>  // day(1-31) → 予算金額
  readonly total: number                       // 月間合計
}

/** 在庫設定 */
export interface InventoryConfig {
  readonly storeId: string
  readonly openingInventory: number | null    // 期首在庫（null = 未設定 → 推定在庫計算スキップ）
  readonly closingInventory: number | null    // 期末在庫（null = 未設定 → 在庫法粗利計算スキップ）
  readonly grossProfitBudget: number | null   // 月間粗利額予算
}
```

**フォールバック動作**:
- `openingInventory` が `null` → 推定期末在庫計算をスキップ
- `closingInventory` が `null` → 在庫法（invMethod）による粗利計算をスキップ
- `grossProfitBudget` が `null` → デフォルト予算（6,450,000）を使用

---

## 9. AppSettings --- アプリケーション設定

**ファイル**: `app/src/domain/models/Settings.ts`

```typescript
/** カスタムカテゴリ */
export type CustomCategory =
  | '市場仕入' | 'LFC' | 'サラダ' | '加工品'
  | '消耗品' | '直伝' | 'その他'

/** アプリケーション設定 */
export interface AppSettings {
  readonly targetYear: number                  // 対象年
  readonly targetMonth: number                 // 対象月 (1-12)
  readonly targetGrossProfitRate: number        // 目標粗利率 (default: 0.25)
  readonly warningThreshold: number             // 警告しきい値 (default: 0.23)
  readonly flowerCostRate: number               // 花掛け率 (default: 0.80)
  readonly directProduceCostRate: number        // 産直掛け率 (default: 0.85)
  readonly defaultMarkupRate: number            // デフォルト値入率 (default: 0.26)
  readonly defaultBudget: number                // デフォルト予算 (default: 6,450,000)
  readonly dataEndDay: number | null            // 取込データ有効末日 (null = 月末まで)
  readonly supplierCategoryMap: Readonly<Partial<Record<string, CustomCategory>>>

  // 前年比マッピング
  readonly prevYearSourceYear: number | null    // 前年データ取得元の年 (null = 自動)
  readonly prevYearSourceMonth: number | null   // 前年データ取得元の月 (null = 自動)
  readonly prevYearDowOffset: number | null     // 曜日オフセット手動指定 (null = 自動計算)
}
```

**永続化**: `localStorage` キー `shiire-arari-settings` にJSON形式で保存。
起動時に `createDefaultSettings()` とマージして読み込む。

---

## 10. CategoryType --- 帳合カテゴリ (11種)

**ファイル**: `app/src/domain/models/CategoryType.ts`

```typescript
/** 帳合カテゴリ */
export type CategoryType =
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
  | 'other'            // その他
```

**表示名マッピング** (`app/src/domain/constants/categories.ts`):

| CategoryType | 日本語表示名 |
|-------------|-------------|
| `market` | 市場 |
| `lfc` | LFC |
| `saladClub` | サラダクラブ |
| `processed` | 加工品 |
| `directDelivery` | 直伝 |
| `flowers` | 花 |
| `directProduce` | 産直 |
| `consumables` | 消耗品 |
| `interStore` | 店間移動 |
| `interDepartment` | 部門間移動 |
| `other` | その他 |

---

## 11. ViewType --- ビュー種別 (10ビュー)

**ファイル**: `app/src/domain/models/Settings.ts`

```typescript
export type ViewType =
  | 'dashboard'    // ダッシュボード
  | 'category'     // 帳合別
  | 'forecast'     // 週間予測
  | 'analysis'     // 予算分析
  | 'daily'        // 日別推移
  | 'transfer'     // 店間移動
  | 'consumable'   // 消耗品
  | 'summary'      // 荒利計算
  | 'reports'      // レポート
  | 'admin'        // 管理
```

---

## 12. DataType --- データ種別 (15種)

**ファイル**: `app/src/domain/models/Settings.ts`

```typescript
export type DataType =
  | 'purchase'                    // 仕入
  | 'sales'                       // 売上
  | 'discount'                    // 売変
  | 'salesDiscount'               // 売上売変（複合ファイル）
  | 'prevYearSalesDiscount'       // 前年売上売変（複合ファイル）
  | 'initialSettings'             // 初期設定
  | 'budget'                      // 予算
  | 'consumables'                 // 消耗品
  | 'interStoreIn'                // 店間入
  | 'interStoreOut'               // 店間出
  | 'flowers'                     // 花
  | 'directProduce'               // 産直
  | 'categoryTimeSales'           // 分類別時間帯売上
  | 'prevYearCategoryTimeSales'   // 前年分類別時間帯売上
  | 'departmentKpi'               // 部門別KPI
```

**注記**:
- `salesDiscount` は売上と売変が1つのファイルに含まれる複合形式
- `prevYearSalesDiscount` は前年データの売上売変複合形式
- `initialSettings` は期首/期末在庫・粗利予算の設定ファイル

---

## 13. ConsumableItem / ConsumableDailyRecord --- 消耗品

**ファイル**: `app/src/domain/models/ConsumableItem.ts`

```typescript
/** 消耗品明細 */
export interface ConsumableItem {
  readonly accountCode: string   // 勘定コード（'81257' のみ対象）
  readonly itemCode: string      // 品目コード
  readonly itemName: string      // 品目名
  readonly quantity: number      // 数量
  readonly cost: number          // 原価
}

/** 消耗品日別レコード */
export interface ConsumableDailyRecord {
  readonly cost: number                          // 日計コスト
  readonly items: readonly ConsumableItem[]       // 明細リスト
}

/** ゼロ値の消耗品日別レコード */
export const ZERO_CONSUMABLE_DAILY: ConsumableDailyRecord = {
  cost: 0,
  items: [],
} as const
```

---

## 14. TransferDetail / TransferDetails --- 移動

**ファイル**: `app/src/domain/models/TransferDetail.ts`

```typescript
/** 店間/部門間移動の詳細 */
export interface TransferDetail {
  readonly day: number
  readonly fromStoreId: string
  readonly toStoreId: string
  readonly cost: number
  readonly price: number
}

/** 移動集計 */
export interface TransferDetails {
  readonly interStoreIn: CostPricePair         // 店間入合計
  readonly interStoreOut: CostPricePair        // 店間出合計
  readonly interDepartmentIn: CostPricePair    // 部門間入合計
  readonly interDepartmentOut: CostPricePair   // 部門間出合計
  readonly netTransfer: CostPricePair          // 店間純増減
}
```

---

## 15. CategoryTimeSalesRecord --- 分類別時間帯売上

**ファイル**: `app/src/domain/models/DataTypes.ts`

```typescript
/** 分類別時間帯売上 時間帯レコード */
export interface TimeSlotEntry {
  readonly hour: number      // 時間帯（時）
  readonly quantity: number  // 数量
  readonly amount: number    // 金額
}

/** 分類別時間帯売上 1行レコード */
export interface CategoryTimeSalesRecord {
  readonly day: number
  readonly storeId: string
  readonly department: { readonly code: string; readonly name: string }  // 部門
  readonly line: { readonly code: string; readonly name: string }        // ライン
  readonly klass: { readonly code: string; readonly name: string }       // クラス
  readonly timeSlots: readonly TimeSlotEntry[]
  readonly totalQuantity: number
  readonly totalAmount: number
}

/** 分類別時間帯売上パース結果 */
export interface CategoryTimeSalesData {
  readonly records: readonly CategoryTimeSalesRecord[]
}
```

**階層構造**: 部門(department) → ライン(line) → クラス(klass) の3階層でカテゴリを分類。

---

## 16. DepartmentKpiRecord --- 部門別KPI

**ファイル**: `app/src/domain/models/DataTypes.ts`

```typescript
/** 部門別KPIレコード */
export interface DepartmentKpiRecord {
  readonly deptCode: string         // 部門コード
  readonly deptName: string         // 部門名
  readonly gpRateBudget: number     // 粗利率予算
  readonly gpRateActual: number     // 粗利率実績
  readonly gpRateVariance: number   // 予算差異 (pt)
  readonly markupRate: number       // 値入率
  readonly discountRate: number     // 売変率
  readonly salesBudget: number      // 売上予算
  readonly salesActual: number      // 売上実績
  readonly salesVariance: number    // 差異
  readonly salesAchievement: number // 達成率
  readonly openingInventory: number // 期首在庫
  readonly closingInventory: number // 期末在庫
  readonly gpRateLanding: number    // 最終粗利着地
  readonly salesLanding: number     // 最終売上着地
}

/** 部門別KPIパース結果 */
export interface DepartmentKpiData {
  readonly records: readonly DepartmentKpiRecord[]
}
```

---

## 17. ValidationMessage --- バリデーション結果

**ファイル**: `app/src/domain/models/ValidationMessage.ts`

```typescript
/** バリデーション結果 */
export interface ValidationMessage {
  readonly level: 'error' | 'warning' | 'info'
  readonly message: string
  readonly details?: readonly string[]    // 詳細行（折りたたみ表示用）
}
```

**バリデーションルール**:

| レベル | 条件 | メッセージ |
|--------|------|-----------|
| `error` | 仕入データ未読込 | 仕入データが必要です |
| `error` | 売上データ未読込 | 売上データが必要です |
| `warning` | 検出店舗数 = 0 | 店舗が検出されません |
| `warning` | 在庫設定未登録の店舗あり | 在庫設定が必要です |
| `info` | 予算データ未読込 | 予算データの読込を推奨 |
| `info` | 売変データ未読込 | 売変データで精度向上 |

---

## 18. AppState --- アプリケーション状態

**ファイル**: `app/src/application/context/AppStateContext.tsx`

AppState はアプリケーション全体の状態を管理するReducer状態である。
Domain層のモデルではないが、全てのモデルを束ねる最上位の状態型として重要。

```typescript
/** UI 状態スライス */
export interface UiState {
  readonly selectedStoreIds: ReadonlySet<string>
  readonly currentView: ViewType
  readonly isCalculated: boolean
  readonly isImporting: boolean
}

/** データ状態スライス */
export interface DataState {
  readonly data: ImportedData
  readonly storeResults: ReadonlyMap<string, StoreResult>
  readonly validationMessages: readonly ValidationMessage[]
}

/** アプリケーション状態 */
export interface AppState {
  readonly data: ImportedData
  readonly storeResults: ReadonlyMap<string, StoreResult>
  readonly validationMessages: readonly ValidationMessage[]
  readonly ui: UiState
  readonly settings: AppSettings
}
```

---

## 19. データ型の全体関連図

```
AppState (Application層)
  │
  ├── data: ImportedData ◄─────────── データ集約ルート
  │     ├── stores ──────────────── Map<string, Store>
  │     ├── suppliers ───────────── Map<string, {code, name}>
  │     ├── purchase ────────────── StoreDayRecord<PurchaseDayEntry>
  │     │                              └── suppliers[code].{cost,price}
  │     ├── sales ───────────────── StoreDayRecord<SalesDayEntry>
  │     ├── discount ────────────── StoreDayRecord<DiscountDayEntry>
  │     ├── prevYearSales ───────── StoreDayRecord<SalesDayEntry>
  │     ├── prevYearDiscount ────── StoreDayRecord<DiscountDayEntry>
  │     ├── interStoreIn ────────── StoreDayRecord<TransferDayEntry>
  │     │                              └── TransferRecord[]
  │     ├── interStoreOut ───────── StoreDayRecord<TransferDayEntry>
  │     ├── flowers ─────────────── StoreDayRecord<SpecialSalesDayEntry>
  │     ├── directProduce ───────── StoreDayRecord<SpecialSalesDayEntry>
  │     ├── consumables ─────────── StoreDayRecord<ConsumableDailyRecord>
  │     │                              └── ConsumableItem[]
  │     ├── categoryTimeSales ───── { records: CategoryTimeSalesRecord[] }
  │     │                              └── TimeSlotEntry[]
  │     ├── prevYearCategoryTimeSales
  │     ├── departmentKpi ───────── { records: DepartmentKpiRecord[] }
  │     ├── settings ────────────── Map<string, InventoryConfig>
  │     └── budget ──────────────── Map<string, BudgetData>
  │                                    └── daily: Map<day, amount>
  │
  ├── storeResults ◄─────────────── 計算結果
  │     └── Map<string, StoreResult>
  │           ├── 在庫: openingInventory, closingInventory
  │           ├── 売上: totalSales, totalCoreSales, grossSales, ...
  │           ├── 原価: totalCost, inventoryCost, deliverySalesCost
  │           ├── 在庫法: invMethodCogs, invMethodGrossProfit, ...
  │           ├── 推定法: estMethodCogs, estMethodMargin, ...
  │           ├── 客数: totalCustomers, averageCustomersPerDay
  │           ├── 売変: totalDiscount, discountRate, discountLossCost
  │           ├── 値入率: averageMarkupRate, coreMarkupRate
  │           ├── 消耗品: totalConsumable, consumableRate
  │           ├── 予算: budget, budgetAchievementRate, ...
  │           ├── daily ─────────── Map<day, DailyRecord>
  │           │     ├── purchase, deliverySales: CostPricePair
  │           │     ├── interStore*/interDepartment*: CostPricePair
  │           │     ├── flowers, directProduce: CostPricePair
  │           │     ├── consumable: ConsumableDailyRecord
  │           │     ├── supplierBreakdown: Map<code, CostPricePair>
  │           │     └── transferBreakdown: TransferBreakdownEntry[]
  │           ├── categoryTotals ── Map<CategoryType, CostPricePair>
  │           ├── supplierTotals ── Map<string, SupplierTotal>
  │           └── transferDetails ─ TransferDetails
  │
  ├── validationMessages ────────── ValidationMessage[]
  │
  ├── ui: UiState
  │     ├── selectedStoreIds: Set<string>
  │     ├── currentView: ViewType (10種)
  │     ├── isCalculated: boolean
  │     └── isImporting: boolean
  │
  └── settings: AppSettings
        ├── targetYear, targetMonth
        ├── targetGrossProfitRate, warningThreshold
        ├── flowerCostRate, directProduceCostRate
        ├── defaultMarkupRate, defaultBudget
        ├── dataEndDay
        ├── supplierCategoryMap
        └── prevYearSourceYear, prevYearSourceMonth, prevYearDowOffset
```

---

## 20. 数値フォーマット仕様

Domain層の `calculations/utils.ts` で定義されるフォーマット関数群。

| 種別 | 関数 | フォーマット | 出力例 |
|------|------|------------|--------|
| 金額（通常） | `formatCurrency(n)` | 四捨五入 → カンマ区切り (ja-JP) | `1,234,567` |
| 金額（万円） | `formatManYen(n)` | /10,000 → 四捨五入 → 符号 → `万円` | `+123万円` |
| 率 | `formatPercent(n, decimals?)` | ×100 → 小数点 → `%` | `25.00%` |
| ポイント差 | `formatPointDiff(n)` | ×100 → 小数1桁 → 符号 → `pt` | `+1.5pt` |
| Null/NaN | 全関数共通 | `-`（ハイフン） | `-` |

**安全変換関数**:

```typescript
/** 安全な数値変換 (null/NaN → 0) */
function safeNumber(n: unknown): number

/** ゼロ除算防止 (denominator=0 → fallback) */
function safeDivide(numerator: number, denominator: number, fallback?: number): number
```
