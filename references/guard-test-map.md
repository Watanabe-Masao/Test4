# ガードテスト対応表

本ファイルはガードテスト → 管理ロール → 保護対象ファイルの対応を示す。

## テストファイル一覧

| テストファイル | 管理ロール | ルール数 | 保護対象 |
|---|---|---|---|
| `app/src/test/architectureGuard.test.ts` | architecture | 9件 | 4層境界、許可リスト、ビジネス関数アクセス |
| `app/src/domain/calculations/__tests__/calculationRules.test.ts` | invariant-guardian | 7件 | safeDivide, calculateTransactionValue, overflowDay, fmtSen, formatPercent, toPct |
| `app/src/presentation/components/charts/__tests__/divisorRules.test.ts` | invariant-guardian | 8件 | computeDivisor, filterByStore, countDistinctDays, 正規ロケーション, 網羅性 |
| `app/src/domain/calculations/__tests__/factorDecomposition.test.ts` | invariant-guardian | 30件 | シャープリー恒等式（2/3/5要素）、2↔3↔5 一貫性 |
| `app/src/application/comparison/__tests__/buildComparisonAggregation.test.ts` | invariant-guardian | 34件 | aggregateKpiByAlignment 集約不変条件（売上・客数合計一致、マッピング範囲、ソート順） |
| `app/src/application/usecases/explanation/__tests__/prevYearBudgetExplanation.test.ts` | invariant-guardian | 9件 | 前年予算 Explanation 不変条件（breakdown 合計一致、evidenceRefs 網羅性、無効入力） |
| `app/src/domain/calculations/__tests__/conditionResolver.test.ts` | invariant-guardian | — | conditionResolver 条件判定ロジック |
| `app/src/domain/calculations/__tests__/dowGapAnalysis.test.ts` | invariant-guardian | — | 曜日ギャップ分析の不変条件 |
| `app/src/domain/calculations/__tests__/formulaRegistry.test.ts` | invariant-guardian | — | 計算式レジストリの整合性 |
| `app/src/test/documentConsistency.test.ts` | documentation-steward | 12件 | 不変条件カタログ↔ガードテスト相互参照、エンジン責務↔実コード、CLAUDE.md 参照パス |
| `app/src/test/hookComplexityGuard.test.ts` | architecture | 4件 | R3(@internal禁止), R3(typeofテスト禁止), R7(store算術式禁止), R10(カバレッジexport禁止) |
| `app/src/test/comparisonMigrationGuard.test.ts` | architecture | 9件 | 旧 day/offset 比較パターン禁止、ComparisonFrame 新規使用禁止、dailyMapping 独自変換禁止 |
| `app/src/domain/models/__tests__/ComparisonScopeInvariant.test.ts` | invariant-guardian | 3件 | ComparisonScope 意味論（候補窓、位置ベース、1:1対応） |
| `app/src/application/comparison/__tests__/sameDowPoint.test.ts` | invariant-guardian | 7件 | SameDowPoint sourceDate 保持、月跨ぎ・年跨ぎ、合計整合性 |

## ルール → テスト対応

### architectureGuard.test.ts（architecture ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| — | domain → 外部層依存なし | INV-ARCH-01 |
| — | application → infrastructure 許可リストのみ | INV-ARCH-02 |
| — | presentation → infrastructure 許可リストのみ | INV-ARCH-03 |
| — | application → presentation 依存なし | INV-ARCH-04 |
| — | infrastructure → presentation 依存なし | INV-ARCH-05 |
| — | 許可リストファイル実在確認 | INV-ARCH-06 |
| — | presentation → domain/calculations 直接 import 禁止 | INV-ARCH-07 |
| — | getDailyTotalCost 直接使用禁止 | INV-ARCH-08 |

