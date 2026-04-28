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
definitionDoc: references/01-principles/pi-value-definition.md
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: 8be44bc
owner: implementation
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
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
