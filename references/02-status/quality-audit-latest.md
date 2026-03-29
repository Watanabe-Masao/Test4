# 品質チェックレポート（2026-03-29 更新）

## 実施環境

- Node.js v22.22.0
- vitest v4.0.18
- eslint-plugin-react-hooks v7.0.1
- TypeScript strict mode

## CI 6段階ゲート結果

| ステップ | コマンド | 結果 |
|---|---|---|
| 1. Lint | `npm run lint` | **PASS**（エラー 0、警告 2） |
| 2. Format | `npm run format:check` | **PASS** |
| 3. Build | `npm run build` | **PASS** |
| 4. Guards | `npm run test:guards` | **PASS**（14 ファイル / 152 テスト） |
| 5. Test | `npx vitest run` | **PASS**（257 ファイル / 4,686 テスト） |
| 6. E2E | `npm run test:e2e` | （未実施） |

## 前回レポート（2026-03-28）からの改善

| 指標 | 2026-03-28 | 2026-03-29 | 変化 |
|---|---|---|---|
| テストファイル数 | 171 | **257** | +86 (+50%) |
| テスト数 | 3,121 | **4,686** | +1,565 (+50%) |
| ガードテスト数 | — | **152** | 新規（pageMetaGuard +12） |
| Lint エラー | 0 | **0** | 維持 |
| Lint 警告 | 15 | **2** | **-13 (-87%)** |
| App→Infra allowlist | 13 | **10** | **-3 (-23%)** |
| application/ports/ | 8 ファイル | **0（全廃）** | Port 型を domain/ports/ に移動 |

## Lint 警告（2件）

すべて `react-refresh/only-export-components` 警告。

| ファイル | 理由 |
|---|---|
| `ConditionSummaryDailyChart.tsx` | 定数 co-export |
| `routes.tsx` | PAGE_COMPONENT_MAP co-export（pageMetaGuard 検証に必要） |

**前回 15 件から 13 件解消。** 解消内訳:
- `DuckDBTimeSlotChart.tsx` — ファイル削除（TimeSlotChart に統合済み）
- `ChartAnnotation.tsx` / `ChartTooltip.tsx` — unused eslint-disable 解消
- `BudgetVsActualChart.tsx` — co-export 解消
- `UnifiedAnalyticsWidgets.tsx` (3件) / `registryKpiWidgets.tsx` (2件) / `KpiTableWidgets.tsx` / `PlanActualForecast.tsx` / `StorageDataViewers.tsx` / `ImportProvenanceModal.tsx` — 各種解消

## 層境界 allowlist（R-1 進捗）

### application → infrastructure（10件、上限 10）

| # | ファイル | カテゴリ | 状態 |
|---|---------|---------|------|
| 1 | `useDuckDB.ts` | DuckDB CQRS | 構造的に必要 |
| 2 | `useEngineLifecycle.ts` | DuckDB CQRS | 構造的に必要 |
| 3 | `useRawDataFetch.ts` | DuckDB CQRS | 構造的に必要 |
| 4 | `useAppLifecycle.ts` | DuckDB CQRS | 構造的に必要 |
| 5 | `useDataRecovery.ts` | lifecycle | Port 化で削除可能 |
| 6 | `useImport.ts` | adapter | Port 化で削除可能 |
| 7 | `FileImportService.ts` | adapter | 同上 |
| 8 | `ExportService.ts` | adapter | 同上 |
| 9 | `useI18n.ts` | adapter | Context 化で削除可能 |
| 10 | `weatherAdapter.ts` | re-export bridge | サービス DI 化で削除可能 |

**前回 13 → 10 に削減。** 削減内訳:
- `backupAdapter.ts` / `fileSystemAdapter.ts` / `storagePersistenceAdapter.ts` — 実装を infrastructure/adapters/ に移動、re-export bridge を削除（消費者は AdapterProvider 経由に移行済み）

### その他 allowlist

| リスト | 件数 | 状態 |
|--------|------|------|
| presentation → infrastructure | **0** | 凍結 |
| infrastructure → application | **0** | 凍結 |
| presentation → usecases | **1** | ClearAllDataSection.tsx |

## 肥大化ファイル（500行超、テスト・ストーリー・styles 除外）

### 解消済み（前回レポートからの削減）

