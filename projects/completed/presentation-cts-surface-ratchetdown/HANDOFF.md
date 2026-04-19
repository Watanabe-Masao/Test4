# HANDOFF — presentation-cts-surface-ratchetdown

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**完了・archive 済み (2026-04-19)。** presentation 層の `CategoryTimeSalesRecord`
直接 import 23 件 (production / test 除外) を 6 commit で baseline 0 に到達。
guard (`categoryLeafDailyLaneSurfaceGuard`) を「追加禁止」固定モードに移行し、
副次として `categoryDailyLaneSurfaceGuard` の YoYWaterfall "permanent floor"
(3/3) も 0 に解消。

alias 解除 (独立構造化) は scope 外。後続 project
`category-leaf-daily-entry-shape-break` に移管し、presentation が raw 型を
**見えない** (alias 経由も触れない) 状態を Option B (flat 独立構造) で実現する。

### 成果サマリ

| Phase | Files | 成果 |
|---|---|---|
| 1 | +guard | `categoryLeafDailyLaneSurfaceGuard` 新設 (baseline 23) |
| 2 batch-1 | 6 | DrilldownWaterfall + CategoryFactor (23→17) |
| 2 batch-2 | 5 | HourlyChart + DayDetail tabs (17→12) |
| 2 batch-3 | 4 | useDrilldown hooks (12→8) |
| 3 | 5 | YoYWaterfall + 階層/PeriodFilter (8→3) |
| 4 | 3 | context/widget 基盤 + Admin (3→0、固定モード移行) |

累積: 23 production ファイル移行 / +361 -149 行 / 全コミットで Hard Gate PASS。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先（Phase 1: guard 新設と初期 baseline）

- `categoryLeafDailyLaneSurfaceGuard.test.ts` を新設
- 参考: `timeSlotLaneSurfaceGuard.test.ts`（同形、baseline 0 到達済み）
- 初期 baseline: 32 件（下記一覧）

### 中優先（Phase 2-N: 段階的置換）

類似 consumer をグループ化し、数件ずつの PR で baseline を減らす。
各 PR で baseline を更新して ratchet-down させる。

### 低優先（Phase Final: 0 到達と guard 永続化）

- baseline 0 到達後、guard を「追加禁止」固定モードに移行
- `CategoryLeafDailyEntry` の独自構造進化を検討する discovery task を起票

## 2.1. 対象 32 ファイル（初期 baseline）

先行 project `category-leaf-daily-series` HANDOFF §2 から転記:

### widget 系（DayDetailModal 直下の 3 consumer + 支援ファイル）

1. `presentation/pages/Dashboard/widgets/HourlyChart.tsx`
2. `presentation/pages/Dashboard/widgets/HourlyChart.builders.ts`
3. `presentation/pages/Dashboard/widgets/HourlyChart.logic.ts`
4. `presentation/pages/Dashboard/widgets/DayDetailHourlyTab.tsx`
5. `presentation/pages/Dashboard/widgets/DayDetailSalesTab.tsx`
6. `presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx`
7. `presentation/pages/Dashboard/widgets/DrilldownWaterfall.builders.ts`
8. `presentation/pages/Dashboard/widgets/CategoryFactorBreakdown.tsx`
9. `presentation/pages/Dashboard/widgets/categoryFactorBreakdownLogic.ts`
10. `presentation/pages/Dashboard/widgets/categoryFactorUtils.ts`
11. `presentation/pages/Dashboard/widgets/drilldownUtils.ts`
12. `presentation/pages/Dashboard/widgets/useDrilldownData.ts`
13. `presentation/pages/Dashboard/widgets/useDrilldownDataLogic.ts`
14. `presentation/pages/Dashboard/widgets/useDrilldownRecords.ts`
15. `presentation/pages/Dashboard/widgets/useDrilldownRecordsBuilders.ts`

### YoYWaterfall 系（dashboard の別 widget）

16. `presentation/pages/Dashboard/widgets/YoYWaterfallChart.builders.ts`
17. `presentation/pages/Dashboard/widgets/YoYWaterfallChart.data.ts`

### 階層・フィルタ系

18. `presentation/components/charts/categoryHierarchyHooks.ts`
19. `presentation/components/charts/periodFilterHooks.ts`
20. `presentation/components/charts/useHierarchyDropdown.ts`

### context / widget 基盤

21. `presentation/components/widgets/types.ts`
22. `presentation/hooks/useUnifiedWidgetContext.ts`

### Admin

23. `presentation/pages/Admin/RawDataTabBuilders.ts`

### test ファイル群（ratchet-down の対象外にする選択肢あり）

24. `presentation/components/charts/__tests__/PeriodFilter.test.ts`
25. `presentation/pages/Dashboard/widgets/__tests__/categoryFactorBreakdownLogic.test.ts`
26. `presentation/pages/Dashboard/widgets/__tests__/categoryFactorUtils.test.ts`
27. `presentation/pages/Dashboard/widgets/__tests__/drilldownUtils.test.ts`
28. `presentation/pages/Dashboard/widgets/__tests__/DrilldownWaterfall.builders.test.ts`
29. `presentation/pages/Dashboard/widgets/__tests__/HourlyChart.logic.test.ts`
30. `presentation/pages/Dashboard/widgets/__tests__/waterfallBuildersBatch.test.ts`
31. `presentation/pages/Dashboard/widgets/__tests__/YoYWaterfallChart.data.test.ts`
32. `presentation/pages/Dashboard/widgets/__tests__/YoYWaterfallChart.vm.test.ts`

> **note**: test ファイルは fixture 作成のため raw 型を使うのが自然な場合がある。
> `categoryLeafDailyLaneSurfaceGuard` の allowlist 設計時に「test を除外する」
> オプションを検討する（`timeSlotLaneSurfaceGuard` は test ファイルを除外している）。
> そうすると初期 baseline は 23 件になる。

## 3. ハマりポイント

### 3.1. `CategoryLeafDailyEntry` は現状 alias のため型挙動は不変

`CategoryLeafDailyEntry = CategoryTimeSalesRecord` という同型 alias のため、
型参照を置換しても TypeScript 上の型チェックは変わらない。違いは「どのモジュールから
import するか」だけ。動作への影響はない。

### 3.2. test ファイルの扱い

`timeSlotLaneSurfaceGuard` は test ファイルを allowlist に入れず、最初から除外
している。本 guard も同様の policy にすると対象が 23 件に減り、現実的な
ratchet-down が可能。

### 3.3. fixture の型参照

fixture を `CategoryLeafDailyEntry` で書いても現状は同型のため問題なし。ただし
fixture に `totalAmount` 等の詳細フィールドを直接書く箇所では、将来 entry が
独自構造に進化したとき fixture も書き直しが必要になる。

### 3.4. ratchet-down の粒度

1 PR あたり 3〜5 ファイル程度が扱いやすい。完了まで概ね 7〜10 PR を想定。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | `CategoryLeafDailyEntry` 定義元 |
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | 参考実装 |
| `projects/completed/category-leaf-daily-series/HANDOFF.md` | 先行 project |
| `projects/category-leaf-daily-entry-shape-break/HANDOFF.md` | 後続 project (alias 解除 / 独立構造化) |

Archived: 2026-04-19
