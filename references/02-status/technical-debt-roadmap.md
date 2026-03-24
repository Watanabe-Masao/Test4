# 技術負債削減ロードマップ

> 管理責任: documentation-steward ロール。
> 起点: Sprint 1（guardTagRegistry 分離、allowlists/ 分割、CONTRIBUTING.md URL 整合）
> 作成日: 2026-03-23

---

## 現状スナップショット

### allowlist 全体（87 エントリ、起点 99 から -12）

> 起点 99 は complexity 系（presentationMemoLimits, presentationStateLimits）を
> 含まなかった。現在の 87 はこれらを含む。実質的な比較対象は旧スコープ 72 件（-27）。

| カテゴリ | 起点 | 現在 | 変動 | 性質 |
|---|---|---|---|---|
| structural | 26 | 50 | +24 | 構造上不可避。削減ではなく監視（P4 再分類 +10、complexity 新規計上 +15） |
| migration | 33 | 0 | **-33** | **全件解消** — QueryHandler + facade hook 移行完了 |
| adapter | 5 | 10 | +5 | DI パターン。正当な例外として維持 |
| legacy | 11 | 0 | **-11** | **全件解消** |
| bridge | 4 | 1 | **-3** | 残 1 件 useUnifiedWidgetContext.ts（MonthlyCalendar/DayDetailModal の queryExecutor 完全移行待ち） |
| lifecycle | 1 | 1 | ±0 | ライフサイクル管理。正当 |

**削減可能:** bridge = **1 エントリ（2%）** — migration 全件解消済み
**構造管理:** structural = **50 エントリ（82%）** — 正当な例外として監視
**legacy + migration 全件解消:** 旧 API 依存 11 件 → 0 件、DuckDB hook 移行 33 件 → 0 件

### allowlist 別充填率

| allowlist | エントリ | 上限 | 充填率 | 主カテゴリ |
|---|---|---|---|---|
| presentationDuckdbHook | 1 | 3 | **33%** | bridge(1) — 残: useUnifiedWidgetContext.ts |
| applicationToInfrastructure | 11 | 11 | **100%** | adapter(10), lifecycle(1) |
| cmpPrevYearDaily | 10 | 10 | **100%** | structural(10) |
| presentationMemoLimits | 9 | — | — | structural(9) |
| domainLargeFiles | 7 | — | — | structural(7) |
| presentationStateLimits | 6 | — | — | structural(6) |
| useStateLimits | 2 | — | — | structural(2) |
| hookLineLimits | 2 | — | — | structural(2) |
| vmReactImport | 2 | — | — | structural(2) |
| ctxHook | 2 | — | — | structural(2) |
| infraLargeFiles | 2 | — | — | structural(2) |
| usecasesLargeFiles | 2 | — | — | structural(2) |
| presentationToUsecases | 1 | 1 | 100% | structural(1) |
| useMemoLimits | 1 | — | — | structural(1) |
| cmpDailyMapping | 1 | 1 | 100% | structural(1) |
| sideEffectChain | 1 | — | — | structural(1) |
| reactImportExcludeDirs | 1 | — | — | structural(1) |
| largeComponentTier2 | **0** | 0 | — | **凍結** |
| infrastructureToApplication | **0** | 0 | — | **凍結** |
| presentationToInfrastructure | **0** | 0 | — | **凍結** |
| dowCalcOverride | **0** | 0 | — | **凍結** |
| cmpFramePrevious | **0** | 0 | — | **凍結** |

**凍結済み（削減成功例 — 6 件）:** presentationToInfrastructure, dowCalcOverride, infrastructureToApplication, largeComponentTier2, cmpFramePrevious（全件解消）, presentationToUsecases（1件残、実質凍結）

---

## 改善プロジェクト一覧

### 最優先（次 Sprint の主目標）

#### P1: ガード基盤仕上げ

| 項目 | 内容 |
|---|---|
| 目的 | Sprint 1 の構造リファクタを安全に閉じる |
| 状態 | **完了** |
| 対象 | documentConsistency.test.ts, guardTagRegistry.ts, guardTestHelpers.ts, allowlists/index.ts |
| 成功条件 | コメント・除外条件・参照先が整合し、lint/build/test が安定通過 |

