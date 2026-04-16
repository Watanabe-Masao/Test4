# Step C 方針 — 時間帯比較レーンの分離

> **Status**: 固定 (2026-04-15)
> **対象**: `unify-period-analysis` Phase 6 Step C (時間帯比較の載せ替え方針)
> **関連**: `inventory/05-phase6-widget-consumers.md` / `HANDOFF.md` §Phase 6

## 要点

> **時間帯比較は `FreePeriodReadModel` を時刻次元まで拡張して吸収しない。
> `ctx.freePeriodLane` の責務と分離した sibling lane (`ctx.timeSlotLane`)
> として扱う。Phase 6 本体の対象からは切り離す。**

## 1. なぜ別レーンにするか

| 観点 | 事実 |
|---|---|
| `FreePeriodReadModel` の現在 surface | `currentRows / comparisonRows` (日×店舗 粒度) + `currentSummary / comparisonSummary` (期間総計) のみ。時刻次元なし |
| 時間帯比較の最小粒度 | `(storeId, hour)` — 日は既に infra 側で集計で畳まれている (`StoreAggregationRow` = `{storeId, hour, amount}`) |
| 意味論 | `FreePeriodReadModel` は「日別期間ファクト」の正本。時刻次元を足すと **時刻なしの日別正本** と **時刻ありの時間帯正本** が同一モデルに同居し、責務が曖昧になる |
| 既存 Screen Plan | `useStoreHourlyChartPlan` (`application/hooks/plans/`) は既に `storeAggregationHandler` 経由で独立 query plan を持っている。freePeriodHandler との関係は 0 |
| Phase 5 との整合 | Chart Input Builder Pattern + Rendering Three-Stage が既に適用されている widget。presentation から見ると追加の「載せ替え」が薄い |

これらを総合すると、時間帯比較を `FreePeriodReadModel` に吸収するのは、契約を
膨らませる代わりに得られる利益が薄く、意味論の責務分離 (D1/D2 原則) を損なう。
**別レーンとして切り分けるのが正しい設計判断**。

## 2. 新契約の形 (type のみ先に固定、実装は後続)

```
ctx.timeSlotLane = {
  frame,                // TimeSlotFrame  (dateRange + storeIds + comparison)
  bundle: {
    currentSeries,      // readonly TimeSlotSeries — 現期間
    comparisonSeries,   // readonly TimeSlotSeries | null — 比較期間
    meta,               // TimeSlotMeta (usedFallback / provenance)
    isLoading, errors, error,
  }
}
```

- 実体: `app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts` (型のみ)
- 責務:
  1. `TimeSlotFrame` が `(dateRange, storeIds, comparison)` を受け取り plan input に変換する
  2. `TimeSlotBundle` が `current / comparison` の 2 series + meta を返す
  3. **presentation は `TimeSlotSeries` のみ触る。`StoreAggregationRow` は import しない**
- 非責務:
  - 日別 raw rows を presentation に露出しない (G3-2 の time-slot 版)
  - Shapley 分解や category 次元は持たない (FreePeriodReadModel の Step B と整合)

## 3. 比較意味論 (time-slot 専用の判断表)

時間帯比較は比較期間の解釈が日別 summary と微妙に異なる。本 phase で先に
固定しておく:

| 項目 | 方針 | 理由 |
|---|---|---|
| `sameDate` 使うか | **Yes** — anchor range と同じ日の前年 time-slot を取る | 既存 StoreHourlyChart の意味論を保持 |
| `sameDayOfWeek` 使うか | **Yes** — FreePeriodReadModel と同じく alignmentMode を尊重する | 比較意味論を freePeriod lane と一致させる (presentation の認知負荷削減) |
| `wow` (week-over-week) を持つか | **No** — 本 lane の初期契約からは外す。必要なら将来の拡張 | 最小契約で start、scope 拡張は別 phase |
| fallback 時の UI | **FreePeriodReadModel と同じ** — `meta.usedFallback=true` の時は badge 表示 + tooltip で理由を説明 | 一貫性 |
| ComparisonScope の扱い | **流用する** — `TimeSlotFrame.comparison: ComparisonScope` として同じ型を受け取る | `ComparisonScope` は domain/models 側の正本。重複定義を作らない |
| 比較先日付の解決 | **`comparisonRangeResolver` 経由** (Phase 2 で固定済み) | presentation / plan hook が独自計算しない。既存 G2 ガードで保証 |
| sourceDate の扱い | `frame.comparison.alignmentMap` をそのまま見る (既存 provenance) | Phase 2b の `ComparisonResolvedRange` 契約と整合 |

## 4. Step C 実装時にやること (本ドキュメントで先に決まっていること)

- **実装場所**: `application/hooks/timeSlot/useTimeSlotBundle.ts` (新設)
- **入力**: `(executor, frame)` — `useFreePeriodAnalysisBundle` と同じ signature
- **内部**: `buildStoreAggregationInput(frame)` → `useQueryWithHandler(executor, storeAggregationHandler, input)` → projection で `TimeSlotSeries` に畳む
- **projection 位置**: application 層 (presentation から `StoreAggregationRow` を見えなくする)
- **ctx 配布**: `useUnifiedWidgetContext` に `timeSlotLane: { frame, bundle }` を追加
- **移行**: `StoreHourlyChartLogic.ts` が `TimeSlotSeries` を消費するように書き換え。`StoreAggregationRow` の presentation 直接 import を 0 に到達させる

## 5. 本 phase で用意する防御 (軽めの guard 1 本)

`app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` を新設。

- 対象: `StoreAggregationRow` の presentation 層 import
- baseline: 1 件 (`presentation/components/charts/StoreHourlyChartLogic.ts`) を allowlist 化
- ratchet-down: 以後増やせない。Step C 実装時に 0 に到達して allowlist 削除
- 目的: 将来的に他の widget が raw time-slot rows を presentation で触るのを防ぐ

> **明確な target**: baseline 1 → 0 (Step C 実装完了時)

## 6. Phase 6 checklist への反映

- Step C は Phase 6 本体の「段階的画面載せ替え」から切り離す
- checklist.md Phase 6 に以下を追記:
  - `[x]` Step C 方針固定 (本ドキュメント)
  - `[ ]` Step C 実装 (Phase 6 後半 or 独立 phase として実施)

## 7. 関連ファイル

| ファイル | 役割 |
|---|---|
| `app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts` | 型契約 (本 commit で新設、実装空) |
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | 軽い防御 (本 commit で新設) |
| `app/src/application/hooks/plans/useStoreHourlyChartPlan.ts` | 既存 Screen Plan (継続利用) |
| `app/src/application/queries/cts/StoreAggregationHandler.ts` | 既存 handler (継続利用) |
| `app/src/presentation/components/charts/StoreHourlyChartLogic.ts` | 現在の raw row consumer (baseline 1 として allowlist 化) |
| `inventory/05-phase6-widget-consumers.md` | Phase 6 棚卸し (本方針の根拠) |
