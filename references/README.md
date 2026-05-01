# references/ ドキュメントガイド

> 運用仕様書群。AIと人間が安全に作業するための設計制約・ルール・参照情報を格納する。

## 構造

| ディレクトリ     | 内容                                                                                                                               | ファイル数 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `01-principles/` | 設計原則・制約・正本定義書（Engine 境界、正本化原則、業務値定義、AAG）                                                             | 40         |
| `02-status/`     | 進捗・品質状態（maturity, promotion, 品質監査, 課題管理）                                                                          | 24         |
| `03-guides/`     | 実装ガイド・リファレンス（API, データモデル, ガードテスト, 不変条件, 責務分離）                                                    | 71         |
| `05-contents/`   | 実装要素の**現状把握台帳**（widget / chart / readModel の振る舞い事実カタログ。改修前提資料。3 軸 drift 防御: 存在 / 構造 / 時間） | 1          |
| `99-archive/`    | 旧文書の圧縮要約（現行では参照しない）                                                                                             | 12         |

`04-design-system/` は Design System v2.1（本体 `presentation/theme/` の外部 documentation layer）。
サブディレクトリ `docs/` + `preview/` + `ui_kits/` を含む特殊構造のため上記表からは除外。詳細は下部「Design System v2.1」セクションを参照。

`05-contents/` は phased-content-specs-rollout Phase A〜J で `widgets/`（45 件）+ `read-models/`（10 件）+ `calculations/`（16 件、Lifecycle State Machine + canonicalRegistration sync + 双方向リンク対称性 + Behavior Claims (Phase J Evidence Level) institutionalize）+ `charts/`（5 件、Chart Input Builder Pattern 記録）+ `ui-components/`（5 件、selection rule 通過 UI 部品）の 5 サブカテゴリを保持。今後 `query-handlers/` / `pipelines/` / `projections/` 等の追加を想定（必要になったら増やす方針）。詳細は `05-contents/README.md` 参照。

### 05-contents/widgets/ 個別 spec（pilot）

| 型番         | 見出し                          | 概要                                                                      |
| ------------ | ------------------------------- | ------------------------------------------------------------------------- |
| `WID-001.md` | 店別予算達成状況                | Dashboard-local 最小構成 pilot（isVisible predicate + 単一 children）     |
| `WID-002.md` | 日別売上チャート                | Dashboard-local 17-field ctx 展開 pilot（props + full ctx 二重注入）      |
| `WID-003.md` | 粗利推移チャート                | Dashboard-local、registry file 内 pure helper 使用                        |
| `WID-004.md` | 時間帯×曜日ヒートマップ         | Dashboard-local、isVisible 関数参照 + full ctx passthrough                |
| `WID-005.md` | 店舗別時間帯比較                | Dashboard-local、UnifiedStoreHourlyWidget 委譲                            |
| `WID-006.md` | 売上・仕入 店舗比較             | Dashboard-local、render 内 inline logic + lane 経由                       |
| `WID-007.md` | 天気-売上 相関分析              | Dashboard-local、WeatherWidget 委譲                                       |
| `WID-008.md` | アラート                        | Dashboard-local、AlertPanelWidget 委譲                                    |
| `WID-009.md` | 曜日平均                        | Dashboard-local、renderDowAverage 委譲                                    |
| `WID-010.md` | 週別サマリー                    | Dashboard-local、renderWeeklySummary 委譲                                 |
| `WID-011.md` | 売上・売変・客数（日別×店舗）   | Dashboard-local、linkTo daily                                             |
| `WID-012.md` | 日別推定在庫                    | Dashboard-local、`computeEstimatedInventory` permanent floor              |
| `WID-013.md` | 店舗別KPI一覧                   | Dashboard-local、linkTo reports                                           |
| `WID-014.md` | 着地予測・ゴールシーク          | Dashboard-local、ForecastToolsWidget 委譲                                 |
| `WID-015.md` | 粗利ウォーターフォール          | Dashboard-local、WaterfallChartWidget 委譲、linkTo insight/decomposition  |
| `WID-016.md` | 粗利率ヒートマップ              | Dashboard-local、GrossProfitHeatmapWidget 委譲                            |
| `WID-017.md` | 客数×客単価 効率分析            | Dashboard-local、6-field destructuring                                    |
| `WID-018.md` | PI値・偏差値・Zスコア           | Dashboard-local、16-field + IIFE 2 箇所                                   |
| `WID-019.md` | カテゴリPI値・偏差値            | 常時非可視（isVisible false）、統合済みの residual                        |
| `WID-020.md` | 因果チェーン分析                | Dashboard-local、inline object literal + 3 null hardcode                  |
| `WID-021.md` | 感度分析ダッシュボード          | Dashboard-local、IIFE 経由 customerFact                                   |
| `WID-022.md` | 回帰分析インサイト              | Dashboard-local、minimal 3-field                                          |
| `WID-023.md` | 季節性ベンチマーク              | Dashboard-local、prop rename pattern                                      |
| `WID-024.md` | 売上トレンド分析                | Dashboard-local、DuckDB 3 点セット + isReady gate                         |
| `WID-025.md` | 曜日パターン分析                | Dashboard-local、DuckDB、size half 唯一                                   |
| `WID-026.md` | カテゴリ構成比推移              | Dashboard-local、DuckDB、2 条件 AND predicate                             |
| `WID-027.md` | カテゴリベンチマーク            | Dashboard-local、DuckDB                                                   |
| `WID-028.md` | カテゴリ箱ひげ図                | Dashboard-local、DuckDB                                                   |
| `WID-029.md` | CV時系列分析                    | Dashboard-local、DuckDB、group 構造分析                                   |
| `WID-030.md` | 粗利率トレンド                  | Unified、Daily page、6-field                                              |
| `WID-031.md` | シャープリー時系列              | Unified、Daily page、hasPrevYear gate + 二重判定                          |
| `WID-032.md` | 予算と実績（Insight）           | Unified、insightData 二重 null check                                      |
| `WID-033.md` | 予算達成シミュレーター          | Unified、features/budget 由来、core required result に null check         |
| `WID-034.md` | 損益構造（Insight）             | Unified、WID-032 と同構造                                                 |
| `WID-035.md` | 予測・パターン                  | Unified、sub-path forecastData gate                                       |
| `WID-036.md` | 売上要因分解                    | Unified、複合 predicate                                                   |
| `WID-037.md` | カテゴリベンチマーク（Insight） | Unified、DuckDB、3 重防御                                                 |
| `WID-038.md` | カテゴリ合計分析                | Unified、Category page、6-field + default 適用                            |
| `WID-039.md` | 店舗間比較（Category）          | Unified、型 assertion + 2 店舗以上 gate                                   |
| `WID-040.md` | サマリーKPI（原価明細）         | Unified ctx の page-local optional field pilot（costDetailData 非対称性） |
| `WID-041.md` | 仕入明細                        | Unified、costDetailData 二重 null check                                   |
| `WID-042.md` | 移動明細                        | Unified、WID-041 と完全同構造                                             |
| `WID-043.md` | 消耗品明細                      | Unified、onExplain 追加差分のみ                                           |
| `WID-044.md` | レポートサマリー                | Unified core required only、clean pattern                                 |
| `WID-045.md` | 部門別KPI                       | Unified core required only、45 件最終 entry                               |

