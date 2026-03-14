# grossProfit Engine Audit

Phase 6 横展開: WASM/Rust 移行候補としての grossProfit モジュール群の監査

## 1. 対象モジュール

grossProfit barrel (`domain/calculations/grossProfit.ts`) が re-export する全モジュールを対象とする。
barrel 自体は 38 行の re-export ファイルであり、実計算は以下の個別モジュールに分散している。

### コア計算モジュール（grossProfit barrel 経由で公開）

| ファイル | 行数 | 公開関数 |
|---|---|---|
| `domain/calculations/invMethod.ts` | 45 | `calculateInvMethod` |
| `domain/calculations/estMethod.ts` | 100 | `calculateEstMethod`, `calculateCoreSales`, `calculateDiscountRate` |
| `domain/calculations/discountImpact.ts` | 34 | `calculateDiscountImpact` |
| `domain/calculations/budgetAnalysis.ts` | 150 | `calculateBudgetAnalysis`, `calculateGrossProfitBudget` |
| `domain/calculations/utils.ts` | 71 | `safeNumber`, `safeDivide`, `calculateTransactionValue`, `calculateItemsPerCustomer`, `calculateAveragePricePerItem`, `calculateMovingAverage`, `getEffectiveGrossProfitRate` |
| `domain/calculations/aggregation.ts` | 63 | `sumStoreValues`, `sumNullableValues`, `weightedAverageBySales` |
| `domain/calculations/divisor.ts` | 85 | `computeDivisor`, `countDistinctDays`, `computeDowDivisorMap`, `filterByStore` |
| `domain/calculations/grossProfit.ts` | 38 | （barrel のみ、自身の計算なし） |

### barrel 経由で間接公開されるサブモジュール

| ファイル | 行数 | 公開関数 | 経由元 |
|---|---|---|---|
| `domain/calculations/averageDivisor.ts` | 98 | `computeAverageDivisor`, `computeActiveDowDivisorMap` | utils.ts → grossProfit.ts |
| `domain/calculations/dataDetection.ts` | 58 | `maxDayOfRecord`, `detectDataMaxDay` | utils.ts → grossProfit.ts |

### barrel に含まれないが関連するモジュール

| ファイル | 行数 | 公開関数 | 備考 |
|---|---|---|---|
| `domain/calculations/markupRate.ts` | 59 | `calculateMarkupRates` | barrel 未登録。storeAssembler から直接 import |
| `domain/calculations/costAggregation.ts` | 55 | `calculateTransferTotals`, `calculateInventoryCost` | barrel 未登録。storeAssembler から直接 import |
| `domain/calculations/inventoryCalc.ts` | 137 | `computeEstimatedInventory`, `computeEstimatedInventoryDetails` | barrel 未登録。Map/DailyRecord 依存 |

**合計: 約 706 行**（barrel 経由モジュールのみ）、関連モジュール含め **約 957 行**。

## 2. 公開関数の詳細

### 2.1 在庫法 — `calculateInvMethod`

```typescript
function calculateInvMethod(input: InvMethodInput): InvMethodResult
```

| 項目 | 内容 |
|---|---|
| 入力 | `openingInventory: number | null`, `closingInventory: number | null`, `totalPurchaseCost: number`, `totalSales: number` |
| 出力 | `cogs: number | null`, `grossProfit: number | null`, `grossProfitRate: number | null` |
| 計算式 | COGS = 期首 + 仕入 - 期末, 粗利 = 売上 - COGS, 粗利率 = 粗利/売上 |
| 純粋性 | **Pure** — 副作用なし |

### 2.2 推定法 — `calculateEstMethod`

```typescript
function calculateEstMethod(input: EstMethodInput): EstMethodResult
```

| 項目 | 内容 |
|---|---|
| 入力 | `coreSales`, `discountRate`, `markupRate`, `costInclusionCost`, `openingInventory: number | null`, `inventoryPurchaseCost` (全て number) |
| 出力 | `grossSales`, `cogs`, `margin`, `marginRate`, `closingInventory: number | null` |
| 計算式 | 粗売上 = コア売上/(1-売変率), 推定原価 = 粗売上×(1-値入率)+原価算入費 |
| 純粋性 | **Pure** |

### 2.3 コア売上 — `calculateCoreSales`

