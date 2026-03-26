# 直近の主要変更（#673-#692）

> 更新日: 2026-03-26

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
