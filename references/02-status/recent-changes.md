# 直近の主要変更（#673-#848+）

> 更新日: 2026-04-02

## v1.7.0 アーキテクチャ改善 + バグ修正（2026-04-02）

### readModel pure builder 化（app→infra 12→7）

5 readModel を pure builder に変換。handler が infra query を呼び、pure builder に渡す構造:
- buildFreePeriodReadModel / buildFreePeriodBudgetReadModel / buildFreePeriodDeptKPIReadModel
- buildSalesFactReadModel / buildDiscountFactReadModel

### God Hook 分割

useUnifiedWidgetContext（49フィールド/29依存）を 3 bundle に分割:
- useComparisonBundle / useQueryBundle / useChartInteractionBundle

### comparison VM 共通基盤

- ComparisonPoint / DailyYoYRow / aggregateContributions を共通化
- storeContributions 直接ループを全て共通 VM 経由に統合

### Category チャート features/ 移動

35 ファイルを features/category/ui/charts/ に移動。バレル re-export で後方互換。

### 前年客数=0 バグ修正

ClassifiedSalesDaySummary に customers を追加し、flowers を JOIN。
getFlowers 個別参照 → summary.customers に統合。

### query-access audit

features/ スキャン + bundle hook 検出を追加。facadeHook: 0→4。

### KPI

- applicationToInfrastructure: 12 → 7
- queryHandlers: 30 → 33
- queryWithHandler: 21 → 29
- facadeHook: 0 → 4

---

## free-period 正本制度化 + 比較subsystem完全移行（2026-04-02）

### 自由期間 readModel + query infra分離

| readModel | 内容 | ガード |
|-----------|------|--------|
| readFreePeriodFact | 売上/仕入/客数/売変 | freePeriodPathGuard (7) |
| readFreePeriodBudgetFact | 月予算→日割り按分 | freePeriodBudgetPathGuard (5) |
| readFreePeriodDeptKPI | 部門KPI 自由期間集約 | freePeriodDeptKPIPathGuard (4) |

query 実装は infrastructure/duckdb/queries/ に分離済み。
readModel は orchestration + Zod parse のみ。

### 比較 subsystem 完全移行

- cmpDailyMapping allowlist: **0**（全件解消）
- PrevYearBudgetDetailPanel: buildSameDowPoints() 経由に移行
- VM が dailyMapping shape を知らない
- 比較意味論は application/comparison に完全に閉じた

### KPI

| 指標 | 値 |
|------|---|
| テスト | 5038 |
| ガードファイル | 31 |
| 自由期間 readModel | 3 |
| cmpDailyMapping | **0** |
| allowlist 総エントリ | 49 |

## adapter DI 化 + 正本ガード完全網羅（2026-04-02）

### adapter 撤去（Phase 1）

| 対象 | 変更 | allowlist |
|------|------|----------|
| weatherAdapter | re-export → AdapterContext.weather + useWeatherAdapter | -1 |
| ExportService | direct import → AdapterContext.export | -1 |
| useImport (rawFileStore) | direct import → AdapterContext.rawFile + RawFilePort | -1 |
| useDataRecovery (rawFileStore) | direct import → AdapterContext.rawFile | removalCondition 具体化 |

AdapterSet: 4 → 6 ports (weather/backup/fileSystem/storagePersistence/export/rawFile)

### 正本ガード完全網羅

| 正本 | ガード | テスト数 |
|------|--------|---------|
| 仕入原価 | purchaseCostPathGuard + importGuard | 24 |
| 粗利 | grossProfitPathGuard | 6 |
| 売上 | salesFactPathGuard | 5 |
| 値引き | discountFactPathGuard | 5 |
| 要因分解 | factorDecompositionPathGuard | 5 |
| 自由期間 | freePeriodPathGuard | 7 |
| PI値 | piValuePathGuard | 2 |
| 客数GAP | customerGapPathGuard | 2 |
| ComparisonScope | comparisonScopeGuard | 5 |
| AnalysisFrame | analysisFrameGuard | 9 |
| TemporalScope | temporalScopeGuard | 4 |

