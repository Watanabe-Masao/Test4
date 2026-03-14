# grossProfit TS 側責務マップ

Phase 6 横展開: WASM 移行時に TS 側に残すもの / 移すもの / 整理が必要なものの切り分け

## 1. アーキテクチャ概要

```
                     ┌─────────────────────────────────┐
                     │   Presentation Layer              │
                     │                                   │
                     │  KPI カード・チャート（描画のみ）    │ ← TS に残す
                     └──────────┬─────────────────────────┘
                                │ import
                     ┌──────────▼─────────────────────────┐
                     │   Application Layer                 │
                     │                                     │
                     │  storeAssembler.ts                   │ ← 単店 orchestration（TS に残す）
                     │  aggregateResults.ts                 │ ← 複数店 orchestration（TS に残す）
                     │  collectionAggregator.ts             │ ← 集約計算（TS に残す）
                     │  grossProfitBridge.ts (未作成)        │ ← Bridge（新規作成）
                     └──────────┬──────────────────────────┘
                                │ import
                     ┌──────────▼──────────────────────────┐
                     │   Domain Layer                       │
                     │                                      │
                     │  invMethod.ts     ── WASM 化候補      │
                     │    └─ calculateInvMethod()            │ ← 在庫法粗利（Rust 移行対象）
                     │  estMethod.ts     ── WASM 化候補      │
                     │    ├─ calculateEstMethod()            │ ← 推定法マージン（Rust 移行対象）
                     │    ├─ calculateCoreSales()            │ ← コア売上（Rust 移行対象）
                     │    └─ calculateDiscountRate()         │ ← 売変率（Rust 移行対象）
                     │  discountImpact.ts ── WASM 化候補     │
                     │    └─ calculateDiscountImpact()       │ ← 売変ロス原価（Rust 移行対象）
                     │  markupRate.ts    ── WASM 化候補      │
                     │    └─ calculateMarkupRates()          │ ← 値入率（Rust 移行対象）
                     │  costAggregation.ts ── WASM 化候補    │
                     │    ├─ calculateTransferTotals()       │ ← 移動合計（Rust 移行対象）
                     │    └─ calculateInventoryCost()        │ ← 在庫仕入原価（Rust 移行対象）
                     │                                      │
                     │  utils.ts / aggregation.ts / divisor.ts │ ← TS に残す
                     └──────────────────────────────────────┘
```

## 2. 責務分類

### A. Rust/WASM 候補（authoritative single-store core）

pure・Date 非依存・FFI フレンドリーな 8 関数。全て Authoritative 計算であり、
`safeDivide` 以外の外部依存を持たない。

#### calculateInvMethod（invMethod.ts）— 在庫法粗利

| 項目 | 内容 |
|---|---|
| 入力型 | `InvMethodInput { openingInventory: number \| null, closingInventory: number \| null, totalPurchaseCost: number, totalSales: number }` |
| 出力型 | `InvMethodResult { cogs: number \| null, grossProfit: number \| null, grossProfitRate: number \| null }` |
| FFI 互換性 | **完全互換** — number / number\|null の plain object。Map/Date/class なし |
| テスト数 | 11（正常系 + null 入力 + 0 除算 + 負値 + 精度） |

#### calculateEstMethod（estMethod.ts）— 推定法マージン

| 項目 | 内容 |
|---|---|
| 入力型 | `EstMethodInput { coreSales: number, discountRate: number, markupRate: number, costInclusionCost: number, openingInventory: number \| null, inventoryPurchaseCost: number }` |
| 出力型 | `EstMethodResult { grossSales: number, cogs: number, margin: number, marginRate: number, closingInventory: number \| null }` |
| FFI 互換性 | **完全互換** — number / number\|null の plain object |
| テスト数 | 10（基本計算 + 売変率 0/1 + 値入率 0/1 + null 入力 + 高売変率） |

#### calculateCoreSales（estMethod.ts）— コア売上

| 項目 | 内容 |
|---|---|
| 入力型 | `totalSales: number, flowerSalesPrice: number, directProduceSalesPrice: number` |
| 出力型 | `{ coreSales: number, isOverDelivery: boolean, overDeliveryAmount: number }` |
| FFI 互換性 | **完全互換** — number + boolean のプリミティブのみ |
| テスト数 | 5（正常系 + 花産直なし + 超過 + 売上 0 + 同額） |

#### calculateDiscountRate（estMethod.ts）— 売変率

