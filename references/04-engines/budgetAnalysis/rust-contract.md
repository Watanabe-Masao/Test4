# budgetAnalysis FFI コントラクト

Phase 6 横展開: Rust/WASM 移行時の FFI 境界仕様

## 1. 概要

budgetAnalysis は本プロジェクトで**最も FFI 親和性が高い**モジュールである。
入力・出力ともに `number` と `Record<number, number>` のみで構成され、
Map→Array 変換や Date 注入が不要。Grade A (95/100) の移行難易度。

## 2. 入力 DTO

### calculateBudgetAnalysis — BudgetAnalysisInput

```typescript
interface BudgetAnalysisInput {
  readonly totalSales: number          // 実績売上合計
  readonly budget: number              // 月間予算
  readonly budgetDaily: Readonly<Record<number, number>>  // 日別予算（key: 日番号 1〜N）
  readonly salesDaily: Readonly<Record<number, number>>   // 日別売上（key: 日番号 1〜N）
  readonly elapsedDays: number         // 経過日数
  readonly salesDays: number           // 営業日数（売上がある日数）
  readonly daysInMonth: number         // 月の日数
}
```

**FFI 互換性:** ✅ 完全互換
- `number` フィールドは f64 に直接マッピング
- `Readonly<Record<number, number>>` は JSON オブジェクト `{ "1": 100000, "2": 200000, ... }`
  - Rust 側では `HashMap<u32, f64>` または `BTreeMap<u32, f64>` で受ける
  - serde_json でゼロコスト変換可能
- Date 型なし、Map 型なし、null 型なし

### calculateGrossProfitBudget — GrossProfitBudgetInput

```typescript
interface GrossProfitBudgetInput {
  readonly grossProfit: number         // 粗利実績
  readonly grossProfitBudget: number   // 粗利予算
  readonly budgetElapsedRate: number   // 予算経過率（calculateBudgetAnalysis の出力を入力に使用）
  readonly elapsedDays: number         // 経過日数
  readonly salesDays: number           // 営業日数
  readonly daysInMonth: number         // 月の日数
}
```

**FFI 互換性:** ✅ 完全互換
- 全フィールドが `number`（f64）
- Record すら含まない — 最も単純な FFI 入力

**注意:** `budgetElapsedRate` は `calculateBudgetAnalysis` の出力値を入力として受け取る。
つまり2つの関数には呼び出し順序の依存がある（budgetAnalysis → grossProfitBudget）。

## 3. 出力 DTO

### calculateBudgetAnalysis — BudgetAnalysisResult

```typescript
interface BudgetAnalysisResult {
  readonly budgetAchievementRate: number     // 予算達成率
  readonly budgetProgressRate: number        // 予算消化率
  readonly budgetElapsedRate: number         // 予算経過率
  readonly budgetProgressGap: number         // 進捗ギャップ（消化率 − 経過率）
  readonly budgetVariance: number            // 予算差異（累計実績 − 累計予算）
  readonly averageDailySales: number         // 日平均売上
  readonly projectedSales: number            // 月末予測売上
  readonly projectedAchievement: number      // 予算達成率予測
  readonly requiredDailySales: number        // 必要日次売上
  readonly remainingBudget: number           // 残余予算
  readonly dailyCumulative: Readonly<        // 日別累計
    Record<number, { readonly sales: number; readonly budget: number }>
  >
}
```

**FFI 互換性:** ✅ 完全互換
- スカラーフィールド（10個）は全て f64
- `dailyCumulative` はネスト Record だが JSON-safe
  - Rust 側: `HashMap<u32, DailyCumulativeEntry>` where `DailyCumulativeEntry { sales: f64, budget: f64 }`
  - serde_json で直接デシリアライズ可能

### calculateGrossProfitBudget — GrossProfitBudgetResult

```typescript
interface GrossProfitBudgetResult {
  readonly grossProfitBudgetVariance: number    // 粗利予算差異
  readonly grossProfitProgressGap: number       // 粗利進捗ギャップ
  readonly requiredDailyGrossProfit: number     // 必要日次粗利
  readonly projectedGrossProfit: number         // 月末粗利予測
  readonly projectedGPAchievement: number       // 粗利予算達成率予測
}
```

