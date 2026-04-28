---
id: CALC-002
kind: calculation
exportName: calculatePIValues
sourceRef: app/src/domain/calculations/piValue.ts
sourceLine: 78
definitionDoc: references/01-principles/pi-value-definition.md
contractId: BIZ-012
semanticClass: business
authorityKind: business-authoritative
methodFamily: retail_kpi
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: 783a74a
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-002 — PI 値計算

## 1. 概要

`calculatePIValues(input)` は **pure 同期関数** で、`PIValueInput`（販売点数・売上金額・客数）から **点数 PI 値**（販売点数 / 客数）と **金額 PI 値**（売上金額 / 客数）を `PIValueResult` として返す（`pi-value-definition.md` 準拠、Zod schema 適用）。`calculateQuantityPI` (line 60) / `calculateAmountPI` (line 70) を内部で呼び出す統合 API。

## 2. Input Contract

- `PIValueInput`（Zod schema: `PIValueInputSchema`）:
  - `totalQuantity`: 販売点数（販売 transaction の line item 数）
  - `totalSales`: 売上金額
  - `customers`: 来店客数（StoreResult.totalCustomers の上書き先である `customerFact` から流入）
- 客数 0 で除算回避: `calculateQuantityPI` / `calculateAmountPI` は 0 を返す（INV-PI-01）

## 3. Output Contract

`PIValueResult`（Zod schema: `PIValueResultSchema`）:

- `quantityPI`: `totalQuantity / customers`（客数 0 → 0）
- `amountPI`: `totalSales / customers`（客数 0 → 0）
- 派生 export:
  - `calculateQuantityPI(totalQuantity, customers)` — 単独 API
  - `calculateAmountPI(totalSales, customers)` — 単独 API

## 4. Invariants

- INV-PI-01: `customers === 0` ならば `quantityPI === 0` かつ `amountPI === 0`（除算回避）
- INV-PI-02: `customers > 0` ならば PI 値は finite（NaN/Infinity 不可、入力 schema で保証）
- INV-PI-03: PI 値の意味は **「1 客あたり」** であり、販売点数 / 売上を **正本客数** で除する
- INV-PI-04: 正本客数 = `readModels.customerFact` ready 時の `grandTotalCustomers`、未 ready 時は `result.totalCustomers` フォールバック

詳細: `pi-value-definition.md`、`invariant-catalog.md` §PI

## 5. Migration Plan

- registry: `BIZ-012`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- **WASM 候補**: `wasm/pi-value/`（`migrationTier: tier1`、`candidate-authoritative`）
- 候補は registry 上の予約 path `candidate/piValue.ts`（物理 file 未生成）
- 候補が landed したら CALC-NNN として spec 化、本 spec に `replacedBy` + 候補側に `supersedes: CALC-002` を記録
- Promote Ceremony は `references/03-guides/promote-ceremony-pr-template.md` 経由で 1 PR 5 同期

## 6. Consumers

- `PerformanceIndexChart`（PI 値・偏差値・Z スコア表示）
- `CategoryPerformanceChart`（カテゴリ別 PI 値）
- `RM-005 customerFact selectors`（PI 値計算の母数を提供）
- `analysis-causal-chain` widget（因果チェーン分析の補助指標）

## 7. Co-Change Impact

- `PIValueInput` / `PIValueResult` schema 変更 → consumer の Zod parse 修正
- `calculateQuantityPI` / `calculateAmountPI` の signature 変更 → 単独 API 経路の破壊
- 客数フォールバック方針変更 → `selectTotalCustomers` selector との整合確認
- WASM bridge landing 時の input layout 変更 → TS fallback との同値性検証必要

## 8. Guard / Rule References

- `piValuePathGuard.test.ts` — PI 値の取得経路の唯一性
- `calculationCanonGuard.test.ts` — registry での `piValue.ts` 分類整合
- `customerFactPathGuard.test.ts` — 母数となる客数経路の整合
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