**45 widget 全件 landed**。完全割当表は `05-contents/widgets/README.md` §「初期割当表」参照。

### 05-contents/read-models/ 個別 spec（Phase C 着手）

| 型番        | export                            | 配置                                                                         | 業務意味                                                     |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `RM-001.md` | `readPurchaseCost`                | `application/readModels/purchaseCost/readPurchaseCost.ts`                    | 仕入原価（typeIn / typeOut / costInclusion 統合）            |
| `RM-002.md` | `calculateGrossProfit`            | `application/readModels/grossProfit/calculateGrossProfit.ts`                 | 粗利（4 種: 在庫法×2 / 推定法×2）                            |
| `RM-003.md` | `buildSalesFactReadModel`         | `application/readModels/salesFact/readSalesFact.ts`                          | 売上ファクト（grand + dept / store / daily / hourly 5 view） |
| `RM-004.md` | `buildDiscountFactReadModel`      | `application/readModels/discountFact/readDiscountFact.ts`                    | 値引き（typeCode 71-74 内訳 + grand 整合不変）               |
| `RM-005.md` | `buildCustomerFactReadModel`      | `application/readModels/customerFact/readCustomerFact.ts`                    | 客数（StoreResult.totalCustomers 上書き先）                  |
| `RM-006.md` | `calculateFactorDecomposition`    | `application/readModels/factorDecomposition/calculateFactorDecomposition.ts` | 要因分解（Shapley 5 要素恒等式）                             |
| `RM-007.md` | `buildFreePeriodReadModel`        | `application/readModels/freePeriod/readFreePeriodFact.ts`                    | 自由期間分析（任意 dateRange、月境界非依存）                 |
| `RM-008.md` | `buildFreePeriodBudgetReadModel`  | `application/readModels/freePeriod/readFreePeriodBudgetFact.ts`              | 自由期間予算（按分）                                         |
| `RM-009.md` | `buildFreePeriodDeptKPIReadModel` | `application/readModels/freePeriod/readFreePeriodDeptKPI.ts`                 | 自由期間部門 KPI（加重平均率）                               |
| `RM-010.md` | `selectMonthlyPrevYearSales`      | `application/readModels/prevYear/selectMonthlyPrevYearSales.ts`              | 月次前年売上（sameDate / sameDow 2 mode）                    |

完全割当表は `05-contents/read-models/README.md` §「初期割当表」参照。

### 05-contents/calculations/ 個別 spec（Phase D 着手）

