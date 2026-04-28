---
id: CHART-003
kind: chart
exportName: BudgetVsActualChart
sourceRef: app/src/presentation/components/charts/BudgetVsActualChart.tsx
sourceLine: 60
inputBuilder: app/src/presentation/components/charts/BudgetVsActualChart.builders.ts
logic: null
viewModel: app/src/presentation/components/charts/BudgetVsActualChart.vm.ts
optionBuilder: null
styles: null
states:
  - empty
  - ready
stories: []
visualTests: []
definitionDoc: references/01-principles/budget-definition.md
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: 8be44bc
owner: implementation
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CHART-003 — 予算 vs 実績チャート

## 1. 概要

`BudgetVsActualChart` は **memo 化された React component** で、月予算と実績の累積推移 + 達成率 + 着地予測を表示する。**Chart Input Builder Pattern 完備の reference 実装**（builders + vm を分離保持、chartInputBuilderGuard / chartRenderingStructureGuard の見本）。

## 2. Input Contract

- 予算 / 実績の月次累積データ
- 派生 builder（`BudgetVsActualChart.builders.ts`）: `dateRangeToKeys` 経由の入力構築（直接 import 禁止）
- vm（`BudgetVsActualChart.vm.ts`）: 描画用 view model（`buildBudgetVsActualVM` 等の pure 関数）
- CALC-011 `calculateBudgetAnalysis` の結果を間接消費

## 3. Render Model

- 累積推移 line chart（予算 vs 実績）
- 達成率 / 着地予測のマーカー
- vm.ts で `BudgetVsActualVM` 構造を構築 → component が描画のみ
- 在庫法粗利との二重表示は別 chart に分離（responsibility 分離）

## 4. State Coverage

| state | 振る舞い |
|---|---|
| empty | 入力 0 件で安全な 0 値表示（INV-BUD-01〜04 適用）|
| ready | 全 props そろい正常描画 |
| loading | 上位 hook で skeleton（chart 自体は同期描画）|
| error | 上位 fallback、chart は input 検証後の描画のみ |

## 5. Visual Evidence

- 現状: visual test 未連携（Phase G で landing 予定）
- Storybook story 未整備

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards |
|---|---|---|---|---|---|
| CLM-001 | RM-001 / CALC-011 出力を mapping して累計予算 vs 累計実績を描画（chart 内 raw 計算禁止、C9）| reviewed | high | - | - |
| CLM-002 | budget = 0 のとき達成率 0% 表示（CALC-011 が 0 を返す、null 化禁止で chart 軸破壊回避）| reviewed | medium | - | - |
| CLM-003 | StoreResult 統合経路で予算分析を取得（domain calc B3 経由、SQL 内率算出禁止、CALC-011 wrap）| tested | high | app/src/domain/calculations/budgetAnalysisInvariants.test.ts | - |
| CLM-004 | ChartCard 経由で empty/loading/error 状態通知（chart 内部 error UI 禁止 = H6）| guarded | high | - | app/src/test/guards/topologyGuard.test.ts |

## 6. Consumers

- DailySalesChart「累計推移」ビュー（統合済み）
- Insight ページの予算タブ
- 旧経路: `chart-budget-actual` widget（registry から削除済、DailySalesChart 統合へ）

## 7. Co-Change Impact

- CALC-011 `calculateBudgetAnalysis` 結果 schema 変更 → vm 修正
- `BudgetVsActualChart.vm.ts` の `buildBudgetVsActualVM` signature 変更 → builders / component 双方修正
- 累積推移の数値 schema 変更 → render 全体に影響

## 8. Guard / Rule References

- `chartInputBuilderGuard.test.ts` — Chart Input Builder Pattern の reference 実装として重要
- `chartRenderingStructureGuard.test.ts` — vm 経由描画の reference 実装
- `responsibilityTagGuard.test.ts` — R:component
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