### 比較サブシステム（Phase 3）

- sourceDate 直接参照: presentation 層から消滅
- dailyMapping 直接ループ: 1 件のみ残存（buildSameDowPoints 移行待ち）

### KPI

| 指標 | 値 |
|------|---|
| allowlist 総エントリ | 47 |
| architecture allowlist | 10 |
| widget 自前取得 | 0 |
| active bridges | 4 |
| 互換 re-export | 1 |
| ImportedData direct import | 0 |
| comparison 独自解決 | 0 |
| 正本化 readModel | 6 |
| ガードファイル | 29 |
| ガードテスト | 262 |
| 全テスト | 5017 |

## MonthlyData 移行完了 + 自由期間分析基盤（2026-04-01）

### ImportedData → MonthlyData 構造移行

| 達成事項 | 詳細 |
|---------|------|
| dataStore | ImportedData-free（data/legacyData/dataVersion/_calculationData 全削除） |
| presentation 層 | `s.data` セレクタ **0**（ガードで禁止） |
| 計算パイプライン | dailyBuilder/summaryBuilder/storeAssembler/Worker → MonthlyData |
| import application 層 | orchestrator/singleMonth/multiMonth → MonthlyData 主語 |
| import infrastructure 層 | processDroppedFiles/processFileData → MonthlyData |
| storage / backup | IndexedDB 内部 + backup → MonthlyData |
| 削除済み API | setImportedData, setPrevYearAutoData, getComparisonFields |
| ImportedData direct import | **0**（ガードで禁止） |
| ガード | 4 回帰防止テスト + Exit KPI audit |

### 計算入口純粋化

| 達成事項 | 詳細 |
|---------|------|
| CalculationFrame | `daysInMonth` hidden dependency を型 + factory に集約 |
| 全入口 frame-aware | calculateAllStores / Worker / cache 全て CalculationFrame 経由 |
| cache frame-aware | computeCacheKey / fingerprint 全て frame |

### 自由期間分析基盤

| 達成事項 | 詳細 |
|---------|------|
| AnalysisFrame | BaseAnalysisFrame + FreePeriodAnalysisFrame + TemporalAnalysisFrame 分離 |
| FreePeriodReadModel | 6番目の正本化 readModel（Zod + DuckDB + JS summary） |
| useFreePeriodAnalysis | AnalysisFrame → ComparisonScope → DuckDB → ReadModel パイプライン |
| facade hooks | useAnalysisInput / useComparisonInput |
| 定義文書 | free-period-analysis-definition.md + cache-responsibility.md |

### 監視指標制度化

| KPI | baseline |
|-----|----------|
| 正本化 readModel 領域 | 6 |
| allowlist 総エントリ数 | 51 |
| widget 自前取得 | ≤ 16 |
| active bridges | ≤ 4 |
| 互換 re-export | ≤ 2 |
| ImportedData direct import | 0 |
| ComparisonScope 独自解決 | 0 |

## 正本化施策 完了（2026-03-30）

正本化施策の全 Workstream を完了。

### 完了条件の達成状況

| 完了条件 | 状態 |
|----------|------|
| purchase cost が唯一の取得正本として運用されている | ✅ |
| gross profit が唯一の計算正本として運用されている | ✅ |
| 主要 widget が readModel / calculateModel 消費に統一されている | ✅ |
| DualPeriod 比較入力が統一契約になっている | ✅ |
| UI 層に独自集計・独自 fallback・独自 before/after が残っていない | ✅ |
| guard / 一貫性テスト / 文書が揃っていて、再発を CI で止められる | ✅ |
| WASM trial が正本運用と切り離されている | ✅ |

### Workstream 達成状況

