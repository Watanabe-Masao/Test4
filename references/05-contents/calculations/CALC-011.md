---
id: CALC-011
kind: calculation
exportName: calculateBudgetAnalysis
sourceRef: app/src/domain/calculations/budgetAnalysis.ts
sourceLine: 105
definitionDoc: references/01-principles/budget-definition.md
contractId: BIZ-003
semanticClass: business
authorityKind: business-authoritative
methodFamily: budget
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: c0a56f3
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-011 — 予算分析計算

## 1. 概要

`calculateBudgetAnalysis(input)` は **pure 同期関数** で、月予算 / 当月実績 / 経過日数から **予算達成率** + **進捗状況** + **着地予測**を統合した `BudgetAnalysisResult` を返す予算分析正本（`budget-definition.md` 準拠、StoreResult に統合済み）。

## 2. Input Contract

- `BudgetAnalysisInput`:
  - `monthlyBudget`: 月予算合計
  - `actualSoFar`: 当月実績累計
  - `daysElapsed`: 経過日数
  - `daysInMonth`: 月総日数
- 派生 export（同 module）:
  - `prorateBudget(monthlyBudget, days)` (line 32) — 月予算の按分 helper

## 3. Output Contract

`BudgetAnalysisResult`:

- `achievementRate`: 進捗率 = `actualSoFar / monthlyBudget`
- `expectedRate`: 期待進捗率 = `daysElapsed / daysInMonth`
- `achievementDelta`: `achievementRate - expectedRate`（プラスは budget pace 超過）
- `requiredDailyRate`: 残予算必要達成率（CALC-006 と同一の計算意味、本 calc 内では補助計算）
- `landingForecast`: 当月着地予測 = `actualSoFar / daysElapsed * daysInMonth`
- `rateOwnership: engine`

## 4. Invariants

- INV-BUD-01: `achievementRate = actualSoFar / monthlyBudget`、`monthlyBudget=0` で 0
- INV-BUD-02: `expectedRate = daysElapsed / daysInMonth`、`daysInMonth=0` で 0
- INV-BUD-03: `landingForecast` の安全動作: `daysElapsed=0` → 0
- INV-BUD-04: 入力 pure number → 出力 finite

詳細: `budget-definition.md`、`budgetAnalysisInvariants.test.ts`

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards |
|---|---|---|---|---|---|
| CLM-001 | `budget = 0` で `budgetAchievementRate = safeDivide(..., 0, 0) = 0`（ゼロ除算回避、達成率 null 化禁止で 0 統一）| tested | high | app/src/domain/calculations/budgetAnalysisInvariants.test.ts | - |
| CLM-002 | `budgetProgressGap = budgetProgressRate − budgetElapsedRate`（消化率 − 経過率、正 = 前倒し / 負 = 遅れ）| tested | high | app/src/domain/calculations/budgetAnalysis.test.ts | - |
| CLM-003 | `projectedSales = totalSales + averageDailySales × remainingDays`（線形外挿、分母と乗数は同一基準で `remainingDays > 0` のみ requiredDailySales 計算）| tested | high | app/src/domain/calculations/budgetAnalysis.test.ts | - |
| CLM-004 | budget WASM bridge 経路との数値同等性（dual-run observation guard 監視下、StoreResult 統合経路）| guarded | high | - | app/src/test/observation/budgetAnalysisObservation.test.ts |

## 5. Migration Plan

- registry: `BIZ-003`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- WASM: `wasm/budget-analysis/` で WASM bridge 稼働中
- 本 calc は domain math layer、StoreResult が統合済み（独立 readModel なし）
- candidate 化計画: 現状なし
- **CALC-006 との関係**: `requiredDailyRate` の計算は `calculateRemainingBudgetRate`（CALC-006）と同一意味だが、本 calc は予算分析の統合 wrapper、CALC-006 は単独 helper。consumer は用途に応じて使い分ける

## 6. Consumers

- `WID-001 widget-budget-achievement`（店別予算達成状況）
- `BudgetSimulatorWidget`（予算シミュレーション）
- `WID-032 insight-budget`（Insight ページの予算タブ）
- `useUnifiedWidgetContext` の `targetRate` / `warningRate` 判定
- StoreResult 経由で全 widget に配布

## 7. Co-Change Impact

- `BudgetAnalysisInput` field 変更 → 全 consumer の入力構築修正
- `BudgetAnalysisResult` field 追加 → consumer の field アクセス追加可能（追加は OK、削除は破壊）
- `prorateBudget` signature 変更 → 期間予算計算の意味変化（INV-FPB-03 整合確認、RM-008 と協調）
- `requiredDailyRate` の式変更 → CALC-006 との重複計算整合確認

## 8. Guard / Rule References

- `budgetAnalysisInvariants.test.ts` — INV-BUD-* 不変条件
- `calculationCanonGuard.test.ts` — registry での `budgetAnalysis.ts` 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