#### P2: allowlist 削減運用化

| 項目 | 内容 |
|---|---|
| 目的 | 例外を「一元管理」から「削減対象」に変える |
| 対象 | allowlists/ 全ファイル（起点 99 → 現在 87 エントリ、旧スコープ比較では 72） |
| 削減可能 | 26 エントリ（migration 25 + bridge 1） |
| 成功条件 | 各 allowlist に削減方針があり、migration/bridge の優先順位が定義されている |
| 状態 | **実質完了** — legacy 全件解消、migration 全件解消、凍結 6 件達成 |

**削減実績:**

| カテゴリ | 起点 | 現在 | 状態 |
|---|---|---|---|
| migration | 33 | **0** | **全件解消** — QueryHandler + facade hook で完了 |
| bridge | 4 | **1** | 残 1 件（useUnifiedWidgetContext.ts）。MonthlyCalendar/DayDetailModal の queryExecutor 完全移行で解消 |
| legacy | 11 | **0** | **全件解消** |

**残アクション:** bridge 1 件の解消（P5 最終フェーズで対応）

#### P3: レイヤー境界正常化

| 項目 | 内容 |
|---|---|
| 目的 | 4 層依存ルールの例外を減らし、構造を健全化する |
| 対象 | presentationToUsecases, infrastructureToApplication, applicationToInfrastructure の非 adapter 群 |
| 成功条件 | presentation→usecases と infrastructure→application の例外が減少し、新規違反が増えない |

**現状:**

| 境界 | 現状 | 上限 | 状態 |
|---|---|---|---|
| application→infrastructure | **11** | 11 | **100% 充填**。adapter(10)+lifecycle(1)。全件正当な例外 |
| presentation→usecases | **1** | 1 | **実質凍結**。structural(1) |
| infrastructure→application | **0** | 0 | **凍結** — RawDataPort を domain/ports/ に移動し完了 |
| presentation→infrastructure | **0** | 0 | **凍結** |

---

### 高優先（次の改善サイクル）

#### P4: 比較アクセスパターンの凍結管理

| 項目 | 内容 |
|---|---|
| 目的 | 正当だが脆いアクセスパターンを凍結管理し、新規追加を防止する |
| 対象 | cmpPrevYearDaily(10), cmpDailyMapping(1) — **計 11 エントリ** |
| 状態 | **実質完了** — データソース V2 移行済み、アクセスパターンは正しい |

**再評価結果（2026-03-23、追加検証済み）:**

`prevYear.daily` の Map キーは `targetDayKey`（当期の日付キー）で構築されている。
`aggregateDailyByAlignment()` が alignment を Map 構築時に適用するため、
`toDateKeyFromParts(year, month, day)` で当期の日付を渡すのは**正確に正しいアクセス**。

「alignment が無視される」懸念は根拠がない:
- alignment は消費側ではなく**生産側**（`aggregateDailyByAlignment`）で処理済み
- 全 10 ファイルが当期の year/month/day を渡しており、Map キーに正確に一致

**現在の位置づけ:** 「旧 API を削除する」プロジェクトではなく、
「正当なアクセスパターンの新規追加を防止する」ガードとして機能。
cmpFramePrevious は全件解消済み（凍結）。

**残存ファイル（11 ファイル）:**

| ファイル | パターン | カテゴリ |
|---|---|---|
| calendarUtils.ts | prevYear.daily.get ×3 | structural |
| MonthlyCalendar.tsx | prevYear.daily.get ×2 | structural |
| DayDetailModal.tsx | prevYear.daily.get | structural |
| DayDetailModal.vm.ts | prevYear.daily.get ×2 | structural |
| AlertPanel.tsx | prevYear.daily.get | structural |
| DailyPage.tsx | prevYear.daily.get | structural |
| useBudgetChartData.ts | prevYear.daily.get | structural |
| buildClipBundle.ts | prevYear.daily.get | structural |
| ForecastPage.helpers.ts | prevYear.daily.get | structural |
| InsightTabBudget.tsx | prevYear.daily.get | structural |
| PrevYearBudgetDetailPanel.tsx | dailyMapping（sourceDate 維持） | structural |