| Workstream | 内容 | PR |
|------------|------|-----|
| A: GP正本化完了 | 利用経路統一 + getEffectiveGrossProfit + raw fallback 禁止 + ラベル定数 + 一貫性テスト | #780, #783 |
| B: widget readModels 消費 | GrossProfitHeatmap .vm.ts + orchestrator 統合 + 分類表 + 移行ガイド | #780, #783 |
| C: DualPeriodSlider 統一 | 全11チャートから内蔵 Slider 削除 + ページレベル統合 + chartPeriodProps | #782, #785 |
| D: 硬化・完了監査 | guard-test-map + PR チェックリスト + GP一貫性テスト + 完了レビュー | #780, #783, #785 |

### 最終数値

| 指標 | 値 |
|------|-----|
| ガードテスト | 23ファイル / 225テスト |
| 不変条件カタログ | INV-CANON-01〜16 (16件) |
| Zod 契約（必須） | 14/14 (100%) |
| Zod 契約（検討） | 7/9 (78%) |
| 比率プリミティブ | 17カテゴリ |
| DualPeriodSlider チャート内呼び出し | 0 |
| raw GP fallback パターン | 0 |
| 全テスト | 4,951パス |

---

## 正本化体系完成 — 全 readModels ガード完備（2026-03-30）

全5正本（purchaseCost / grossProfit / salesFact / discountFact / factorDecomposition）に
パスガードが揃い、正本化体系の構造的防御が完成。

### 新規ガードテスト

| ガード | テスト数 | 保護対象 |
|--------|---------|----------|
| salesFactPathGuard | 5 | readSalesFact 存在・Zod契約・旧クエリimport禁止・orchestrator統合・定義書 |
| discountFactPathGuard | 5 | readDiscountFact 存在・Zod契約・旧クエリimport禁止・orchestrator統合・定義書 |
| factorDecompositionPathGuard | 5 | calculateFactorDecomposition 存在・Zod契約・domain直接import許可リスト制限・presentation層制限・定義書 |
| canonicalizationSystemGuard | 6 | 全readModelディレクトリ・ファイル構成・全定義書・レジストリ・orchestrator・CLAUDE.md参照 |

### 旧経路修正

- **causalChain.ts**: `decompose2` 直接import → `calculateFactorDecomposition` 正本経由に置換
- **grossProfit/index.ts**: バレルエクスポート追加（他の readModel と構成統一）

### 数値成果

| 指標 | Before | After |
|------|--------|-------|
| ガードテストファイル | 18 | **22** (+4) |
| ガードテスト数 | 197 | **212** (+15) |
| 正本パスガード数 | 2 (purchaseCost, grossProfit) | **6** (全正本+体系) |
| factorDecomposition 許可リスト外の直接import | 1 (causalChain) | **0** |

### Zod 契約拡充

- **sensitivity.ts**: 4スキーマ（SensitivityBase/Deltas/Result + ElasticityResult）
- **trendAnalysis.ts**: 2スキーマ（MonthlyDataPoint + TrendAnalysisResult）
- **advancedForecast.ts**: 4スキーマ（WMAEntry/MonthEndProjection/LinearRegression + WeatherAdjustedProjection）
- **correlation.ts**: 4スキーマ（CorrelationResult/NormalizedSeries/DivergencePoint/CorrelationMatrixCell）
- **forecast.ts**: 4スキーマ（WeeklySummary/DayOfWeekAverage/AnomalyDetectionResult + ForecastResult）
- **computeMovingAverage.ts**: 2スキーマ（MovingAveragePoint + MissingnessPolicy）
- **必須14/14完了、検討7/9完了**（残り2件は domain/models 依存で据え置き）

### getEffectiveGrossProfitRate 凍結ガード

- 利用ファイル数上限13に凍結。新規利用は grossProfitFromStoreResult 経由を強制

### 全正本化ガード一覧

