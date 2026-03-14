# grossProfit FFI コントラクト

Phase 7 横展開: Rust/WASM 移行時の FFI 境界仕様

## 1. FFI 互換性サマリー

grossProfit のコア計算関数群（8関数）は、入出力が全て `number` と `number | null` のみで構成される。
Map / Date / Set / Record / コールバック等の複雑な型を一切使用しない。
これは全モジュール中**最も FFI 親和性が高い**構成であり、型変換コストはゼロである。

### 他候補との FFI 変換コスト比較

| モジュール | 入力型の最大複雑度 | FFI 変換コスト | 評価 |
|---|---|---|---|
| **grossProfit** | `number \| null` | **ゼロ**（null → `Option<f64>` のみ） | **BEST** |
| budgetAnalysis | `Readonly<Record<number, number>>` | ほぼゼロ（Record → `BTreeMap<u32, f64>`） | A |
| factorDecomposition | `number` のみ | ゼロ | A |
| forecast | `ReadonlyMap<number, number>` | 要変換（Map → Array / Vec 変換必要） | B |

**結論:** grossProfit は `number | null` → `Option<f64>` の 1 パターンのみ。
budgetAnalysis の Record 変換すら不要であり、FFI 境界の型変換は文字通りゼロコストである。

## 2. 入力 DTO

### 2.1 calculateInvMethod — InvMethodInput

```typescript
interface InvMethodInput {
  readonly openingInventory: number | null  // 期首在庫
  readonly closingInventory: number | null  // 期末在庫
  readonly totalPurchaseCost: number        // 総仕入原価
  readonly totalSales: number              // 総売上高
}
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvMethodInput {
    pub opening_inventory: Option<f64>,
    pub closing_inventory: Option<f64>,
    pub total_purchase_cost: f64,
    pub total_sales: f64,
}
```

### 2.2 calculateEstMethod — EstMethodInput

```typescript
interface EstMethodInput {
  readonly coreSales: number               // コア売上（花・産直・売上納品除外）
  readonly discountRate: number            // 売変率
  readonly markupRate: number              // 値入率
  readonly costInclusionCost: number       // 原価算入費
  readonly openingInventory: number | null // 期首在庫（在庫販売分）
  readonly inventoryPurchaseCost: number   // 期中仕入原価（在庫販売分）
}
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstMethodInput {
    pub core_sales: f64,
    pub discount_rate: f64,
    pub markup_rate: f64,
    pub cost_inclusion_cost: f64,
    pub opening_inventory: Option<f64>,
    pub inventory_purchase_cost: f64,
}
```

### 2.3 calculateCoreSales — 位置引数

```typescript
function calculateCoreSales(
  totalSales: number,
  flowerSalesPrice: number,
  directProduceSalesPrice: number,
): { coreSales: number; isOverDelivery: boolean; overDeliveryAmount: number }
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoreSalesInput {
    pub total_sales: f64,
    pub flower_sales_price: f64,
    pub direct_produce_sales_price: f64,
}
```

**注意:** TypeScript 側は位置引数だが、FFI Bridge ではオブジェクト形式に統一する。
Bridge 層で `calculateCoreSales(input.totalSales, input.flowerSalesPrice, input.directProduceSalesPrice)` に展開する。

### 2.4 calculateDiscountRate — 位置引数

```typescript
function calculateDiscountRate(salesAmount: number, discountAmount: number): number
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscountRateInput {
    pub sales_amount: f64,
    pub discount_amount: f64,
}
```

**注意:** 同上。Bridge 層で位置引数に展開する。

### 2.5 calculateDiscountImpact — DiscountImpactInput

```typescript
interface DiscountImpactInput {
  readonly coreSales: number    // コア売上
  readonly markupRate: number   // 値入率
  readonly discountRate: number // 売変率
}
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscountImpactInput {
    pub core_sales: f64,
    pub markup_rate: f64,
    pub discount_rate: f64,
}
```

### 2.6 calculateMarkupRates — MarkupRateInput

```typescript
interface MarkupRateInput {
  readonly purchasePrice: number       // 仕入売価合計
  readonly purchaseCost: number        // 仕入原価合計
  readonly deliveryPrice: number       // 売上納品売価合計（花 + 産直）
  readonly deliveryCost: number        // 売上納品原価合計（花 + 産直）
  readonly transferPrice: number       // 移動売価合計（店間入出 + 部門間入出）
  readonly transferCost: number        // 移動原価合計（店間入出 + 部門間入出）
  readonly defaultMarkupRate: number   // デフォルト値入率
}
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkupRateInput {
    pub purchase_price: f64,
    pub purchase_cost: f64,
    pub delivery_price: f64,
    pub delivery_cost: f64,
    pub transfer_price: f64,
    pub transfer_cost: f64,
    pub default_markup_rate: f64,
}
```

