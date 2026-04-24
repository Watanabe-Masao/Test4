# HANDOFF — budget-achievement-simulator (widget reboot + 統合完了)

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase A〜H 完了 + Dashboard 既存 widget 撤去 + shared 化完了。最終承認待ち。**

本 project は当初 page 前提（新規縦スライス + `/budget-simulator` 独立ページ）だった
が、途中方針変更で **widget embed** に移行。reboot 全工程 (Phase A〜H) に加え、
Dashboard の `MonthlyCalendar` widget を Budget Simulator (①②③④ + 期間詳細モーダル)
に統合して撤去するところまで landed 済み。

### 既に landed しているもの

#### Budget Simulator 本体

- `BudgetSimulatorWidget` (entrypoint、`UnifiedWidgetContext` 依存) と
  `BudgetSimulatorView` (表示専用、scenario/state/vm を props で受ける) の分離
- サブコンポーネント群:
  - `RemainingInputPanel` / `DayCalendarInput` / `DayCalendarCell` / `DowAverageRow`
  - `DrilldownPanel` / `DrillCalendar` / `DailyBarChart` / `ProjectionBarChart` /
    `StripChart` / `TimelineSlider`
- pure domain 計算 (`domain/calculations/budgetSimulator.ts` +
  `budgetSimulatorAggregations.ts`)、`calculationCanonRegistry` 登録済み
- application 層:
  - `useSimulatorState` / `useSimulatorScenario` / `useFullMonthLyDaily` /
    `useBudgetSimulatorWidgetPlan`
  - builder: `buildBudgetSimulatorSource` / `buildBudgetSimulatorScenario` /
    `buildWeatherIconMaps` / `buildDayDetailModalProps`
  - pure helper: `periodSummary.computePeriodSummary` (+ unit test)
- VM (`BudgetSimulatorWidget.vm.ts`)
- `INSIGHT_WIDGETS` に `'insight-budget-simulator'` 登録
- Storybook (`stories/BudgetSimulator.stories.tsx`) + mock scenario 4 preset

#### ①②③④ カレンダー機能

- 天気アイコン表示 (`☀️ ☁️ 🌧️ ❄️`) — 前年 / 当年を each 行に前置
- DayCalendarCell 5 行再設計 (前年 / 予算 / 実績 / 予算比|前年比 / 反対側参考)
- 曜日平均行 (DowAverageRow) + 実績曜日平均自動入力 3 モード
- 単日クリック → `DayDetailModal` (売上/時間帯/仕入内訳 3 tab)
- 週合計 / 曜日平均 / 日平均 クリック → `PeriodDetailModal` (期間集計)
- grayscale 分岐: 当年実績なし時は誤解を招かないよう明示メッセージ

#### shared 化

- `DayDetailModal` + 3 tab + 関連 styles を `components/day-detail/` に移設
- `PeriodDetailModal` 新規追加
- `PinModalOverlay` を day-detail 内に一本化

#### Dashboard 既存 widget 撤去

- `MonthlyCalendar` / `MonthlyCalendarFC` (widget + styles + state + utils + preview) 削除
- registry / ownership manifest / layout preset から撤去
- モック HTML (`_.standalone.html`) 削除

### 残り

- 人間による最終レビュー (plan / checklist / HANDOFF / 実装差分)
- 承認後の activate 切替 (`CURRENT_PROJECT.md`)
- `test:visual` は Storybook + WASM 依存のため CI で検証

## 2. 次にやること

1. 最終レビュー実施
2. 承認後に `CURRENT_PROJECT.md` を `budget-achievement-simulator` にスイッチし、
   project を **active → completed** へ昇格
3. （任意）後続の cleanup:
   - `components/day-detail/` の sales/hourly tab が Dashboard widget
     (HourlyChart / DrilldownWaterfall / CategoryDrilldown) を absolute import
     している上向き依存の解消
   - compat shim `Dashboard/widgets/DayDetailModal.styles.ts` の解消
     (HourlyWeatherOverlay / HourlyYoYSummary / CategoryDrilldown を新 path に直す)
   - `RemainingInputPanel.tsx` / `DrilldownPanel.tsx` のさらなる分割で
     responsibilityTag baseline を下げる