```typescript
function calculateCoreSales(totalSales: number, flowerSalesPrice: number, directProduceSalesPrice: number): { coreSales: number; isOverDelivery: boolean; overDeliveryAmount: number }
```

| 項目 | 内容 |
|---|---|
| 計算式 | コア売上 = 総売上 - 花売価 - 産直売価（負値は0にクランプ） |
| 純粋性 | **Pure** |

### 2.4 売変率 — `calculateDiscountRate`

```typescript
function calculateDiscountRate(salesAmount: number, discountAmount: number): number
```

| 項目 | 内容 |
|---|---|
| 計算式 | 売変率 = 売変額 / (売上 + 売変額) |
| 純粋性 | **Pure** |

### 2.5 売変影響 — `calculateDiscountImpact`

```typescript
function calculateDiscountImpact(input: DiscountImpactInput): DiscountImpactResult
```

| 項目 | 内容 |
|---|---|
| 入力 | `coreSales`, `markupRate`, `discountRate` |
| 出力 | `discountLossCost` |
| 計算式 | (1-値入率) × コア売上 × 売変率/(1-売変率) |
| 純粋性 | **Pure** |

### 2.6 値入率 — `calculateMarkupRates`

```typescript
function calculateMarkupRates(input: MarkupRateInput): MarkupRateResult
```

| 項目 | 内容 |
|---|---|
| 入力 | purchasePrice/Cost, deliveryPrice/Cost, transferPrice/Cost, defaultMarkupRate (全て number) |
| 出力 | `averageMarkupRate`, `coreMarkupRate` |
| 純粋性 | **Pure** |

### 2.7 移動合計・コスト集計

```typescript
function calculateTransferTotals(input: TransferTotalsInput): TransferTotalsResult
function calculateInventoryCost(totalCost: number, deliverySalesCost: number): number
```

| 項目 | 内容 |
|---|---|
| 純粋性 | **Pure** |
| 計算量 | 単純加減算のみ |

### 2.8 ユーティリティ関数群

| 関数 | 入力 | 出力 | 純粋性 |
|---|---|---|---|
| `safeNumber` | `unknown` | `number` | Pure |
| `safeDivide` | `number, number, number?` | `number` | Pure |
| `calculateTransactionValue` | `number, number` | `number` | Pure |
| `calculateItemsPerCustomer` | `number, number` | `number` | Pure |
| `calculateAveragePricePerItem` | `number, number` | `number` | Pure |
| `calculateMovingAverage` | `readonly number[], number` | `number[]` | Pure |
| `getEffectiveGrossProfitRate` | `{invMethodGrossProfitRate, estMethodMarginRate}` | `number` | Pure |

### 2.9 全店集計

| 関数 | 入力 | 出力 | 純粋性 | FFI 互換性 |
|---|---|---|---|---|
| `sumStoreValues` | `readonly StoreResult[], getter` | `number` | Pure | **低** — StoreResult にコールバック+Map フィールド |
| `sumNullableValues` | `readonly StoreResult[], getter` | `number | null` | Pure | **低** — 同上 |
| `weightedAverageBySales` | `readonly StoreResult[], getter, getter` | `number` | Pure | **低** — 同上 |

### 2.10 除数計算

| 関数 | 入力 | 出力 | 純粋性 | FFI 互換性 |
|---|---|---|---|---|
| `computeDivisor` | `number, AggregateMode` | `number` | Pure | **高** |
| `countDistinctDays` | `readonly CategoryTimeSalesRecord[]` | `number` | Pure | 中 — Record 配列 |
| `computeDowDivisorMap` | `records[], year, month` | `Map<number,number>` | Pure | **低** — Date 使用、Map 出力 |
| `filterByStore` | `records[], ReadonlySet<string>` | `records[]` | Pure | **低** — Set 入力 |
| `computeAverageDivisor` | `AveragingContext` | `number` | Pure | **低** — Date 使用、Iterable 入力 |
| `computeActiveDowDivisorMap` | `Iterable<number>, year, month` | `Map<number,number>` | Pure | **低** — Date 使用、Map 出力 |

## 3. FFI 互換性分析

### 3.1 FFI フレンドリーなモジュール（変換不要）