### 2.7 calculateTransferTotals — TransferTotalsInput

```typescript
interface TransferTotalsInput {
  readonly interStoreInPrice: number          // 店間入庫売価
  readonly interStoreInCost: number           // 店間入庫原価
  readonly interStoreOutPrice: number         // 店間出庫売価
  readonly interStoreOutCost: number          // 店間出庫原価
  readonly interDepartmentInPrice: number     // 部門間入庫売価
  readonly interDepartmentInCost: number      // 部門間入庫原価
  readonly interDepartmentOutPrice: number    // 部門間出庫売価
  readonly interDepartmentOutCost: number     // 部門間出庫原価
}
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferTotalsInput {
    pub inter_store_in_price: f64,
    pub inter_store_in_cost: f64,
    pub inter_store_out_price: f64,
    pub inter_store_out_cost: f64,
    pub inter_department_in_price: f64,
    pub inter_department_in_cost: f64,
    pub inter_department_out_price: f64,
    pub inter_department_out_cost: f64,
}
```

### 2.8 calculateInventoryCost — 位置引数

```typescript
function calculateInventoryCost(totalCost: number, deliverySalesCost: number): number
```

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryCostInput {
    pub total_cost: f64,
    pub delivery_sales_cost: f64,
}
```

**注意:** 同上。Bridge 層で位置引数に展開する。

## 3. 出力 DTO

### 3.1 InvMethodResult

```typescript
interface InvMethodResult {
  readonly cogs: number | null             // 売上原価
  readonly grossProfit: number | null      // 粗利益
  readonly grossProfitRate: number | null  // 粗利率
}
```

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvMethodResult {
    pub cogs: Option<f64>,
    pub gross_profit: Option<f64>,
    pub gross_profit_rate: Option<f64>,
}
```

### 3.2 EstMethodResult

```typescript
interface EstMethodResult {
  readonly grossSales: number              // 粗売上（売変前売価）
  readonly cogs: number                    // 推定原価
  readonly margin: number                  // 推定マージン
  readonly marginRate: number              // 推定マージン率
  readonly closingInventory: number | null // 推定期末在庫
}
```

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstMethodResult {
    pub gross_sales: f64,
    pub cogs: f64,
    pub margin: f64,
    pub margin_rate: f64,
    pub closing_inventory: Option<f64>,
}
```

### 3.3 CoreSalesResult

```typescript
{ coreSales: number; isOverDelivery: boolean; overDeliveryAmount: number }
```

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoreSalesResult {
    pub core_sales: f64,
    pub is_over_delivery: bool,
    pub over_delivery_amount: f64,
}
```

**注意:** `boolean` → `bool` の FFI マッピング。wasm-bindgen はネイティブ対応。

### 3.4 calculateDiscountRate — スカラー出力

```typescript
function calculateDiscountRate(...): number
```

```rust
// 戻り値: f64（スカラー）
// Bridge 層で JsValue::from_f64() に変換
```

### 3.5 DiscountImpactResult

```typescript
interface DiscountImpactResult {
  readonly discountLossCost: number  // 売変ロス原価
}
```

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscountImpactResult {
    pub discount_loss_cost: f64,
}
```

### 3.6 MarkupRateResult

```typescript
interface MarkupRateResult {
  readonly averageMarkupRate: number  // 全体値入率
  readonly coreMarkupRate: number    // コア値入率
}
```

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkupRateResult {
    pub average_markup_rate: f64,
    pub core_markup_rate: f64,
}
```

### 3.7 TransferTotalsResult