| 正本 | パスガード | プロセステスト |
|------|-----------|---------------|
| purchaseCost | purchaseCostPathGuard (9) + importGuard (15) | readPurchaseCost.test (21) |
| grossProfit | grossProfitPathGuard (5) | calculateGrossProfit.test (15) |
| salesFact | salesFactPathGuard (5) | readSalesFact.test (8) |
| discountFact | discountFactPathGuard (5) | readDiscountFact.test (7) |
| factorDecomposition | factorDecompositionPathGuard (5) | calculateFactorDecomposition.test (6) |
| 体系統合 | canonicalizationSystemGuard (6) | — |
| 計算レジストリ | calculationCanonGuard (4) | — |

---

## 仕入原価正本化 + 取得経路統合（2026-03-29）

仕入原価がページによって異なる値を示す問題を解決。Phase 0 全タスク完了。

### バグ修正

1. **移動原価 IN のみフィルタ是正** — 仕入分析の3箇所で transfers を IN のみフィルタしていたため二重計上が発生。全方向(IN+OUT)に修正
2. **ウォーターフォール売上修正** — CTS 依存から daily(StoreResult)正本に変更。CTS 不足時の警告追加
3. **仕入分析バグ修正** — cappedPrevDateTo 月跨ぎバグ、ピボット未来日差異非表示

### 正本化（Phase 0 完了）

4. **複合正本構造** — 3独立正本（通常仕入・売上納品・移動原価）を組み合わせて総仕入原価を構成
5. **Zod 正本契約** — `PurchaseCostReadModel` で runtime 検証（fail fast）。3正本 + grandTotalCost(在庫法/仕入分析) + inventoryPurchaseCost(推定法)
6. **唯一の read 関数** — `readPurchaseCost.ts`（QueryHandler）で3正本を並列取得→統合→parse
7. **facade hook** — `usePurchaseCost.ts` で useQueryWithHandler 経由の統一入口
8. **既存切替** — `usePurchaseComparisonQuery` が `purchaseCostHandler` を使用。旧経路完全除去

### 構造防御

9. **取得経路ガード** — `purchaseCostPathGuard.test.ts`（9テスト、4層防御: import/集計/正本一貫性/手続き保証）
10. **冗長クエリ廃止** — `queryPurchaseBySupplier` 完全削除。`querySupplierNames`（名前解決専用）を新設。`buildSupplierAndCategoryData` を ReadModel ベースに全面書換え
11. **天気ファイル移動** — domain/calculations/ → domain/weather/ へ。NON_CALCULATION_FILES=0 達成

### 数値成果

| 指標 | 変更 |
|------|------|
| ガードテスト | 158 → **167**（+9: 仕入原価取得経路ガード 4層防御） |
| 一貫性テスト | **18** パス（ピボット/KPI 一致不変条件） |
| 取得経路 | 3経路 → **1経路**（readPurchaseCost に統合） |
| 移動原価フィルタ | IN のみ → **全方向**（二重計上解消） |
| 廃止した旧クエリ関数 | **7関数 + 3型** 完全削除 |
| 並列クエリ | 14本 → **8本** |
| ReadModel 粒度 | storeId × day（店舗別分析に対応） |
| プロセス正当性テスト | **63テスト**（21+9+15+18） |

### 関連文書
- `references/01-principles/purchase-cost-definition.md` — 仕入原価の正本定義
- `references/03-guides/purchase-cost-unification-plan.md` — 取得経路統合計画
- `app/src/application/readModels/purchaseCost/` — 複合正本実装

---

## ルーティング正本化・非同期状態統一・層境界改善（2026-03-29）

6つの並行ストリームを1セッションで完了:

1. **PageMeta 正本化** — 7箇所の断片化を PAGE_REGISTRY に統一、pageMetaGuard (12テスト) 追加
2. **AsyncState<T> 統一** — error 型 string→Error 統一、adapter 付き共通型
3. **Persistence Provider 化** — module-scope state → PersistenceContext + useReducer
4. **Presentation 層責務分割** — 10ファイルの計算ロジック・option builder を .vm.ts / Logic.ts に抽出
5. **層境界改善** — Port 型を domain/ports/ に移動、adapter を infrastructure/adapters/ に移動、AdapterProvider DI 導入
6. **ドキュメント清掃** — Recharts 残存コメント清掃、品質レポート・Engine Matrix 更新

### 数値成果

| 指標 | Before | After |
|------|--------|-------|
| Lint 警告 | 15 | **2** (-87%) |
| app→infra allowlist | 13 | **10** (-23%) |
| application/ports/ | 8 ファイル | **全廃** |
| テスト数 | 3,121 | **4,686** (+50%) |
| ガードテスト | 140 | **152** (+12) |

---

## 概要

5つの並行ストリームが収束した期間:

1. **Temporal Phase 0-5** — 移動平均 overlay の最小統合
2. **P5/DuckDB 収束** — composition root 整理・QueryHandler 完全移行
3. **WidgetContext 整理** — UnifiedWidgetContext 派生化・weather 分離
4. **Query 基盤 typed 化** — buildTypedWhere 完全移行・deprecated 管理
5. **Guard 強化** — 新規ガード3件・allowlist カテゴリ分割

---

## Temporal Analysis（#683-#692）

| PR | Phase | 内容 |
|----|-------|------|
| #683 | 0 | 入力型分離 + isolation テスト + temporal-analysis-policy 初版 |
| #684 | 0補修 | temporal isolation テストの store 依存チェック具体化 |
| #685 | 1 | Frame / Fetch Plan の最小導入 |
| #686 | 2 | Daily Series Foundation（連続日次系列 / 欠損 / provenance） |
| #687 | 3 | 最初の rolling 計算として moving average 導入 |
| #688 | 3改善 | row adapter / metric resolver を handler から分離 |
| #689 | 4 | temporal rolling guard + invariant + handler contract テスト |
| #690 | 4差分 | rolling guard 6ルール完成 + contract/policy 整合 |
| #691 | 5 | 日別売上チャートに移動平均 overlay 最小統合 |
| #692 | 5修正 | store×day rows の dateKey 集約（全店合計ベースに修正） |

### Phase 5 到達点

- 対象: 日別売上チャート（IntegratedSalesChart → DailySalesChart）
- 仕様: metric=sales / windowSize=7 / policy=strict / 初期ON / standard view のみ
- パターン: chart は overlay series を受けるだけ、rolling 計算を知らない
- Handler パイプライン: query → dateKey集約 → adapter → buildDailySeries → computeMovingAverage → sliceToAnchorRange

### 構造的成果

- `domain/calculations/temporal/` — 純粋計算（computeMovingAverage）
- `application/services/temporal/` — source normalization（aggregateStoreDaySummaryByDateKey, buildDailySeries）
- `application/queries/temporal/` — MovingAverageHandler
- `application/hooks/` — useTemporalAnalysis（低レベル）/ useMovingAverageOverlay（高レベル）
- Guard: temporalRollingGuard 6ルール（R-T1〜R-T6）で経路乱立を防止

---

## P5/DuckDB 収束（#673-#674）

### #673: useDuckDB composition root 分割

- weather hook 分離（useWeatherStoreId, usePrevYearWeather）
- QueryHandler 移行完了（22 chart + 2 page → allowlist 33→0）
- guard 強化 + 未使用コード削除

### #674: materializeSummary 最適化

- OPFS 復元時スキップ
- buildTypedWhere 完全移行（buildWhereClause を @deprecated 化）
- MaterializeResult インターフェース追加（rowCount, createMs, totalMs, skipped）
- D&D hook 抽出

---

## WidgetContext 整理（#676-#679, #682）

