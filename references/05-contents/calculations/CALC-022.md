---
id: CALC-022
kind: calculation
exportName: calculateSensitivity
sourceRef: app/src/domain/calculations/algorithms/sensitivity.ts
sourceLine: 78
definitionDoc: references/01-principles/authoritative-calculation-definition.md
contractId: ANA-003
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: what_if
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: b2b3be8b34e6f3bcf3c8b7ca75abee2c5d9ea150
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-022 — 感度分析（what-if shock simulation）

## 1. 経過

`calculateSensitivity(base, deltas)` は **pure 同期関数** で、StoreResult 主要指標のベースラインに対して 4 種 delta（割引率 / 客数 / 客単価 / 原価率）を適用し、粗利・売上・予算達成度の変化をシミュレートする analytic-authoritative 計算（ANA-003、what_if family）。同 file の `calculateElasticity` は 1pt 変動あたり粗利変動額（弾性値）、`extractSensitivityBase` は StoreResult から base 抽出のヘルパー。

## 2. Input Contract

- `base: SensitivityBase`（Zod schema: `SensitivityBaseSchema`）— ベースライン:
  - `totalSales` / `totalCost` / `totalDiscount` / `grossSales` / `totalCustomers` / `totalCostInclusion`
  - `averageMarkupRate` / `budget` / `elapsedDays` / `salesDays`
- `deltas: SensitivityDeltas`（Zod schema: `SensitivityDeltasSchema`）— 変動量:
  - `discountRateDelta`（pt 加算）/ `customersDelta`（係数 1+δ で乗算）
  - `transactionValueDelta`（係数 1+δ）/ `costRateDelta`（pt 加算）
- pure 同期。`safeDivide` でゼロ除算回避

## 3. Output Contract

- `SensitivityResult`（Zod schema: `SensitivityResultSchema`）:
  - `baseGrossProfit` / `baseGrossProfitRate` — ベースライン
  - `simulatedGrossProfit` / `simulatedGrossProfitRate` — シミュレート後
  - `grossProfitDelta` / `salesDelta` / `projectedSalesDelta` / `budgetAchievementDelta`
- `calculateElasticity(base)` → `ElasticityResult`（4 種 elasticity）

## 4. Invariants

- INV-SENS-01: `deltas` 全 0 → `simulatedGrossProfit === baseGrossProfit`（pure ID 性）
- INV-SENS-02: `customersDelta` / `transactionValueDelta` は **乗算効果**（売上 = 客数 × 客単価 = `(1+δc) × (1+δt)`）
- INV-SENS-03: `simDiscountRate >= 1` のとき `safeDivide(..., 1 - simDiscountRate, simSales)` で fallback（無限大回避）
- INV-SENS-04: `elapsedDays === 0 ∨ salesDays === 0` → `projectedSalesDelta = 0`（投影不能時の null 安全）
- INV-SENS-05: 弾性値は `(simulatedGrossProfit - baseGrossProfit) / 1pt` の線形近似（局所線形）

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `deltas` 全 0 → `simulatedGrossProfit === baseGrossProfit`（pure ID 性、INV-SENS-01、何もしない刺激は何も変えない） | tested | high | app/src/domain/calculations/sensitivity.test.ts | - | - |
| CLM-002 | `customersDelta` / `transactionValueDelta` は **乗算効果**（売上 = `(1+δc) × (1+δt) × baseSales`、INV-SENS-02、加算誤用禁止） | tested | high | app/src/domain/calculations/sensitivity.test.ts | - | - |
| CLM-003 | `simDiscountRate >= 1` で `safeDivide(..., 1 - simDiscountRate, simSales)` フォールバック（無限大回避、INV-SENS-03） | tested | high | app/src/domain/calculations/sensitivity.test.ts | - | - |
| CLM-004 | candidate (`candidate/algorithms/sensitivity.ts`) との数値同等性 (dual-run observation guard 監視下) | guarded | high | - | app/src/test/observation/sensitivityCandidateObservation.test.ts | - |

## 5. Migration Plan

- registry: `ANA-003`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate file（`candidate/algorithms/sensitivity.ts`）が registry に存在（candidate-authoritative）。Promote Ceremony 着手条件: 数値同等性 invariant 検証 + 既存 callers 全て切替 + dual-run guard exit（**Phase D Step 7+ 以降**）

## 6. Consumers

- 感度分析 widget / KPI（4 種 delta 入力 → 粗利インパクト可視化）
- presentation 層は raw 走査せず本 calc 出力を mapping（C9）

## 7. Co-Change Impact

- `SensitivityBase` / `SensitivityDeltas` schema 変更 → caller hook + UI 入力フォーム修正
- delta 単位変換（pt ↔ %）→ 全 caller の数値見直し（**互換破壊**）
- `safeDivide` 挙動変更 → INV-SENS-03 再評価
- candidate 昇格時 → CALC-022 deprecated + supersedes 後継の Promote Ceremony 1 PR 5 同期

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `sensitivity.test.ts`（既存）— 数値検証 peer test
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