```typescript
interface TransferTotalsResult {
  readonly transferPrice: number  // 移動売価合計
  readonly transferCost: number   // 移動原価合計
}
```

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferTotalsResult {
    pub transfer_price: f64,
    pub transfer_cost: f64,
}
```

### 3.8 calculateInventoryCost — スカラー出力

```typescript
function calculateInventoryCost(...): number
```

```rust
// 戻り値: f64（スカラー）
```

## 4. null 値の FFI 方針

grossProfit モジュールで `null` を使用するのは以下の 4 フィールドのみ:

| 関数 | フィールド | 方向 | 意味 |
|---|---|---|---|
| `calculateInvMethod` | `openingInventory` | 入力 | 期首在庫が未確定 |
| `calculateInvMethod` | `closingInventory` | 入力 | 期末在庫が未確定 |
| `calculateInvMethod` | `cogs`, `grossProfit`, `grossProfitRate` | 出力 | 在庫未確定時は計算不可 |
| `calculateEstMethod` | `openingInventory` | 入力 | 期首在庫が未確定 |
| `calculateEstMethod` | `closingInventory` | 出力 | 期首在庫未確定時は推定不可 |

### wasm-bindgen での null 処理

```rust
use wasm_bindgen::prelude::*;

// 入力: JsValue から Option<f64> への変換
fn js_to_option_f64(val: &JsValue) -> Option<f64> {
    if val.is_null() || val.is_undefined() {
        None
    } else {
        val.as_f64()
    }
}

// 出力: Option<f64> → JsValue
fn option_f64_to_js(val: Option<f64>) -> JsValue {
    match val {
        Some(v) => JsValue::from_f64(v),
        None => JsValue::NULL,
    }
}
```

### serde での null 処理

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvMethodInput {
    // serde はデフォルトで JSON null → None にデシリアライズする
    pub opening_inventory: Option<f64>,
    pub closing_inventory: Option<f64>,
    pub total_purchase_cost: f64,
    pub total_sales: f64,
}
```

**方針:** serde のデフォルト動作で `null` ↔ `None` の変換が完結する。
`deserialize_with` カスタムデシリアライザは不要（budgetAnalysis の Record 変換と異なり、追加の型変換が一切ない）。

## 5. Bridge エントリポイント方針

### Bridge 対象（8 関数）

全てのコア計算関数が Bridge 候補となる。関数間に相互依存はなく、
各関数は独立して呼び出し可能である（唯一の共通依存は `safeDivide`）。

| # | 関数 | Bridge メソッド名 | 群 |
|---|---|---|---|
| 1 | `calculateInvMethod` | `calculateInvMethodVia` | 粗利計算群 |
| 2 | `calculateEstMethod` | `calculateEstMethodVia` | 粗利計算群 |
| 3 | `calculateCoreSales` | `calculateCoreSalesVia` | 粗利計算群 |
| 4 | `calculateDiscountRate` | `calculateDiscountRateVia` | 粗利計算群 |
| 5 | `calculateDiscountImpact` | `calculateDiscountImpactVia` | 粗利計算群 |
| 6 | `calculateMarkupRates` | `calculateMarkupRatesVia` | 仕入分析群 |
| 7 | `calculateTransferTotals` | `calculateTransferTotalsVia` | 仕入分析群 |
| 8 | `calculateInventoryCost` | `calculateInventoryCostVia` | 仕入分析群 |

### Bridge 対象外

| モジュール | 理由 |
|---|---|
| `aggregation.ts` | `StoreResult` + コールバック関数引数。Application 層の集約責務 |
| `divisor.ts` | `Date` 依存 + `Map` 出力 + `ReadonlySet` 入力 |
| `utils.ts` | 共有ユーティリティ。`safeDivide` は Rust 側で独立実装する |

### グルーピング方針

```
grossProfitBridge.ts
├── 粗利計算群（invMethod, estMethod, discountImpact）
│   └── 在庫法粗利・推定法マージン・コア売上・売変率・売変ロス原価
│
└── 仕入分析群（markupRate, costAggregation）
    └── 値入率・移動合計・在庫仕入原価
```

budgetAnalysisBridge と同一パターンで実装する。
1 Bridge ファイルに 8 関数を集約し、WASM / TS の切り替えを一元管理する。

### 呼び出し元の切り替え

```
storeAssembler
  ├─ grossProfitBridge.calculateInvMethodVia(input)
  ├─ grossProfitBridge.calculateEstMethodVia(input)
  ├─ grossProfitBridge.calculateMarkupRatesVia(input)
  ├─ grossProfitBridge.calculateTransferTotalsVia(input)
  ├─ grossProfitBridge.calculateInventoryCostVia(input)
  └─ ...

periodMetricsCalculator
  └─ grossProfitBridge.calculateDiscountImpactVia(input)

collectionAggregator
  └─ grossProfitBridge.calculateMarkupRatesVia(input)
```

## 6. barrel 整理課題

### 現状の問題