| モジュール | 入力型 | 出力型 | JSON 互換 | 評価 |
|---|---|---|---|---|
| `invMethod.ts` | number, number\|null | plain object (number\|null) | 完全互換 | **A** |
| `estMethod.ts` | number, number\|null | plain object (number\|null) | 完全互換 | **A** |
| `discountImpact.ts` | number のみ | plain object (number) | 完全互換 | **A** |
| `markupRate.ts` | number のみ | plain object (number) | 完全互換 | **A** |
| `costAggregation.ts` | number のみ | plain object (number) | 完全互換 | **A** |
| `budgetAnalysis.ts` | number + Record<number,number> | plain object + Record | ほぼ互換 | **A** |

### 3.2 FFI 変換が必要なモジュール

| モジュール | 問題点 | 対策 |
|---|---|---|
| `aggregation.ts` | `StoreResult` 依存 + コールバック関数引数 | Application 層の責務。WASM 移行対象外 |
| `divisor.ts` | `CategoryTimeSalesRecord[]` + `ReadonlySet` + `Date` + `Map` 出力 | Date 依存部は TS に残す。またはカレンダーテーブル注入 |
| `averageDivisor.ts` | `AveragingContext`（Iterable + Date 内部使用）+ `Map` 出力 | 同上 |
| `dataDetection.ts` | nested object 構造 | Application ユーティリティ。WASM 移行対象外 |
| `inventoryCalc.ts` | `ReadonlyMap<number, DailyRecord>` + `DailyRecord` の複雑な構造 | Map→Array 変換 + DailyRecord のフラット化が必要。移行コスト高 |

### 3.3 Date 依存の詳細

| 関数 | Date 使用箇所 | 目的 |
|---|---|---|
| `computeDowDivisorMap` | `new Date(year, month-1, day).getDay()` | 日番号→曜日変換 |
| `computeAverageDivisor` | 同上 | 曜日フィルタ適用時 |
| `computeActiveDowDivisorMap` | 同上 | 曜日別除数算出 |

**invMethod / estMethod / discountImpact / markupRate / costAggregation は Date 依存なし。**

### 3.4 Map/Set/class 依存

| 依存型 | 使用モジュール | WASM 対策 |
|---|---|---|
| `Map<number,number>` | divisor.ts, averageDivisor.ts（出力） | `Vec<(u32, f64)>` に変換 |
| `ReadonlyMap<number,DailyRecord>` | inventoryCalc.ts（入力） | フラット化が必要 |
| `ReadonlySet<string>` | divisor.ts（入力） | `Vec<String>` に変換 |
| `StoreResult` | aggregation.ts（入力） | 移行対象外 |

## 4. Authoritative / Analytics 分類

| 関数 | 分類 | 根拠 |
|---|---|---|
| `calculateInvMethod` | **Authoritative** | 在庫法粗利は正式な会計確定値。KPI 直結 |
| `calculateEstMethod` | **Authoritative** | 推定法マージンは正式な推定指標。在庫推定の基礎 |
| `calculateCoreSales` | **Authoritative** | コア売上は売上分析の基礎確定値 |
| `calculateDiscountRate` | **Authoritative** | 売変率は正式な業務指標 |
| `calculateDiscountImpact` | **Authoritative** | 売変ロス原価は正式な損益指標 |
| `calculateMarkupRates` | **Authoritative** | 値入率は正式な仕入評価指標 |
| `calculateTransferTotals` | **Authoritative** | 移動合計は在庫管理の確定値 |
| `calculateInventoryCost` | **Authoritative** | 在庫仕入原価は確定値 |
| `calculateBudgetAnalysis` | **Authoritative** | 予算達成率等は確定 KPI（別途監査済み） |
| `calculateGrossProfitBudget` | **Authoritative** | 粗利予算分析は確定 KPI（別途監査済み） |
| `safeDivide` / `safeNumber` | **Pure Utility** | 数学ユーティリティ |
| `calculateTransactionValue` | **Authoritative** | 客単価は確定 KPI |
| `calculateItemsPerCustomer` | **Authoritative** | PI 値は decompose3 の構成要素 |
| `calculateAveragePricePerItem` | **Authoritative** | 点単価は decompose3 の構成要素 |
| `calculateMovingAverage` | **Pure Analytics** | 分析補助（予測中間値） |
| `getEffectiveGrossProfitRate` | **Pure Utility** | 在庫法/推定法の選択ロジック |
| `sumStoreValues` / `sumNullableValues` / `weightedAverageBySales` | **Application Orchestration** | 全店集計は集約責務 |
| `computeDivisor` / `countDistinctDays` | **Pure Utility** | 除数計算補助 |
| `computeDowDivisorMap` / `computeAverageDivisor` | **Pure Utility** | 曜日別除数計算（Date 依存） |
| `filterByStore` | **Application Orchestration** | フィルタリング責務 |
| `computeEstimatedInventory` / `computeEstimatedInventoryDetails` | **Authoritative** | 日別推定在庫は確定値だが、Map/DailyRecord 依存 |