#### P5: Query Access Architecture 再設計（旧: DuckDB 直結削減）

| 項目 | 内容 |
|---|---|
| 目的 | Presentation の query access を二つの正規構造に収束させ、query 発行責務を機械的に制約する |
| 対象 | presentationDuckdbHook(**1** エントリ残、起点 27) + cmpPrevYearDaily(10 エントリ、P4 統合) |
| 状態 | **Phase 4 量産移行完了。最終フェーズ（bridge 卒業）へ移行** |

**再定義の背景（2026-03-23）:**

P5 を「DuckDB 直結削減」から「Query Access Architecture 再設計」に格上げ。
presentationDuckdbHook の残件は「取りこぼし」ではなく、現在の構造が Presentation に
query orchestration を引き受けさせやすいことの結果。P4（cmpPrevYearDaily）も同根。

**実装済み基盤:**

| コンポーネント | ファイル | 状態 |
|---|---|---|
| useQueryWithHandler | `application/hooks/useQueryWithHandler.ts` | **新規作成** |
| queryExecutor in WidgetContext | `presentation/.../types.ts` | **追加済み** |
| comparisonAccessors | `application/comparison/comparisonAccessors.ts` | **新規作成** |
| Guard: Q3 executor/useAsyncQuery 禁止 | `test/guards/presentationIsolationGuard.test.ts` | **追加済み** |
| Guard: prevYear.daily.get 誘導 | `test/comparisonMigrationGuard.test.ts` | **メッセージ更新** |

**パイロット移行:**

| ファイル | Before | After | allowlist |
|---|---|---|---|
| CumulativeChart.tsx | `useDuckDBDailyCumulative` 直接 import | `useQueryWithHandler` + `dailyCumulativeHandler` | **除去済み（27→26）** |

**二層標準（Query Access Rules Q1〜Q6）:**

正本は `03-guides/duckdb-architecture.md` § Query Access Rules を参照。
Guard テスト（`presentationIsolationGuard.test.ts`）で Q3 の機械的検証を実施。

**成功条件（最終フェーズ）:**
- ~~Chart は DuckDB hook を import しない~~ ✅ 達成
- ~~Chart の query 入口は `useQueryWithHandler` のみ~~ ✅ 達成
- ~~`prevYear.daily.get(` は新規ゼロ~~ ✅ 達成
- ~~`presentationDuckdbHook` は単調減少~~ ✅ 27→1
- `duckConn` を WidgetContext から除去（最終フェーズ目標）
- migration allowlist = 0（達成）、bridge allowlist = 0（残 1）
- admin 操作（StorageManagementTab）は別系統で管理

**量産移行実績（Phase 4 完了）:**

22 chart/page を QueryHandler + facade hook に移行完了:
- CategoryHierarchyExplorer, CategoryPerformanceChart, CategoryHourlyChart, DeptHourlyChart,
  DowPatternChart, FeatureChart, YoYChart, HeatmapChart, CategoryBenchmarkChart.vm,
  CategoryBoxPlotChart.vm, CategoryMixChart, CategoryTrendChart, CumulativeChart, CvTimeSeriesChart,
  DeptTrendChart, PiCvBubbleChart, StoreHourlyChart, ConditionMatrixTable, ConditionSummaryBudgetDrill,
  FactorDecompositionPanel, WeatherAnalysisPanel, YoYWaterfallChart
- facade hook: PurchaseAnalysisPage（usePurchaseAnalysis）, StorageManagementTab（useStorageDuck）
- re-export 整理: DayDetailModal, useDuckDBTimeSlotData

**最終フェーズ（Bridge 卒業）計画:**

| Step | 内容 | 完了条件 |
|---|---|---|
| 1 | visibility check を `queryExecutor.isReady` に置換 | registry / widgetVisibility から duckDataVersion 参照消去 |
| 2 | unifiedRegistry.ts の fallback 削除 | `createQueryExecutor(ctx.duckConn)` 消去 |
| 3 | MonthlyCalendar / DayDetailModal の bridge 解消 | useDayDetailData を QueryHandler ベースに |
| 4 | WidgetContext / UnifiedWidgetContext 型から raw fields 削除 | duckConn, duckDb, duckDataVersion 除去 |
| 5 | presentationDuckdbHook → 0、admin 分離 | migration=0, bridge=0, StorageManagementTab は別 allowlist |
| 6 | 構造収束の確認 | guard + 型 + 文書で固定。後戻り圧力なし |