| 型番          | export                         | 配置                                                   | lifecycle / canonicalRegistration                                                 |
| ------------- | ------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `CALC-001.md` | `calculateCustomerGap`         | `domain/calculations/customerGap.ts`                   | active / current（WASM 候補 BIZ-013 を migration plan に記録）                    |
| `CALC-002.md` | `calculatePIValues`            | `domain/calculations/piValue.ts`                       | active / current（WASM 候補 BIZ-012 を migration plan に記録）                    |
| `CALC-003.md` | `computeEstimatedInventory`    | `domain/calculations/inventoryCalc.ts`                 | active / current（WASM 候補 BIZ-009、推定法粗利の入力）                           |
| `CALC-004.md` | `calculatePinIntervals`        | `domain/calculations/pinIntervals.ts`                  | active / current（WASM 候補 BIZ-011、rateOwnership: engine）                      |
| `CALC-005.md` | `evaluateObservationPeriod`    | `domain/calculations/observationPeriod.ts`             | active / current（WASM 候補 BIZ-010、データ品質 bitmask）                         |
| `CALC-006.md` | `calculateRemainingBudgetRate` | `domain/calculations/remainingBudgetRate.ts`           | active / current（WASM 候補 BIZ-008、rateOwnership: engine）                      |
| `CALC-007.md` | `decompose5`                   | `domain/calculations/factorDecomposition.ts`           | active / current（domain math、INV-SHAPLEY、BIZ-004、RM-006 が wrap）             |
| `CALC-008.md` | `calculateForecast`            | `domain/calculations/forecast.ts`                      | active / current（analytic-authoritative、ANA-006、forecastBridge）               |
| `CALC-009.md` | `calculateInvMethod`           | `domain/calculations/invMethod.ts`                     | active / current（domain math、4 種粗利のうち 2 種、BIZ-001、RM-002 が wrap）     |
| `CALC-010.md` | `calculateEstMethod`           | `domain/calculations/estMethod.ts`                     | active / current（domain math、4 種粗利のうち 2 種、BIZ-002、RM-002 が wrap）     |
| `CALC-011.md` | `calculateBudgetAnalysis`      | `domain/calculations/budgetAnalysis.ts`                | active / current（予算進捗 + 着地予測、BIZ-003、StoreResult 統合）                |
| `CALC-012.md` | `analyzeDowGap`                | `domain/calculations/dowGapAnalysis.ts`                | active / current（analytic-authoritative、ANA-007、calendar_effect）              |
| `CALC-013.md` | `calculateDiscountImpact`      | `domain/calculations/discountImpact.ts`                | active / current（売変ロス原価、BIZ-005、CALC-010 と協調）                        |
| `CALC-014.md` | `buildPrevYearCostApprox`      | `domain/calculations/prevYearCostApprox.ts`            | active / current（前年近似原価、ANA-005、SP-B 抽出）                              |
| `CALC-015.md` | `calculateTransferTotals`      | `domain/calculations/costAggregation.ts`               | active / current（移動 + 在庫仕入、BIZ-006）                                      |
| `CALC-016.md` | `calculateMarkupRates`         | `domain/calculations/markupRate.ts`                    | active / current（値入率、BIZ-007、CALC-010 供給元）                              |
| `CALC-017.md` | `findCoreTime`                 | `domain/calculations/timeSlotCalculations.ts`          | active / current（time_pattern、ANA-001、補助 findTurnaroundHour/buildHourlyMap） |
| `CALC-018.md` | `computeKpis`                  | `domain/calculations/budgetSimulator.ts`               | active / current（budget_simulation、ANA-010、budgetAnalysis 部品 orchestration） |
| `CALC-019.md` | `aggregateDowAverages`         | `domain/calculations/budgetSimulatorAggregations.ts`   | active / current（CALC-018 と協調、ANA-010、曜日別/週別 drill-down）              |
| `CALC-020.md` | `calculateMonthEndProjection`  | `domain/calculations/algorithms/advancedForecast.ts`   | active / current（forecasting、ANA-002、複数手法+95%信頼区間）                    |
| `CALC-021.md` | `pearsonCorrelation`           | `domain/calculations/algorithms/correlation.ts`        | active / current（statistical、ANA-005、相関マトリクス/正規化/divergence）        |
| `CALC-022.md` | `calculateSensitivity`         | `domain/calculations/algorithms/sensitivity.ts`        | active / current（what_if、ANA-003、4 種 delta 粗利インパクト）                   |
| `CALC-023.md` | `analyzeTrend`                 | `domain/calculations/algorithms/trendAnalysis.ts`      | active / current（temporal_pattern、ANA-004、MoM/YoY/MA/季節性）                  |
| `CALC-024.md` | `computeMovingAverage`         | `domain/calculations/temporal/computeMovingAverage.ts` | active / current（time_series、ANA-009、strict/partial missingness）              |

完全割当表は `05-contents/calculations/README.md` §「初期割当表」参照。Lifecycle State Machine + Promote Ceremony は `references/03-guides/promote-ceremony-pr-template.md` 参照。

### 05-contents/charts/ 個別 spec（Phase E 着手）

| 型番           | export                         | 配置                                                              | builders / logic / vm                              |
| -------------- | ------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| `CHART-001.md` | `SalesPurchaseComparisonChart` | `presentation/components/charts/SalesPurchaseComparisonChart.tsx` | builders 有 / 他 -（WID-006 子）                   |
| `CHART-002.md` | `PerformanceIndexChart`        | `presentation/components/charts/PerformanceIndexChart.tsx`        | builders 有 / 他 -（WID-018 子、PI 値）            |
| `CHART-003.md` | `BudgetVsActualChart`          | `presentation/components/charts/BudgetVsActualChart.tsx`          | builders + vm（reference 実装）                    |
| `CHART-004.md` | `CustomerScatterChart`         | `presentation/components/charts/CustomerScatterChart.tsx`         | builders 有 / 他 -（WID-017 子）                   |
| `CHART-005.md` | `GrossProfitAmountChart`       | `presentation/components/charts/GrossProfitAmountChart.tsx`       | logic 有（chartRenderingStructureGuard reference） |

完全割当表は `05-contents/charts/README.md` §「初期割当表」参照。

### 05-contents/ui-components/ 個別 spec（Phase F 着手）

| 型番         | export                     | 配置                                                                | category / 該当 selection rule                                           |
| ------------ | -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `UIC-001.md` | `ConditionSummaryEnhanced` | `presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx` | dashboard-summary（4 widget 参照、Pick<> 重 props、ADR-A-001 PR3 関連）  |
| `UIC-002.md` | `KpiCard`                  | `presentation/components/common/KpiCard.tsx`                        | kpi-display（5+ pages、KpiWarningInfo / KpiDisplayMode、Storybook 整備） |
| `UIC-003.md` | `KpiGrid`                  | `presentation/components/common/KpiCard.styles.ts`                  | kpi-layout（KpiCard と pair で多用）                                     |
| `UIC-004.md` | `ChartCard`                | `presentation/components/charts/ChartCard.tsx`                      | chart-shell（全 chart 共通 wrapper、4 state overlay）                    |
| `UIC-005.md` | `ChartLoading`             | `presentation/components/charts/ChartState.tsx`                     | chart-state（ChartError / ChartEmpty と pair）                           |

完全割当表は `05-contents/ui-components/README.md` §「初期割当表」参照。selection rule (複数 widget/page 参照 / props 重い / responsibility hotspot) 通過のみ対象。

## 正本一覧

各事実の定義元は1箇所。他の文書は正本を参照のみ。

