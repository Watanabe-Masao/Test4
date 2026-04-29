---
id: CALC-006
kind: calculation
exportName: calculateRemainingBudgetRate
sourceRef: app/src/domain/calculations/remainingBudgetRate.ts
sourceLine: 43
definitionDoc: references/01-principles/budget-definition.md
contractId: BIZ-008
semanticClass: business
authorityKind: business-authoritative
methodFamily: budget
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

# CALC-006 — 残予算必要達成率計算

## 1. 概要

`calculateRemainingBudgetRate(input)` は **pure 同期関数** で、予算 / 当月実績 / 残日数から **残期間で必要となる 1 日あたり達成率**を返す（`budget-definition.md` 準拠）。「あと N 日でこのペースが必要」という業務指標の正本。

## 2. Input Contract

- `RemainingBudgetRateInput`（Zod schema: `RemainingBudgetRateInputSchema`）:
  - `budget`: 月予算（合計）
  - `actualSoFar`: 当月の実績累計（売上等）
  - `daysElapsed`: 経過日数
  - `daysInMonth`: その月の総日数
- 残予算 = `budget - actualSoFar`、残日数 = `daysInMonth - daysElapsed`

## 3. Output Contract

`number`（達成率を返す pure 数値、`rateOwnership: engine`）:

- `(budget - actualSoFar) / (daysInMonth - daysElapsed)` の 1 日あたり必要金額
- 残日数 0 → 0 を返す（除算回避）
- 残予算 ≤ 0 → 0 を返す（既達成）

## 4. Invariants

- INV-RBR-01: 残日数 0 のとき結果は 0（除算回避）
- INV-RBR-02: 残予算 ≤ 0（既達成）のとき結果は 0
- INV-RBR-03: `rateOwnership: engine` — UI/VM/SQL で再計算しない、本 calc のみが正本
- INV-RBR-04: 入力が pure number → 出力は finite

詳細: `budget-definition.md` §「残予算達成率」

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `remainingPeriodBudget = 0` で `safeDivide` が 0 を返しゼロ除算回避（INV-RBR-01） | tested | high | app/src/domain/calculations/__tests__/remainingBudgetRate.test.ts | - | - |
| CLM-002 | 結果は **% 値**（100 = 計画通り、>100 = 巻き返し必要、<100 = 余裕） | tested | medium | app/src/domain/calculations/__tests__/remainingBudgetRate.test.ts | - | - |
| CLM-003 | Zod `RemainingBudgetRateInputSchema` で input fail-fast（汚染データ流入禁止） | tested | medium | app/src/domain/calculations/__tests__/remainingBudgetRate.test.ts | - | - |
| CLM-004 | `rateOwnership: engine` 不変 — UI/VM/SQL での率再計算は禁止（INV-RBR-03） | guarded | high | - | app/src/test/guards/piValuePathGuard.test.ts | - |

## 5. Migration Plan

- registry: `BIZ-008`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- **WASM 候補**: `wasm/remaining-budget-rate/`（`migrationTier: tier1`、`candidate-authoritative`）
- 候補が landed したら CALC-NNN として spec 化、本 spec に `replacedBy` + 候補側に `supersedes: CALC-006` を記録

## 6. Consumers

- `WID-001 widget-budget-achievement`（店別予算達成状況の予測ペース表示）
- `BudgetSimulatorWidget` (`WID-033` 経由) — 残ペース from / to シミュレーション
- `useUnifiedWidgetContext` の `targetRate` / `warningRate` と協調

## 7. Co-Change Impact

- `RemainingBudgetRateInput` schema 変更 → consumer の Zod parse 修正
- `daysInMonth` の意味（月暦 vs 営業日）変更 → 全 budget 計算経路の見直し
- `rateOwnership: engine` 不変 — UI 側で `(budget - actual) / remainingDays` を再計算したら違反
- WASM bridge landing 時の input layout 変更 → TS fallback との同値性検証必要

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry での `remainingBudgetRate.ts` 分類整合
- `budgetAnalysisInvariants.test.ts` — 関連 invariant test 群
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