| ファイル | 前回行数 | 現在 | 対応 |
|---|---|---|---|
| `DuckDBCategoryBenchmarkChart.tsx` | 666 | **削除** | CategoryBenchmarkChart.tsx (217行) にリネーム済み |
| `DuckDBTimeSlotChart.tsx` | 655 | **削除** | TimeSlotChart.tsx (227行) に統合済み |
| `TimeSlotSalesChart.tsx` | 614 | **削除** | styles のみ残存 |
| `DuckDBCategoryTrendChart.tsx` | 556 | **削除** | CategoryTrendChart.tsx (367行) にリネーム、Logic.ts 抽出済み |
| `clipExport/renderClipHtml.ts` | 829 | **42** | CSS/JS 分離済み |
| `duckdb/dataLoader.ts` | 690 | **201** | 分離済み |
| `PerformanceIndexChart.tsx` | 591 | **193** | builder 分離済み |
| `YoYVarianceChart.tsx` | 563 | **174** | .vm.ts 抽出済み（本セッション） |
| `CategoryFactorBreakdown.tsx` | 563 | **242** | EChart コンポーネント分離（本セッション） |
| `Forecast/ForecastChartsCustomer.tsx` | 572 | **213** | builder 分離済み |
| `DashboardPage.tsx` | 555 | **412** | ページオーケストレーター（許容範囲） |
| `ForecastTools.tsx` | 544 | **441** | 状態管理は hook に委譲済み |
| `BudgetVsActualChart.tsx` | — | **232** | .vm.ts 抽出済み（本セッション） |
| `PrevYearMappingTab.tsx` | 568 | **353** | .vm.ts 抽出済み（本セッション） |
| `DayDetailModal.tsx` | 586 | **340** | .vm.ts 存在 |
| `CategoryTotalView.tsx` | 602 | **450** | .vm.ts 抽出済み（本セッション） |

### 残存 500行超ファイル

| ファイル | 行数 | 備考 |
|---|---|---|
| `TimeSlotChartOptionBuilder.ts` | 732 | option builder（純粋関数）。分割不要 |
| `IntegratedSalesChart.tsx` | 588 | ドリル状態管理 + 分析文脈構築。Logic.ts 一部抽出済み |
| `conditionSummaryCardBuilders.ts` | 580 | builder（純粋関数）。分割不要 |
| `conditionSummaryDailyBuilders.ts` | 570 | builder（純粋関数）。分割不要 |
| `ForecastChartsCustomer.builders.ts` | 566 | builder（純粋関数）。分割不要 |
| `ConditionSummaryDailyModal.tsx` | 552 | モーダル UI |
| `conditionPanelYoY.tsx` | 550 | 条件パネル |
| `StorageManagementTab.tsx` | 547 | 6 ドメイン統合（サブコンポーネント分割候補） |
| `HourlyChart.tsx` | 537 | 時間帯チャート |
| `InsightTabBudget.tsx` | 536 | インサイトタブ |
| `InsightTabForecast.tsx` | 533 | インサイトタブ |
| `grossProfitBridge.ts` | 520 | ブリッジサービス |
| `MonthlyCalendarFC.tsx` | 505 | カレンダー |
| `TimeSlotChartView.tsx` | 505 | View コンポーネント（適合: useState 1個） |

**注:** `*.builders.ts` / `*Logic.ts` / `*OptionBuilder.ts` は純粋関数ファイルであり、
コンポーネントの肥大化とは性質が異なる。SRP 違反ではなく分割不要。

## 本セッションで実施した構造改善

### 1. ルーティング正本化
- **PageMeta** 型 + **PAGE_REGISTRY** 導入（7箇所の断片化を統一）
- routes.tsx / NavBar / BottomNav / useKeyboardShortcuts / useRouteSync を正本から導出
- **pageMetaGuard** (12テスト) で整合性を機械検証

### 2. 非同期状態統一
- **AsyncState<T>** 型 + 全 status ヘルパー + adapter 導入
- error 型を `string | null` → `Error | null` に統一
- AsyncQueryResult<T> の重複定義を排除（QueryContract.ts が正本）

### 3. module-scope state 排除
- **usePersistence** を PersistenceContext + PersistenceProvider に移行
- **useAutoImport** の processed timing 修正

### 4. Presentation 層 責務分割（10 ファイル）
- チャート 3 件: option builder を Logic.ts に抽出（DeptHourly / CategoryTrend / IntegratedSales）
- 計算ロジック 7 件: .vm.ts 抽出（YoYVariance / BudgetVsActual / YoYWaterfall / PrevYearBudgetDetail / PrevYearMapping / CategoryTotal / CategoryFactor EChart 分離）

### 5. 層境界改善
- **Port 型** を application/ports/ → domain/ports/ に移動（設計原則 A4 準拠）
- **Adapter 実装** を application/adapters/ → infrastructure/adapters/ に移動
- **AdapterProvider** 導入（4 アダプターを Context 経由 DI）
- **application/ports/** ディレクトリ全廃（8 ファイル削除）
- **adapter bridge** 3 件削除（消費者は AdapterProvider 経由に移行済み）
- allowlist **13 → 10** に削減、guard 上限引き下げ

### 6. ドキュメント清掃
- Recharts 残存コメント清掃（README 移行状況テーブル更新）
- guardTagRegistry に F10（PageMeta 正本）追加

## 総評

- テスト数が **4,686** に到達（前回比 +50%）
- Lint 警告は **15→2** に大幅削減（-87%）
- **application/ports/** ディレクトリ全廃 — Port 型の正本は domain/ports/ に統一
- allowlist **13→10** — 層境界違反を 23% 削減
- Presentation 層の計算ロジック漏れを **10 ファイル** で修正（.vm.ts / Logic.ts / コンポーネント分離）
- 肥大化ファイルの **500行超 → 300行台** への縮小を 8 ファイルで実施
- 残存 500行超の `.tsx` ファイルのうち、純粋関数ファイル（builders/Logic）を除くと **実質 9 ファイル** が分割検討対象