| テーマ                                                                                                 | 正本                                                            |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 設計原則 9 カテゴリ A-I + Q（48 タグ）                                                                 | `01-principles/design-principles.md`                            |
| 設計原則が兼ねる禁止事項                                                                               | CLAUDE.md §設計原則（A1-H6 + Q3-Q4 の各項目が禁止事項を兼ねる） |
| Engine 境界・3 エンジン定義                                                                            | `01-principles/engine-boundary-policy.md`                       |
| 意味分類ポリシー                                                                                       | `01-principles/semantic-classification-policy.md`               |
| JS vs DuckDB 責務                                                                                      | `01-principles/engine-responsibility.md`                        |
| データパイプライン整合性                                                                               | `01-principles/data-pipeline-integrity.md`                      |
| 期間スコープの意味論                                                                                   | `01-principles/temporal-scope-semantics.md`                     |
| データフロー 4 段階                                                                                    | `01-principles/data-flow.md`                                    |
| ドメイン率プリミティブ                                                                                 | `01-principles/domain-ratio-primitives.md`                      |
| 観測期間仕様                                                                                           | `01-principles/observation-period-spec.md`                      |
| UI/UX 4 原則                                                                                           | `01-principles/uiux-principles.md`                              |
| 正本化原則（P1-P7）                                                                                    | `01-principles/canonicalization-principles.md`                  |
| 仕入原価の正本定義                                                                                     | `01-principles/purchase-cost-definition.md`                     |
| 粗利の正本定義                                                                                         | `01-principles/gross-profit-definition.md`                      |
| 売上の正本定義                                                                                         | `01-principles/sales-definition.md`                             |
| 値引きの正本定義                                                                                       | `01-principles/discount-definition.md`                          |
| 予算の正本定義                                                                                         | `01-principles/budget-definition.md`                            |
| KPIの正本定義                                                                                          | `01-principles/kpi-definition.md`                               |
| PI値の正本定義                                                                                         | `01-principles/pi-value-definition.md`                          |
| 客数GAPの正本定義                                                                                      | `01-principles/customer-gap-definition.md`                      |
| Authoritative計算の定義                                                                                | `01-principles/authoritative-calculation-definition.md`         |
| 正本化マップ                                                                                           | `01-principles/calculation-canonicalization-map.md`             |
| MetricId レジストリ                                                                                    | `03-guides/metric-id-registry.md`（50 定義/42 実装済み）        |
| 不変条件カタログ                                                                                       | `03-guides/invariant-catalog.md`                                |
| Compare 共通規約                                                                                       | `03-guides/compare-conventions.md`                              |
| 天気データ基盤                                                                                         | `03-guides/weather-architecture.md`                             |
| ウィジェット連携アーキテクチャ                                                                         | `03-guides/widget-coordination-architecture.md`                 |
| Authoritative 表示ルール                                                                               | `03-guides/authoritative-display-rules.md`                      |
| Engine maturity 定義                                                                                   | `02-status/engine-maturity-matrix.md`                           |
| Engine 昇格マトリクス                                                                                  | `02-status/engine-promotion-matrix.md`                          |
| Engine 昇格基準                                                                                        | `02-status/promotion-criteria.md`                               |
| 品質監査レポート                                                                                       | `02-status/quality-audit-latest.md`                             |
| 技術的負債ロードマップ                                                                                 | `02-status/technical-debt-roadmap.md`                           |
| AAG Core doc audit report (Phase 3 deliverable)                                                        | `02-status/aag-doc-audit-report.md`                             |
| AR-rule binding 品質基準 protocol (Project B Phase 3 batch 1)                                          | `02-status/ar-rule-audit.md`                                    |
| 直近の主要変更                                                                                         | `02-status/recent-changes.md`                                   |
| プロジェクト構成                                                                                       | `02-status/project-structure.md`                                |
| PI値昇格準備度                                                                                         | `02-status/promotion-readiness-piValue.md`                      |
| 客数GAP昇格準備度                                                                                      | `02-status/promotion-readiness-customerGap.md`                  |
| 残予算率昇格準備度                                                                                     | `02-status/promotion-readiness-remainingBudgetRate.md`          |
| 観測期間昇格準備度                                                                                     | `02-status/promotion-readiness-observationPeriod.md`            |
| 棚卸区間昇格準備度                                                                                     | `02-status/promotion-readiness-pinIntervals.md`                 |
| 推定在庫昇格準備度                                                                                     | `02-status/promotion-readiness-inventoryCalc.md`                |
| 感度分析昇格準備度                                                                                     | `02-status/promotion-readiness-sensitivity.md`                  |
| 相関分析昇格準備度                                                                                     | `02-status/promotion-readiness-correlation.md`                  |
| 移動平均昇格準備度                                                                                     | `02-status/promotion-readiness-movingAverage.md`                |
| トレンド分析昇格準備度                                                                                 | `02-status/promotion-readiness-trendAnalysis.md`                |
| 曜日GAP昇格準備度                                                                                      | `02-status/promotion-readiness-dowGapAnalysis.md`               |
| responsibility-taxonomy-v2 Migration Map                                                               | `03-guides/responsibility-v1-to-v2-migration-map.md`            |
| test-taxonomy-v2 TSIG Migration Map                                                                    | `03-guides/test-tsig-to-v2-migration-map.md`                    |
| Discovery Review チェックリスト                                                                        | `03-guides/discovery-review-checklist.md`                       |
| ガードテスト対応表                                                                                     | `03-guides/guard-test-map.md`                                   |
| 許可リスト運用                                                                                         | `03-guides/allowlist-management.md`                             |
| 意味分類 Inventory 手順書                                                                              | `03-guides/semantic-inventory-procedure.md`                     |
| レジストリ所有権ポリシー                                                                               | `03-guides/directory-registry-ownership-policy.md`              |
| 移行タグ運用ポリシー                                                                                   | `03-guides/migration-tag-policy.md`                             |
| 契約定義ポリシー                                                                                       | `03-guides/contract-definition-policy.md`                       |
| Current群保守ポリシー                                                                                  | `03-guides/current-maintenance-policy.md`                       |
| Tier 1 Business移行計画                                                                                | `03-guides/tier1-business-migration-plan.md`                    |
| Analytic Kernel移行計画                                                                                | `03-guides/analytic-kernel-migration-plan.md`                   |
| Guard統合整理+JS正本縮退                                                                               | `03-guides/guard-consolidation-and-js-retirement.md`            |
| Promote Ceremony テンプレート                                                                          | `03-guides/promote-ceremony-template.md`                        |
| DuckDB アーキテクチャ・Query Access Rules（Q1-Q6）                                                     | `03-guides/duckdb-architecture.md`                              |
| 計算エンジン                                                                                           | `03-guides/calculation-engine.md`                               |
| WASM 二重実行ランブック                                                                                | `03-guides/wasm-dual-run-runbook.md`                            |
| 拡張プレイブック                                                                                       | `03-guides/extension-playbook.md`                               |
| 仕入原価統合計画                                                                                       | `03-guides/purchase-cost-unification-plan.md`                   |
| Temporal 分析ポリシー                                                                                  | `03-guides/temporal-analysis-policy.md`                         |
| WASM 候補適性判定基準                                                                                  | `03-guides/wasm-candidate-eligibility.md`                       |
| データロード冪等化計画（idempotent load contract 正本 / Done 定義）                                    | `03-guides/data-load-idempotency-plan.md`                       |
| idempotent load contract 引き継ぎ書（要約 — plan のビュー）                                            | `03-guides/data-load-idempotency-handoff.md`                    |
| Read-path 重複耐性 Spot Audit（FRAGILE/PARTIAL/SAFE 分類の根拠資料）                                   | `03-guides/read-path-duplicate-audit.md`                        |
| projects/ 運用ルール（ドキュメントと課題の分離 / checklist 駆動の completion 管理）                    | `03-guides/project-checklist-governance.md`                     |
| 新規 project bootstrap ガイド（必須セット / 派生セット判定 / overlay defaults / 切替検証）             | `03-guides/new-project-bootstrap-guide.md`                      |
| AAG-COA Projectization Policy（立ち上げ前の入口判定 / Level 0-4）                                      | `03-guides/projectization-policy.md`                            |
| Deferred Decision Pattern（途中判断 制度化 / AI 自主判断 + judgement criteria 集約）                   | `03-guides/deferred-decision-pattern.md`                        |
| AAG ディレクトリ index（Layer 0+1 Meta / Layer 2+3 Core / Layer 4 Audit の単一エントリ）               | `01-principles/aag/README.md`                                   |
| AAG Meta charter（目的 + 要件 = AAG-REQ-\* namespace + 5 層 × 5 縦スライス mapping + audit framework） | `01-principles/aag/meta.md`                                     |
| AAG Strategy（戦略マスター + 文化論 + 意図的に残す弱さ、Layer 0+1）                                    | `01-principles/aag/strategy.md`                                 |
| AAG Architecture（5 層構造定義 + 旧 4 層 → 新 5 層 mapping、Layer 1+2）                                | `01-principles/aag/architecture.md`                             |
| AAG Evolution（進化動学 = Discovery / Accumulation / Evaluation、Layer 1+2）                           | `01-principles/aag/evolution.md`                                |
| AAG Operational Classification（now / debt / review 運用区分、Layer 2 governance-ops）                 | `01-principles/aag/operational-classification.md`               |
| AAG Source of Truth（正本 / 派生物 / 運用物 区分ポリシー、Layer 2 governance-ops）                     | `01-principles/aag/source-of-truth.md`                          |
| AAG Layer Map（ファイル別 5 層マッピング、Layer 2 reference）                                          | `01-principles/aag/layer-map.md`                                |
| AAG 5.0 4層構造定義（旧、Project A Phase 5 で archive 予定）                                           | `01-principles/aag-5-constitution.md`                           |
| AAG 5.0 既存ファイル層マッピング（旧、Phase 5.1 で archive 移管済 → aag/layer-map.md）                 | `99-archive/aag-5-layer-map.md`                                 |
| AAG 5.0 正本/派生/運用物ポリシー（旧、Project A Phase 5 で archive 予定）                              | `01-principles/aag-5-source-of-truth-policy.md`                 |
| Test Signal Integrity — 品質シグナル保全の原則                                                         | `01-principles/test-signal-integrity.md`                        |
| Test Signal Integrity Advisory 運用ガイド                                                              | `03-guides/test-signal-integrity-advisory.md`                   |
| Taxonomy v2 Constitution（責務軸 + テスト軸の 7 不可侵原則）                                           | `01-principles/taxonomy-constitution.md`                        |
| Taxonomy v2 Interlock マトリクス（R ⇔ T 双方向契約）                                                   | `01-principles/taxonomy-interlock.md`                           |
| Taxonomy v2 Origin Journal（全タグの Why / When / Who / Sunset）                                       | `01-principles/taxonomy-origin-journal.md`                      |
| Responsibility Taxonomy Schema v2（v2 R:tag vocabulary 仕様正本、子 Phase 1 deliverable）              | `01-principles/responsibility-taxonomy-schema.md`               |
| Test Taxonomy Schema v2（v2 T:kind vocabulary 仕様正本、子 Phase 1 deliverable）                       | `01-principles/test-taxonomy-schema.md`                         |
| Taxonomy v2 Review Journal（review window 記録）                                                       | `02-status/taxonomy-review-journal.md`                          |
| Taxonomy v2 Review Window 運用ガイド（四半期 window 手続き + 判定基準）                                | `03-guides/taxonomy-review-window.md`                           |
| Responsibility Taxonomy Operations（責務軸 R:\* 運用ガイド、子 Phase 5 deliverable）                   | `03-guides/responsibility-taxonomy-operations.md`               |
| Test Taxonomy Operations（テスト軸 T:\* 運用ガイド、子 Phase 5 deliverable）                           | `03-guides/test-taxonomy-operations.md`                         |

