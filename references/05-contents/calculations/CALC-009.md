---
id: CALC-009
kind: calculation
exportName: calculateInvMethod
sourceRef: app/src/domain/calculations/invMethod.ts
sourceLine: 37
definitionDoc: references/01-principles/gross-profit-definition.md
contractId: BIZ-001
semanticClass: business
authorityKind: business-authoritative
methodFamily: accounting
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: c0a56f3
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-009 — 在庫法粗利計算（domain math 層）

## 1. 概要

`calculateInvMethod(input)` は **pure 同期関数** で、売上 / 直接原価 / 値引きから **在庫法粗利**（4 種粗利のうち 2 種）を導出する domain math 層の正本（`gross-profit-definition.md` の在庫法側）。RM-002 `calculateGrossProfit` の内部実装の片翼（推定法は CALC-010）。

## 2. Input Contract

- `InvMethodInput`:
  - `totalSales`: 売上金額
  - `totalCost`: 直接原価
  - `totalDiscount`: 値引き金額
  - `costInclusionAmount`: 原価算入額
  - `inventoryAdjust`（option）: 在庫調整額
- pure 同期、I/O なし

## 3. Output Contract

`InvMethodResult`:

- `grossProfit`: 在庫法粗利 = `totalSales - totalCost - totalDiscount + costInclusionAmount`
- `grossProfitRate`: `grossProfit / totalSales`（`totalSales=0` で 0）
- `inventoryAdjustedGrossProfit`: 在庫調整適用後の粗利（option）
- `inventoryAdjustedGrossProfitRate`: 同上の rate
- `rateOwnership: engine` — UI/VM/SQL で再計算しない

## 4. Invariants

- INV-INV-01: `grossProfit = totalSales - totalCost - totalDiscount + costInclusionAmount`（在庫法定義式）
- INV-INV-02: `grossProfitRate = grossProfit / totalSales`、`totalSales=0` → 0
- INV-INV-03: 入力 pure number → 出力 finite
- INV-INV-04: 在庫調整版は基本式に `inventoryAdjust` を加算

詳細: `gross-profit-definition.md` §「在庫法粗利の定義式」、`grossProfitInvariants.test.ts`

## 5. Migration Plan

- registry: `BIZ-001`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- WASM: `wasm/gross-profit/` で WASM bridge 稼働中（calculateGrossProfit 経由）
- 本 calc は domain math layer、RM-002 が wrap
- candidate 化計画: 現状なし

## 6. Consumers

- **RM-002 calculateGrossProfit**（直接 wrap、4 種粗利のうち 2 種を本 calc から）
- `WaterfallChartWidget`（粗利分解の在庫法側）
- `WID-016 analysis-gp-heatmap`（粗利率ヒートマップ）

## 7. Co-Change Impact

- `InvMethodInput` field 変更 → RM-002 wrapper 修正必要
- 在庫法定義式変更 → INV-INV-01 修正、`gross-profit-definition.md` 改訂
- `rateOwnership: engine` 不変 — UI/SQL で `(sales - cost) / sales` を再計算したら違反
- WASM signature 変更 → TS fallback 同値性検証

## 8. Guard / Rule References

- `grossProfitPathGuard.test.ts` — 在庫法経路の唯一性
- `grossProfitConsistencyGuard.test.ts` — 4 種粗利の整合性
- `grossProfitInvariants.test.ts` — INV-INV-* / INV-EST-* 不変条件
- `calculationCanonGuard.test.ts` — registry での `invMethod.ts` 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
