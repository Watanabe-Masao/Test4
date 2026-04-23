# inquiry/06 — data pipeline map

> 役割: Phase 1 inquiry 成果物 #6。`InsightData` / `costDetailData` / `selectedResults` / 各 readModel / queryHandler 等の data flow を event-source ベースで事実記録する。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。Phase 2 以降で追加情報が判明しても書き換えず、`06a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `436fd95` |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `app/src/presentation/pages/Insight/useInsightData.ts`、`app/src/features/cost-detail/application/useCostDetailData.ts`、`app/src/presentation/pages/CostDetail/useCostDetailData.ts`、`app/src/application/hooks/useStoreSelection.ts`、`app/src/application/hooks/useWidgetDataOrchestrator.ts`、`app/src/application/readModels/*`、`app/src/presentation/hooks/useUnifiedWidgetContext.ts` の直読 |

---

## A. ctx に配布される page-local フィールドの生成経路

### A-1. `ctx.insightData`

| 項目 | 値 |
|---|---|
| 型 | `InsightData = ReturnType<typeof useInsightData>`（`pages/Insight/useInsightData.ts:225`） |
| 生成 hook | `useInsightData(opts?: { curCustomerCount?: number; prevCustomerCount?: number })` |
| 生成場所 | `app/src/presentation/pages/Insight/useInsightData.ts:39` |
| 所属層 | `presentation/pages/Insight/`（presentation 層に hook 配置）|
| 依存 hook | `useCalculation` / `useBudgetChartData` / `useStoreSelection` / `useSettingsStore` / `usePeriodSelectionStore` / `usePageComparisonModule` / `useCurrencyFormat` |
| 依存 domain 計算 | `safeDivide` / `calculateTransactionValue` / `calculateYoYRatio` / `calculateForecast` |
| 依存 features | `extractPrevYearCustomerCount`（`@/features/comparison`） / `getEffectiveGrossProfitRate` / `getEffectiveGrossProfit`（`@/application/readModels/grossProfit`） |
| 依存 pure builders | `buildForecastInput` / `computeStackedWeekData` / `buildDailyCustomerData` / `buildDowCustomerAverages` / `buildMovingAverages` / `buildRelationshipData` / `buildRelationshipDataFromPrev` / `buildDailyDecomposition` / `buildDowDecomposition` / `buildWeeklyDecomposition`（全て `pages/Forecast/ForecastPage.helpers` 由来） |
| export される意味論 | tab ('budget' / 'grossProfit' / 'forecast' / 'decomposition') / chart mode / view mode / forecast data / customer data / 予算 data 等の合成結果 |

### A-2. `ctx.costDetailData`

| 項目 | 値 |
|---|---|
| 型 | `CostDetailData = ReturnType<typeof useCostDetailData>`（`features/cost-detail/application/useCostDetailData.ts:168` および `pages/CostDetail/useCostDetailData.ts:168`）|
| 生成 hook | `useCostDetailData()` |
| 生成場所 A（features 版）| `app/src/features/cost-detail/application/useCostDetailData.ts:35` |
| 生成場所 B（pages 版）| `app/src/presentation/pages/CostDetail/useCostDetailData.ts:35` |
| 複製関係 | 2 ファイルが独立に存在。両方とも同じ export 名（`useCostDetailData` / `CostDetailData`）。inquiry/03 §特殊 1 の byte-identical 複製と類似パターンだが、本件は `useXxxData.ts` の複製。`features/cost-detail/index.ts:5` は features 版を export |
| 所属層 | 生成場所 A = `features/cost-detail/application/`（application 層） / 生成場所 B = `presentation/pages/CostDetail/`（presentation 層）|
| 依存 hook | `useCalculation` / `useStoreSelection` / `useSettingsStore` |
| 依存 pure builder | `buildPurchasePivot`（`useCostDetailData.helpers` 由来） |
| 依存 sub-hook | `useCostDetailTransfer` / `useCostDetailCostInclusion` |
| export される意味論 | tab / transferType / costInclusion / purchasePivot / transferPivot / dailyTotals 等の合成結果 |

### A-3. `ctx.selectedResults` / `ctx.storeNames` / `ctx.onCustomCategoryChange`

| 項目 | 値 |
|---|---|
| 生成 hook | `useStoreSelection()` |
| 生成場所 | `app/src/application/hooks/useStoreSelection.ts:49`（useMemo 内の `selectedResults`） |
| 所属層 | `application/hooks/`（application 層） |
| 他の戻り値 | `currentResult` / `storeName` / `stores` / `selectedStoreIds` |
| 主要 consumer | `useUnifiedWidgetContext.ts:63`（全 widget ctx 構築点）、`useInsightData.ts:46`、`useCostDetailData.ts:37`、`ReportsPage.tsx:26` |

