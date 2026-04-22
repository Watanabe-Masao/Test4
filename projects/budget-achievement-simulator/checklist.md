# checklist — budget-achievement-simulator (widget reboot)

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` / `* [x]` のみ。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase A: Reboot 文脈の正本化

* [x] `projects/budget-achievement-simulator/AI_CONTEXT.md` を widget 正本の方針に更新した
* [x] `projects/budget-achievement-simulator/plan.md` を widget reboot 方針に更新した
* [x] `projects/budget-achievement-simulator/checklist.md` を widget reboot 方針に更新した
* [x] `projects/budget-achievement-simulator/HANDOFF.md` に page 前提から widget 前提へ変更した旨を追記した
* [x] checklist から `/budget-simulator` / `PAGE_REGISTRY` / `pageComponentMap` 前提の required task を除外または後続扱いへ変更した

## Phase B: UI 契約の固定

* [x] `SimulatorScenario` の widget 用入力契約を再確認し、再利用 / 変更点を記録した
* [x] `app/src/features/budget/application/mockBudgetSimulatorScenario.ts` を作成した
* [x] `BudgetSimulatorWidget` が実データなしで mock scenario を受け取って描画できる
* [x] state と scenario の責務分離を `HANDOFF.md` か `AI_CONTEXT.md` に明記した

## Phase C: 見た目の再移植

* [x] `BudgetSimulatorView.tsx` を作成した
* [x] KPI header を HTML モック準拠の情報設計に揃えた
* [x] 基準日 slider を `BudgetSimulatorView` 配下で mock scenario で動作確認した
* [x] mode switch と mode 別入力 UI を mock scenario で動作確認した
* [x] KPI table / strip / projection / drilldown の主要 UI が mock scenario で描画される
* [x] `app/src/stories/BudgetSimulator.stories.tsx` を reboot 後の構造に追従させた
* [x] empty / month-start / mid-month / month-end の少なくとも 4 story が存在する

## Phase D: state 管理の接続

* [x] `useSimulatorState.ts` を再利用または軽修正して reboot 後の UI に接続した
* [x] `currentDay` の操作が `BudgetSimulatorView` に反映される
* [x] mode 切替が `BudgetSimulatorView` に反映される
* [x] day override の操作が `BudgetSimulatorView` に反映される
* [x] `weekStart` の変更が calendar / table 表示に反映される

## Phase E: source adapter の新設

* [x] `app/src/features/budget/application/buildBudgetSimulatorSource.ts` を作成した
* [x] `app/src/features/budget/application/buildBudgetSimulatorScenario.ts` を作成した
* [x] `app/src/features/budget/application/useBudgetSimulatorWidgetPlan.ts` を作成した
* [x] `BudgetSimulatorView.tsx` から raw context / raw rows / query input 組み立てを除去した
* [x] `BudgetSimulatorWidget.tsx` が `useBudgetSimulatorWidgetPlan.ts` を経由して scenario を取得する

## Phase F: 段階的な実データ接続

* [ ] 月次予算を source adapter から scenario に接続した
* [ ] 日別実績を source adapter から scenario に接続した
* [ ] 前年同月日別を source adapter から scenario に接続した
* [ ] 曜日別集計を source adapter から scenario に接続した
* [ ] 日別 override 反映後の projection が scenario / VM 経由で描画される
* [ ] 主要欠損ケースで widget が空描画やクラッシュを起こさない

## Phase G: widget 組込みの整理

* [ ] `features/budget/index.ts` / `ui/index.ts` の export を reboot 後の構造に追従させた
* [ ] `INSIGHT_WIDGETS` の該当エントリが reboot 後の `BudgetSimulatorWidget` を指す
* [ ] widget 登録後も既存 budget widget 群の import cycle が増えていない
* [ ] widget integration 後に既存 budget 画面で回帰がないことを確認した

## Phase H: テストと仕上げ

* [ ] `BudgetSimulatorWidget.vm.test.ts` が reboot 後の構造で PASS する
* [ ] `useBudgetSimulatorWidgetPlan` または builder 群の unit test を追加した
* [ ] `npm run lint` が PASS する
* [ ] `npm run format:check` が PASS する
* [ ] `npm run test:guards` が PASS する
* [ ] `npm run test:visual` が PASS する
* [ ] `cd app && npm run health:check` が warning なしで通る
* [ ] `cd app && npm run build` が成功する

## 最終レビュー (人間承認)

* [ ] reboot 後の plan / checklist / HANDOFF / 実装差分を人間がレビューし、継続実装または PR 化を承認した