| PR | 内容 |
|----|------|
| #676 | WidgetContext を UnifiedWidgetContext 派生に変更 + materializeSummary テスト修正 |
| #677 | WidgetContext の未使用 import 削除 |
| #678 | toDashboardContext の戻り値に型アサーション追加 |
| #679 | WidgetContext の optional フィールド修正 |
| #682 | observationStatus を UnifiedWidgetContext コアフィールドに昇格 |

### 構造的成果

- UnifiedWidgetContext が主型。WidgetContext はその派生
- observationStatus: 'ok' | 'partial' | 'invalid' | 'undefined' — 品質シグナルとして昇格
- weather は application/hooks に分離（useWeatherStoreId, usePrevYearWeather）
- useWidgetQueryContext: DuckDB context の隔離層

---

## Query 基盤 typed 化（#675, #681）

- buildTypedWhere: 6型の discriminated union（dateRange, boolean, storeIds, code, in, raw）
- 全 queries/ ディレクトリで移行完了
- buildWhereClause: @deprecated マーカー付きで残存（互換）
- テストヘルパーも buildTypedWhere に統一（#681）

---

## Guard 強化（#680, #682）

### 新規ガードテスト

| ガード | 責務 |
|--------|------|
| temporalRollingGuard | rolling path の経路分離（6ルール R-T1〜R-T6） |
| purityGuard | Domain 純粋性 + store C3 検証 |
| codePatternGuard | @internal export 禁止 + 7パターン検出 |

### allowlist 構造変更

- `allowlists.ts`（単一ファイル）→ `allowlists/`（カテゴリ別ディレクトリ）
- architecture.ts / complexity.ts / duckdb.ts / migration.ts / size.ts / misc.ts
- 総エントリ: 99 → 87（migration 33→0, legacy 11→0 で大幅削減）

---

## 移動平均・チャート・UI 大規模改善（#730+）

### MA（移動平均）バグ修正・構造改善

- extraMetrics の policy を `strict` → `partial` に修正（commit 809cbe9 の退行を解消）
- `toMaData` を dateKey 再構築方式から `date.day` ベースの Map ルックアップに変更
- `remapPrevYearSeries` で `dateKey` だけでなく `date` も当年に更新（不変条件維持）
- 全 null の MA 系列をチャートに追加しない（legend/tooltip 不整合防止）
- standard 以外のビューでは MA クエリを停止
- MA 色をハードコードからテーマトークン（`ct.colors.primary` / `ct.colors.cyanDark`）に移行
- 前年整列ロジックを `prevYearAlignment.ts` に共通化（`alignPrevYearDay`）

### カテゴリ分析の拡張

- IntegratedSalesChart のカテゴリ分析タブを3ビューに拡張（日次推移 / カテゴリ棒 / ドリルダウン分析）
- 新規: `CategoryBarChart.tsx` — 期間内のカテゴリ別売上/点数の横棒グラフ
- 期間スコープを `analysisContext` に統一（SubAnalysisPanel と CategoryHierarchyExplorer で共通化）
- ドリル範囲の正確な渡し（`drillEnd` state + `useDrillDateRange` で prevYearScope もスコープ）

### カテゴリ別売変分析

- 新規: `CategoryDiscountChart.tsx` / `CategoryDiscountTable.tsx`
- ダブルクリックでドリルダウン（部門→ライン→クラス）、パンくず戻り対応
- 第二軸に売変率（散布図）、前年比較（rect マーカー + テーブル前年列）
- テーブルヘッダークリックでソート切替（グラフ連動）
- 親 DiscountTrendChart の種別フィルターを子に継承
- ChartCard に `collapsible` / `defaultCollapsed` prop を追加

### PI値分析改善

