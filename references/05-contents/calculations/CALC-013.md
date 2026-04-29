---
id: CALC-013
kind: calculation
exportName: calculateDiscountImpact
sourceRef: app/src/domain/calculations/discountImpact.ts
sourceLine: 91
definitionDoc: references/01-principles/discount-definition.md
contractId: BIZ-005
semanticClass: business
authorityKind: business-authoritative
methodFamily: accounting
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: f43b5bd7c84d8475dfe8b26c3f7f9fe16c6a1396
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-013 — 売変ロス原価計算

## 1. 概要

`calculateDiscountImpact(input)` は **pure 同期関数** で、売変による原価ロス（値引きの原価相当額）を計算する business-authoritative 計算（BIZ-005、accounting family）。`calculateDiscountImpactWithStatus` (line 66) は status 付き wrapper（fallback 経路の透明性）。

## 2. Input Contract

- `DiscountImpactInput`（Zod schema: `DiscountImpactInputSchema`）:
  - `discountAmount`: 値引き金額
  - `markupRate`: 想定値入率（推定法と同じパラメータ）
  - 他、計算に必要な入力
- pure 同期

## 3. Output Contract

`DiscountImpactResult`（Zod schema: `DiscountImpactResultSchema`）:

- 売変ロスの原価相当額
- 派生 metric (rate / breakdown 等)
- `rateOwnership: engine` — UI/SQL で再計算しない

## 4. Invariants

- INV-DI-01: 入力 0 で結果 0（pure 安全）
- INV-DI-02: Zod parse 双方向 fail-fast
- INV-DI-03: `markupRate` の意味は CALC-010 推定法と一貫

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `discountRate >= 1 ∨ discountRate < 0` → `invalidResult` 返却（`calculateDiscountImpactWithStatus`、domain 外入力 fail-fast） | tested | high | app/src/domain/calculations/__tests__/discountImpact.test.ts | - | - |
| CLM-002 | 売変ロス原価公式 `(1 - markupRate) × coreSales × discountRate / (1 - discountRate)`（売変前売価逆算後の原価換算） | tested | high | app/src/domain/calculations/discountImpact.test.ts | - | - |
| CLM-003 | Zod `DiscountImpactInputSchema` / `DiscountImpactResultSchema` で input/output 双方 fail-fast（INV-DI-02） | tested | medium | app/src/domain/calculations/__tests__/discountImpact.test.ts | - | - |
| CLM-004 | `markupRate` 入力意味が CALC-010 estMethod と一貫（CALC-016 markupRate 出力 → estMethod ↔ discountImpact 共有、INV-DI-03） | reviewed | high | - | - | 横断的意味整合 (CALC 間の入出力 markupRate 一貫性) は test 単独で表現不能。INV-DI-03 invariant + CALC-016/010 の出力契約で構造的保証 |

## 5. Migration Plan

- registry: `BIZ-005`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate 化計画なし

## 6. Consumers

- 売変分析 chart / widget
- WaterfallChartWidget（粗利分解の値引き component）

## 7. Co-Change Impact

- `DiscountImpactInput` / `Result` schema 変更 → consumer 修正
- `markupRate` パラメータ変更 → CALC-010 推定法との整合確認必要

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `discountFactPathGuard.test.ts` — 値引き取得経路（RM-004 経由）
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