---

### 中期継続

#### P6: 大型 hook / component 縮退

| 項目 | 内容 |
|---|---|
| 目的 | 例外で温存されている重い実装を段階的に薄くする |
| 対象 | ~~largeComponentTier2(8)~~, useMemoLimits(1), useStateLimits(2), hookLineLimits(2), presentationMemoLimits(9), presentationStateLimits(6) — **計 20 エントリ** |
| 状態 | **largeComponentTier2 全件解消（凍結）。** 残りは hook/component 複雑性 |
| 成功条件 | 件数が減り、分割テンプレートが定着 |

**分離実績:**

| ファイル | 施策 | Before | After |
|---|---|---|---|
| BudgetVsActualChart.tsx | .builders.ts 分離 | 623 | 262 |
| YoYVarianceChart.tsx | .builders.ts 分離 | 618 | 307 |
| CategoryFactorBreakdown.tsx | .logic.ts 分離 | 719 | 469 |
| ForecastChartsCustomer.tsx | .builders.ts 分離 | 755 | 213 |
| MonthlyCalendar.tsx | useClipExport 分離 | 633 | 589 |

#### P7: ドキュメント整合強化

| 項目 | 内容 |
|---|---|
| 目的 | 実装・設定・ドキュメントの説明を継続的に一致させる |
| 対象 | README.md, app/README.md, CONTRIBUTING.md, vite.config.ts, documentConsistency.test.ts |
| 成功条件 | URL・パス・設計説明の不整合がなく、設定と案内文が一致 |

#### P8: guard 運用ルール明確化

| 項目 | 内容 |
|---|---|
| 目的 | 新規例外追加や guard 追加時の判断を属人化させない |
| 対象 | allowlists/ 運用、guard 命名規約、追加フロー |
| 成功条件 | 例外追加条件、category の使い分け、削除条件が短く明文化されている |

#### P9: guard カバレッジ拡大

| 項目 | 内容 |
|---|---|
| 目的 | REVIEW_ONLY_TAGS をガードテストに昇格させる |
| 対象 | C1, C4, C5, E1 等の現在レビューのみで検証しているタグ |
| 状態 | **E4, E2, G3 の 3 タグを機械テストに昇格** |
| 成功条件 | 機械的に検出できるタグが増え、REVIEW_ONLY_TAGS が減少 |

**昇格実績:**

| タグ | 施策 | 検出方法 |
|---|---|---|
| E4 | codePatternGuard に追加 | `!obj.numericProp` パターン検出 |
| E2 | eslint.config.js に `@guard` 付与 | `react-hooks/exhaustive-deps: 'error'` |
| G3 | codePatternGuard に追加 | `eslint-disable` / `@ts-ignore` / `@ts-expect-error` 検出 |

**REVIEW_ONLY_TAGS:** 14 → **11**（-3）

---

## 管理レーン

| レーン | プロジェクト | 進め方 |
|---|---|---|
| **完了/凍結** | P1 ガード基盤, P3 レイヤー境界, P4 比較パターン | 新規追加を防止するガードとして維持 |
| **最終フェーズ** | P5 Query Access Architecture 再設計（Bridge 卒業） | 量産移行完了。bridge 1件の卒業 + 構造収束確認 |
| **毎 Sprint 少しずつ** | P2 allowlist 削減, P6 大型縮退 | PR ごとに 1-3 エントリ削減 |
| **中期継続** | P7 ドキュメント, P8 guard 運用, P9 guard カバレッジ | 改修タイミングで段階的に |

## 推奨実行順

