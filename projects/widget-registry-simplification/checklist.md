# checklist — widget-registry-simplification（SP-B）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: ADR-B-001 — 二重 null check 解消

* [x] PR1: `shortcutPatternGuard` を baseline=6 で追加した（registry 行の二重 null check pattern を ratchet-down 検出）
* [x] PR2: registryDuckDBWidgets.tsx 5 件で type narrowing 適用 (`?.isReady` → `.isReady`)
* [x] PR3: registryAnalysisWidgets.tsx 1 件で type narrowing 適用 (全 6 件完了)
* [x] PR4: `shortcutPatternGuard` baseline=0 + fixed mode 化した

## Phase 2: ADR-B-002 — full ctx passthrough を絞り込み props 化

* [x] PR1: `fullCtxPassthroughGuard` を baseline=9 で追加した（`<X ctx={ctx} />` / `<X widgetCtx={ctx} />` 検出）
* [x] PR2 (batch1+2): WaterfallChart / GrossProfitHeatmap / AlertPanel / UnifiedHeatmap / UnifiedStoreHourly (5 件) を Pick<DashboardWidgetContext, ...> に変更
* [x] PR3: Weather / ForecastTools / ConditionSummaryEnhanced (3 件) を Pick 化 + IntegratedSalesChart widgetCtx → widgetContext rename
* [x] PR4: passthrough 0 到達、`fullCtxPassthroughGuard` baseline=0 + fixed mode 化した

## Phase 3: ADR-B-003 — IIFE pattern を readModel selector 抽出

* [x] PR1: `registryInlineLogicGuard` を baseline=3 で追加した（IIFE count 検出）
* [x] PR2: selector 3 本を `application/readModels/customerFact/selectors.ts` に新設した（pure fn + 9 tests）
* [x] PR3: 4 IIFE call site を selector call に置換した（WID-018 + analysis-category-pi + WID-021）
* [x] PR4: `registryInlineLogicGuard` baseline=0 + fixed mode 化した + LEG-009 sunsetCondition 達成

## Phase 4: ADR-B-004 — registry inline JSX 解消（B-003 follow-through）

* [x] PR1: `registryInlineLogicGuard` 拡張で I2 (inline function declaration baseline=1) + I3 (palette refs baseline=4) 検出を追加
* [ ] PR2: helper / default config を純関数 / 定数に抽出した
* [ ] PR3: registry 行を helper call / config 参照に置換した
* [ ] PR4: `registryInlineLogicGuard` baseline=0 + LEG-009 sunsetCondition 達成

## Phase 5: sub-project completion

* [ ] 4 ADR すべての 4 step（新実装 / 移行 / 削除 / guard）が完遂した
* [ ] LEG-009 の `consumerMigrationStatus` が `migrated` に到達した
* [ ] 本 project の 3 guard（shortcutPattern / fullCtxPassthrough / registryInlineLogic）の baseline が 0 に到達した
* [ ] sub-project completion PR（umbrella inquiry/20 §sub-project completion テンプレート 7 step）を実施した
* [ ] 本 project の期間中、umbrella plan.md に載らない破壊的変更を一切行わなかったことを `git log` で確認した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
