---
id: CALC-010
kind: calculation
exportName: calculateEstMethod
sourceRef: app/src/domain/calculations/estMethod.ts
sourceLine: 125
definitionDoc: references/01-principles/gross-profit-definition.md
contractId: BIZ-002
semanticClass: business
authorityKind: business-authoritative
methodFamily: accounting
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: 8be44bc8586399e3c84ee527289d2dcbcfbe6842
owner: architecture
specVersion: 1
---

# CALC-010 — 推定法マージン計算（domain math 層）

## 1. 概要

`calculateEstMethod(input)` は **pure 同期関数** で、コアセールス / 値引率から **推定法マージン**（4 種粗利のうち 2 種）を導出する domain math 層の正本（`gross-profit-definition.md` の推定法側）。RM-002 `calculateGrossProfit` の内部実装の片翼（在庫法は CALC-009）。

## 2. Input Contract

- `EstMethodInput`:
  - `totalSales`: 売上金額
  - `totalDiscount`: 値引き金額
  - `markupRate`: 想定値入率（推定法の核心パラメータ）
  - `inventoryAdjust`（option）: 在庫調整額
- 派生 export（同 module）:
  - `calculateEstMethodWithStatus(input)` (line 70) — status 付き wrapper（fallback 経路の透明性）
  - `calculateCoreSales(salesAmount, discountAmount)` (line 153) — コアセールス helper
  - `calculateDiscountRate(salesAmount, discountAmount)` (line 187) — 値引率 helper

## 3. Output Contract

`EstMethodResult`:

- `coreSales`: コアセールス = `salesAmount + discountAmount`（販売原価ベースの売上）
- `estimatedCost`: 推定原価 = `coreSales * (1 - markupRate)`
- `grossProfit`: 推定法粗利 = `totalSales - estimatedCost`
- `grossProfitRate`: `grossProfit / totalSales`
- `inventoryAdjustedGrossProfit` / `inventoryAdjustedGrossProfitRate`: 在庫調整版
- `rateOwnership: engine` — UI/VM/SQL で再計算しない

## 4. Invariants

- INV-EST-01: `coreSales = salesAmount + discountAmount`（コアセールス定義）
- INV-EST-02: `estimatedCost = coreSales * (1 - markupRate)`
- INV-EST-03: `grossProfit = totalSales - estimatedCost`
- INV-EST-04: `grossProfitRate = grossProfit / totalSales`、`totalSales=0` で 0
- INV-EST-05: `markupRate` ∈ [0, 1]（外側で validate、Zod schema で保証）

詳細: `gross-profit-definition.md` §「推定法マージンの定義式」

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `discountRate >= 1 ∨ discountRate < 0` → `invalidResult` を返す（domain 外入力 fail-fast、`calculateEstMethodWithStatus`） | tested | high | app/src/domain/calculations/__tests__/estMethod.test.ts | - | - |
| CLM-002 | 粗売上公式 `coreSales / (1 - discountRate)` で売変前売価を逆算、推定原価 `grossSales × (1 - markupRate) + costInclusionCost` | tested | high | app/src/domain/calculations/estMethod.test.ts | - | - |
| CLM-003 | `markupRate < 0 ∨ markupRate > 1` は warning のみ（`okResult` で値返却）— 実用域逸脱を伝播し UI 側で警告表示 | tested | medium | app/src/domain/calculations/__tests__/estMethod.test.ts | - | - |
| CLM-004 | RM-002 `calculateGrossProfit` が本 calc を 4 種粗利の 1 つとして wrap、推定法 markupRate は CALC-016 から供給（`@deprecated calculateEstMethod` は WithStatus 版に段階移行中、@expiresAt 2026-12-31） | guarded | high | - | app/src/test/observation/grossProfitObservation.test.ts | - |

## 5. Migration Plan

- registry: `BIZ-002`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- WASM: `wasm/gross-profit/` 経由（CALC-009 と同じ bridge）
- 本 calc は domain math layer、RM-002 が wrap
- candidate 化計画: 現状なし

## 6. Consumers

- **RM-002 calculateGrossProfit**（直接 wrap、4 種粗利のうち 2 種を本 calc から）
- `WaterfallChartWidget`（粗利分解の推定法側）
- `WID-016 analysis-gp-heatmap`（粗利率ヒートマップの推定法表示）

## 7. Co-Change Impact

- `EstMethodInput` field 変更 → RM-002 wrapper 修正必要
- 推定法定義式変更 → INV-EST-01〜05 修正、`gross-profit-definition.md` 改訂
- `markupRate` の意味変更（小数 vs パーセント等）→ 全 caller の数値スケール見直し
- `calculateEstMethodWithStatus` の status 値追加 → consumer の switch 網羅性破壊
- `rateOwnership: engine` 不変 — UI/SQL で再計算したら違反

## 8. Guard / Rule References

- `grossProfitPathGuard.test.ts` — 推定法経路の唯一性
- `grossProfitConsistencyGuard.test.ts` — 4 種粗利の整合性
- `grossProfitInvariants.test.ts` — INV-EST-* 不変条件
- `calculationCanonGuard.test.ts` — registry での `estMethod.ts` 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
