---
id: CALC-016
kind: calculation
exportName: calculateMarkupRates
sourceRef: app/src/domain/calculations/markupRate.ts
sourceLine: 68
definitionDoc: references/01-foundation/gross-profit-definition.md
contractId: BIZ-007
semanticClass: business
authorityKind: business-authoritative
methodFamily: pricing
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastSourceCommit: f43b5bd7c84d8475dfe8b26c3f7f9fe16c6a1396
owner: architecture
specVersion: 1
---

# CALC-016 — 値入率計算

## 1. 概要

`calculateMarkupRates(input)` は **pure 同期関数** で、売上 / 原価 / 値引きから **値入率**（pricing margin）を導出する business-authoritative 計算（BIZ-007、pricing family）。CALC-010 推定法の `markupRate` パラメータ供給元。

## 2. Input Contract

- `MarkupRateInput`（Zod schema: `MarkupRateInputSchema`）:
  - `totalSales`: 売上
  - `totalCost`: 原価
  - `totalDiscount`: 値引き
  - 他、計算に必要な入力
- pure 同期

## 3. Output Contract

`MarkupRateResult`（Zod schema: `MarkupRateResultSchema`）:

- `markupRate`: 値入率
- 派生 metric (rate breakdown)
- `rateOwnership: engine`

## 4. Invariants

- INV-MKR-01: 入力 0 で結果 0（pure 安全）
- INV-MKR-02: Zod parse 双方向 fail-fast
- INV-MKR-03: `markupRate` ∈ [0, 1] の範囲（外側 validate、Zod 強制）
- INV-MKR-04: CALC-010 `calculateEstMethod` の `markupRate` 入力は本 calc の出力と意味一貫

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `averageMarkupRate = (allPrice - allCost) / allPrice`（全仕入＝仕入 + 売上納品 + 移動の値入率、`safeDivide` で allPrice=0 時 0 返却） | tested | high | app/src/domain/calculations/__tests__/markupRate.test.ts | - | - |
| CLM-002 | `coreMarkupRate = (corePrice - coreCost) / corePrice`（コア仕入＝仕入 + 移動、売上納品除外。corePrice=0 時 `defaultMarkupRate` フォールバック） | tested | high | app/src/domain/calculations/__tests__/markupRate.test.ts | - | - |
| CLM-003 | Zod `MarkupRateInputSchema` で `markupRate ∈ [0, 1]` 範囲を input 側 validate、`MarkupRateResultSchema` で output 双方向 fail-fast（INV-MKR-02 / INV-MKR-03） | tested | high | app/src/domain/calculations/__tests__/markupRate.test.ts | - | - |
| CLM-004 | CALC-010 `calculateEstMethod` の `markupRate` 入力は本 calc の `coreMarkupRate` 出力と意味一貫（INV-MKR-04、推定法粗利の精度依存性） | reviewed | high | - | - | 異 CALC 間の入出力意味一貫性は test 単独で表現不能。INV-MKR-04 + 推定法粗利の精度依存性宣言で構造的保証 |

## 5. Migration Plan

- registry: `BIZ-007`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate 化計画なし

## 6. Consumers

- **CALC-010 calculateEstMethod**（推定法マージン計算で本 calc の `markupRate` を入力）
- 値入率表示 chart / KPI

## 7. Co-Change Impact

- `MarkupRateInput` / `Result` schema 変更 → CALC-010 wrapper 修正必要
- `markupRate` の意味スケール変更（小数 vs パーセント）→ 全 caller の数値見直し
- `rateOwnership: engine` 不変（UI/SQL で再計算したら違反）

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `grossProfitPathGuard.test.ts` — 推定法粗利経路（CALC-010 経由）
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
