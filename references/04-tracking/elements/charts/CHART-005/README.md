---
id: CHART-005
kind: chart
exportName: GrossProfitAmountChart
sourceRef: app/src/presentation/components/charts/GrossProfitAmountChart.tsx
sourceLine: 50
inputBuilder: null
logic: app/src/presentation/components/charts/GrossProfitAmountChartLogic.ts
viewModel: null
optionBuilder: null
styles: app/src/presentation/components/charts/GrossProfitAmountChart.styles.ts
states:
  - empty
  - ready
stories: []
visualTests: []
definitionDoc: references/01-foundation/gross-profit-definition.md
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastSourceCommit: db443c4da02705e4b7924933579ee92ebfe527c6
owner: implementation
specVersion: 1
---

# CHART-005 — 粗利推移チャート

## 1. 概要

`GrossProfitAmountChart` は **memo 化された React component** で、日次の粗利金額 + 粗利率トレンド + 予算ライン + 前年比較を表示する。**Logic.ts 経由** で描画用 data 構築（chartRenderingStructureGuard reference 実装、3 chart の 1 つ）。RM-002 `calculateGrossProfit` の結果と CALC-009/010 の在庫法/推定法粗利の可視化。

## 2. Input Contract

- `daily` / `daysInMonth` / `year` / `month`
- `grossProfitBudget`: 予算ライン
- `targetRate` / `warningRate`: 達成判定の閾値
- `prevYearDaily: PrevYearDailyRow[] | undefined` (`prevYear.hasPrevYear` で conditional)
- `prevYearCostMap`: `buildPrevYearCostApprox(ctx.prevYear)` 経由（registry 行で構築）
- `rangeStart` / `rangeEnd` (chartPeriodProps、optional)

派生 logic（`GrossProfitAmountChartLogic.ts`）:
- `buildGrossProfitChartData` — 日次 row → render data 構築 pure 関数
- chart 内 inline `build*Data` 禁止（chartRenderingStructureGuard で強制）

## 3. Render Model

- 棒チャート（粗利金額）+ ライン（粗利率トレンド）+ 予算ライン + 前年比較ライン
- Logic.ts で render data 構築（pure）→ component が描画のみ
- 在庫法と推定法の切替は別 chart（本 chart は statgrossProfit 統合表示）

## 4. State Coverage

| state | 振る舞い |
|---|---|
| empty | 入力 0 件で空 chart（safe 描画）|
| ready | 全 props そろい正常描画 |
| loading | 上位 hook で skeleton |
| error | 上位 fallback |

## 5. Visual Evidence

- 現状: visual test 未連携（Phase G で landing 予定）
- Storybook story 未整備
- Logic.ts は test 化されており（`GrossProfitAmountChartLogic.test.ts` 想定）数値テストは存在

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | CALC-014 `buildPrevYearCostApprox` 出力を chart 入力として mapping（前年近似原価を傾向比較系列に使用、registry 行で wrap） | reviewed | high | - | - | mapping の正しさは CALC-014 出力契約で fail-fast。「前年近似」性質の表明は analytic-authoritative classification で declarative (semanticClassification) |
| CLM-002 | RM-002 calculateGrossProfit 出力を chart 入力として mapping（4 種粗利を ChartInputBuilder で統合、chart 内 raw 計算禁止） | guarded | high | - | app/src/test/guards/grossProfitPathGuard.test.ts | - |
| CLM-003 | logic.ts (純 pure layer) で計算、tsx (presentation) は描画のみ（A3 / C4 描画純粋、Logic test で数値検証） | reviewed | high | - | - | tsx と logic の責務分離は A3 + C4 + presentationIsolationGuard で構造的保証。数値検証は Logic test に委譲済 |
| CLM-004 | ChartCard 経由で empty/loading/error 状態通知（chart 内部 error UI 禁止 = H6） | guarded | high | - | app/src/test/guards/topologyGuard.test.ts | - |

## 6. Consumers

- **WID-003** `chart-gross-profit-amount` — 唯一の registry consumer
- registry 行で `buildPrevYearCostApprox` を inline 呼び出し（`prevYearCostApprox.ts` の registry I3 残留 reference）

## 7. Co-Change Impact

- RM-002 `calculateGrossProfit` 結果型変更 → grossProfitBudget / 粗利金額 props の修正
- CALC-009 / CALC-010 の `inventoryAdjustedGrossProfit` 表示要件変更 → render 修正
- `buildPrevYearCostApprox` signature 変更 → registry 行 + chart props 双方修正
- `GrossProfitAmountChartLogic.ts` の `buildGrossProfitChartData` signature 変更 → component 描画破壊

## 8. Guard / Rule References

- `chartRenderingStructureGuard.test.ts` — Logic 経由描画の reference 実装（baseline 0 fixed mode 達成済）
- `grossProfitPathGuard.test.ts` — 粗利取得経路の唯一性
- `responsibilityTagGuard.test.ts` — R:component
- `presentationIsolationGuard.test.ts` — presentation isolation
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