| 項目 | 内容 |
|---|---|
| 入力型 | `salesAmount: number, discountAmount: number` |
| 出力型 | `number` |
| FFI 互換性 | **完全互換** — プリミティブのみ |
| テスト数 | 4（正常系 + 売変 0 + 両方 0 + 売上 0） |

#### calculateDiscountImpact（discountImpact.ts）— 売変ロス原価

| 項目 | 内容 |
|---|---|
| 入力型 | `DiscountImpactInput { coreSales: number, markupRate: number, discountRate: number }` |
| 出力型 | `DiscountImpactResult { discountLossCost: number }` |
| FFI 互換性 | **完全互換** — number の plain object |
| テスト数 | 6（正常系 + 0 入力 + フォールバック） |

#### calculateMarkupRates（markupRate.ts）— 値入率

| 項目 | 内容 |
|---|---|
| 入力型 | `MarkupRateInput { purchasePrice: number, purchaseCost: number, deliveryPrice: number, deliveryCost: number, transferPrice: number, transferCost: number, defaultMarkupRate: number }` |
| 出力型 | `MarkupRateResult { averageMarkupRate: number, coreMarkupRate: number }` |
| FFI 互換性 | **完全互換** — number の plain object |
| テスト数 | 7（0 入力 + 分離計算 + 不変条件 + storeAssembler 互換） |

#### calculateTransferTotals（costAggregation.ts）— 移動合計

| 項目 | 内容 |
|---|---|
| 入力型 | `TransferTotalsInput { interStoreInPrice: number, interStoreInCost: number, interStoreOutPrice: number, interStoreOutCost: number, interDepartmentInPrice: number, interDepartmentInCost: number, interDepartmentOutPrice: number, interDepartmentOutCost: number }` |
| 出力型 | `TransferTotalsResult { transferPrice: number, transferCost: number }` |
| FFI 互換性 | **完全互換** — number の plain object |
| テスト数 | 6（costAggregation.test.ts 全体。0 入力 + 4 方向合計 + storeAssembler 互換） |

#### calculateInventoryCost（costAggregation.ts）— 在庫仕入原価

| 項目 | 内容 |
|---|---|
| 入力型 | `totalCost: number, deliverySalesCost: number` |
| 出力型 | `number` |
| FFI 互換性 | **完全互換** — プリミティブのみ |
| テスト数 | 上記 6 テストに含まれる |

### B. 条件付き候補

**該当なし。** コア計算関数は全て A 層に分類される。

budgetAnalysis と同様、grossProfit のコア計算は全て Date 非依存・Map 不使用であり、
条件付き候補に該当する関数は存在しない。

### C. TS 残留

#### Application Orchestration（StoreResult + コールバック依存）

| 関数 | ファイル | TS に残す理由 |
|---|---|---|
| `sumStoreValues` | aggregation.ts | StoreResult 依存 + コールバック関数引数。FFI 互換性: **低** |
| `sumNullableValues` | aggregation.ts | 同上 |
| `weightedAverageBySales` | aggregation.ts | 同上 |

#### Date 依存（除数計算）

| 関数 | ファイル | TS に残す理由 |
|---|---|---|
| `computeDowDivisorMap` | divisor.ts | `new Date()` 使用 + `Map<number,number>` 出力。FFI 互換性: **低** |
| `computeAverageDivisor` | averageDivisor.ts | Date 使用 + Iterable 入力。FFI 互換性: **低** |
| `computeActiveDowDivisorMap` | averageDivisor.ts | Date 使用 + `Map<number,number>` 出力。FFI 互換性: **低** |

#### フィルタリング（Set 入力）

| 関数 | ファイル | TS に残す理由 |
|---|---|---|
| `filterByStore` | divisor.ts | `ReadonlySet<string>` 入力。Application 層のフィルタリング責務 |

#### Application ユーティリティ

| 関数 | ファイル | TS に残す理由 |
|---|---|---|
| `getEffectiveGrossProfitRate` | utils.ts | 在庫法/推定法の選択ロジック。Application 層の調停責務 |

#### 共通ユーティリティ（全モジュール共有）

| 関数 | ファイル | TS に残す理由 |
|---|---|---|
| `safeNumber` | utils.ts | pure utility。全計算モジュールの共通依存。TS の共通基盤として残す |
| `safeDivide` | utils.ts | 同上。Rust 側でも同等関数を実装するが、TS 側の非移行関数が引き続き使用 |

#### 分析ユーティリティ

| 関数 | ファイル | TS に残す理由 |
|---|---|---|
| `calculateMovingAverage` | utils.ts | 分析補助（予測中間値）。Authoritative ではない |

