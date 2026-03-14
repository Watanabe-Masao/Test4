# budgetAnalysis TS 側責務マップ

Phase 6 横展開: WASM 移行時に TS 側に残すもの / 移すもの / 整理が必要なものの切り分け

## 1. 責務マップ概要

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
                     │    └─ calculateAggregateBudget()     │    ← 複数店集約（TS に残す）
                     │  budgetAnalysisBridge.ts (未作成)     │ ← Bridge（新規作成）
                     └──────────┬──────────────────────────┘
                                │ import
                     ┌──────────▼──────────────────────────┐
                     │   Domain Layer                       │
                     │                                      │
                     │  budgetAnalysis.ts  ── WASM 化候補    │
                     │    ├─ calculateBudgetAnalysis()       │ ← 単店予算分析（Rust 移行対象）
                     │    └─ calculateGrossProfitBudget()    │ ← 粗利予算分析（Rust 移行対象）
                     └──────────────────────────────────────┘
```

## 2. 3層分類

### A. Rust/WASM 移行候補（単店純粋計算）

| 関数 | ファイル | 理由 |
|---|---|---|
| `calculateBudgetAnalysis` | `domain/calculations/budgetAnalysis.ts` | Authoritative 単店計算。pure、副作用なし、Date 非依存、FFI 障壁ゼロ |
| `calculateGrossProfitBudget` | `domain/calculations/budgetAnalysis.ts` | Authoritative 単店計算。同上 |

**移行の容易さ:**
- 入力型が `number` と `Readonly<Record<number, number>>` のみ — JSON-safe で FFI 変換不要
- `safeDivide` 以外の外部依存なし — Rust 側で同等関数を用意するだけ
- Date 非依存 — カレンダー計算は呼び出し元（storeAssembler）が担当
- forecast（ReadonlyMap + Date 依存）と比較して最も単純な移行候補

### B. 条件付き移行候補

budgetAnalysis には条件付き候補に該当する関数は**存在しない**。

forecast では `calculateWeeklySummaries`（Date 依存）等が条件付き候補だったが、
budgetAnalysis の2関数はいずれも Date 非依存・Map 不使用のため、全て A 層に分類される。

### C. TS のみ（hooks, ViewModel, 複数店 orchestration）

#### Application 層

| ファイル / 関数 | 責務 | TS に残す理由 |
|---|---|---|
| `storeAssembler.ts` — `assembleStoreResult()` | 単店の月間集計から StoreResult を組み立てる orchestration | Map↔Record 変換、予算データの解決、在庫法/推定法フォールバック等の調停ロジック |
| `collectionAggregator.ts` — `calculateAggregateBudget()` | 複数店舗の予算分析を集約 | Application 層の集約責務（後述） |
| `aggregateResults.ts` — `aggregateStoreResults()` | 複数 StoreResult の合算ファサード | Application 層の orchestration |

#### Presentation 層

| ファイル | 責務 | TS に残す理由 |
|---|---|---|
| KPI カード・予算チャート | 描画のみ | React コンポーネント。WASM 化の対象外 |

## 3. calculateAggregateBudget の位置づけ

### 結論: Application 層の集約責務として TS に残す

`calculateAggregateBudget` は `collectionAggregator.ts`（Application 層）に配置されている。

**TS に残す理由:**

1. **入力が ReadonlyMap** — `aggBudgetDaily: ReadonlyMap<number, number>` と `aggDaily: ReadonlyMap<number, DailyRecord>` を受け取る。Domain 層の `calculateBudgetAnalysis`（`Readonly<Record<number, number>>`）とは型が異なる
2. **複数店舗集約** — 個別店舗の StoreResult を合算した後の二次集約。単店の Authoritative 計算とは責務が異なる
3. **DailyRecord 依存** — 入力に `DailyRecord` 型（domain/models の複合型）を使用しており、FFI で渡すには構造のフラット化が必要
4. **重複ではない** — `calculateBudgetAnalysis` と同じ数式を使っているが、入力ソース（Map vs Record）と集約スコープ（複数店 vs 単店）が異なる。二重実装禁止には該当しない

**将来的な整理:**
- Bridge 作成後、`calculateAggregateBudget` 内部で Bridge 経由の `calculateBudgetAnalysis` を呼ぶ構成も可能だが、Map→Record 変換のオーバーヘッドと複雑性を考慮すると現状維持が妥当
- 集約結果の整合性は Cross-Validation（CV-1〜10）で担保する

## 4. Bridge 設計方針

### 配置

```
app/src/application/usecases/calculation/
  └─ budgetAnalysisBridge.ts    ← 新規作成
