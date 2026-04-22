# HANDOFF — budget-achievement-simulator (widget reboot)

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase D 完了、Phase E へ。**

本 project は当初 page 前提（新規縦スライス + `/budget-simulator` 独立ページ）
だったが、途中方針変更で **widget embed** に移行済み。
checklist / 実装が先行する一方で plan / AI_CONTEXT が page 前提のままだった
不整合を、今回の reboot で解消する。

### 既に landed しているもの

- `BudgetSimulatorWidget` (entrypoint、`UnifiedWidgetContext` 依存) と
  `BudgetSimulatorView` (表示専用、scenario/state/vm を props で受ける)
  の分離 (Phase C)
- 関連サブコンポーネント群 (`RemainingInputPanel` / `DayCalendarInput` /
  `DayCalendarCell` / `DrilldownPanel` / `ProjectionBarChart` /
  `DailyBarChart` / `StripChart` / `TimelineSlider`)
- `mockBudgetSimulatorScenario` (DEFAULT / MONTH_START / MONTH_END /
  NO_PREV_YEAR の 4 preset) と Storybook の 4 View stories (Phase B/C)
- pure domain 計算 (`app/src/domain/calculations/budgetSimulator.ts` と
  `budgetSimulatorAggregations.ts`)。`calculationCanonRegistry` 登録済み
- application 層 hook (`useSimulatorState` / `useSimulatorScenario` /
  `useFullMonthLyDaily`) + VM (`BudgetSimulatorWidget.vm.ts`)
- `INSIGHT_WIDGETS` に `'insight-budget-simulator'` 登録
- Storybook エントリ (`app/src/stories/BudgetSimulator.stories.tsx`)
- reboot 計画書 (`plan.md`) と checklist (`checklist.md`) を widget 方針に更新済み

### 残り

- **Phase A〜D**: 完了 (reboot 文脈正本化 / mock scenario / View 分離 /
  state 接続 + mode toggle)
- **Phase E**: source adapter 群 (`buildBudgetSimulatorSource` /
  `buildBudgetSimulatorScenario` / `useBudgetSimulatorWidgetPlan`) の新設
- **Phase F**: 段階的な実データ接続（月次予算 → 日別実績 → 前年同月 →
  曜日別 → 日別 override projection）
- **Phase G**: widget 組込みの整理（barrel export / `INSIGHT_WIDGETS`
  エントリの再配線）
- **Phase H**: テスト + visual regression + health 確認

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先（Phase A 残り）

- `AI_CONTEXT.md` / `HANDOFF.md` の widget 方針化を本 commit で反映
- reboot 方針の人間承認（続く Phase B 着手のゲート）

### 中優先（Phase B / C）

- `mockBudgetSimulatorScenario.ts` 追加（UI 開発用 fixture）
- `BudgetSimulatorView.tsx` 切り出し（context を知らない表示専用 component）
- HTML モック準拠のレイアウト最終整備（週合計列・未来セル達成率/前年比は
  landed 済み。header 情報設計 / slider / mode switch の見直しが中優先）

### 低優先（Phase E〜H）

- source adapter の新設と実データ接続の段階投入
- visual regression / E2E の整備

## 3. ハマりポイント

### 3.1. page 前提の残骸に注意

旧 plan では `features/budget-simulator/` 新規縦スライス +
`/budget-simulator` 独立ページ + `PAGE_REGISTRY` 登録が
Phase 4 として含まれていた。**reboot では全て scope 外**。
`pageRegistry.ts` / `PageMeta.ts` / `pageComponentMap.ts` を触らない。

### 3.2. `domain/calculations/` の既存関数の再利用

既存 `budgetSimulator.ts` は契約が安定している。**改変しない**。
`budgetAnalysis.ts` の `prorateBudget` / `projectLinear` も再利用。
import のみで済ませる。

プロトタイプ `calc.js` の `buildScenario`（サンプルデータ生成）は
pure 関数としては不適切。本番では application 層の adapter
（`buildBudgetSimulatorScenario`）から scenario を構築する。

### 3.3. HTML モックの CSS を直コピーしない

HTML モック (`_.standalone.html`) の CSS 変数 (`var(--c-primary)` 等) は
design token と独立している。`presentation/theme/tokens.ts` 経由で
styled-components に変換する。

具体的には:

- `var(--c-primary)` → `theme.colors.palette.primary`
- `var(--bg3)` / `var(--fg2)` → `theme.colors.bg*` / `theme.colors.text*`
- `var(--sp-4)` → `theme.spacing[...]`

### 3.4. widget 本体に取得ロジックを書かない

widget は `SimulatorScenario` 相当の整形済み入力だけを受け取る。
DuckDB クエリ / raw rows / `freePeriodLane` への直接アクセスは
application 層の adapter (`useBudgetSimulatorWidgetPlan`) に閉じ込める。
現行 `BudgetSimulatorWidget.tsx` は `ctx.prevYearMonthlyKpi` /
`ctx.comparisonScope` を直接参照しているため、Phase E でこれを
adapter 経由に移す。

### 3.5. UI と取得経路を同時に触らない

見た目の不具合とデータ不具合の切り分けができなくなる。
Phase C（見た目再移植）と Phase E〜F（取得経路）は必ず分ける。

### 3.6. localStorage キーの衝突

現行は `shiire-arari-budget-simulator:day` / `shiire-arari-budget-simulator:weekstart`
の接頭辞で統一済み（既存 `shiire-arari-*` 命名規約に準拠）。
mode / inputs / dayOverrides は session 限定でメモリ保持（プロトタイプと同じ）。

### 3.7. state と scenario の責務分離

reboot 後の widget は以下の責務を保つ:

- **scenario (`SimulatorScenario`)** = 月・予算・前年・日別実績など、
  表示対象期間の「静的な事実」。application 層の adapter が組み立てる。
  widget は **read-only** として受け取る
- **state (`useSimulatorState`)** = ユーザー操作で変わる値 = currentDay /
  mode / yoyInput / achInput / dowInputs / dowBase / dayOverrides /
  weekStart。localStorage 永続化は state 側の責務
- **VM (`BudgetSimulatorWidget.vm.ts`)** = `(scenario, state) → view rows /
  projection` の pure 変換

widget / view は scenario と state を props として受け取るだけで、
どちらの組み立ても自ら行わない。Phase B では `mockBudgetSimulatorScenario`
で scenario を注入できることを確認済み。

### 3.8. 責務タグ制約と行数制限

`features/budget/ui/` 配下は G5 制約（≤300 行, R:widget / R:form 系）。
現行 `DrilldownPanel.tsx` (457 行) / `RemainingInputPanel.tsx` (357 行) が
baseline 入り（`TAG_MISMATCH_BASELINE = 50`）。Phase C の再構築で
分割して baseline を下げる想定。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | reboot の why / scope / 読み順 |
| `plan.md` | widget reboot 方針・Phase A〜H 構造・不可侵原則 |
| `checklist.md` | Phase 別の completion checkbox 集合 |
| `config/project.json` | project id / entrypoints |
| `aag/execution-overlay.ts` | ルール overlay |
| HTML モック (`_.standalone.html`) | 見た目の基準としてのみ参照 |
| `app/src/features/budget/` | widget embed 先 feature |
| `app/src/domain/calculations/budgetSimulator.ts` | 再利用する pure 計算 |
| `references/03-guides/project-checklist-governance.md` | project 運用の正本ガイド |