**結論:** grossProfit barrel のコア計算関数群（invMethod, estMethod, discountImpact, markupRate, costAggregation）は **全て Authoritative** であり、WASM 移行の価値が高い。ユーティリティ・集計・除数系は混合。

## 5. テスト資産

### Domain 層テスト

| ファイル | テスト数 | 内容 |
|---|---|---|
| `invMethod.test.ts` | 10 | 正常系 + null 入力 + 0 除算 + 負値 + 精度 |
| `estMethod.test.ts` | 14 | 推定法 10 + コア売上 5 + 売変率 4（describe 3 分割） |
| `discountImpact.test.ts` | 6 | 正常系 + 0 入力 + フォールバック |
| `markupRate.test.ts` | 7 | 0 入力 + 分離計算 + 不変条件 + storeAssembler 互換 |
| `costAggregation.test.ts` | 6 | 0 入力 + 4 方向合計 + storeAssembler 互換 |
| `aggregation.test.ts` | 7 | 合計 + nullable + 加重平均 |
| `utils.test.ts` | 45 | safeNumber/safeDivide/format/移動平均/PI値/除数計算/dataDetection |
| `budgetAnalysis.test.ts` | 別途監査済み | 11 テスト |
| `inventoryCalc.test.ts` | 存在する | 推定在庫推移テスト |

**合計: 95 テスト**（budgetAnalysis 除く）、全テスト **125 件パス確認済み**（budgetAnalysis 含む）。

### 不変条件テスト

| ID | 条件 | 現状 |
|---|---|---|
| GP-INV-1 | `invMethod: COGS = opening + purchase - closing` | テスト済み（複数ケース） |
| GP-INV-2 | `invMethod: grossProfit = sales - COGS` | テスト済み |
| GP-INV-3 | `invMethod: opening/closing が null → 全結果 null` | テスト済み |
| GP-INV-4 | `estMethod: margin = coreSales - cogs` | テスト済み |
| GP-INV-5 | `estMethod: closingInventory = opening + inventoryPurchase - cogs` | テスト済み |
| GP-INV-6 | `coreSales: 負値 → 0 にクランプ + isOverDelivery フラグ` | テスト済み |
| GP-INV-7 | `discountRate: 売上+売変=0 → 0` | テスト済み |
| GP-INV-8 | `C × Q × P̄ = S`（PI 値 × 点単価 × 客数 = 売上） | テスト済み（6 シナリオ） |
| GP-INV-9 | `markupRate: 0 ≤ rate < 1`（正常データ） | テスト済み（不変条件テスト） |

## 6. barrel export の現状

### `domain/calculations/grossProfit.ts` の export 構造

```
grossProfit.ts (barrel)
├── utils.ts: safeNumber, safeDivide, calculateTransactionValue, calculateItemsPerCustomer,
│             calculateAveragePricePerItem, calculateMovingAverage,
│             computeAverageDivisor, computeActiveDowDivisorMap
│             + type AverageMode, AveragingContext
├── invMethod.ts: calculateInvMethod + type InvMethodInput, InvMethodResult
├── estMethod.ts: calculateEstMethod, calculateCoreSales, calculateDiscountRate
│                 + type EstMethodInput, EstMethodResult
├── discountImpact.ts: calculateDiscountImpact + type DiscountImpactInput, DiscountImpactResult
├── budgetAnalysis.ts: calculateBudgetAnalysis + type BudgetAnalysisInput, BudgetAnalysisResult
├── aggregation.ts: sumStoreValues, sumNullableValues, weightedAverageBySales
└── divisor.ts: computeDivisor, countDistinctDays, computeDowDivisorMap, filterByStore
               + type AggregateMode (re-export from models)
```