### calculationRules.test.ts（invariant-guardian ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| RULE-D1 | domain 内インライン除算禁止 | INV-DIV-01 |
| RULE-D2 | インライン客単価計算禁止 | INV-DIV-02 |
| RULE-I1 | overflow day ロジック共通化 | INV-DIV-03 |
| RULE-P2 | fmtSen 重複定義禁止 | INV-FMT-01 |
| RULE-P3 | Dashboard パーセント書式統一 | INV-FMT-02 |
| RULE-C1 | Chart パーセント書式統一 | INV-FMT-03 |

### divisorRules.test.ts（invariant-guardian ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| RULE-1 | computeDivisor 経由強制 | INV-PF-01 |
| RULE-2 | レガシー API 使用禁止 | INV-PF-02 |
| RULE-3 | カレンダーベース除数禁止 | INV-PF-03 |
| RULE-4 | 二重ゼロ除算ガード禁止 | INV-PF-04 |
| RULE-5 | filterByStore 経由強制 | INV-PF-05 |
| RULE-6 | countDistinctDays 経由強制 | INV-PF-06 |
| — | 正規ロケーション実装健全性 | INV-PF-07 |
| — | usePeriodFilter 使用ファイル網羅性 | INV-PF-08 |

### factorDecomposition.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| decompose2 シャープリー恒等式 | INV-SH-01 |
| decompose3 シャープリー恒等式 | INV-SH-02 |
| decompose5 シャープリー恒等式 | INV-SH-03 |
| 2↔3↔5 要素間一貫性 | INV-SH-04 |
| データソース乖離時の合計一致 | INV-SH-03（特殊ケース） |
| 全パラメータ大変動時の合計一致 | INV-SH-03（ストレステスト） |

### buildComparisonAggregation.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| Σ(storeContributions.sales) = entry.sales | INV-AGG-01 |
| Σ(storeContributions.customers) = entry.customers | INV-AGG-02 |
| Σ(dailyMapping.prevSales) = entry.sales | INV-AGG-03 |
| Σ(dailyMapping.prevCustomers) = entry.customers | INV-AGG-04 |
| transactionValue = Math.round(sales / customers) | INV-AGG-05 |
| マッピング範囲 1〜daysInMonth | INV-AGG-06 |
| offset=0 → originalDay = mappedDay | INV-AGG-07 |

### prevYearBudgetExplanation.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| breakdown 日別売上合計 = entry.sales | INV-EXPL-01 |
| evidenceRefs に全 storeContribution が含まれる | INV-EXPL-02 |
| evidenceRefs に budget 参照が含まれる | INV-EXPL-03 |
| explanation.value = safeDivide(sales, budget) | INV-EXPL-04 |
| 無効入力 → 空 Map | INV-EXPL-05 |

### hookComplexityGuard.test.ts（architecture ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| R3 | hooks/ に @internal export がない | INV-HOOK-01 |
| R3 | テストに typeof === 'function' アサーションがない | INV-HOOK-02 |
| R7 | stores/ の set() コールバック内に算術式がない | INV-STORE-01 |
| R10 | hooks/ の export にカバレッジ目的のコメントがない | INV-HOOK-03 |

### comparisonMigrationGuard.test.ts（architecture ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| — | presentation/application で prevYear.daily.get(day) 禁止 | INV-CMP-01 |
| — | day 番号 + offset による前年比較禁止 | INV-CMP-02 |
| — | ComparisonFrame.previous の新規使用禁止 | INV-CMP-03 |
| — | aggregateWithOffset の新規使用禁止 | INV-CMP-04 |
| — | dailyMapping を直接ループして独自 Map を構築する禁止（sourceDate 劣化防止） | INV-CMP-08 |

### sameDowPoint.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| buildSameDowPoints が sourceDate（prevYear/prevMonth/prevDay）を保持する | INV-CMP-09 |
| 月跨ぎ（2026/2/28 → 2025/3/1）で sourceDate.month=3 を失わない | INV-CMP-09 |
| Σ(points.sales) = Σ(dailyMapping.prevSales) | INV-CMP-09 |
| Σ(points.customers) = Σ(dailyMapping.prevCustomers) | INV-CMP-09 |
| points のキー集合 = dailyMapping の currentDay 集合 | INV-CMP-09 |
| 年跨ぎ（2026/1/1 → 2024/12/27）で sourceDate を保持する | INV-CMP-09 |

