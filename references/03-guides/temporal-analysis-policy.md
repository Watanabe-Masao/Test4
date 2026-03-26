# Temporal Analysis 方針

> 管理責任: architecture ロール
> 作成日: 2026-03-25 / 更新日: 2026-03-26（Phase 5 統合反映）

## 適用範囲

- **対象:** 新規 temporal analysis path（`*/temporal/` ディレクトリ以下）
- **非対象:** existing monthly path（useCalculation → CalculationOrchestrator → StoreResult）
- **非対象:** existing comparison path（ComparisonScope → useComparisonModule）
- **Phase 0 制限:** ComparisonScope bridge は Phase 6-7 まで導入しない

## 中心原則

| 原則 | 内容 |
|---|---|
| **A** | 期間基盤は仕様解釈層であり、既存計算ロジック置換層ではない |
| **B** | UI は「欲しい期間・分析」を宣言するだけで、requiredRange / requiredMonths / 境界仕様を知らない |
| **C** | ヘッダ月次指定と自由期間分析は別概念として扱う |
| **D** | 共通化するのは下位の frame / fetch plan / daily series であって、入力概念ではない |
| **E** | sourceDate / provenance / missingness を落とさない |
| **F** | 新基盤は useUnifiedWidgetContext をさらに肥大化させない。独立した analysis entrypoint を持つ |
| **G** | ComparisonScope は比較専用の正本として当面維持する。拙速に一般化しない |
| **H** | store粒度 source は series 化前に dateKey 集約して意味を確定する |

## 入力概念の3系統

| 入力 | 型 | 生成元 | 正本責務 |
|---|---|---|---|
| ヘッダ月次指定 | `MonthlyContext` | Header monthly selector | 月次粗利・予算・在庫計算 |
| 自由期間分析 | `AnalysisRequest` | 将来: Free analysis selector / Phase 5 暫定: Dashboard scope resolver (`buildTemporalInputFromDashboardScope`) | moving average / rolling sum / trend |
| 同様日比較 | `ComparisonPresetRequest` | Comparison selector | 前年比・同曜日比較 |

## 禁止事項

1. **useUnifiedWidgetContext に temporal analysis 責務を追加しない**（原則F）
2. **新基盤は既存 QueryHandler pattern 上で動作する** — 独自 DuckDB hook 経路を作らない
3. **ComparisonScope は比較専用正本として維持・一般化しない**（原則G）
4. **useDuckDB の再設計はスコープ外**
5. **header state を chart が直接読んではならない**（原則C/D）。resolver (`buildTemporalInputFromDashboardScope`) 経由の限定統合は Phase 5 暫定として許容。将来は Free analysis selector が正規の生成元となる
6. **AnalysisRequest → StoreResult 再計算禁止**
7. **UI / chart 内で month - 1, year - 1 を解かない**（原則B）
8. **buildDailySeries を通さず rolling 系系列を構築しない**（原則E）
9. **store粒度 source を dateKey 集約せずに rolling に入れない**（原則H）。queryStoreDaySummary は store×day 返却のため、series 構築前に aggregateStoreDaySummaryByDateKey で日別合計の意味を確定する

## 機械的検証

`test/temporal/temporalMonthlyIsolation.test.ts` で以下を import パターンガードで検証:

1. useUnifiedWidgetContext → temporal/ の import 禁止
2. useCalculation → temporal/ の import 禁止
3. temporal/ → useUnifiedWidgetContext の import 禁止
4. domain/models/temporal/ → ComparisonScope / comparison の import 禁止
5. domain/models/temporal/ → periodSelectionStore の import 禁止

## Phase 4: Rolling Path Guard（実装済み）

> Phase 4 は moving average を対象に完了。guard は rolling path 一般に先行対応。

### 実装済み Guard ルール（temporalRollingGuard.test.ts）

| Guard | ルール | 目的 |
|---|---|---|
| R-T1 | presentation/ で rolling 計算を import しない | UI に計算を置かない |
| R-T2 | application/hooks/ で rolling 計算を直接 import しない | hook に計算を書かない |
| R-T3 | temporal handler 以外で buildDailySeries + rolling 計算を組み合わせない | 経路の乱立防止 |
| R-T4 | presentation/ で windowSize + reduce/slice の手書き平均を禁止 | 逆流防止 |
| R-T5 | useUnifiedWidgetContext が temporal rolling を import しない | 結節点の保護 |
| R-T6 | comparison/ が temporal rolling を import しない | comparison path との混線防止 |

### 境界の定義

- **comparison path** は「比較意味解釈」（前年同月/同曜日/期間比較）
- **temporal rolling path** は「時系列窓計算」（移動平均/rolling sum/trend）
- 両者は合成可能でも、**実装経路は分離する**
- unified context は query result 倉庫でも temporal orchestration の入口でもない

## Phase 5: Moving Average Overlay 統合（実装済み）

> Phase 5 は日別売上チャートへの最小統合として完了。

### 到達点

| 項目 | 値 |
|---|---|
| 対象チャート | 日別売上・売変推移（IntegratedSalesChart → DailySalesChart） |
| metric | `sales`（当期売上のみ。比較系列・売変率には載せない） |
| windowSize | `7`（7日移動平均） |
| policy | `strict`（欠損日があれば null） |
| 初期状態 | ON（`useState(true)`） |
| 表示条件 | `dailyView === 'standard'` のみ |

### UI 統合パターン

- chart は overlay series を受けるだけ — rolling 計算を知らない
- 親 (`IntegratedSalesChart`) が `useMovingAverageOverlay` で `anchorSeries` を取得し、`DailySalesChart` に `movingAverageSeries` + `showMovingAverage` として渡す
- `DailySalesChartBody` が ECharts series として描画（dashed, indigo, smooth）

### Handler パイプライン（MovingAverageHandler）

```
1. buildTemporalFetchPlan(frame) → requiredRange/requiredMonths
2. queryStoreDaySummary(conn, params) → store×day rows
2.5. aggregateStoreDaySummaryByDateKey → dateKey 集約（日別合計の意味確定）
3. adaptStoreDaySummaryRow → DailySeriesSourceRow[]
4. buildDailySeries(plan, sourceRows, metric) → 連続日次系列
5. computeMovingAverage(series, windowSize, policy) → MA 計算
6. sliceToAnchorRange → anchorRange に切り戻し
```

## ディレクトリ配置

```
domain/models/temporal/        — 入力型（MonthlyContext, AnalysisRequest 等）
domain/calculations/temporal/  — 純粋計算（computeMovingAverage 等）
application/usecases/temporal/ — frame 構築 + scope resolver（buildAnalysisFrame, buildTemporalFetchPlan, buildTemporalInputFromDashboardScope）
application/services/temporal/ — source normalization + daily series（aggregateStoreDaySummaryByDateKey, buildDailySeries）
application/queries/temporal/  — QueryHandler（MovingAverageHandler 等）
application/hooks/             — useTemporalAnalysis（低レベル入口）/ useMovingAverageOverlay（高レベル入口 — Presentation 向け）
```