## AI 向け索引 — カテゴリ別ファイルマップ

> 「この概念に関するドキュメントはどれか」を即座に特定するための索引。
> ファイルを探すときはまずここを見る。

### AAG（Adaptive Architecture Governance）

| ファイル                                             | 内容                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `AAG_OVERVIEW.md`                                    | **入口 doc** — AAG 一枚サマリ + 「困った時にどこを見るか」索引（Phase Q.O-1 deliverable）                              |
| `AAG_CRITICAL_RULES.md`                              | **入口 doc** — Tier 0 一覧（絶対踏んではいけない rule、Phase Q.O-1 + Q.O-2 deliverable）                               |
| `03-guides/aag-onboarding-path.md`                   | **入口 doc** — 初見者向け最短経路（タスク種別別の minimal reading path、Phase Q.O-1 deliverable）                      |
| `03-guides/guard-failure-playbook.md`                | Repair-style guard message 標準（既存 AagResponse / renderAagResponse 系統の明文化、Phase Q.O-4 deliverable）          |
| `03-guides/aag-change-impact-template.md`            | AAG 変更 PR の Impact Section 記入要領（Phase Q.M-1 deliverable）                                                      |
| `01-principles/adaptive-architecture-governance.md`  | **AAG 正本** — 構成要素、設計原則、バージョン履歴                                                                      |
| `01-principles/adaptive-governance-evolution.md`     | 進化の設計 — 3 層サイクル（発見→蓄積→評価）                                                                            |
| `01-principles/design-principles.md`                 | 設計原則 9 カテゴリ A-I + Q（48 タグ）                                                                                 |
| `01-principles/safe-performance-principles.md`       | H カテゴリ（Screen Runtime）の詳細                                                                                     |
| `01-principles/critical-path-safety-map.md`          | Safety Tier 分類                                                                                                       |
| `03-guides/architecture-rule-system.md`              | Architecture Rule 運用ガイド                                                                                           |
| `03-guides/integrity-pair-inventory.md`              | 整合性ペア inventory (canonicalization Phase A、13 ペア詳細 + selection rule + primitive 候補 + 採用候補リスト)        |
| `03-guides/integrity-domain-architecture.md`         | 整合性 Domain Skeleton 設計 (canonicalization Phase B〜F 完遂、14 primitive + adapter pattern + Phase F coverage 正本) |
| `03-guides/canonicalization-checklist.md`            | 整合性ペア追加 / 撤退の標準手順 (canonicalization Phase I 成果物、selection rule + 撤退規律 + 機械検証経路一覧)        |
| `03-guides/allowlist-management.md`                  | Allowlist 管理ガイド                                                                                                   |
| `03-guides/semantic-inventory-procedure.md`          | 意味分類 Inventory 手順書                                                                                              |
| `03-guides/directory-registry-ownership-policy.md`   | レジストリ所有権ポリシー                                                                                               |
| `03-guides/migration-tag-policy.md`                  | 移行タグ運用ポリシー                                                                                                   |
| `03-guides/contract-definition-policy.md`            | 契約定義ポリシー（Phase 3: BIZ/ANA 契約テンプレート + bridge 境界）                                                    |
| `03-guides/current-maintenance-policy.md`            | Current群保守ポリシー（Phase 4: 意味再分類 + 状態制限 + 保守観点）                                                     |
| `03-guides/tier1-business-migration-plan.md`         | Tier 1 Business 移行計画（Phase 5: 候補一覧 + 8ステップ + 判定基準）                                                   |
| `03-guides/analytic-kernel-migration-plan.md`        | Analytic Kernel 移行計画（Phase 6: 候補一覧 + 9ステップ + 不変条件）                                                   |
| `03-guides/guard-consolidation-and-js-retirement.md` | Guard 統合整理 + JS 正本縮退方針（Phase 7: 全マップ + 4段階縮退 + 違反レスポンス）                                     |
| `03-guides/promote-ceremony-template.md`             | Promote Ceremony テンプレート（Phase 8: 昇格提案書 + 実施手順 + 巻き戻し）                                             |
| `03-guides/guard-test-map.md`                        | ガードテスト対応表                                                                                                     |
| `03-guides/active-debt-refactoring-plan.md`          | Active-Debt リファクタリング計画                                                                                       |
| `03-guides/aag-phase4-6-plan.md`                     | AAG Phase 4-6 実装計画                                                                                                 |
| `03-guides/aag-rule-inventory.md`                    | AAG ルール棚卸し                                                                                                       |
| `03-guides/aag-physical-move-impact-matrix.md`       | AAG 物理移動影響マトリクス                                                                                             |
| `03-guides/governance-final-placement-plan.md`       | Governance 最終配置方針                                                                                                |
| `01-principles/architecture-rule-feasibility.md`     | ルール導入の実現可能性評価                                                                                             |
| `01-principles/aag-four-layer-architecture.md`       | AAG 4 層（Principles/Judgment/Detection/Response）                                                                     |
| `01-principles/aag-operational-classification.md`    | 運用区分表（即修正/構造負債/観測）                                                                                     |
| `01-principles/aag-rule-splitting-plan.md`           | ルール分割計画（例外圧 → protected harm ベース分割）                                                                   |
| `01-principles/aag-5-constitution.md`                | AAG 5.0 — 4層構造定義（Constitution/Schema/Execution/Operations）                                                      |
| `99-archive/aag-5-layer-map.md`                      | AAG 5.0 — 既存ファイルの層マッピング棚卸し（Phase 5.1 archived → 新 doc: aag/layer-map.md）                            |
| `01-principles/aag-5-source-of-truth-policy.md`      | AAG 5.0 — 正本/派生/運用物ポリシー                                                                                     |
| `01-principles/test-signal-integrity.md`             | Test Signal Integrity — 品質シグナル保全の原則 (H1-H4 / TSIG-TEST / TSIG-COMP)                                         |
| `03-guides/test-signal-integrity-advisory.md`        | Test Signal Integrity Advisory 運用ガイド (trigger / 文面 / 自己点検 / 昇格条件)                                       |

