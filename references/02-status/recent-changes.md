# 直近の主要変更（#673-#730+）

> 更新日: 2026-03-29

## 仕入原価正本化 + 取得経路統合（2026-03-29）

仕入原価がページによって異なる値を示す問題を解決:

1. **移動原価 IN のみフィルタ是正** — 仕入分析の3箇所で transfers を IN のみフィルタしていたため二重計上が発生。全方向(IN+OUT)に修正
2. **複合正本構造を設計** — 3独立正本（通常仕入・売上納品・移動原価）を組み合わせて総仕入原価を構成。推定法は売上納品を除外して参照可能
3. **Zod 正本契約を定義** — `PurchaseCostReadModel` で runtime 検証。3正本 + 導出値(grandTotalCost, inventoryPurchaseCost) + メタデータ
4. **ウォーターフォール売上修正** — CTS 依存から daily(StoreResult)正本に変更。CTS 不足時の警告追加
5. **仕入分析バグ修正** — cappedPrevDateTo 月跨ぎバグ、ピボット未来日差異非表示、取得経路一元化(KPI再計算)
6. **天気ファイル移動** — domain/calculations/ → domain/weather/ へ。NON_CALCULATION_FILES=0 達成
7. **定義書・計画書** — purchase-cost-definition.md(正本定義)、purchase-cost-unification-plan.md(実施計画)

### 関連文書
- `references/01-principles/purchase-cost-definition.md` — 仕入原価の正本定義
- `references/03-guides/purchase-cost-unification-plan.md` — 取得経路統合計画

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
