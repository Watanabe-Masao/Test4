---
id: CALC-019
kind: calculation
exportName: aggregateDowAverages
sourceRef: app/src/domain/calculations/budgetSimulatorAggregations.ts
sourceLine: 45
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
lastSourceCommit: b4e07fd2c0489afacfe9236bf35c98a6295291ba
owner: architecture
specVersion: 1
---

# CALC-019 — 予算シミュレータ ドリルダウン集計（曜日別 / 週別）

## 1. 概要

`aggregateDowAverages(scenario, rangeStart?, rangeEnd?)` は **pure 同期関数** で、`SimulatorScenario` の `dailyBudget` / `actualDaily` / `lyDaily` を **曜日別** に集計する analytic-authoritative 計算（ANA-010、budget_simulation family、CALC-018 と協調）。同 file の `aggregateWeeks` は週別集計の peer 関数。`budgetSimulator.ts` のサイズ制限（G5）対応で分離された。

## 2. Input Contract

- `scenario: SimulatorScenario`（CALC-018 と共有、`dowOf` 経由で年月から曜日決定）
- `rangeStart: number = 1`（1-based inclusive、省略時 = 月初）
- `rangeEnd: number = scenario.daysInMonth`（1-based inclusive、省略時 = 月末）
- pure 同期。`Math.max(1, rangeStart)` で下限クランプ

## 3. Output Contract

- `aggregateDowAverages` → `readonly DowAggregation[]`:
  - `dow`（0=日 … 6=土）/ `label`（DOW_LABELS_JP）
  - `count`: 当該曜日の出現日数
  - `budgetTotal` / `actualTotal` / `lyTotal`
  - `budgetAvg` / `actualAvg` / `lyAvg`（count で除）
- `aggregateWeeks` → `readonly WeekAggregation[]`:
  - `weekIndex`（0-based）/ `startDay` / `endDay`（1-based inclusive）
  - `budgetTotal` / `actualTotal` / `lyTotal`
  - `achievement`: `actual / budget * 100`（budget=0 → `null`）

## 4. Invariants

- INV-BSA-01: 曜日 7 行（曜日 0-6）順序固定（dow asc）
- INV-BSA-02: `count === 0` のとき `*Avg = 0`（`safeDivide` 同等の null 安全挙動、ゼロ除算禁止）
- INV-BSA-03: `aggregateWeeks` の week 区切りは月内日次配列の 7 日刻み（`startDay = weekIndex*7+1`）
- INV-BSA-04: `achievement === null` ⇔ `budgetTotal === 0`（ゼロ除算 = null 伝播、D2 遵守）

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `aggregateDowAverages` は曜日 0-6 順固定で 7 行を返す（INV-BSA-01、欠損曜日も 0 行で出力、出現順スワップ禁止） | tested | high | app/src/domain/calculations/__tests__/budgetSimulator.test.ts | - | - |
| CLM-002 | `count === 0` のとき `*Avg = 0`（INV-BSA-02、`safeDivide` 同等のゼロ除算回避、null 化禁止で 0 統一） | tested | high | app/src/domain/calculations/__tests__/budgetSimulator.test.ts | - | - |
| CLM-003 | `aggregateWeeks` 区切りは `startDay = weekIndex*7+1` の 7 日刻み（INV-BSA-03、月末週は短くなりうる） | tested | medium | app/src/domain/calculations/__tests__/budgetSimulator.test.ts | - | - |
| CLM-004 | `achievement = null ⇔ budgetTotal = 0`（INV-BSA-04、null 伝播。budgetTotal>0 で actual=0 → 0% を返却、null 化禁止） | tested | high | app/src/domain/calculations/__tests__/budgetSimulator.test.ts | - | - |

## 5. Migration Plan

- registry: `ANA-010`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate 化計画なし（CALC-018 と協調、独立 WASM 化メリット薄）

## 6. Consumers

- 予算達成シミュレーター widget の曜日別 / 週別 drill-down chart
- presentation 層は raw 走査せず本 calc の集計結果を mapping（C9）

## 7. Co-Change Impact

- `SimulatorScenario` 型変更 → CALC-018 / 本 calc 双方の wrapper 修正
- `DowAggregation` / `WeekAggregation` field 変更 → drill-down chart の VM 修正
- `dowOf` / DOW_LABELS_JP 変更 → 曜日マッピング全体の整合性再評価

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
