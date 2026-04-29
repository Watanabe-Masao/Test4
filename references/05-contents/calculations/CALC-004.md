---
id: CALC-004
kind: calculation
exportName: calculatePinIntervals
sourceRef: app/src/domain/calculations/pinIntervals.ts
sourceLine: 41
definitionDoc: references/01-principles/gross-profit-definition.md
contractId: BIZ-011
semanticClass: business
authorityKind: business-authoritative
methodFamily: accounting
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: c0a56f3635637ba07f632a8482bcc26e8d7a9908
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-004 — 在庫確定区間（pin）粗利計算

## 1. 概要

`calculatePinIntervals(input)` は **pure 同期関数** で、在庫が確定（pin）している区間ごとに**売上 / 総原価 / 粗利**を集計し `PinInterval[]` として返す。在庫確定日の間で粗利を正確に区切るための区間集計（`gross-profit-definition.md` の在庫法側の精度向上手法）。

## 2. Input Contract

- 期首・期中・期末の在庫確定日と、その間の `dailySales` / `dailyTotalCost` / `pinDays` / `pinClosingInventory`
- 列分離: `pinDays`（区間日数）と `pinClosingInventory`（期末在庫）が独立した列として渡される
- Zod schema: `PinIntervalSchema`

## 3. Output Contract

`PinInterval[]`（Zod schema: `PinIntervalSchema`）:

- 各 interval: `{ startDay, endDay, sales, totalCost, grossProfit, grossProfitRate }`
- 区間ごとの粗利 / 粗利率は **engine 側**で計算（`rateOwnership: engine`、UI/VM/SQL で再計算しない）
- 全 interval の `sales` 合計 = 元日次 `dailySales` の合計（保存則）

## 4. Invariants

- INV-PIN-01: 全 interval の `sales` 合計 = 元日次 `dailySales` の合計
- INV-PIN-02: 全 interval の `totalCost` 合計 = 元日次 `dailyTotalCost` の合計
- INV-PIN-03: 各 interval の `grossProfit = sales - totalCost`
- INV-PIN-04: 各 interval の `grossProfitRate = grossProfit / sales`（sales=0 で 0）
- INV-PIN-05: interval の startDay/endDay が連続性を持つ（隙間なし）

詳細: `gross-profit-definition.md` §「在庫確定区間の粗利計算」

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `pins` 空配列 → 空配列を返す（pure 安全、INV-PIN-05 連続性の起点） | tested | medium | app/src/domain/calculations/pinIntervals.test.ts | - | - |
| CLM-002 | 在庫法 COGS 公式 `cogs = prevInventory + totalPurchaseCost - closingInv` を区間ごとに適用（INV-PIN-03） | tested | high | app/src/domain/calculations/pinIntervals.test.ts | - | - |
| CLM-003 | `grossProfitRate = safeDivide(grossProfit, totalSales, 0)` で sales=0 のゼロ除算回避（INV-PIN-04） | tested | high | app/src/domain/calculations/pinIntervals.test.ts | - | - |
| CLM-004 | `rateOwnership: engine` 不変 — UI/VM/SQL での率再計算は 4 層依存違反として禁止 | guarded | high | - | app/src/test/guards/piValuePathGuard.test.ts | - |

## 5. Migration Plan

- registry: `BIZ-011`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- **WASM 候補**: `wasm/pin-intervals/`（`migrationTier: tier1`、`candidate-authoritative`）
- 候補 FFI: `dailySales + dailyTotalCost + pinDays/pinClosingInventory` 列分離 contract
- 候補が landed したら CALC-NNN として spec 化、本 spec に `replacedBy` + 候補側に `supersedes: CALC-004` を記録

## 6. Consumers

- `RM-002 calculateGrossProfit`（在庫法粗利の精度向上 input）
- 在庫法粗利を表示する chart / KPI（`grossProfitRate` 表示）

## 7. Co-Change Impact

- `PinIntervalSchema` 変更 → consumer の zod parse 修正
- 列分離 contract の変更（`pinDays` / `pinClosingInventory`）→ FFI 変更必要、TS/WASM 同期
- `rateOwnership: engine` 不変 — UI/VM/SQL が `grossProfitRate` を再計算したら違反
- 連続性 invariant (INV-PIN-05) 緩和 → 在庫確定の意味自体を変える設計判断必要

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry での `pinIntervals.ts` 分類整合
- `grossProfitPathGuard.test.ts` — 在庫法粗利の取得経路
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