### 正本化（Canonicalization）

| ファイル                                            | 内容                                  |
| --------------------------------------------------- | ------------------------------------- |
| `01-principles/canonicalization-principles.md`      | 正本化原則 P1-P7                      |
| `01-principles/canonical-value-ownership.md`        | 値の所有権台帳（移行状態の追跡）      |
| `01-principles/canonical-input-sets.md`             | 正本入力セットの定義                  |
| `01-principles/calculation-canonicalization-map.md` | domain/calculations/ 全ファイルの分類 |

### 業務値定義書（Definition）

| ファイル                                                | 正本関数                                                 |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `01-principles/sales-definition.md`                     | `readSalesFact()`                                        |
| `01-principles/discount-definition.md`                  | `readDiscountFact()`                                     |
| `01-principles/customer-definition.md`                  | `readCustomerFact()`                                     |
| `01-principles/purchase-cost-definition.md`             | `readPurchaseCost()`                                     |
| `01-principles/gross-profit-definition.md`              | `calculateGrossProfit()`                                 |
| `01-principles/pi-value-definition.md`                  | `calculateQuantityPI()` / `calculateAmountPI()`          |
| `01-principles/customer-gap-definition.md`              | `calculateCustomerGap()`                                 |
| `01-principles/budget-definition.md`                    | StoreResult（統一済み）                                  |
| `01-principles/kpi-definition.md`                       | StoreResult（統一済み）                                  |
| `01-principles/authoritative-calculation-definition.md` | WASM authoritative 計算                                  |
| `01-principles/free-period-analysis-definition.md`      | `readFreePeriodFact()`                                   |
| `01-principles/free-period-budget-kpi-contract.md`      | `readFreePeriodBudgetFact()` / `readFreePeriodDeptKPI()` |

