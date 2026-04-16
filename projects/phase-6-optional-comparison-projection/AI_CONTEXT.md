# AI_CONTEXT — phase-6-optional-comparison-projection

> 役割: project の why / what / what-not / 背景を示す不変寄りの文書。新規参加者が最初に読んで目的を掴み、どの文書に進むべきかを判断する起点。
>
> **Parent**: `unify-period-analysis` (Phase 6 optional)
> **Status**: active (2026-04-16)
> **Read order**: AI_CONTEXT.md → plan.md → checklist.md → HANDOFF.md

## Why (1 行)

**`comparison` feature が UI 状態型 `PeriodSelection` を source of truth に
している構造をやめる。** 比較サブシステムが月次意味論を UI state に
引きずられるのを切り、最小契約 (`ComparisonProjectionContext`) に閉じ込める。

## What (何をするか)

1. `buildKpiProjection` から `PeriodSelection` 依存を外す
2. `useComparisonModule` の core 経路を `PeriodSelection` 非依存にする
3. `sameDate` / `sameDow` / `monthlyTotal` / `dowGap` の parity を保持
4. caller 互換を壊さない (旧 signature は wrapper 温存)

## What-not (やらないこと)

- `storeDailyLane` / `categoryDailyLane` / `timeSlotLane` への touch
- `CategoryLeafDailySeries` 等の leaf-grain contract 検討
- Step B permanent floor の解消
- `UnifiedWidgetContext` の新規 field 追加
- widget 表示ロジックの再設計
- `PeriodSelection` store 自体の改変 (UI 状態は影響範囲外)
- 全 caller 一斉移行 (optional phase なので primary path のみ)

## 親 project との関係

親 `unify-period-analysis` は Phase 6 / Phase 6.5 全 step クローズ済み
(PR #1039 / PR #1040)。`HANDOFF.md` の「高優先」に **Phase 6 optional**
1 項目だけが残っている状態で、本サブ project がその 1 項目を閉じる。

親 project が定義した 2 系統の **permanent floor** は本 phase では動かさない:
- `storeDailyLaneSurfaceGuard` baseline = 1 (`computeEstimatedInventory`)
- `categoryDailyLaneSurfaceGuard` baseline = 6 (Shapley 5-factor leaf-grain)

## 背景 — なぜ optional として切り出すか

Phase 6 / Phase 6.5 の実装は UI 側 (widget / ctx / lane) の責務境界を
整理する作業だった。一方、本 phase は feature 層の **内部** 責務境界の
整理であり、UI には波及しない。そのため:

- 親 project のメインフローとは独立して進められる
- 実装しなくても Phase 6 全体の品質は維持される (だから optional)
- だが比較系の今後の改修では source of truth が UI state にあると障害になる

サブ project として独立管理することで、親 project の「閉じた」状態を
汚さずに、本 phase 単独のライフサイクル (active → archived) を回せる。

## 到達目標

Done 条件の詳細は `plan.md §2` と `checklist.md` を参照。要約:

- ✅ `comparisonProjections.ts` から `PeriodSelection` import が消える
- ✅ `buildKpiProjection` が最小 contract を受ける
- ✅ `useComparisonModuleCore` が存在し `periodSelection` を受け取らない
- ✅ parity test 全通 (`sameDate` / `sameDow` / `monthlyTotal` / `dowOffset` / `dowGap`)
- ✅ `useComparisonModuleLegacyCallerGuard` baseline 0 維持
- ✅ 親 project `HANDOFF.md` の Phase 6 optional が完了済みに移せる状態

## 主な関連ファイル

| パス | 役割 |
|---|---|
| `app/src/features/comparison/application/comparisonProjections.ts` | Phase O4 で `PeriodSelection` import 削除 |
| `app/src/features/comparison/application/hooks/useComparisonModule.ts` | Phase O5 で core/wrapper 二層化 |
| (新設) `app/src/features/comparison/application/ComparisonProjectionContext.ts` | Phase O1 で型契約 |
| (新設) `app/src/features/comparison/application/buildComparisonProjectionContext.ts` | Phase O2 で pure builder |
| (新設) `app/src/features/comparison/application/__tests__/buildKpiProjection.parity.test.ts` | Phase O3 で parity |
| `app/src/presentation/hooks/slices/useComparisonSlice.ts` | Phase O6 で primary caller 移行 |
| `app/src/application/hooks/usePageComparisonModule.ts` | wrapper 経由のまま温存 |

## 非目標の再確認

本 phase は **hook の行数削減ではない**。`useComparisonModule` が短くなる
のは副産物であり、目的は比較サブシステムの source of truth を UI 状態型
から最小契約型に落とし直すことにある。

成功の指標:
- `comparisonProjections.ts` が `PeriodSelection` を import しない
- parity test が全 green
- caller 互換が壊れない

失敗しても無害な指標 (気にしなくて良い):
- hook の行数
- wrapper の存在の有無

## 参照

- 親 project `HANDOFF.md` §Phase 6 optional
- 親 project `inventory/05-phase6-widget-consumers.md` (Phase 6 全景 + permanent floor 記録)
- `app/src/features/comparison/application/hooks/useComparisonModule.ts` (現行実装)
- `app/src/features/comparison/application/comparisonProjections.ts` (現行 `buildKpiProjection`)