事実: `useStoreSelection` は `application/hooks/` に置かれた 1 つの関数から、`currentResult` / `selectedResults` / `storeName` / `stores` / `selectedStoreIds` という 5 関心を同時に返している。

---

## B. readModel 正本の一覧（`application/readModels/*`）

8 ディレクトリが存在（inquiry 採取時点）:

| readModel ディレクトリ | 入口関数 | 機能 |
|---|---|---|
| `customerFact/` | `readCustomerFact()` | 客数の正本 readModel |
| `discountFact/` | `readDiscountFact()` | 値引きの正本 readModel |
| `factorDecomposition/` | `calculateFactorDecomposition()` | 要因分解の正本 calculation |
| `freePeriod/` | `readFreePeriodFact()` / `readFreePeriodBudgetFact()` / `readFreePeriodDeptKPI()` / `selectPrevYearSummaryFromFreePeriod()` | 自由期間分析系の 4 入口 |
| `grossProfit/` | `calculateGrossProfit()` / `getEffectiveGrossProfit()` / `getEffectiveGrossProfitRate()` | 粗利の正本 calculation + 取得 helper |
| `prevYear/` | （後段の hook が import する前年データ） | 前年 data の readModel |
| `purchaseCost/` | `readPurchaseCost()` / `usePurchaseCost()` / `purchaseCostHandler` | 仕入原価の正本 readModel（3 独立正本を統合）|
| `salesFact/` | `readSalesFact()` / `salesFactHandler` | 売上の正本 readModel |

事実: `application/queryHandlers/` ディレクトリは**存在しない**。handler は readModel ディレクトリ内に co-located（例: `application/readModels/purchaseCost/` に `purchaseCostHandler`）、または `application/queries/` に配置（例: `application/queries/discountFactHandler`）。**handler の配置先が統一されていない**。

---

## C. widget ctx の orchestrator: `useWidgetDataOrchestrator`

### C-1. 概要

| 項目 | 値 |
|---|---|
| hook 名 | `useWidgetDataOrchestrator` |
| 所在 | `app/src/application/hooks/useWidgetDataOrchestrator.ts` |
| 機能 | 3 正本（`purchaseCost` / `salesFact` / `discountFact`）+ `customerFact` を `useQueryWithHandler` で並列取得し、`readModels` として widget ctx に配布 |

### C-2. handler 使用箇所