`grossProfit.ts` barrel に以下のモジュールが**含まれていない**:

| モジュール | 公開関数 | barrel 未登録の理由 |
|---|---|---|
| `markupRate.ts` | `calculateMarkupRates`, `MarkupRateInput`, `MarkupRateResult` | 整理漏れ |
| `costAggregation.ts` | `calculateTransferTotals`, `calculateInventoryCost`, `TransferTotalsInput`, `TransferTotalsResult` | 整理漏れ |

これらは `storeAssembler` / `periodMetricsCalculator` / `collectionAggregator` から
直接 import されている（barrel 不経由）。

### 修正方針

Bridge 作成時に以下を実施する:

1. `grossProfit.ts` に `markupRate.ts` と `costAggregation.ts` の re-export を追加

```typescript
// 値入率
export { calculateMarkupRates } from './markupRate'
export type { MarkupRateInput, MarkupRateResult } from './markupRate'

// 移動合計・コスト集計
export { calculateTransferTotals, calculateInventoryCost } from './costAggregation'
export type { TransferTotalsInput, TransferTotalsResult } from './costAggregation'
```

2. 呼び出し元の import を Bridge 経由に変更
3. barrel 経由の import パスは後方互換として維持:
   - `@/domain/calculations/grossProfit` — barrel 経由
   - `@/domain/calculations` — index.ts 経由（grossProfit を re-export）

### 追加後の barrel 構造

```
grossProfit.ts (barrel)
├── utils.ts: safeNumber, safeDivide, calculateTransactionValue, ...
├── invMethod.ts: calculateInvMethod + 型
├── estMethod.ts: calculateEstMethod, calculateCoreSales, calculateDiscountRate + 型
├── discountImpact.ts: calculateDiscountImpact + 型
├── markupRate.ts: calculateMarkupRates + 型          ← 追加
├── costAggregation.ts: calculateTransferTotals,       ← 追加
│                       calculateInventoryCost + 型
├── budgetAnalysis.ts: 型のみ re-export（runtime は budgetAnalysisBridge 経由）
├── aggregation.ts: sumStoreValues, sumNullableValues, weightedAverageBySales
└── divisor.ts: computeDivisor, countDistinctDays, computeDowDivisorMap, filterByStore
```

## 7. 他候補との比較表

| 観点 | grossProfit | budgetAnalysis | forecast | factorDecomposition |
|---|---|---|---|---|
| **入力型の最大複雑度** | `number \| null` | `Record<number, number>` | `ReadonlyMap<number, DailyRecord>` | `number` のみ |
| **出力型の最大複雑度** | `number \| null`, `boolean` | `Record<number, {sales, budget}>` | `Map<number, ...>`, `WeekRange[]` | `number` のみ |
| **null 許容** | あり（`Option<f64>`） | なし | 一部あり | なし |
| **Date 依存** | **なし** | なし | あり（4 関数） | なし |
| **Map/Set 依存** | **なし** | なし | あり | なし |
| **FFI 変換コスト** | **ゼロ** | ほぼゼロ | 要変換 | ゼロ |
| **関数数** | 8 | 2 | 11 | 4 |
| **コード量** | ~293 行 | ~150 行 | ~625 行 | ~338 行 |
| **テスト数** | 43（コア） | 11 | 多数 | 多数 |
| **Bridge 存在** | なし（新規作成要） | あり | あり | あり |
| **移行難易度** | ★☆☆ | ★☆☆ | ★★★ | ★★☆ |
| **業務重要度** | ★★★ | ★★☆ | ★★☆ | ★★★ |
| **Grade** | **A (97)** | A (95) | — | — |

### grossProfit の FFI 優位性

1. **型変換が文字通りゼロ:** `number` → `f64`, `number | null` → `Option<f64>` のみ。
   budgetAnalysis の `Record<number, number>` → `BTreeMap<u32, f64>` 変換すら不要
2. **Date 完全非依存:** forecast の 4 関数が必要とするカレンダー注入が不要
3. **Map/Set 非依存:** forecast の `ReadonlyMap` → `Vec<(key, value)>` 変換が不要
4. **boolean は 1 箇所のみ:** `CoreSalesResult.isOverDelivery` だけ。wasm-bindgen ネイティブ対応
5. **関数間の依存が最小:** 各関数は `safeDivide` のみに依存し、相互依存なし。
   budgetAnalysis の `calculateBudgetAnalysis` → `calculateGrossProfitBudget` のような呼び出し順序制約もない