### アーキテクチャ設計

| ファイル                                          | 内容                                                        |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `01-principles/engine-boundary-policy.md`         | 3 エンジン境界（Authoritative / Application / Exploration） |
| `01-principles/semantic-classification-policy.md` | 意味分類ポリシー（business vs analytic、用語規則）          |
| `01-principles/engine-responsibility.md`          | JS vs DuckDB の責務分担                                     |
| `01-principles/data-flow.md`                      | データフロー 4 段階                                         |
| `01-principles/data-pipeline-integrity.md`        | パイプライン整合性                                          |
| `01-principles/temporal-scope-semantics.md`       | 期間スコープの分離ルール                                    |
| `01-principles/modular-monolith-evolution.md`     | モジュラーモノリス進化方針                                  |
| `01-principles/cache-responsibility.md`           | キャッシュ責務                                              |
| `01-principles/domain-ratio-primitives.md`        | ドメイン率プリミティブ                                      |
| `01-principles/monthly-data-architecture.md`      | 月次データ構造                                              |

### UI/UX・画面設計

| ファイル                                    | 内容                     |
| ------------------------------------------- | ------------------------ |
| `01-principles/uiux-principles.md`          | UI/UX 4 原則             |
| `01-principles/dual-period-definition.md`   | 2 期間比較の定義         |
| `01-principles/observation-period-spec.md`  | 観測期間仕様             |
| `01-principles/app-lifecycle-principles.md` | アプリライフサイクル原則 |

### 実装ガイド

| ファイル                                           | 内容                                |
| -------------------------------------------------- | ----------------------------------- |
| `03-guides/coding-conventions.md`                  | コーディング規約                    |
| `03-guides/runtime-data-path.md`                   | 実行時データ経路                    |
| `03-guides/chart-input-builder-pattern.md`         | Chart Input Builder Pattern         |
| `03-guides/chart-rendering-three-stage-pattern.md` | Chart Rendering Three-Stage Pattern |
| `03-guides/responsibility-separation-catalog.md`   | 責務分離 24 パターン                |
| `03-guides/invariant-catalog.md`                   | 不変条件カタログ                    |
| `03-guides/metric-id-registry.md`                  | MetricId レジストリ（50 定義）      |
| `03-guides/new-page-checklist.md`                  | 新規ページチェックリスト            |
| `03-guides/extension-playbook.md`                  | 拡張プレイブック                    |
| `03-guides/compare-conventions.md`                 | 比較共通規約                        |
| `03-guides/pr-review-checklist.md`                 | PR レビューチェックリスト           |

### DuckDB・クエリ

| ファイル                                     | 内容                                       |
| -------------------------------------------- | ------------------------------------------ |
| `03-guides/duckdb-architecture.md`           | DuckDB アーキテクチャ + Query Access Rules |
| `03-guides/duckdb-data-loading-sequence.md`  | データロード順序図                         |
| `03-guides/duckdb-type-boundary-contract.md` | 型境界契約                                 |
| `03-guides/data-model-layers.md`             | データモデル層                             |
| `03-guides/data-models.md`                   | データモデル詳細                           |

### 計算エンジン・WASM

| ファイル                                      | 内容                    |
| --------------------------------------------- | ----------------------- |
| `03-guides/calculation-engine.md`             | 計算エンジン設計        |
| `03-guides/wasm-dual-run-runbook.md`          | WASM 二重実行ランブック |
| `03-guides/safety-first-architecture-plan.md` | 安全設計改善計画        |

### ウィジェット・チャート

| ファイル                                        | 内容                                  |
| ----------------------------------------------- | ------------------------------------- |
| `03-guides/widget-coordination-architecture.md` | ウィジェット連携アーキテクチャ        |
| `03-guides/widget-readmodel-migration.md`       | Widget ReadModel 移行                 |
| `03-guides/chart-data-flow-map.md`              | チャートデータフローマップ            |
| `03-guides/explanation-architecture.md`         | 説明責任（Explanation）アーキテクチャ |
| `03-guides/authoritative-display-rules.md`      | Authoritative 表示ルール              |

### 天気・外部データ

| ファイル                                | 内容                  |
| --------------------------------------- | --------------------- |
| `03-guides/weather-architecture.md`     | 天気データ基盤        |
| `03-guides/temporal-analysis-policy.md` | Temporal 分析ポリシー |

### インフラ・運用