### ComparisonScopeInvariant.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| prevYearSameDow の period2 は候補窓（period1 + 14日） | INV-CMP-05 |
| alignmentMap は位置ベースで DOW 解決を担当しない | INV-CMP-06 |
| 1:1 プリセットの alignmentMap 長 = effectivePeriod1 長 | INV-CMP-07 |

## 許可リスト管理

### application → infrastructure 許可リスト（14件）

変更時は architecture ロールの承認が必要。

| ファイル | 理由 |
|---|---|
| `application/hooks/useDuckDB.ts` | DuckDB ライフサイクル管理 |
| `application/hooks/duckdb/useCtsQueries.ts` | 時間帯売上クエリ |
| `application/hooks/duckdb/useDeptKpiQueries.ts` | 部門KPIクエリ |
| `application/hooks/duckdb/useSummaryQueries.ts` | サマリクエリ |
| `application/hooks/duckdb/useYoyQueries.ts` | 前年比較クエリ |
| `application/hooks/duckdb/useFeatureQueries.ts` | 特徴量クエリ |
| `application/hooks/duckdb/useAdvancedQueries.ts` | 高度分析クエリ |
| `application/hooks/duckdb/useMetricsQueries.ts` | 店舗メトリクスクエリ |
| `application/hooks/duckdb/useDailyRecordQueries.ts` | 日次レコードクエリ |
| `application/hooks/useStoragePersistence.ts` | ストレージ永続化 |
| `application/hooks/useDataRecovery.ts` | データ復旧 |
| `application/hooks/useBackup.ts` | バックアップ |
| `application/hooks/useImport.ts` | ファイルインポート |
| `application/usecases/import/FileImportService.ts` | インポートサービス |
| `application/workers/useFileParseWorker.ts` | ワーカーフック |
| `application/usecases/export/ExportService.ts` | エクスポート |
| `application/hooks/useI18n.ts` | i18n ブリッジ |

### 比較移行許可リスト（INV-CMP-01: 11件、INV-CMP-03: 4件）

移行完了時にファイルを許可リストから削除する。新規追加は禁止。

#### INV-CMP-01: prevYear.daily.get() 許可リスト

| ファイル | 状態 |
|---|---|
| `presentation/pages/Daily/DailyPage.tsx` | DateKey 移行済み |
| `presentation/pages/Dashboard/widgets/AlertPanel.tsx` | DateKey 移行済み |
| `presentation/pages/Dashboard/widgets/DayDetailModal.tsx` | DateKey 移行済み |
| `presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts` | DateKey 移行済み |
| `presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx` | DateKey 移行済み |
| `presentation/pages/Dashboard/widgets/SalesAnalysisWidgets.tsx` | DateKey 移行済み |
| `presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx` | DateKey 移行済み |
| `presentation/pages/Insight/InsightTabBudget.tsx` | DateKey 移行済み |
| `presentation/pages/Forecast/ForecastPage.helpers.ts` | DateKey 移行済み |
| `application/hooks/useBudgetChartData.ts` | DateKey 移行済み |
| `application/usecases/clipExport/buildClipBundle.ts` | DateKey 移行済み |

#### INV-CMP-08: dailyMapping 直接使用許可リスト

| ファイル | 理由 |
|---|---|
| `presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx` | `...row` でスプレッドし全フィールド保持。sourceDate を落とさない正当な使用 |

#### INV-CMP-03: comparisonFrame.previous 許可リスト

| ファイル | 状態 |
|---|---|
| `presentation/pages/Dashboard/widgets/DayDetailModal.tsx` | 移行待ち |
| `presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts` | 移行待ち |
| `presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx` | 移行待ち |
| `presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx` | 移行待ち |
