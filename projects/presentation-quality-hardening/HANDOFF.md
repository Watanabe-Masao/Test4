# HANDOFF — presentation-quality-hardening

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

Presentation 層の品質改善は active-debt Phase A〜G-4 までで 33→7 件に
削減済み。残 7 件と Presentation テストカバレッジ強化 / E2E 業務フロー拡充 /
500 行超コンポーネントの `.vm.ts` 抽出 が live で残っている。

これらは旧来 `open-issues.md` / `technical-debt-roadmap.md` /
`active-debt-refactoring-plan.md` に分散していたが、本 project に集約した。

## 2. 次にやること

**優先度順**:

### 高優先（Phase 1 / active-debt 残 7 件）

| # | 対象 | 種別 | 工数 |
|---|---|---|---|
| 1 | `WeatherPage.tsx` | combined 17→9 (`useWeatherDaySelection` 抽出) | L |
| 2 | `InventorySettingsSection.tsx` | getState 12→default (callback props 化) | L |
| 3 | `useCostDetailData.ts` | useMemo 12→default (flow builders 抽出) | M |
| 4 | `useMonthDataManagement.ts` | useState 6→default (delete workflow useReducer) | S |

詳細: `references/03-guides/active-debt-refactoring-plan.md` Phase H/I/J。

### 中優先（Phase 2 / 500 行超コンポーネントの `.vm.ts` 抽出）

| # | 対象 | 行数 |
|---|---|---|
| 1 | `IntegratedSalesChart.tsx` | 588 |
| 2 | `StorageManagementTab.tsx` | 547 |
| 3 | `HourlyChart.tsx` | 537 |
| 4 | `InsightTabBudget.tsx` | 536 |
| 5 | `InsightTabForecast.tsx` | 533 |

### 中優先（Phase 3 / Presentation テスト + E2E）

- Presentation 層のコンポーネントテスト追加
- coverage 閾値 55→70%
- E2E 業務フロー拡充

### 低優先（Phase 4 / ComparisonWindow 契約波及）

- `useClipExportPlan` 等の他 plan hook に `comparisonProvenance` を追加

## 3. ハマりポイント

### 3.1. Phase H (WeatherPage) の依存整理

`useWeatherDaySelection` 抽出時、`selectedDays` / `selectedDows` は
`handleDowChange` / `goPrev` / `goNext` / `handleMonthScroll` /
`handleChartDayClick` / `handleDayRangeSelect` の 6 callback に閉じている。
描画ロジックとの循環依存はないが、props 経由配布の準備が必要。

### 3.2. CategoryBenchmarkChart.vm.ts の useState 6/7

`active-debt-refactoring-plan.md` で「Guard 制約上の限界」として記録済み。
import 行を Guard が計上しているため default 以下。Guard 改善（import 除外）が
入るまで `.vm.ts` 構造を変えても改善しない。

### 3.3. coverage 閾値の引き上げは実装と並行する

55→70% を機械的に設定すると CI が即赤くなる。Phase 3 のテスト追加と
ペアで進める。閾値変更は最後の commit に分離する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/03-guides/active-debt-refactoring-plan.md` | Phase H/I/J 詳細（背景） |
| `references/02-status/open-issues.md` | active project 索引 |
| `references/02-status/technical-debt-roadmap.md` | 判断理由（背景） |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
