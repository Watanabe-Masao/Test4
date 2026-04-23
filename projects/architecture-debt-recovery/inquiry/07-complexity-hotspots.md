# inquiry/07 — 複雑性 hotspot 棚卸し

> 役割: Phase 1 inquiry 成果物 #7。行数 / useMemo 数 / ctx touch 数 / 責務タグ の hotspot + Budget Simulator reboot で残された 7 件の cleanup を事実として記録する。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。Phase 2 以降で追加情報が判明しても書き換えず、`07a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `0813d04`（inquiry/05 push 直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `architectureRules.ts` 系の baseline、`allowlists/`、`architecture-health.json`、Budget Simulator reboot 後の残留項目、inquiry/01-06 の集計 |

## A. 複雑性 hotspot top 10（architecture-state-snapshot より）

`architecture-state-snapshot.json §complexityHotspots`（採取日時点で 10 件登録）。3 指標（memoCount / stateCount / lineCount）を併記。

| # | file | memo | state | lines |
|---|---|---|---|---|
| 1 | `presentation/pages/Dashboard/widgets/HourlyChart.tsx` | 9 | 6 | 495 |
| 2 | `presentation/components/charts/TimeSlotChart.tsx` | 8 | 6 | 216 |
| 3 | `presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx` | 7 | 7 | **532** |
| 4 | `presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx` | 9 | 5 | 448 |
| 5 | `presentation/pages/Weather/WeatherPage.tsx` | 9 | 5 | 411 |
| 6 | `presentation/pages/Insight/useInsightData.ts` | 5 | 7 | 226 |
| 7 | `application/hooks/useMetricBreakdown.ts` | 7 | 5 | 282 |
| 8 | `presentation/hooks/useUnifiedWidgetContext.ts` | 8 | 3 | 347 |
| 9 | `presentation/pages/Dashboard/widgets/DayDetailModal.tsx` | 7 | 4 | 345 |
| 10 | `application/hooks/plans/useDayDetailPlan.ts` | **11** | 0 | 196 |

事実（観察）:

- **最大 lineCount**: `ConditionSummaryEnhanced.tsx`（532 行、WID-001 の子 component）
- **最大 memoCount**: `useDayDetailPlan.ts`（11、P8 制約 ≤ 12 に対し余裕 1）
- **memo + state 合計最大**: `ConditionSummaryEnhanced.tsx`（14）
- **Dashboard widgets 配下**: 5 件（HourlyChart / ConditionSummaryEnhanced / YoYWaterfallChart / DayDetailModal + TimeSlotChart は `components/charts/` 配下で除外）
- **page / hook 配下**: 5 件（useInsightData / useMetricBreakdown / useUnifiedWidgetContext / useDayDetailPlan / WeatherPage）

`complexity.hotspot.count` KPI: **10 / budget 10（OK）**。budget に達しており、これ以上の追加は境界突破。

## B. 関連 KPI（architecture-health.json より）

| KPI id | value | budget | status |
|---|---|---|---|
| `complexity.hotspot.count` | 10 | 10 | OK（境界ジャスト） |
| `complexity.nearLimit.count` | 0 | 5 | OK |
| `complexity.vm.count` | 27 | 30 | OK |
| `allowlist.total` | 13 | 20 | OK |
| `allowlist.active.count` | 6 | 10 | OK |
| `allowlist.frozen.nonZero` | 0 | 0 | OK（frozen は全て 0） |
| `compat.bridge.count` | 0 | 3 | OK |
| `compat.reexport.count` | 2 | 3 | OK |
| `boundary.presentationToInfra` | 0 | 0 | OK |

## C. ctx touch 数 hotspot（inquiry/02 §A-3 より再掲）

| 順位 | WID | widget id | 直接 touch 数 |
|---|---|---|---|
| 1 | WID-002 | chart-daily-sales | **17** |
| 2 | WID-018 | analysis-performance-index | 13 |
| 3 | WID-040 | costdetail-kpi-summary | 10（全て `costDetailData.*` sub-field）|
| 4 | WID-003 | chart-gross-profit-amount | 9 |
| 5 | WID-031 | daily-chart-shapley | 7 |