## 3. ハマりポイント

### 3.1. page 前提の残骸に注意

旧 plan の独立ページ (`features/budget-simulator/` / `/budget-simulator` /
`PAGE_REGISTRY` 登録) は **reboot では全て scope 外**。
`pageRegistry.ts` / `PageMeta.ts` / `pageComponentMap.ts` を触らない。

### 3.2. `domain/calculations/` の既存関数の再利用

既存 `budgetSimulator.ts` は契約が安定。**改変しない**。
`budgetAnalysis.ts` の `prorateBudget` / `projectLinear` も再利用、import のみで済ませる。

### 3.3. widget 本体に取得ロジックを書かない

widget は `SimulatorScenario` 相当の整形済み入力だけを受け取る。取得は
`useBudgetSimulatorWidgetPlan` に閉じ込める。

### 3.4. state と scenario の責務分離

- **scenario** = 月・予算・前年・日別実績 (静的な事実、read-only)
- **state (`useSimulatorState`)** = ユーザー操作で変わる値。localStorage 永続化は state 側
- **VM** = `(scenario, state) → view rows / projection` の pure 変換

widget / view は scenario と state を props として受け取るだけ。

### 3.5. localStorage キー

`shiire-arari-budget-simulator:day` / `shiire-arari-budget-simulator:weekstart` 接頭辞で統一。
mode / inputs / dayOverrides は session 限定でメモリ保持。

### 3.6. 責務タグ制約と行数制限

`features/budget/ui/` 配下は G5 制約 (≤300 行, R:widget / R:form 系)。
現行 `DrilldownPanel.tsx` / `RemainingInputPanel.tsx` が baseline 入り
(`TAG_MISMATCH_BASELINE = 50`)。後続 cleanup で分割して baseline を下げる想定。

### 3.7. 前年 alignment

前年売上は `prevYearMonthlyKpi.{sameDate|sameDow}.dailyMapping` から取得。
`useFullMonthLyDaily` が alignmentMode に応じて sameDate / sameDow を自動選択。
ヘッダの「前年同月」「前年同曜日」トグルに追従する。
天気アイコンは現状 sameDate 前提 (sameDow の厳密対応は将来拡張)。

### 3.8. grayscale 分岐のポリシー

当年実績がない日 / 期間では誤解を招く分析を避けるため:

- KPI カードの実績側行を grayscale (opacity=0.5) + 値を `-`
- 前年比ウォーターフォール (`DayDetailSalesTab`) は非表示 + 明示メッセージ
- 時間帯分析 (`HourlyChart`) はチャート領域を grayscale + 中央オーバーレイ
- `PeriodDetailModal` も同ポリシー

### 3.9. MonthlyCalendar 撤去の後始末

Dashboard の `MonthlyCalendar` widget は Budget Simulator へ統合され完全撤去済み。
`PinModalOverlay` は `components/day-detail/DayDetailModal.styles.ts` に一本化、
`PinInputLabel` は `ForecastTools.styles.ts` に移設、
モック HTML (`_.standalone.html`) は削除済み。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | reboot の why / scope / 読み順 |
| `plan.md` | widget reboot 方針・Phase A〜H 構造・不可侵原則 |
| `checklist.md` | Phase 別の completion checkbox 集合 |
| `config/project.json` | project id / entrypoints |
| `aag/execution-overlay.ts` | ルール overlay |
| `app/src/features/budget/` | widget embed 先 feature |
| `app/src/presentation/components/day-detail/` | shared 化された DayDetailModal / PeriodDetailModal |
| `app/src/domain/calculations/budgetSimulator.ts` | 再利用する pure 計算 |
| `references/03-guides/project-checklist-governance.md` | project 運用の正本ガイド |