### barrel に含まれていないモジュール

| モジュール | 直接 import 元 | 理由 |
|---|---|---|
| `markupRate.ts` | storeAssembler, periodMetricsCalculator, collectionAggregator | barrel 整理漏れ |
| `costAggregation.ts` | storeAssembler, periodMetricsCalculator, collectionAggregator | barrel 整理漏れ |
| `inventoryCalc.ts` | 複数 Application hooks | Map/DailyRecord 依存で barrel に含めにくい |
| `budgetAnalysis.ts` (`calculateGrossProfitBudget`) | barrel に含まれるが、budgetAnalysisBridge からは直接 import | Bridge パターンとして正常 |

**課題:** `markupRate.ts` と `costAggregation.ts` は barrel 未登録だが、コア計算の一部。Bridge 作成時に整理が必要。

### `domain/calculations/index.ts` の構造

```
index.ts (top-level barrel)
├── * from './grossProfit' (全 re-export)
├── * from './forecast.barrel'
└── * from './decomposition'
```

## 7. CQRS 適合性

| 観点 | 現状 | 評価 |
|---|---|---|
| Command/Query 分離 | domain = 確定計算（在庫法・推定法・値入率等）、DuckDB = 探索集計 | **完全分離** |
| 二重実装 | なし（JS と SQL で同一ロジック重複なし） | **準拠** |
| 正式値の定義元 | 各関数が唯一の定義元（`calculateInvMethod` → invMethodGrossProfit 等） | **単一定義元** |
| Application 層の集約 | collectionAggregator に `calculateAggregateInventory`（在庫法再計算）あり。ただし全店集計用途であり、単店の確定値は domain が担当 | **許容範囲** — 集約は Application 責務 |

**注意:** collectionAggregator の `calculateAggregateInventory` は invMethod の計算を inline で再実装している（`safeDivide` 経由）。これは全店集計の特殊要件（個別店舗の opening/closing を合算）のためであり、domain 関数を直接使わない合理的な理由がある。ただし、WASM 移行時には整合性の監視が必要。

## 8. 移行難易度評価

### 8.1 コア計算モジュール群（invMethod + estMethod + discountImpact + markupRate + costAggregation）

| 評価項目 | スコア | 理由 |
|---|---|---|
| FFI 互換性 | 10/10 | 全入出力が number / number\|null の plain object。Map/Date/class なし |
| テスト充実度 | 9/10 | 43 テスト。正常系+異常系+不変条件+互換性。エッジケースも十分 |
| 副作用なし | 10/10 | 完全 pure。外部依存は `safeDivide` のみ（これも pure） |
| Date 非依存 | 10/10 | カレンダー計算なし |
| コード量 | 9/10 | 約 293 行（5 モジュール合計）。budgetAnalysis（150 行）より大きいが manageable |
| 業務重要度 | 10/10 | 粗利計算はシステムの中核。在庫法・推定法は全 KPI の基礎 |
| **総合** | **Grade A (97/100)** | **budgetAnalysis に次ぐ移行容易性。業務重要度は最高** |

### 8.2 ユーティリティモジュール群（utils + aggregation + divisor + averageDivisor）

| 評価項目 | スコア | 理由 |
|---|---|---|
| FFI 互換性 | 4/10 | StoreResult コールバック、Date、Map、Set、Iterable が混在 |
| テスト充実度 | 8/10 | 52 テスト。広範なカバレッジ |
| 副作用なし | 10/10 | 全て pure |
| Date 非依存 | 3/10 | divisor/averageDivisor に Date 依存あり |
| コード量 | 7/10 | 約 317 行（4 モジュール合計） |
| 業務重要度 | 5/10 | 補助的。WASM 化の速度メリットが小さい |
| **総合** | **Grade C (55/100)** | **WASM 移行対象外。TS に残す** |

### 8.3 inventoryCalc（barrel 外）

| 評価項目 | スコア | 理由 |
|---|---|---|
| FFI 互換性 | 3/10 | ReadonlyMap<number, DailyRecord> 入力。DailyRecord は deeply nested |
| テスト充実度 | 7/10 | テスト存在 |
| Date 非依存 | 10/10 | Date 不使用 |
| コード量 | 8/10 | 137 行 |
| **総合** | **Grade C (50/100)** | **DailyRecord のフラット化コストが高い。後回し** |