事実: 直接 touch 数の分布は偏っている（上位 5 が 9-17、残り 40 widget は 0-6）。

## D. 責務タグ不一致 / 未分類

`responsibilityTagGuard.test.ts` の baseline（CLAUDE.md の C9 / R 節より）:

| 指標 | baseline | 性質 |
|---|---|---|
| 未分類 | 400 | ratchet-down（減少のみ許可。減ったら baseline 更新を促す） |
| タグ不一致 | 51 | ratchet-down（同上） |

事実: 未分類 400 / タグ不一致 51 の状態で baseline 管理中。ratchet-down で単調減少する運用。

## E. Budget Simulator reboot の残留項目（informed-by）

`projects/budget-achievement-simulator/AI_CONTEXT.md` および本 project `AI_CONTEXT.md` の informed-by 節より、Budget Simulator reboot から継承された findings:

1. 2 つの `WidgetDef` 型並存（型 A / 型 B、詳細は inquiry/04）
2. `UnifiedWidgetContext` の universal ctx / page-coupled ctx 非対称（`InsightData` / `costDetailData` / `selectedResults` の page-local optional 配置）
3. registry 未登録 UI component の機械検出仕組み不在（inquiry/03 で orphan 3 件を手動検出）
4. widget 登録の 2 registry 系統分岐（Dashboard sub 5 + page-level 5 + 合成 2）
5. pure 関数が hook / component に埋没し `domain/calculations/` に昇格していない（inquiry/05 で 95 候補を検出）
6. `features/*/ui/widgets.tsx` 3 ファイルの byte-identical 複製（inquiry/01 §特殊）
7. G5 サイズ超過 3 ファイル（`ConditionSummaryEnhanced` 532 / `ConditionSummaryEnhanced.styles` 888 / `ConditionSummaryEnhanced.vm` 行数未計測）、DOW 重複 5 箇所 等の cleanup 項目が baseline に積まれたまま（本台帳 §A の 10 hotspot に重なる部分あり）

事実: 7 項目は Phase 1 inquiry/01-06 で表面化した事実と重なるものが多く、本 project でまとめて扱う前提。

## F. ambiguity / 未追跡項目

### F-1. hotspot 選定閾値

`complexityHotspots` への登録閾値は `tools/architecture-health/src/` の collector 側で定義（本台帳では未走査）。memo / state / lines の閾値は snapshot ファイル上に表示されていないため、上位 10 件が全てなのか、閾値超過のみなのかは本台帳で未確認。

### F-2. 複合指標の重み

「memoCount が高い」「lineCount が長い」「stateCount が多い」の 3 軸で順位が変わる。本台帳では全 3 指標を併記し順位は付けない（上記 #1-10 は snapshot の出現順）。

### F-3. ctx touch 数と複雑度の相関

ctx touch 最大の WID-002（17 touch）は hotspot 表には出現しない（子 `IntegratedSalesChart` の実装側に複雑性が集約されている可能性）。registry 行の touch 数と子 component の memo/state/lines は別指標。

### F-4. G5 サイズ超過 3 ファイル（Budget reboot）

WSS pilot 時点（WID-001 Section 8）で `sizeGuard.test.ts` が ConditionSummaryEnhanced ファミリのサイズを監視している事実のみを確認。具体的な超過 3 ファイル（`ConditionSummaryEnhanced.tsx` / `.styles.ts` / `.vm.ts`）の行数正本は `tools/architecture-health/src/config/` の size baseline に記載されるが、本台帳では未走査。

### F-5. DOW 重複 5 箇所

「DOW 重複 5 箇所」の具体的な場所列挙は本 Phase 1 では未実施。`inquiry/05` で曜日計算系の pure 候補（`DowAverageRow` / `DrillCalendar` の dow aggregation / `useDowGapAnalysis` 等）は検出されているが、5 箇所の確定 list は Phase 4 改修計画で整理する想定。

## 付記

- 本台帳は immutable。Phase 2 以降の追加情報は `07a-*.md` として addend する
- 関連: `inquiry/01-06`、`references/02-status/generated/architecture-health.json`、`references/02-status/generated/architecture-state-snapshot.json`
