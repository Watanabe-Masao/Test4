# 品質チェックレポート（2026-03-28 更新）

## 実施環境

- Node.js v22.22.0
- vitest v4.0.18
- eslint-plugin-react-hooks v7.0.1
- TypeScript strict mode

## CI 6段階ゲート結果

| ステップ | コマンド | 結果 |
|---|---|---|
| 1. Lint | `npm run lint` | **PASS**（エラー 0、警告 15） |
| 2. Format | `npm run format:check` | **PASS** |
| 3. Build | `npm run build` | **PASS**（14.23s） |
| 4. Storybook | `npm run build-storybook` | （未実施） |
| 5. Test | `npx vitest run` | **PASS**（171 ファイル / 3,121 テスト） |
| 6. E2E | `npm run test:e2e` | （未実施） |

## 前回レポート（2026-02-21）からの改善

| 指標 | 2026-02-21 | 2026-03-07 | 変化 |
|---|---|---|---|
| テストファイル数 | 66 | **250** | +184 (+279%) |
| テスト数 | 616 | **4,659** | +4,043 (+656%) |
| Lint エラー | 0 | **0** | 維持 |
| Lint 警告 | 33 | **15** | -18 (-55%) |
| MetricId 数 | 不明 | **81** | — |

## Lint 警告（15件）

すべて `react-refresh/only-export-components` 警告。コンポーネントファイルで定数・ヘルパーを
co-export しているため、React Fast Refresh が効かないケース。

| ファイル | 警告数 |
|---|---|
| `ChartAnnotation.tsx` | 1（unused eslint-disable） |
| `DuckDBTimeSlotChart.tsx` | 1（unused eslint-disable） |
| `ChartTooltip.tsx` | 1（unused eslint-disable） |
| `BudgetVsActualChart.tsx` | 1 |
| `ImportProvenanceModal.tsx` | 1 |
| `PlanActualForecast.tsx` | 1 |
| `StorageDataViewers.tsx` | 1 |
| `KpiTableWidgets.tsx` | 1 |
| `UnifiedAnalyticsWidgets.tsx` | 3 |
| `registryKpiWidgets.tsx` | 2 |
| `routes.tsx` | 1 |

## 肥大化ファイル（300行超、テスト・ストーリー・styles 除外）

### 1,000行超（要分割）

| ファイル | 行数 |
|---|---|
| `Dashboard/widgets/ConditionDetailPanels.tsx` | ~~1,202~~ → 18行バレル（2026-03-12 分割完了。conditionPanel{Profitability,MarkupCost,YoY,SalesDetail}.tsx に分離） |

### 500〜999行（分割検討）

| ファイル | 行数 | 備考 |
|---|---|---|
| `clipExport/renderClipHtml.ts` | 829 | HTML テンプレート生成 |
| `duckdb/dataLoader.ts` | 690 | DuckDB データロード |
| `charts/DuckDBCategoryBenchmarkChart.tsx` | 666 | カテゴリベンチマーク |
| `charts/DuckDBTimeSlotChart.tsx` | 655 | 時間帯チャート |
| ~~`import/FileImportService.ts`~~ | ~~632~~ → 194 | **解決済み**（ImportOrchestrator 抽出等で縮小） |
| `charts/TimeSlotSalesChart.tsx` | 614 | 時間帯売上 |
| `DayDetailModal.styles.ts` | 605 | スタイル定義 |
| `Category/CategoryTotalView.tsx` | 602 | カテゴリ全体ビュー |
| `charts/PerformanceIndexChart.tsx` | 591 | パフォーマンス指数 |
| `Dashboard/widgets/DayDetailModal.tsx` | 586 | 日次詳細モーダル |
| `Admin/StorageManagementTab.tsx` | 580 | ストレージ管理 |
| `Dashboard/widgets/PrevYearBudgetDetailPanel.tsx` | 579 | 前年予算詳細 |
| `Forecast/ForecastChartsCustomer.tsx` | 572 | 顧客予測チャート |
| `Admin/PrevYearMappingTab.tsx` | 568 | 前年マッピング |
| `Dashboard/widgets/CategoryFactorBreakdown.tsx` | 563 | カテゴリ要因分解 |
| `charts/YoYVarianceChart.tsx` | 563 | YoY 分散チャート |
| `charts/DuckDBCategoryTrendChart.tsx` | 556 | カテゴリトレンド |
| `Dashboard/DashboardPage.tsx` | 555 | ダッシュボード |
| `Dashboard/widgets/ForecastTools.tsx` | 544 | 予測ツール |

### 前回レポートとの比較

| ファイル | 2026-02-21 | 2026-03-07 | 変化 |
|---|---|---|---|
| DayDetailModal.tsx | 1,518 | **586** | -932行（分割実施済み） |
| AdminPage.tsx | 1,105 | **300行未満** | タブ分割実施済み |
| DashboardPage.styles.ts | 1,052 | **300行未満** | スタイル分割実施済み（DayDetailModal.styles.ts に 605行残存） |
| TableWidgets.tsx | 1,038 | **300行未満** | ウィジェット分割実施済み |

## 現在の課題（`open-issues.md` と同期）

> 2026-03-28 時点: C-1〜C-5 はすべて **解決済み**（`open-issues.md` 参照）。
> 現在の対応必要な課題はなし。将来リスクとして R-10（DualPeriodSlider 廃止検討）が High で残存。

## 前回の高優先度項目の解消状況

| # | 課題（2026-02-21） | 状態 |
|---|---|---|
| 1 | `useImport.ts` の `useCallback` 依存配列不足 | **解消済み** |
| 2 | `usePwaInstall.ts` の `useEffect` 依存配列不足 | **解消済み** |
| 3 | `StorageManagementTab.tsx` の `useCallback` 依存配列不足 | **解消済み** |
| 4 | `DataGrid.tsx` の `react-hooks/incompatible-library` 警告 | **解消済み**（react-hooks v7 で警告消失） |
| 5 | `App.test.tsx` の `borderRadius` prop DOM 漏れ | **解消済み** |
| 6 | Chart テストの width/height -1 stderr | **解消済み** |
| 7 | `react-hooks/exhaustive-deps` が warning のまま | **解消済み**（error に昇格済み） |

## 総評

- テスト数が **7.5倍** に増加し（616→4,659）、品質基盤が大幅に強化された
- 前回の高優先度バグ6件はすべて解消済み
- Lint 警告は 33→15 に半減。残りはすべて Fast Refresh 関連で機能影響なし
- 肥大化ファイルは 1,000行超が 4→1 に改善。500行超は依然として 19 ファイル存在
- アーキテクチャガードテスト (`guards/layerBoundaryGuard.test.ts`) による層間依存チェックが機能中
- `react-hooks/exhaustive-deps` が error に昇格済みで、依存配列不足が CI で遮断される
