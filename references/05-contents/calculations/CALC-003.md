---
id: CALC-003
kind: calculation
exportName: computeEstimatedInventory
sourceRef: app/src/domain/calculations/inventoryCalc.ts
sourceLine: 72
definitionDoc: references/01-principles/gross-profit-definition.md
contractId: BIZ-009
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
specVersion: 1
---

# CALC-003 — 日別推定在庫計算

## 1. 概要

`computeEstimatedInventory(daily, opts)` は **pure 同期関数** で、日次売上 / 直接仕入 / 商品仕入 / 消耗品 / 売変等から **日別推定在庫の推移**（`InventoryPointSchema[]`）を導出する。在庫法ではなく **推定法**側の正本（推定法粗利 RM-002 の入力に使われる）。

## 2. Input Contract

- `daily: readonly StoreDayDailyRow[]` — 日次粒度の行 (`dailySales` / `flowersPrice` / `directProducePrice` / `costInclusionCost` / `totalCost` / `deliverySalesCost`)
- `opts`（option）: 初期在庫 / 期首在庫設定
- 派生 export:
  - `computeEstimatedInventoryDetails(daily, opts)` (line 94) — 日別 row の details 付き

## 3. Output Contract

`InventoryPoint[]`（Zod schema: `InventoryPointSchema`）:

- 各 element: `{ day, estimatedInventory, dailyChange, ... }`
- 累積構造: 前日在庫 + 当日仕入 - 当日売上 - 当日消耗 = 当日在庫
- `InventoryDetailRow[]`（`computeEstimatedInventoryDetails` 経由）: rendering 用の augmented view

## 4. Invariants

- INV-INV-01: 推定在庫の累積式が日次差分の sum と一致（保存則）
- INV-INV-02: 入力 row が 0 件 → 空配列を返す（pure builder）
- INV-INV-03: 数値が finite（NaN/Infinity 禁止、Zod parse で保証）
- INV-INV-04: `dailyChange = estimatedInventory[t] - estimatedInventory[t-1]`（差分の自己整合）

詳細: `gross-profit-definition.md` §「推定法」、`invariant-catalog.md`

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `getDailyTotalCost(rec) − deliverySales.cost` を在庫仕入原価の唯一算出元（storeAssembler の `totalCost → inventoryCost` との整合性保証） | tested | high | app/src/domain/calculations/inventoryCalc.test.ts | - | - |
| CLM-002 | コア売上は日別 `max(0)` クランプしない（月次集計 `calculateEstMethod` との Σ 不等式回避、INV-INV-01 保存則の前提） | tested | high | app/src/domain/calculations/inventoryCalc.test.ts | - | - |
| CLM-003 | Zod `InventoryPointSchema` / `InventoryDetailRowSchema` で input/output 双方 fail-fast（汚染データ流入禁止） | tested | medium | app/src/domain/calculations/inventoryCalc.test.ts | - | - |
| CLM-004 | 取得経路の唯一性（推定在庫は本 calc のみ、`grossProfitPathGuard` 監視下） | guarded | high | - | app/src/test/guards/grossProfitPathGuard.test.ts | - |

## 5. Migration Plan

- registry: `BIZ-009`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- **WASM 候補**: `wasm/inventory-calc/`（`migrationTier: tier1`、`candidate-authoritative`）
- 候補 FFI: 6 列 flat contract（`dailySales` / `flowersPrice` / `directProducePrice` / `costInclusionCost` / `totalCost` / `deliverySalesCost`）
- 候補が landed したら CALC-NNN として spec 化、本 spec に `replacedBy` + 候補側に `supersedes: CALC-003` を記録

## 6. Consumers

- `WID-012 daily-inventory` widget — 「日別推定在庫」表示の **permanent floor**（CategoryDailySeries に含まれない markup/discount rate + 仕入内訳を必要とするため raw `result.daily` 経由が intentional な permanent 例外、`storeDailyLaneSurfaceGuard` で許容）
- `RM-002 calculateGrossProfit` の推定法側入力
- 在庫推移 chart（部分的）

## 7. Co-Change Impact

- `StoreDayDailyRow` の field set 変更（6 列 flat contract）→ FFI 変更が必要、TS / WASM 双方の修正
- `InventoryPointSchema` 変更 → consumer (WID-012 / RM-002 推定法) の zod parse 修正
- 推定法計算式変更 → INV-INV-* の修正、`gross-profit-definition.md` 改訂
- `storeDailyLaneSurfaceGuard` の permanent floor 例外条件変更 → 本 calc 直接 import の閉じ込め見直し

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry での `inventoryCalc.ts` 分類整合
- `storeDailyLaneSurfaceGuard.test.ts` — `result.daily` 直接 iterate を許容する permanent floor として本 calc が登録済み
- `grossProfitPathGuard.test.ts` — 推定法粗利の取得経路（本 calc が input）
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