#### hooks, ViewModel, UI フォーマット

Presentation 層・Application 層の hooks・ViewModel・UI フォーマット関数は全て TS に残す。
React コンポーネント・状態管理・描画ロジックは WASM 化の対象外。

## 3. barrel 整理方針

### 現状

`grossProfit.ts` barrel は invMethod / estMethod / discountImpact / aggregation / divisor / utils を re-export しているが、
以下の 2 モジュールが barrel 未登録:

| モジュール | 現状 | 直接 import 元 |
|---|---|---|
| `markupRate.ts` | barrel 未登録 | storeAssembler, periodMetricsCalculator, collectionAggregator |
| `costAggregation.ts` | barrel 未登録 | storeAssembler, periodMetricsCalculator, collectionAggregator |

### 方針

- **`markupRate.ts` → `grossProfit.ts` barrel に追加する**（コア計算モジュール）
- **`costAggregation.ts` → `grossProfit.ts` barrel に追加する**（コア計算モジュール）
- **タイミング:** grossProfitBridge 実装時に barrel 追加を行う（次フェーズ）
- `index.ts` の `export * from './grossProfit'` により、barrel への追加は自動的に上位に公開される

## 4. Bridge 設計方針

### パターン

forecastBridge / budgetAnalysisBridge と同一パターンを適用する。

```
app/src/application/usecases/calculation/
  └─ grossProfitBridge.ts    ← 新規作成
```

### 段階

1. **ts-only:** TS 実装をそのまま呼び出す薄いラッパーとして作成
2. **compare/WASM:** WASM バイナリ利用可能時に切り替え + dual-run-compare で検証

### Bridge グループ

| グループ | 含まれる関数 | 業務的まとまり |
|---|---|---|
| **粗利計算グループ** | `calculateInvMethod`, `calculateEstMethod`, `calculateCoreSales`, `calculateDiscountRate`, `calculateDiscountImpact` | 在庫法・推定法・売変の粗利計算体系 |
| **仕入分析グループ** | `calculateMarkupRates`, `calculateTransferTotals`, `calculateInventoryCost` | 値入率・移動合計・仕入原価の仕入評価体系 |

### Bridge に含めないモジュール

| モジュール | 理由 |
|---|---|
| `aggregation.ts` | Application 層の集約責務。StoreResult + コールバック依存 |
| `divisor.ts` | Date 依存 + Map/Set 出力。FFI 変換コストが高い |
| `utils.ts` | 共通ユーティリティ。全モジュールの依存元として TS に残す |

### budgetAnalysis Bridge との比較

| 観点 | grossProfit Bridge | budgetAnalysis Bridge |
|---|---|---|
| FFI 変換 | **不要** — number / number\|null の plain object | **不要** — Record ベースの入出力 |
| Date 注入 | **不要** | **不要** |
| 関数数 | 8（2 グループ） | 2 |
| 複雑性 | ★★☆ — 関数数は多いが各関数は単純 | ★☆☆ 最小 |

## 5. 次ステップ

### Phase 7a: Bridge 骨格作成

1. `grossProfitBridge.ts` を作成（budgetAnalysisBridge と同一パターン）
2. Bridge エントリポイント（8 関数）:
   - `calculateInvMethod`（在庫法）
   - `calculateEstMethod`（推定法）
   - `calculateCoreSales`（コア売上）
   - `calculateDiscountRate`（売変率）
   - `calculateDiscountImpact`（売変影響）
   - `calculateMarkupRates`（値入率）
   - `calculateTransferTotals`（移動合計）
   - `calculateInventoryCost`（在庫仕入原価）
3. storeAssembler / periodMetricsCalculator / collectionAggregator の import を Bridge 経由に切り替え

### Phase 7b: barrel 整理

1. `markupRate.ts` と `costAggregation.ts` を `grossProfit.ts` barrel に追加
2. 直接 import を barrel 経由に統一

### Phase 7c: Rust 実装

1. `safeDivide` を Rust ユーティリティとして実装
2. 各計算関数を Rust で実装（入出力が number / number|null のため型変換不要）
3. dual-run-compare で TS/Rust の出力一致を検証

### Phase 7d: TS 残留モジュールの整理

1. `aggregation.ts` — Application 層の集約責務として TS に残す
2. `divisor.ts` / `averageDivisor.ts` — Date 依存のため TS に残す
3. `utils.ts` — 共通基盤として TS に残す（Rust 側に同等関数を別途実装）