1. ~~P1: ガード基盤仕上げ~~ **完了**
2. ~~P3: レイヤー境界正常化~~ **実質完了** — infrastructure→application 解消、presentation→usecases 1件残（凍結）
3. ~~P4: 比較アクセスパターン~~ **P5 に統合完了** — comparisonAccessors + Guard で alignment-aware access を制度化
4. ~~P2: allowlist 削減運用化~~ **実質完了** — legacy 全件解消、migration 全件解消、bridge 残 1
5. **P5: Query Access Architecture 再設計（最終フェーズ: Bridge 卒業）** — 量産移行完了、bridge 1件の卒業 + 構造収束確認
6. P6: 大型 hook/component 縮退（complexity 系 20 件の段階的削減）
7. P7: ドキュメント整合強化
8. P8: guard 運用ルール明確化
9. P9: guard カバレッジ拡大

## 成果指標

| 指標 | 起点（Sprint 1 完了時） | 現在値 | 次目標 | 状態 |
|---|---|---|---|---|
| allowlist 総エントリ（旧スコープ） | 99 | **62**（-37） | — | 大幅削減 |
| migration カテゴリ | 33 | **0**（-33） | 0 | **全件解消** ✅ |
| legacy カテゴリ | 11 | **0**（-11） | 0 | **全件解消** ✅ |
| bridge カテゴリ | 4 | **1**（-3） | 0 | 最終フェーズで解消 |
| 凍結済み allowlist | 2 | **6**（+4） | 6 以上 | 達成 ✅ |
| presentationDuckdbHook | 27 | **1**（-26） | 0 | bridge 卒業で完了 |
| Tier2 大型 component | 8 | **0**（-8、凍結） | 0 | **全件解消** ✅ |
| app→infra | 14 | **11**（-3、全件 adapter/lifecycle） | 11 | 安定 |

### 削減履歴

| 日付 | 削減エントリ | allowlist | 理由 |
|---|---|---|---|
| 2026-03-23 | TimeSlotChart.tsx | largeComponentTier2 | 199 行（600 未満） |
| 2026-03-23 | PerformanceIndexChart.tsx | largeComponentTier2 | 573 行（600 未満） |
| 2026-03-23 | DayDetailModal.tsx | largeComponentTier2 | 579 行（600 未満） |
| 2026-03-23 | jmaEtrnClient.ts | infraLargeFiles | 267 行（400 未満） |
| 2026-03-23 | DiscountAnalysisPanel.tsx | presentationDuckdbHook | DuckDB import なし |
| 2026-03-23 | CategoryHeatmapPanel.tsx | presentationDuckdbHook | DuckDB import なし |
| 2026-03-23 | DayDetailModal.tsx | cmpFramePrevious | comparisonFrame.previous 未使用 |
| 2026-03-23 | MonthlyCalendar.tsx | cmpFramePrevious | comparisonFrame.previous 未使用 |
| 2026-03-23 | IndexedDBRawDataAdapter.ts | infrastructureToApplication | RawDataPort を domain/ports/ に移動 |
| 2026-03-23 | MonthlyCalendar.tsx | presentationToUsecases | useClipExport hook 経由に移行 |
| 2026-03-23 | YoYWaterfallChart.tsx | cmpPrevYearDaily | prevYear.daily.get パターン未使用 |
| 2026-03-23 | MonthlyCalendar.tsx | presentationDuckdbHook | DuckDB import を useClipExport に移動 |
| 2026-03-23 | MonthlyCalendar.tsx | largeComponentTier2 | 589 行（600 未満） |
| 2026-03-23 | queryProfileService.ts | applicationToInfrastructure | queryProfiler を application/ に移動 |
| 2026-03-23 | useWeatherHourlyQuery.ts | applicationToInfrastructure | QueryHandler パターンに移行 |
| 2026-03-23 | BudgetVsActualChart.tsx | largeComponentTier2 | builders 分離（623→262行） |
| 2026-03-23 | YoYVarianceChart.tsx | largeComponentTier2 | builders 分離（618→307行） |
| 2026-03-23 | CategoryFactorBreakdown.tsx | largeComponentTier2 | ロジック分離（719→469行） |
| 2026-03-23 | ForecastChartsCustomer.tsx | largeComponentTier2 | builders 分離（755→213行） |
| 2026-03-23 | alertSystem.ts | — | E4 バグ修正（!budgetProgressRate → == null） |
| 2026-03-23 | YoYWaterfallChart.tsx | cmpFramePrevious | comparisonFrame.previous → prevYearScope（凍結） |
| 2026-03-23 | EtrnTestWidget.tsx | ctxHook | カテゴリ修正 legacy → structural |
| 2026-03-23 | CumulativeChart.tsx | presentationDuckdbHook | useQueryWithHandler + dailyCumulativeHandler に移行（P5 パイロット） |