| ファイル                                    | 内容                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `03-guides/api.md`                          | API リファレンス                                                                          |
| `03-guides/operations.md`                   | 運用ガイド                                                                                |
| `03-guides/security.md`                     | セキュリティ                                                                              |
| `03-guides/file-import-guide.md`            | ファイルインポートガイド                                                                  |
| `03-guides/cloudflare-worker-setup.md`      | Cloudflare Worker セットアップ                                                            |
| `03-guides/rollback-policy.md`              | ロールバックポリシー                                                                      |
| `03-guides/ui-components.md`                | UI コンポーネント                                                                         |
| `03-guides/faq.md`                          | FAQ                                                                                       |
| `03-guides/app-lifecycle-implementation.md` | ライフサイクル実装                                                                        |
| `02-status/open-issues.md`                  | active project 索引（**live task table は持たない** — 各 project の checklist.md が正本） |

### プロモーション・昇格

| ファイル                                               | 内容                                     |
| ------------------------------------------------------ | ---------------------------------------- |
| `02-status/promotion-readiness-piValue.md`             | PI値の昇格準備度判定表（Phase 5 Step 8） |
| `02-status/promotion-readiness-customerGap.md`         | 客数GAPの昇格準備度判定表                |
| `02-status/promotion-readiness-remainingBudgetRate.md` | 残予算率の昇格準備度判定表               |
| `02-status/promotion-readiness-observationPeriod.md`   | 観測期間の昇格準備度判定表               |
| `02-status/promotion-readiness-pinIntervals.md`        | 棚卸区間の昇格準備度判定表               |
| `02-status/promotion-readiness-inventoryCalc.md`       | 推定在庫の昇格準備度判定表               |
| `02-status/promotion-readiness-sensitivity.md`         | 感度分析の昇格準備度判定表               |
| `02-status/promotion-readiness-correlation.md`         | 相関分析の昇格準備度判定表               |
| `02-status/promotion-readiness-movingAverage.md`       | 移動平均の昇格準備度判定表               |
| `02-status/promotion-readiness-trendAnalysis.md`       | トレンド分析の昇格準備度判定表           |
| `02-status/promotion-readiness-dowGapAnalysis.md`      | 曜日GAPの昇格準備度判定表                |

### WASM 移行

| ファイル                                     | 内容                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `03-guides/wasm-candidate-eligibility.md`    | WASM 候補適性の事前判定基準                                                                                                                                                                                                                                                       |
| `03-guides/data-load-idempotency-plan.md`    | データロード冪等化計画（**正本** — Phase 履歴 + Done 定義）                                                                                                                                                                                                                       |
| `03-guides/data-load-idempotency-handoff.md` | idempotent load contract 引き継ぎ書（**要約** — plan のビュー、後任者の入口）                                                                                                                                                                                                     |
| `03-guides/read-path-duplicate-audit.md`     | Read-path 重複耐性 Spot Audit（**根拠資料** — FRAGILE/PARTIAL/SAFE 分類）                                                                                                                                                                                                         |
| `03-guides/project-checklist-governance.md`  | projects/ 運用ルール（**規約の正本** — ドキュメントと課題の分離 / checklist 駆動の completion 管理）                                                                                                                                                                              |
| `03-guides/new-project-bootstrap-guide.md`   | 新規 project bootstrap ガイド（aag-format-redesign — 必須セット / 派生セット判定 / overlay defaults / 切替検証順序 / 実行可能粒度チェックリスト）                                                                                                                                 |
| `03-guides/projectization-policy.md`         | AAG-COA — Projectization Policy（**立ち上げ前の入口判定** — Level 0-4 / required + forbidden artifacts / escalation / project.json metadata / guard 仕様）                                                                                                                        |
| `03-guides/deferred-decision-pattern.md`     | Deferred Decision Pattern（**途中判断 制度化** — 計画段階で判断が難しい decision を実装着手時 / 進行中の AI 自主判断として deferred、判断基準 + 収集元 + AI/人間判断分離 + decision log + 適用 template、AAG Layer 4A System Operations、project-checklist-governance.md と並列） |

### 移行・廃止

| ファイル                                      | 内容                                   |
| --------------------------------------------- | -------------------------------------- |
| `03-guides/purchase-cost-unification-plan.md` | 仕入原価統合計画                       |
| `03-guides/legacy-governance-retirement.md`   | レガシーガバナンス廃止                 |
| `99-archive/`                                 | 旧文書の圧縮要約（現行では参照しない） |

### Design System v2.1

> 本体 `app/src/presentation/theme/` (tokens.ts + theme.ts + semanticColors.ts + colorSystem.ts) の外部 documentation layer。
> 本体コードには影響しない資産のみを格納する。

| ファイル                                         | 内容                                   |
| ------------------------------------------------ | -------------------------------------- |
| `04-design-system/README.md`                     | Design System v2.1 正本                |
| `04-design-system/SKILL.md`                      | DS 運用スキル                          |
| `04-design-system/colors_and_type.css`           | v2.1 CSS 変数（本体 tokens.ts と同期） |
| `04-design-system/components.css`                | v2.1 コンポーネント CSS                |
| `04-design-system/docs/tokens.md`                | 全トークン一覧                         |
| `04-design-system/docs/theme-object.md`          | AppTheme オブジェクト構造              |
| `04-design-system/docs/chart-semantic-colors.md` | 業務概念 → 色マップ                    |
| `04-design-system/docs/category-gradients.md`    | ti/to/bi/bo グラデーション             |
| `04-design-system/docs/trend-helpers.md`         | `sc.*` トレンド判定関数                |
| `04-design-system/docs/echarts-integration.md`   | ECharts 統合パターン                   |
| `04-design-system/docs/content-and-voice.md`     | コンテンツ・トーン                     |
| `04-design-system/docs/visual-foundations.md`    | 視覚基礎                               |
| `04-design-system/docs/iconography.md`           | アイコン運用                           |
| `04-design-system/docs/v2-to-v2.1-changes.md`    | v2.0 → v2.1 変更点                     |
| `04-design-system/docs/route-b-guide.md`         | 配置手順 + PR 本文テンプレート         |
| `04-design-system/preview/index.html`            | インタラクティブプレビュー入口         |
| `04-design-system/ui_kits/app/index.html`        | アプリ UI キット                       |
