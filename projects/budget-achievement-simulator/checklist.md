# checklist — budget-achievement-simulator

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: プロトタイプ持ち込み & project 文脈作成

* [x] `projects/budget-achievement-simulator/AI_CONTEXT.md` を作成した
* [x] `projects/budget-achievement-simulator/HANDOFF.md` を作成した
* [x] `projects/budget-achievement-simulator/plan.md` を作成した
* [x] `projects/budget-achievement-simulator/checklist.md` を作成した
* [x] `projects/budget-achievement-simulator/config/project.json` を作成した
* [x] `projects/budget-achievement-simulator/aag/execution-overlay.ts` を作成した
* [ ] `cd app && npm run docs:generate` を実行し、project-health に本 project が現れることを確認した
* [ ] 本 PR（Phase 0）を人間がレビューし、Phase 1 への進行を承認した

## Phase 1: Pure 計算 Domain 層

* [x] `app/src/domain/calculations/budgetSimulator.ts` を作成し、KPI 計算関数を実装した
* [x] `app/src/domain/calculations/__tests__/budgetSimulator.test.ts` を作成し、不変条件テストが PASS する
* [x] `calculationCanonRegistry` に新規 pure 関数を `semanticClass` 付きで登録した
* [x] `npm run lint` / `npm run format:check` が PASS する
* [x] `npm run test:guards` が PASS する

## Phase 2: Application 層（ViewModel / Hooks）

> **配置変更** (ユーザー方針): 新規 feature 作成 → **既存 `features/budget/` 内 widget embed**。
> ファイル名は widget プレフィックス。

* [x] `app/src/features/budget/application/useSimulatorState.ts` を実装した
* [x] `app/src/features/budget/application/useSimulatorScenario.ts` を実装した
* [x] `app/src/features/budget/ui/BudgetSimulatorWidget.vm.ts` を実装した
* [x] `BudgetSimulatorWidget.vm.test.ts` と hook テスト (useSimulatorScenario / useSimulatorState) が PASS する
* [x] localStorage のキーが `shiire-arari-budget-simulator-*` プレフィックスに統一されている（既存 `shiire-arari-*` 命名規約に準拠）

## Phase 3: Presentation 層（ページ + サブコンポーネント）

* [ ] `BudgetSimulatorPage.tsx` を実装した
* [ ] `TimelineSlider.tsx` を実装した
* [ ] `KpiTable.tsx` を実装した
* [ ] `RemainingInputPanel.tsx`（④入力部・3 モードトグル）を実装した
* [ ] `DayCalendarInput.tsx`（曜日別継承 + 日別上書き）を実装した
* [ ] `DrilldownPanel.tsx`（週別・曜日別・日別カレンダー・日別棒グラフ）を実装した
* [ ] `ProjectionBarChart.tsx` / `DailyBarChart.tsx` / `DrillCalendar.tsx` / `StripChart.tsx` を実装した
* [ ] `features/budget-simulator/index.ts`（public API）と `manifest.ts`（ownership）を作成した
* [ ] styled-components の `*.styles.ts` を分離し、デザイントークン経由で色・間隔を指定した
* [ ] `app/src/stories/BudgetSimulator.stories.tsx` を追加した
* [ ] `npm run test:visual`（visual regression）が PASS する

## Phase 4: 組込み（PAGE_REGISTRY / Nav / routes）

* [ ] `domain/models/PageMeta.ts` の ViewType に `budget-simulator` を追加した
* [ ] `application/navigation/pageRegistry.ts` に `budget-simulator` エントリを追加した
* [ ] `presentation/pageComponentMap.ts` に lazy import を追加した
* [ ] `/budget-simulator` で画面が正しく描画される
* [ ] ナビに「予算達成シミュレーター」アイコンが出る
* [ ] `npm run test:guards`（pageMetaGuard 含む）が PASS する

## Phase 5: E2E + Health + 仕上げ

* [ ] `app/e2e/budget-simulator.spec.ts` を作成し、スライダー / モード切替 / 日別上書きの主要フローをカバーした
* [ ] `references/02-status/features-migration-status.md` に `budget-simulator` を追加した
* [ ] `CHANGELOG.md` に本 feature を追加した
* [ ] `cd app && npm run health:check` が warning なしで通る
* [ ] `cd app && npm run build` が成功する
* [ ] `cd app && npm run test:e2e` が PASS する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