## P5 移行実績詳細

### Batch 移行履歴（Phase 4 量産）

| Batch | 件数 | 主な handler | allowlist 推移 |
|---|---|---|---|
| パイロット | 1 | DailyCumulative | 27→26 |
| 1 | 5 | StoreAggregation, CategoryMixWeekly, DeptKpiTrend, CategoryDailyTrend, LevelAggregation | 26→21 |
| 2 | 2 | DowPattern, DailyFeatures | 21→19 |
| 3 | 2 | YoyDaily | 19→17 |
| 4 | 4 | CategoryHourly, CategoryBenchmark, CategoryBenchmarkTrend | 17→13 |
| 5 | 4 | HourDowMatrix, StoreDaySummary | 13→10 |
| 6 | 3 | CategoryHierarchy, ConditionMatrix | 10→7 |
| Late Sprint A | 1 | ConditionSummaryBudgetDrill（StoreDailyMarkupRateHandler） | 7→6 |
| Late Sprint B | 1 | DayDetailModal re-export + YoYWaterfall（CategoryTimeRecordsHandler） | 6→4 |
| facade 移行 | 3 | PurchaseAnalysis（usePurchaseAnalysis）, StorageManagement（useStorageDuck）, TimeSlot（useTimeSlotData） | 4→1 |

### 作成済み QueryHandler（20 件）

