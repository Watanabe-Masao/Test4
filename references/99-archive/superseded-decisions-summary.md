# ADR・意思決定記録の圧縮要約

## ADR-001: DuckDB-WASM 導入（Accepted）

ブラウザ内 SQL 分析エンジンとして DuckDB-WASM を採用。時間帯ヒートマップ、階層ロールアップ、ウィンドウ関数、YoY クロス結合などの探索クエリを実現。Phase 1 のパフォーマンスボトルネックを解決。

- **Status:** 採用済み・運用中
- **What remains relevant:** DuckDB は Exploration Engine の基盤技術として定着
- **Current reference:** `03-guides/duckdb-architecture.md`

## ADR-002: 期間選択モデル刷新（Superseded by ADR-003）

分散していた targetYear/targetMonth/dataEndDay/ComparisonFrame を統一的な期間選択モデルに再設計する計画。Phase 1-2 のコードは保存、Phase 4 以降は ADR-003 に吸収。

- **Status:** ADR-003 に置換
- **What remains relevant:** PeriodSelection.ts が存在する歴史的理由
- **Current reference:** ADR-003 の方針に従う

## ADR-003: 統一パイプラインアーキテクチャ（Accepted）

「DuckDB チャート」vs「JS チャート」の二分法を廃止。比較ロジックを散在する SQL 結合やフック内マージから正規化された comparison row に統一。

- **Status:** 採用済み・実装進行中
- **What remains relevant:** チャート実装時の基本方針。全チャートが統一パイプラインに従う
- **Current reference:** CLAUDE.md「アーキテクチャ進化計画」セクション

## 前年同曜日比較の日付劣化バグ（Root Cause Analysis）

月末 YoY 曜日マッピングバグ（2/28 → 不正な 3 月日付）の根本原因分析。3 層にまたがる原因（sourceMonth 誤算、DuckDB→JS タイムスタンプ喪失、不変条件テスト欠如）を特定。

- **Status:** 修正済み
- **What remains relevant:** 日付マッピングドメインにおけるガードテストパターンの好例。不変条件違反の検出と再発防止の手法
- **Current reference:** `03-guides/guard-test-map.md`（関連ガードテスト）