| 行 | handler | import 元 |
|---|---|---|
| `:35` | `purchaseCostHandler` | `@/application/readModels/purchaseCost` |
| `:40` | `discountFactHandler` | `@/application/queries/discountFactHandler`（**readModel ではなく queries/**） |
| `:43` | `customerFactHandler` | `@/application/readModels/customerFact` |
| `:171` | `useQueryWithHandler(executor, purchaseCostHandler, purchaseCostInput)` | PairedInput 経由 |
| `:183` | `useQueryWithHandler(executor, discountFactHandler, discountFactInput)` | 同 |
| `:189` | `useQueryWithHandler(executor, customerFactHandler, customerFactInput)` | 同 |

事実: handler import 元の 3 種（`application/readModels/purchaseCost` / `application/queries/discountFactHandler` / `application/readModels/customerFact`）が**不揃い**。同じ「handler」という責務でも配置場所が 2 系統（`readModels/` と `queries/`）に分岐している。

---

## D. widget ctx の合成: `useUnifiedWidgetContext`

| 項目 | 値 |
|---|---|
| hook 名 | `useUnifiedWidgetContext` |
| 所在 | `app/src/presentation/hooks/useUnifiedWidgetContext.ts`（**presentation 層**） |
| 機能 | `useStoreSelection` + readModels + その他多数の hook を統合して `UnifiedWidgetContext` を組み立てる |
| 主な統合対象 | `useStoreSelection`（`:63`）、その他 Dashboard 固有の取得経路、lane（freePeriod / timeSlot / storeDaily / categoryDaily）、`useWidgetDataOrchestrator`、`chartPeriodProps` 等 |

事実: `useUnifiedWidgetContext` は **presentation 層**に配置されている（`application/hooks/` ではなく）。application 層の hook（`useStoreSelection` / `useWidgetDataOrchestrator`）を呼び出して ctx を組み立てる責務を、presentation 層の hook が担っている。

---

## E. 合成図（data flow summary）

```text
[raw data sources]
  │
  ├─ DuckDB query execution
  │    │
  │    └─ *Handler（readModels/* または queries/*）
  │         │
  │         └─ useQueryWithHandler（application/hooks）
  │              │
  │              └─ useWidgetDataOrchestrator（application/hooks）
  │                   │ readModels = { purchaseCost, salesFact, discountFact, customerFact }
  │                   ↓
  │
  ├─ StoreResult / PrevYearData（上位 calculation engine 結果）
  │    │
  │    └─ useStoreSelection（application/hooks）
  │         │ returns { currentResult, selectedResults, storeName, stores, selectedStoreIds }
  │         ↓
  │
  └─ page-local data
       │
       ├─ useInsightData（presentation/pages/Insight）     → ctx.insightData
       ├─ useCostDetailData（features/cost-detail/application および presentation/pages/CostDetail）
       │                                                   → ctx.costDetailData
       └─ （その他 page-local hook）
       ↓

[merge]
  │
  ↓
useUnifiedWidgetContext（presentation/hooks）
  │
  ↓
UnifiedWidgetContext / WidgetContext
  │
  ↓
Widget registry の render 関数
```

---

## F. 観察される非統一（事実）

以下は本 map の作成過程で観察された**構造的非統一**。改修案ではなく、事実として列挙する:

### F-1. hook の層配置の非統一

| hook | 所属層 |
|---|---|
| `useStoreSelection` | `application/hooks/` |
| `useWidgetDataOrchestrator` | `application/hooks/` |
| `useQueryWithHandler` | `application/hooks/` |
| `useCostDetailData`（features 版） | `features/cost-detail/application/` |
| `useCostDetailData`（pages 版） | `presentation/pages/CostDetail/` |
| `useInsightData` | `presentation/pages/Insight/` |
| `useUnifiedWidgetContext` | `presentation/hooks/` |

事実: 5 位置に hook が散在（`application/hooks/` / `features/*/application/` / `presentation/pages/*/` / `presentation/hooks/` / 複製）。

### F-2. handler の層配置の非統一

| handler | 配置 |
|---|---|
| `purchaseCostHandler` | `application/readModels/purchaseCost/` |
| `customerFactHandler` | `application/readModels/customerFact/` |
| `discountFactHandler` | `application/queries/discountFactHandler.ts`（readModel ではなく queries/） |
| `salesFactHandler` | `application/readModels/salesFact/`（想定） |

事実: `discountFactHandler` のみ `application/queries/` 配下で、他は `application/readModels/<name>/` 内。

### F-3. `useCostDetailData` の複製

`features/cost-detail/application/useCostDetailData.ts` と `pages/CostDetail/useCostDetailData.ts` が並存。両方とも同じ export 名。どちらが正本かは本台帳では未判定（inquiry/03 §特殊 1 の byte-identical widgets.tsx 複製と類似パターン）。

### F-4. `useInsightData` の依存先の広さ

`useInsightData` は 11 個の pure builder を `@/presentation/pages/Forecast/ForecastPage.helpers` から import している。`Insight` page 用 hook が `Forecast` page の helpers を参照する形で、page 間の依存が存在。

### F-5. `useStoreSelection` の 5 関心併返

`useStoreSelection()` が返す 5 値（`currentResult` / `selectedResults` / `storeName` / `stores` / `selectedStoreIds`）は、ほぼ全ての consumer が一部のみを必要とする。consumer の用途が揃っていない。

### F-6. `useUnifiedWidgetContext` の presentation 層配置

widget ctx の合成は `presentation/hooks/` で行われている。application 層に複数の hook（`useStoreSelection` / `useWidgetDataOrchestrator`）があるにもかかわらず、統合点は presentation 層。

---

## G. page-local data の存在箇所

| page | page-local hook | 生成される ctx field |
|---|---|---|
| Insight | `useInsightData`（`pages/Insight/`） | `insightData` |
| CostDetail | `useCostDetailData`（features / pages 両方） | `costDetailData` |
| Category | （`useStoreSelection` の `selectedResults` / `stores` 経由） | `selectedResults` / `storeNames` / `onCustomCategoryChange` |
| Reports | `ReportsPage.tsx` が `useStoreSelection` を直接消費 | なし（`result` / `departmentKpi` 等 Unified core）|
| Dashboard | 多数の Dashboard 固有 hook を `useUnifiedWidgetContext` 内で合成 | Dashboard 固有 optional 20 field |
| Daily | （pure な計算のみ、page 固有 hook なし） | なし（`result.daily` 等 Unified core）|

---

## 付記

- 本台帳は immutable。Phase 2 以降の追加情報は `06a-*.md` として addend する
- 関連: `inquiry/01-widget-registries.md`（registry から ctx への入口）、`inquiry/02-widget-ctx-dependency.md`（widget × field 依存）、`inquiry/04-type-asymmetry.md`（ctx の構造非対称）