```

### 責務

```typescript
// budgetAnalysisBridge.ts（概念設計）
//
// Phase 7 で作成。forecast/factorDecomposition と同パターン。
//
// 1. TS 実装をデフォルトとして呼び出す
// 2. WASM バイナリが利用可能な場合は WASM に切り替える
// 3. 呼び出し元（storeAssembler）は Bridge 経由でのみアクセスする

export function calculateBudgetAnalysisVia(
  input: BudgetAnalysisInput
): BudgetAnalysisResult {
  // Phase 7: WASM 利用可能時は wasm.calculateBudgetAnalysis(input) を呼ぶ
  // 入力が Record ベースのため FFI 変換不要
  return calculateBudgetAnalysis(input)
}

export function calculateGrossProfitBudgetVia(
  input: GrossProfitBudgetInput
): GrossProfitBudgetResult {
  // 同上
  return calculateGrossProfitBudget(input)
}
```

### forecast Bridge との比較

| 観点 | budgetAnalysis Bridge | forecast Bridge |
|---|---|---|
| FFI 変換 | **不要** — Record ベースの入出力 | Map→Array 変換が必要 |
| Date 注入 | **不要** — カレンダー計算なし | dayOfWeekTable 注入が必要 |
| 関数数 | 2 | 11（段階的移行） |
| 複雑性 | ★☆☆ 最小 | ★★★ 変換層が必要 |

## 5. hook 内の隠れた計算の有無

### storeAssembler.ts: ⚠️ 変換処理あり

```typescript
// Map↔Record 変換（budgetAnalysis の入力準備）
const salesDailyRecord: Record<number, number> = {}
for (const [d, rec] of acc.daily) {
  salesDailyRecord[d] = rec.sales
}
const budgetDailyRecord: Record<number, number> = {}
for (const [d, v] of budgetDaily) {
  budgetDailyRecord[d] = v
}
```

- `acc.daily`（Map）→ `salesDailyRecord`（Record）への変換
- `budgetDaily`（Map）→ `budgetDailyRecord`（Record）への変換
- これは **orchestration の範疇**であり、Authoritative 計算ではない
- Bridge 導入後もこの変換は storeAssembler に残る（呼び出し元の責務）

### aggregateResults.ts: ✅ 問題なし

- `calculateAggregateBudget` を呼ぶだけ
- `calculateGrossProfitBudget` を直接 import しているが、barrel 経由ではなくファイル直接 import
- Bridge 導入後は Bridge 経由に切り替え

## 6. barrel export の整理方針

| 関数 | 現状 | 移行後 |
|---|---|---|
| `calculateBudgetAnalysis` | `grossProfit.ts` → `index.ts` 経由で export | Bridge 経由に切り替え。barrel export は後方互換のため維持 |
| `calculateGrossProfitBudget` | barrel 未 export（直接 import のみ） | `grossProfit.ts` に export 追加 → barrel 正規化 → Bridge 経由に切り替え |
| `BudgetAnalysisInput` / `BudgetAnalysisResult` | `grossProfit.ts` 経由で export | 維持 |
| `GrossProfitBudgetInput` / `GrossProfitBudgetResult` | barrel 未 export | `grossProfit.ts` に type export 追加 |