## 9. forecast / factorDecomposition / budgetAnalysis との比較

| 観点 | grossProfit (コア) | budgetAnalysis | forecast | factorDecomposition |
|---|---|---|---|---|
| 入力型 | `number`, `number\|null` | `number`, `Record` | `ReadonlyMap` | `number` |
| Date 依存 | **なし** | なし | あり（4 関数） | なし |
| FFI 変換 | **不要** | 不要 | Map→Array 必要 | 不要 |
| 関数数 | 7（コア 5 モジュール） | 2 | 11 | 4 |
| コード量 | ~293 行（コア） | ~150 行 | ~625 行 | ~338 行 |
| テスト数 | 43（コア） | 11 | 多数 | 多数 |
| 移行難易度 | **★☆☆** | ★☆☆ | ★★★ | ★★☆ |
| 業務重要度 | **★★★** | ★★☆ | ★★☆ | ★★★ |
| Bridge 存在 | なし（新規作成要） | あり | あり | あり |
| Grade | **A (97)** | A (95) | — | — |

**grossProfit コア計算は budgetAnalysis と同等の移行容易性でありながら、業務重要度は最高。**

### grossProfit の優位点

1. **入力が最もシンプル:** `number` と `number | null` のみ。Record すら不要（budgetAnalysis は `Record<number, number>` を使う）
2. **Date 完全非依存:** forecast と異なりカレンダー計算なし
3. **関数間の依存が最小:** 各計算関数は `safeDivide` のみに依存。相互依存なし
4. **テストが充実:** 不変条件テスト・互換性テスト・エッジケースまで網羅

### grossProfit の注意点

1. **モジュール数が多い:** 5 ファイルに分散しているため、Bridge のエントリポイント設計が必要
2. **barrel 未登録モジュール:** markupRate と costAggregation を barrel に追加する整理が先行タスク
3. **collectionAggregator の在庫法 inline 再計算:** WASM 移行後も Application 層の集約ロジックとの整合性を監視する必要がある

## 10. 次ステップ

### grossProfit は budgetAnalysis の次の移行候補として最適

**理由:**

1. FFI 障壁ゼロ（budgetAnalysis と同等）
2. 業務重要度が最も高い（システムの中核計算）
3. テスト資産が十分（43 テスト、不変条件テスト込み）
4. budgetAnalysis の Bridge パターンをそのまま適用可能

### 推奨移行順序

```
Phase 7a: Bridge 骨格作成
  1. grossProfitBridge.ts を作成（budgetAnalysisBridge と同一パターン）
  2. Bridge エントリポイント:
     - calculateInvMethod (在庫法)
     - calculateEstMethod (推定法)
     - calculateCoreSales (コア売上)
     - calculateDiscountRate (売変率)
     - calculateDiscountImpact (売変影響)
     - calculateMarkupRates (値入率)
     - calculateTransferTotals (移動合計)
     - calculateInventoryCost (在庫仕入原価)
  3. storeAssembler の import を Bridge 経由に切り替え

Phase 7b: barrel 整理
  1. markupRate.ts と costAggregation.ts を grossProfit barrel に追加
  2. 直接 import を barrel 経由に統一

Phase 7c: Rust 実装
  1. safeDivide を Rust ユーティリティとして実装
  2. 各計算関数を Rust で実装（型変換不要）
  3. dual-run-compare で TS/Rust の出力一致を検証

Phase 7d: ユーティリティ/除数計算の判断
  1. aggregation.ts — Application 責務として TS に残す
  2. divisor.ts / averageDivisor.ts — Date 依存のため TS に残す
  3. inventoryCalc.ts — DailyRecord 依存のため後回し
```

### 主要リスク

| リスク | 影響 | 対策 |
|---|---|---|
| collectionAggregator の inline 在庫法計算との不整合 | 全店集計値が単店合計と一致しなくなる | 全店集計テストで監視 |
| Bridge 経由化による呼び出し元の多さ | storeAssembler + periodMetricsCalculator + collectionAggregator の 3 箇所を修正 | 段階的切り替え + CI ゲート |
| safeDivide の Rust 実装での浮動小数点差異 | 小数点以下の微差 | dual-run-compare で許容誤差検証 |
