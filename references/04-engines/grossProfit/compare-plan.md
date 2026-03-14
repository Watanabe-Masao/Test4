# grossProfit Dual-Run Compare 計画

## 目的

grossProfitBridge.ts に dual-run compare を導入し、
TS 実装と将来の Rust/WASM 実装の比較観測を可能にする。
authoritative 表示は引き続き TS に維持する。

## compare 対象（8 関数）

| # | 関数 | ファイル | 戻り値型 |
|---|---|---|---|
| 1 | `calculateInvMethod` | `invMethod.ts` | `InvMethodResult`（nullable fields） |
| 2 | `calculateEstMethod` | `estMethod.ts` | `EstMethodResult`（nullable closingInventory） |
| 3 | `calculateCoreSales` | `estMethod.ts` | `{ coreSales, isOverDelivery, overDeliveryAmount }` |
| 4 | `calculateDiscountRate` | `estMethod.ts` | `number` |
| 5 | `calculateDiscountImpact` | `discountImpact.ts` | `DiscountImpactResult` |
| 6 | `calculateMarkupRates` | `markupRate.ts` | `MarkupRateResult` |
| 7 | `calculateTransferTotals` | `costAggregation.ts` | `TransferTotalsResult` |
| 8 | `calculateInventoryCost` | `costAggregation.ts` | `number` |

## compare 対象外

| 関数 | 除外理由 |
|---|---|
| `safeDivide` | ユーティリティ。bridge 外 |
| `safeNumber` | ユーティリティ。bridge 外 |
| `calculateTransactionValue` | bridge 外 |
| `sumStoreValues` | aggregation 責務。bridge 外 |
| `weightedAverageBySales` | aggregation 責務。bridge 外 |
| `computeDivisor` | divisor 責務。bridge 外 |
| `filterByStore` | フィルタ責務。bridge 外 |
| `getEffectiveGrossProfitRate` | ストア依存の派生値。bridge 外 |

## 関数ごとの比較基準

### 1. calculateInvMethod

**比較項目:**
- `cogs: number | null`
- `grossProfit: number | null`
- `grossProfitRate: number | null`

**invariant:**
- GP-INV-1: `cogs = openingInventory + totalPurchaseCost - closingInventory`
- GP-INV-2: `grossProfit = totalSales - cogs`
- GP-INV-3: `grossProfitRate = grossProfit / totalSales`
- GP-INV-4: openingInventory or closingInventory が null → 全出力 null

**null 比較:**
- TS/WASM 両方 null → 一致（skip）
- 片方 null → `null-mismatch`

### 2. calculateEstMethod

**比較項目:**
- `grossSales: number`
- `cogs: number`
- `margin: number`
- `marginRate: number`
- `closingInventory: number | null`

**invariant:**
- GP-INV-5: `grossSales = coreSales / (1 - discountRate)`
- GP-INV-6: `cogs = grossSales × (1 - markupRate) + costInclusionCost`
- GP-INV-7: `closingInventory = openingInventory + inventoryPurchaseCost - cogs`（null 伝播あり）

**null 比較:**
- closingInventory のみ nullable。片方 null → `null-mismatch`

### 3. calculateCoreSales

**比較項目:**
- `coreSales: number`
- `isOverDelivery: boolean`
- `overDeliveryAmount: number`

**invariant:**
- `coreSales = max(0, totalSales - flowerSalesPrice - directProduceSalesPrice)`
- `isOverDelivery` の boolean 一致（exact match）

### 4. calculateDiscountRate

**比較項目:**
- 戻り値単一 `number`

**invariant:**
- `rate = discountAmount / (salesAmount + discountAmount)`

### 5. calculateDiscountImpact

**比較項目:**
- `discountLossCost: number`

**invariant:**
- GP-INV-8: `discountLossCost = (1 - markupRate) × coreSales × discountRate / (1 - discountRate)`

### 6. calculateMarkupRates

**比較項目:**
- `averageMarkupRate: number`
- `coreMarkupRate: number`

**invariant:**
- GP-INV-9: `markupRate ∈ [0, 1]` for normal inputs
- GP-INV-10: averageMarkupRate は delivery 含む、coreMarkupRate は delivery 除外

### 7. calculateTransferTotals

**比較項目:**
- `transferPrice: number`
- `transferCost: number`

**invariant:**
- GP-INV-11: `transferPrice = Σ(4方向の Price)`
- GP-INV-11: `transferCost = Σ(4方向の Cost)`

### 8. calculateInventoryCost

**比較項目:**
- 戻り値単一 `number`

**invariant:**
- `inventoryCost = totalCost - deliverySalesCost`

## tolerance 定義

| 種類 | 許容差 |
|---|---|
| 個別数値差 | 1e-10 |
| 恒等式検証 | 1e-10 |
| boolean | exact match |

## null 比較ルール

| TS | WASM | 判定 |
|---|---|---|
| `null` | `null` | 一致（skip） |
| `null` | `number` | `null-mismatch` |
| `number` | `null` | `null-mismatch` |
| `number` | `number` | diff 計算 |

## finite 比較ルール

- `NaN` or `Infinity` → 即 `invariant-violation`
- GP-INV-12 で既にテスト済み

## mismatch 分類

| 分類 | 条件 |
|---|---|
| `numeric-within-tolerance` | maxAbsDiff ≤ 1e-10 かつ invariant ok |
| `numeric-over-tolerance` | maxAbsDiff > 1e-10 かつ invariant ok |
| `null-mismatch` | nullable フィールドで片方のみ null |
| `invariant-violation` | invariant check が violated |

## 動作モード

| モード | 動作 |
|---|---|
| `ts-only` | TS 実装のみ実行。WASM 不使用 |
| `wasm-only` | WASM ready 時のみ WASM 結果。未 ready は TS fallback |
| `dual-run-compare` | 両方実行 → compare → TS 結果を返却（DEV のみ） |

## runbook 観測項目

- `__dualRunStats()` で grossProfit 関数の統計を確認
- `__dualRunStats('log')` で mismatch ログの詳細を確認
- `calculateInvMethod` / `calculateEstMethod` の null-mismatch 頻度
- invariant-violation の有無（あれば即調査）
- maxAbsDiff の傾向（1e-10 超が出るか）
