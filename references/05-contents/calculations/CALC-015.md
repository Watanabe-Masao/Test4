---
id: CALC-015
kind: calculation
exportName: calculateTransferTotals
sourceRef: app/src/domain/calculations/costAggregation.ts
sourceLine: 55
definitionDoc: references/01-principles/purchase-cost-definition.md
contractId: BIZ-006
semanticClass: business
authorityKind: business-authoritative
methodFamily: accounting
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: d8d3282
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-015 — 移動合計・在庫仕入原価計算

## 1. 概要

`calculateTransferTotals(input)` は **pure 同期関数** で、店舗間移動の入出合計と在庫仕入原価を集計する business-authoritative 計算（BIZ-006、accounting family）。`calculateInventoryCost(totalCost, deliverySalesCost)` (line 75) は派生 helper。

## 2. Input Contract

- `TransferTotalsInput`（Zod schema: `TransferTotalsInputSchema`）: typeIn / typeOut の transfer 集計入力
- pure 同期

## 3. Output Contract

`TransferTotalsResult`（Zod schema: `TransferTotalsResultSchema`）:

- typeIn / typeOut 合計
- 在庫仕入原価 = `totalCost - deliverySalesCost`（`calculateInventoryCost` 経由）
- `rateOwnership: engine`

## 4. Invariants

- INV-CAG-01: typeIn 合計 + typeOut 合計 = 移動 transfer の sum
- INV-CAG-02: `calculateInventoryCost(totalCost, deliverySalesCost) = totalCost - deliverySalesCost`
- INV-CAG-03: pure 安全動作（入力 0 で結果 0）

## 5. Migration Plan

- registry: `BIZ-006`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate 化計画なし
- RM-001 readPurchaseCost と協調（typeIn / typeOut の正本は purchaseCost readModel 側、本 calc は集計 helper）

## 6. Consumers

- WID-040 / WID-041 / WID-042 / WID-043 (CostDetail 系 widget) の集計 path
- RM-001 readPurchaseCost 内部でも参照

## 7. Co-Change Impact

- `TransferTotalsInput` / `Result` schema 変更 → consumer 修正
- `calculateInventoryCost` 式変更 → 在庫法粗利 (CALC-009) との整合確認必要

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `purchaseCostPathGuard.test.ts` — 仕入原価取得経路 (RM-001 経由)
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