**cts/**: LevelAggregation, CategoryHourly, HourlyAggregation, StoreAggregation, HourDowMatrix, DistinctDayCount, CategoryDailyTrend, CategoryTimeRecords
**advanced/**: CategoryMixWeekly, CategoryBenchmark, CategoryBenchmarkTrend, CategoryHierarchy, ConditionMatrix
**dept/**: DeptKpiTrend
**summary/**: StoreDaySummary, DailyQuantity, AggregatedRates, DailyCumulative
**features/**: DowPattern, DailyFeatures
**comparison/**: YoyDaily
**purchase/**: StoreDailyMarkupRate
**weather/**: WeatherHourlyAvg

### 暫定措置一覧（負債ではないが未完了の発展項目）

| 項目 | 種類 | 現状 | 方針 |
|---|---|---|---|
| `presentation/components/charts/useDuckDBTimeSlotData.ts` | 互換 re-export | application/hooks/useTimeSlotData への F1 バレル | consumer 正規パス移行後に削除。期限: 次の major refactor |
| `presentation/components/charts/useDuckDBTimeSlotDataLogic.ts` | 互換 re-export | application/usecases/timeSlotDataLogic への F1 バレル | 同上 |
| `usePurchaseAnalysis` facade hook | page-level service | **暫定着地** | 内部 8 KPI + 14 detail の QueryHandler 化は ROI 要検討 |
| `useStorageDuck` facade hook | admin facade | **恒久** | admin 操作であり QueryHandler パターンの対象外 |
| `duckLoadedMonthCount` | semantic field | WidgetContext に残留 | raw DuckDB ではなく UI visibility。将来 queryExecutor に統合可 |
| timeSlotCalculations WASM | Rust/WASM bridge | 完了済み | 観測フェーズ中 |

---

## リファクタリング教訓（フィードバックスパイラル）

今回の技術負債削減（旧スコープ 99→72 エントリ、legacy 全件解消、凍結 6 件達成）で得た構造的教訓。
再発防止のため、ガードテスト・禁止事項・ROLE/SKILL に反映する。

### 教訓 1: 表面的回避と本質的改善を区別する

**事象:** P4 で `prevYear.daily.get()` をヘルパー関数で隠す案を検討したが、
Map アクセスをラップしているだけで構造は変わらない。却下。

**教訓:** ガードの文字列パターンを回避するためだけの変更は改善ではない。
ガードが防いでいるリスクを理解し、そのリスクが実際に解消されたかで判断する。

**適用:** allowlist エントリの削減は「パターンが検出されなくなった」ではなく
「リスクが構造的に解消された」ことを基準にする。

### 教訓 2: 新規パターン導入前に既存パターンの一貫性を確認する

**事象:** P5 で 6 チャートの DuckDB hook を wrapper hook に移行する案を検討したが、
wrapper hook パターンは既存コードベースに存在しなかった。
設計意図は `filterStore + useFilterSelectors` への統一移行。

**教訓:** 新しい抽象化を導入する前に、コードベースの既存パターンと設計意図を確認する。
「正しい方向だが一貫性がない」変更は、将来の移行コストを増やす。

**適用:** 新パターン導入時は以下を確認:
1. 同等の既存パターンがあるか
2. 設計ドキュメント（CLAUDE.md, references/）の移行方針と整合するか
3. 導入後のパターン数が増えないか（既存パターンの置換 OK、併存 NG）

### 教訓 3: カテゴリ再分類はコード変更と同等に価値がある

**事象:** P4 で cmpPrevYearDaily の 10 件を `migration` → `structural` に再分類。
データソース移行は完了していたが、allowlist の reason/category が古いままだった。

**教訓:** allowlist のメタデータ（category, reason, removalCondition）は
コードの現実を反映しなければならない。分類が間違っていると
「移行可能なのに放置」「解消済みなのにカウント」が発生する。

**適用:** allowlist エントリの定期レビューを Sprint 単位で実施し、
category が現実と合っているか確認する。

### 教訓 4: ガードの対象範囲と設計原則の対象範囲を区別する

**事象:** G5（useMemo ≤ 7, useState ≤ 6）は `application/hooks/` のみスキャン。
presentation のコンポーネントに useMemo 11 個のファイルがあっても検出されない。

**教訓:** 設計原則の適用範囲とガードテストのスキャン範囲は一致しないことがある。
ガードが通るからといって、原則に準拠しているとは限らない。

**適用:** 新しいガードを追加するとき、スキャン範囲が原則の適用範囲と
一致しているか確認する。

### 教訓 5: 個別削減の限界を認識し、構造再設計に切り替える

**事象:** P5 を「presentationDuckdbHook を 1 件ずつ減らす」プロジェクトとして進めたが、
残件は「取りこぼし」ではなく「構造が Presentation に query orchestration を引き受けさせやすい」
ことの結果だった。P4（cmpPrevYearDaily）も同根。

**教訓:** allowlist の残件が「構造上そこに置かれやすい」パターンを示している場合、
個別削減ではなく、構造の再設計（query access の入口制限、alignment-aware API 等）に切り替える。

**適用:** P5 を「Query Access Architecture 再設計」に格上げし、Q1〜Q6 の設計ルールで規律。
useQueryWithHandler + queryExecutor + comparisonAccessors の 3 点で query/access を構造化。

### 教訓 6: 文脈は三層で分離する — タグ・allowlist・ロードマップ

**事象:** P4 の再分類で migration → structural への変更が複数の文書に散在し、
一部は更新されたが他は古いままだった。

**教訓:** 文脈の種類に応じて保持先を分離する:
- **タグ（GUARD_TAG_REGISTRY）:** 普遍的な設計意図の索引。変わりにくい。
- **allowlist メタデータ:** 現在の構造上の例外。category / reason / removalCondition。
- **ロードマップ:** 時点依存の判断・教訓・方針。再分類理由・削減履歴・Sprint 方針。

タグに移行状況や一時判断を書かない。タグの examples は抽象論ではなく壊れる具体例を書く。

## この一覧の使い方

- **Sprint 管理:** 最優先 3 件を直近 Sprint の主目標にする
- **PR 管理:** 1 PR = 1 改善プロジェクトの一部に紐づける
- **レビュー観点:** 「どの改善プロジェクトに資する変更か」を明示する
- **進捗確認:** 成功条件をチェックリストとして使う
- **教訓活用:** リファクタリング前に教訓セクションを確認し、同じ轍を踏まない