- 期間スライダー（DualPeriodSlider）を削除し全期間表示に
- ビュートグル「PI値」を「金額PI」「点数PI」に分離
- PI値7日MA を partial 方式に変更（月初からMA表示）
- 当年PI棒の前年比色分け: 上回り=primary、下回り=orange
- 前年PI棒を背後にグレー半透明で追加
- CategoryPerformanceChart を PerformanceIndexChart の子チャートに統合
- 新規: `StorePIComparisonChart.tsx` — 店舗別PI棒 + カテゴリ×店舗PIヒートマップ
- 新規クエリ: `storeCategoryAggregation.ts` + `StoreCategoryPIHandler.ts`

### motion アニメーション

- SegmentedControl: `motion.div layoutId` で pill スライド
- Tab (TimeSlotSalesChart.styles): TabWrapper + tab-indicator で pill スライド
- Modal: CSS keyframes → framer-motion variants（backdrop fade + panel spring）
- サブタブ切替: AnimatePresence + fade/slide
- Dashboard LazyWidget: フェードイン（opacity + scale）
- CategoryHierarchyExplorer: パンくず layout animation + テーブル fade
- 時間帯ヒートマップ: ドリル展開フェード
- prefers-reduced-motion 対応

### ヒートマップ・時間帯売上

- CategoryTimeHeatmap に `onCategoryClick` コールバック追加（行クリックでドリルダウン）
- TimeSlotChartView にドリル後の「← 戻る」ボタン追加
- ツールチップに前年天気を追加（`formatDailyTooltip` に `prevYearWeatherMap` 引数追加）
- 売変シリーズを折れ線から棒グラフに変更

### ForecastTools / SensitivityDashboard UI改善

- 新規: `SimulationInsightBanner.tsx` — 結論1行要約バナー（positive/caution/negative）
- 新規: `SimulationSummaryCard.tsx` — 主KPI + 従属KPI + 詳細折りたたみカード
- 新規: `simulationInsight.ts` — 閾値判定ロジック（getTool1Insight/getTool2Insight/getSensitivityInsight）
- ForecastTools: ExecRow 羅列 → InsightBanner + SummaryCard（Tool1: 2カード、Tool2: 3カード）
- SensitivityDashboard: ResultCard 5枚 → 3枚統合（粗利インパクト/売上シミュレーション/予算達成率変化）

### パフォーマンス・ログ改善

- Weather: inflight dedupe（同一 station/year/month の並列リクエストを Promise 共有）
- Weather: ログ責務を一層化（service 層は開始/完了/エラーのみ、infra 層は `weatherDebug()` で production 無効）
- DuckDB: `ConsoleLogger` → `VoidLogger`（production）/ `ConsoleLogger(WARNING)`（dev）

### ウィジェット整理

- `chart-discount-breakdown` / `chart-category-analysis` を独立ウィジェットから削除（IntegratedSalesChart に統合）
- `exec-department-kpi` を削除（データ未対応）
- `analysis-category-pi` を非表示化（PerformanceIndexChart に統合）
- `analysis-waterfall` は維持（粗利ウォーターフォール）
- YoYWaterfallChartWidget を IntegratedSalesChart に復元

### テスト品質改善

- `usePersistence.test.ts`: act 警告除去（waitFor で非同期復元完了を待つ）
- `ImportServiceAdditional.test.ts`: IndexedDB ノイズ解消（DatasetRegistry モック）、弱いアサーション強化
- `computeMovingAverage.test.ts`: 不変条件テスト5件追加（定数系列、出力長、strict⊂partial、min-max範囲、窓不足）
- `remapPrevYearInvariant.test.ts`: 新規6件（dateKey/date整合、value保持、月マタギ）
- `simulationInsight.test.ts`: 新規14件（判定関数全パターン）
- `SimulationSummaryCard.test.tsx`: 新規4件（折りたたみ挙動）
- `ForecastToolsUI.test.tsx`: 新規4件（InsightBanner/SummaryCard統合）
- `SensitivityDashboardUI.test.tsx`: 新規3件（3カード構成、シナリオ動線）
- `weatherDedupe.test.ts`: 新規4件（dedupe集約、cache クリア、エラー時、別key）
