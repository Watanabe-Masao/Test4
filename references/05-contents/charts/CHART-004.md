---
id: CHART-004
kind: chart
exportName: CustomerScatterChart
sourceRef: app/src/presentation/components/charts/CustomerScatterChart.tsx
sourceLine: 47
inputBuilder: app/src/presentation/components/charts/CustomerScatterChart.builders.ts
logic: null
viewModel: null
optionBuilder: null
styles: null
states:
  - empty
  - ready
stories: []
visualTests: []
definitionDoc: references/01-principles/customer-definition.md
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

# CHART-004 — 客数×客単価 効率分析

## 1. 概要

`CustomerScatterChart` は **memo 化された React component** で、日次の客数 × 客単価を散布図プロットし、当期 / 前年同期の比較 + クラスタリングで効率パターンを可視化する。WID-017 子（registry で 6 field destructuring）。

## 2. Input Contract

- `daily: StoreDayDailyRow[]` (当期日次)
- `daysInMonth: number`
- `year` / `month`
- `prevYearDaily: PrevYearDailyRow[] | undefined` (前年同期、`prevYear.hasPrevYear` での conditional 転送)

派生 builder（`CustomerScatterChart.builders.ts`）:
- 散布図 input 変換 helper

## 3. Render Model

- 散布図（X: 客数、Y: 客単価、color: 当期/前年）
- RM-005 客数経由ではなく `daily` row の `customerCount` 直接消費（registry 行で 6-field destructuring）
- 前年同期は `hasPrevYear` 判定で render skip 可能

## 4. State Coverage

| state | 振る舞い |
|---|---|
| empty | `daily` 0 件で空散布図 |
| ready | 当期データありで正常描画 |
| loading | 上位 hook で skeleton |
| error | 上位 fallback |

## 5. Visual Evidence

- 現状: visual test 未連携（Phase G で landing 予定）
- Storybook story 未整備

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards |
|---|---|---|---|---|---|
| CLM-001 | RM-005 customerFact ready/fallback 経路と CALC-001 客数 GAP の双方を mapping（chart 内 raw 計算禁止、C9）| reviewed | high | - | - |
| CLM-002 | scatter プロットの x/y 軸は CALC-001 / CALC-002 出力をそのまま使用（B3 chart 側で率再計算禁止）| guarded | high | - | app/src/test/guards/customerGapPathGuard.test.ts |
| CLM-003 | prevYear 不在時 → 当年データのみで scatter 描画（前年比較系列を skip、null 安全）| reviewed | medium | - | - |
| CLM-004 | ChartCard 経由で empty/loading/error 状態通知（chart 内部 error UI 禁止 = H6）| guarded | high | - | app/src/test/guards/topologyGuard.test.ts |

## 6. Consumers

- **WID-017** `analysis-customer-scatter` — 唯一の registry consumer（`{ result: r, daysInMonth, year, month, prevYear }` destructuring）

## 7. Co-Change Impact

- `StoreDayDailyRow` の `customerCount` field 変更 → daily props の修正必要
- `prevYearDaily` 構造変更 → conditional 転送の修正
- RM-005 `customerFact` への移行（現状は `daily.customerCount` 直接消費）→ 取得経路再設計時に影響大

## 8. Guard / Rule References

- `chartInputBuilderGuard.test.ts` — `dateRangeToKeys` 直接呼び出し禁止
- `chartRenderingStructureGuard.test.ts` — chart 内 inline build 禁止
- `customerFactPathGuard.test.ts` — 客数取得経路（本 chart は legacy 経路で permissioned）
- `responsibilityTagGuard.test.ts` — R:component
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