**FFI 互換性:** ✅ 完全互換
- 全フィールドが f64 — 最も単純な FFI 出力

## 4. dailyCumulative の構造

`dailyCumulative` は budgetAnalysis 固有のネスト構造である。

```typescript
// TypeScript 側
Readonly<Record<number, { readonly sales: number; readonly budget: number }>>

// 実データ例（3日間の月）
{
  1: { sales: 150000, budget: 100000 },
  2: { sales: 400000, budget: 300000 },
  3: { sales: 400000, budget: 600000 }
}
```

```rust
// Rust 側の対応構造
#[derive(Serialize, Deserialize)]
struct DailyCumulativeEntry {
    sales: f64,
    budget: f64,
}

// 出力型
type DailyCumulative = BTreeMap<u32, DailyCumulativeEntry>;
```

**性質:**
- キーは 1 から `daysInMonth` までの連続整数
- `sales` は単調非減少（salesDaily >= 0 の前提下）
- `budget` は単調非減少（budgetDaily >= 0 の前提下）
- JSON シリアライズ時、数値キーは文字列キーになる（`"1"`, `"2"`, ...）
  — Rust 側で serde の `deserialize_with` または `BTreeMap<String, _>` → `BTreeMap<u32, _>` 変換が必要

## 5. forecast との FFI 互換性比較

| 観点 | budgetAnalysis | forecast |
|---|---|---|
| 入力の Map 使用 | ❌ 不使用（`Record` のみ） | ✅ `ReadonlyMap<number, DailyRecord>` |
| 入力の Date 使用 | ❌ 不使用 | ✅ `new Date()` 依存（4関数） |
| 出力の Map 使用 | ❌ 不使用（`Record` のみ） | ✅ `Map<number, ...>` |
| FFI 変換コスト | **ゼロ** | Map→Array 変換 + Date→dayOfWeek テーブル注入 |
| null 許容入力 | **なし** | 一部あり |
| ネスト構造 | `dailyCumulative`（Record ネスト） | `WeekRange[]`, `DayOfWeekAverage[]` |
| JSON-safe | ✅ 入出力完全 | ⚠️ Map は JSON 非対応 |

**結論:** budgetAnalysis は forecast と異なり、Bridge 層での型変換が一切不要。
`JSON.stringify` → WASM → `JSON.parse` のパスがそのまま使える。

## 6. Bridge エントリポイント計画

### 移行対象

| 関数 | Bridge 候補 | 理由 |
|---|---|---|
| `calculateBudgetAnalysis` | ✅ Bridge 対象 | Authoritative 単店計算。FFI 変換不要 |
| `calculateGrossProfitBudget` | ✅ Bridge 対象 | Authoritative 単店計算。FFI 変換不要 |
| `calculateAggregateBudget` | ❌ Bridge 対象外 | Application 層の複数店集約。Map 入力。TS に残す |

### Bridge の呼び出し順序

`calculateGrossProfitBudget` は `calculateBudgetAnalysis` の出力（`budgetElapsedRate`）を
入力として受け取るため、Bridge は以下の順序で呼び出す:

```
storeAssembler
  │
  ├─ budgetAnalysisBridge.calculateBudgetAnalysisVia(input)
  │    └─ WASM or TS: calculateBudgetAnalysis(input) → result
  │
  └─ budgetAnalysisBridge.calculateGrossProfitBudgetVia({
       ...input,
       budgetElapsedRate: result.budgetElapsedRate  ← 前の結果を使用
     })
       └─ WASM or TS: calculateGrossProfitBudget(input) → gpResult
```

### aggregateResults での呼び出し

`aggregateResults.ts` では `calculateGrossProfitBudget` を直接呼んでいる。
Bridge 導入後は Bridge 経由に切り替える:

```
aggregateResults
  │
  ├─ calculateAggregateBudget(...)  ← TS のまま（Bridge 対象外）
  │    └─ budgetElapsedRate を出力
  │
  └─ budgetAnalysisBridge.calculateGrossProfitBudgetVia({
       ...input,
       budgetElapsedRate: budgetAnalysis.budgetElapsedRate
     })
```

## 7. barrel export の整合性問題

### 現状

```
domain/calculations/
  ├── budgetAnalysis.ts
  │     ├── calculateBudgetAnalysis      ← export あり
  │     ├── calculateGrossProfitBudget   ← export あり
  │     ├── BudgetAnalysisInput          ← export あり
  │     ├── BudgetAnalysisResult         ← export あり
  │     ├── GrossProfitBudgetInput       ← export あり
  │     └── GrossProfitBudgetResult      ← export あり
  │
  ├── grossProfit.ts（barrel）
  │     ├── re-export: calculateBudgetAnalysis     ✅
  │     ├── re-export: BudgetAnalysisInput         ✅
  │     ├── re-export: BudgetAnalysisResult        ✅
  │     ├── calculateGrossProfitBudget             ❌ 未 export
  │     ├── GrossProfitBudgetInput                 ❌ 未 export
  │     └── GrossProfitBudgetResult                ❌ 未 export
  │
  └── index.ts（barrel）
        └── export * from './grossProfit'           ← grossProfit.ts に含まれないものは通らない
```

### 影響

- `storeAssembler.ts` は `'@/domain/calculations/budgetAnalysis'` から直接 import（barrel 不経由）
- `aggregateResults.ts` も同様に直接 import
- barrel 経由でアクセスできるのは `calculateBudgetAnalysis` のみ

### 修正方針

Bridge 作成時に以下を実施:

1. `grossProfit.ts` に `calculateGrossProfitBudget` と型の re-export を追加
2. `storeAssembler.ts` / `aggregateResults.ts` の import を Bridge 経由に変更
3. barrel export は後方互換のため維持（Domain 層の直接アクセスも許容）

## 8. Rust 側の型定義（参考）

```rust
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Deserialize)]
pub struct BudgetAnalysisInput {
    pub total_sales: f64,
    pub budget: f64,
    pub budget_daily: BTreeMap<u32, f64>,
    pub sales_daily: BTreeMap<u32, f64>,
    pub elapsed_days: u32,
    pub sales_days: u32,
    pub days_in_month: u32,
}

#[derive(Serialize)]
pub struct DailyCumulativeEntry {
    pub sales: f64,
    pub budget: f64,
}

#[derive(Serialize)]
pub struct BudgetAnalysisResult {
    pub budget_achievement_rate: f64,
    pub budget_progress_rate: f64,
    pub budget_elapsed_rate: f64,
    pub budget_progress_gap: f64,
    pub budget_variance: f64,
    pub average_daily_sales: f64,
    pub projected_sales: f64,
    pub projected_achievement: f64,
    pub required_daily_sales: f64,
    pub remaining_budget: f64,
    pub daily_cumulative: BTreeMap<u32, DailyCumulativeEntry>,
}

#[derive(Deserialize)]
pub struct GrossProfitBudgetInput {
    pub gross_profit: f64,
    pub gross_profit_budget: f64,
    pub budget_elapsed_rate: f64,
    pub elapsed_days: u32,
    pub sales_days: u32,
    pub days_in_month: u32,
}

#[derive(Serialize)]
pub struct GrossProfitBudgetResult {
    pub gross_profit_budget_variance: f64,
    pub gross_profit_progress_gap: f64,
    pub required_daily_gross_profit: f64,
    pub projected_gross_profit: f64,
    pub projected_gp_achievement: f64,
}
```

**注意:**
- TypeScript の camelCase → Rust の snake_case 変換は serde の `#[serde(rename_all = "camelCase")]` で対応
- `BTreeMap<u32, f64>` の JSON シリアライズ時、キーは文字列（`"1"`, `"2"`, ...）になる。serde はこれをデフォルトで処理する
- `u32` はキー（日番号）に使用。`elapsed_days` 等も非負だが、TS 側が `number` のため f64 → u32 変換が必要
