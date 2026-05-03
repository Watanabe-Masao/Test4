---
id: CHART-002
kind: chart
exportName: PerformanceIndexChart
sourceRef: app/src/presentation/components/charts/PerformanceIndexChart.tsx
sourceLine: 77
inputBuilder: app/src/presentation/components/charts/PerformanceIndexChart.builders.ts
logic: null
viewModel: null
optionBuilder: null
styles: null
states:
  - empty
  - ready
stories: []
visualTests: []
definitionDoc: references/01-foundation/pi-value-definition.md
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastSourceCommit: db443c4da02705e4b7924933579ee92ebfe527c6
owner: implementation
specVersion: 1
---

# CHART-002 — PI 値・偏差値・Z スコア

## 1. 概要

`PerformanceIndexChart` は **memo 化された React component** で、PI 値（点数 PI / 金額 PI）+ 偏差値 + Z スコアの店舗別・日次比較を表示する。RM-005 客数 selectors（`selectTotalCustomers` / `selectStoreCustomerMap`）から供給される正本客数を母数として CALC-002 `calculatePIValues` の結果を可視化。

## 2. Input Contract

- `daily` / `daysInMonth` / `year` / `month` / `prevYearDaily`（基本期間 props）
- `queryExecutor` / `currentDateRange` / `prevYearScope` / `selectedStoreIds`（DuckDB query 経路）
- `totalCustomers: number`（`selectTotalCustomers` 経由、RM-005 ready 時の正本上書き）
- `allStoreResults` / `stores`
- `dailyQuantity: ReadonlyMap<dateKey, number>`（`currentCtsQuantity?.byDay`）
- `ctsQuantityByStore: ReadonlyMap<storeId, number>`（`currentCtsQuantity?.byStore`）
- `storeCustomerMap: ReadonlyMap<storeId, number> | undefined`（`selectStoreCustomerMap` 経由）

派生入力 builder（`PerformanceIndexChart.builders.ts`）:
- chart input 変換 helper

## 3. Render Model

- 多軸比較チャート（PI / 偏差値 / Z スコア）
- 母数となる客数は **RM-005 ready なら `grandTotalCustomers`**、未 ready なら `result.totalCustomers` フォールバック
- 内部で CALC-002 `calculatePIValues` を呼び出して PI 値導出

## 4. State Coverage

| state | 振る舞い |
|---|---|
| empty | 客数 0 や入力空で安全な 0 値表示 (CALC-002 INV-PI-01) |
| ready | RM-005 ready + 全 props そろい正常描画 |
| loading | RM-005 pending 時は fallback 経路で legacy `totalCustomers` を使用 |
| error | RM-005 error 時も fallback で表示継続（discriminated union readiness）|

## 5. Visual Evidence

- 現状: visual test 未連携（Phase G で landing 予定）
- Storybook story 未整備

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | CALC-002 `calculatePIValues` 出力を mapping して描画（chart 内 raw 計算禁止、C9 現実把握） | reviewed | high | - | - | chart 内 raw 計算不在は chartInputBuilderGuard で構造的保証。mapping の意味整合は CALC-002 出力契約 (Zod schema) で fail-fast |
| CLM-002 | RM-005 customerFact ready/fallback 経路に依存（grandTotalCustomers が母数、ready 不在で chart 縮退） | guarded | high | - | app/src/test/guards/customerFactPathGuard.test.ts | - |
| CLM-003 | 標準偏差 / Z スコア層は CALC-002 出力 field をそのまま mapping（chart 側で再計算しない、B3 率算出禁止） | reviewed | high | - | - | B3 (率は domain で算出) は responsibilityTagGuard で構造的保証。chart layer の再計算不在は chartInputBuilderGuard で hard fail |
| CLM-004 | ChartCard 経由で empty/loading/error 状態通知（chart 内部 error UI 禁止 = H6） | guarded | high | - | app/src/test/guards/topologyGuard.test.ts | - |

## 6. Consumers

- **WID-018** `analysis-performance-index` — 唯一の registry consumer

## 7. Co-Change Impact

- `selectTotalCustomers` / `selectStoreCustomerMap` の signature 変更 → builders / props の修正
- CALC-002 `calculatePIValues` 結果型変更 → 描画計算の修正
- RM-005 `customerFact` の status discriminated union 値追加 → fallback 経路の switch 網羅性破壊
- `currentCtsQuantity` 型変更 → `dailyQuantity` / `ctsQuantityByStore` props の修正

## 8. Guard / Rule References

- `chartInputBuilderGuard.test.ts` — `dateRangeToKeys` 直接呼び出し禁止
- `chartRenderingStructureGuard.test.ts` — chart 内 inline build 禁止
- `piValuePathGuard.test.ts` — PI 値の取得経路の唯一性
- `customerFactPathGuard.test.ts` — 客数経路の唯一性
- `responsibilityTagGuard.test.ts` — R:component
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
