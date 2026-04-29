---
id: CALC-018
kind: calculation
exportName: computeKpis
sourceRef: app/src/domain/calculations/budgetSimulator.ts
sourceLine: 151
definitionDoc: references/01-principles/budget-definition.md
contractId: ANA-010
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: budget_simulation
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: b4e07fd2c0489afacfe9236bf35c98a6295291ba
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-018 — 予算達成シミュレータ KPI 基盤計算

## 1. 概要

`computeKpis(scenario, currentDay)` は **pure 同期関数** で、月内任意の基準日から **経過 / 残期間 / 着地見込** を試算する analytic-authoritative 計算（ANA-010、budget_simulation family）。`budgetAnalysis.ts`（`prorateBudget` / `projectLinear`）と `utils.ts`（`safeDivide` / `calculateYoYRatio` / `calculateAchievementRate`）の orchestration 層。

## 2. Input Contract

- `SimulatorScenario`（Zod schema: `SimulatorScenarioSchema`）:
  - `year` / `month` / `daysInMonth`: 暦日整合 refine（Gregorian カレンダー一致必須）
  - `monthlyBudget` / `lyMonthly`: 月予算 / 前年実績（非負）
  - `dailyBudget` / `lyDaily` / `actualDaily`: 日次配列（0-indexed = day i+1）
  - `lyCoverageDay`: 前年データ最終有効日（経過日キャップ。`null` = full month）
- `currentDay: number` — 基準日（1-based、`clampDay` で daysInMonth に切り上げ）

## 3. Output Contract

- `SimulatorKpis`:
  - `currentDay` / `daysInMonth` / `remainingDays`
  - `monthlyBudget` / `monthlyYoY`
  - `elapsedBudget` / `elapsedActual` / `elapsedYoY` / `elapsedAchievement`
  - `remBudget` / `remBudgetYoY` / `requiredAchievement` / `requiredYoY`
  - `projectedMonth`（`projectLinear` 結果、d>0 のみ）
- 率は **% 整数**（プロトタイプ命名規約: 100=100%）
- 比較対象 0 のときの YoY / Achievement は `null` を返す（D2 「引数無視再計算禁止」遵守、null 伝播）

## 4. Invariants

- INV-BS-01: `daysInMonth` は year/month の Gregorian 暦と一致（schema refine）
- INV-BS-02: 比較対象 0 → 比率系は `null`（ゼロ除算禁止）
- INV-BS-03: `elapsedBudget + remBudget === monthlyBudget`（prorate との整合）
- INV-BS-04: `lyCoverageDay !== null` のとき `remLY = max(0, lyMonthly - elapsedLY)` でキャップ吸収
- INV-BS-05: 全率は `pct(ratio) = ratio * 100`（小数表現を % 整数表現に統一）

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `SimulatorScenarioSchema.refine` が `daysInMonth === new Date(year, month, 0).getDate()` を強制（Gregorian 暦不整合 = INV-BS-01 違反は Zod parse fail） | tested | high | app/src/domain/calculations/__tests__/budgetSimulator.test.ts | - | - |
| CLM-002 | 比較対象 0 → 比率系（YoY / Achievement）は `null` を返す（D2 ゼロ除算禁止、INV-BS-02、null 伝播） | tested | high | app/src/domain/calculations/__tests__/budgetSimulator.test.ts | - | - |
| CLM-003 | `elapsedBudget + remBudget === monthlyBudget`（prorateBudget との保存則、INV-BS-03、daily-cumulative split で破壊禁止） | tested | high | app/src/domain/calculations/__tests__/budgetSimulator.test.ts | - | - |
| CLM-004 | 率は **% 整数**（`pct(ratio) = ratio * 100`）でプロトタイプ命名規約に統一（INV-BS-05、表現規約変更は全 caller の数値見直し = 互換破壊） | reviewed | medium | - | - | 表現規約 (% 整数 vs ratio) の統一は test より命名規約宣言が一次。INV-BS-05 + caller 全体の数値見直し義務で互換破壊を防御 |

## 5. Migration Plan

- registry: `ANA-010`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate 化計画なし（既存 `budgetAnalysis.ts` 部品の orchestration、独立 WASM 化メリット薄）

## 6. Consumers

- 予算達成シミュレーター widget（`projects/completed/budget-achievement-simulator/`）
- presentation 層は raw 走査せず本 calc の `SimulatorKpis` を VM 経由 mapping（C9）

## 7. Co-Change Impact

- `SimulatorScenario` schema 変更 → caller の readModel / hook 修正必要
- `SimulatorKpis` field 追加削除 → consumer chart / KPI card 修正必要
- 率の表現規約変更（% 整数 → 小数）→ 全 caller の数値見直し（**互換破壊**）
- `prorateBudget` / `projectLinear`（`budgetAnalysis.ts`）変更 → 本 calc の挙動波及

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
