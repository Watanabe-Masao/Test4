# 旧計画・監査文書の圧縮要約

## architecture-evolution-plan.md

CQRS + 契約ハイブリッド設計への進化計画。JS Command 側（authoritative 計算）と DuckDB Query 側（探索）を分離し、Phase 0-7 で段階的に移行する。CLAUDE.md の「アーキテクチャ進化計画（要約）」セクションに要点が記載済み。

- **Why archived:** 要点は CLAUDE.md に集約済み。詳細な Phase 定義は実装進行に伴い個別 engine README に移行
- **What remains relevant:** CQRS の基本方針、Command/Query 分離の原則、Phase の概念
- **Superseded by:** CLAUDE.md + `01-principles/engine-boundary-policy.md` + `02-status/engine-maturity-matrix.md`

## module-structure-evolution.md

横スライス（層別）から縦スライス（機能別）への構造移行ロードマップ。sales / inventory / category / customer / forecast の 5 機能ドメインに分割し、各スライス内に 4 層を持つ構成を提案。

- **Why archived:** 要点は CLAUDE.md に集約済み。移行は改修タイミングで段階的に実施
- **What remains relevant:** 縦スライスの境界定義、shared/ の役割、バレル re-export による後方互換
- **Superseded by:** CLAUDE.md「モジュール構造の進化方針（要約）」

## record-store-architecture.md

月 blob 単位から record 粒度への IndexedDB 永続化リデザイン。7 つの構造的欠陥（データリーク、import source 喪失、月切替汚染等）を解決する 3 層パイプライン（Parse → Classify → Persist）を定義。

- **Why archived:** 設計は確定済み。実装フェーズに移行
- **What remains relevant:** 3 層パイプラインの設計、source tracking の必要性
- **Superseded by:** 実装コードが正本

## implementation-plan-constants-metrics.md

ビジネス用語の定数化と MetricId レジストリ拡張（25→50 指標）の実装計画。

- **Why archived:** 計画は完了。50 MetricId が実装・文書化済み
- **What remains relevant:** なし
- **Superseded by:** `03-guides/metric-id-registry.md`

## quality_audit_2026-02-21.md

2026-02-21 時点の品質ベースライン。lint 警告 33 件、616 テスト通過。6 件の高優先バグ候補（useCallback/useEffect 依存配列）、12 件の中優先技術的負債を識別。

- **Why archived:** ベースライン記録。現在は CI 6 段階ゲートで継続的に品質を保証
- **What remains relevant:** リファクタリング前後の改善度測定の基準値
- **Superseded by:** `02-status/quality-audit-latest.md`（最新監査）+ CI ゲート

## ts-calculation-audit.md

Application 層に散在する calculation-like コードの監査。Domain 層（pure + authoritative）に移動すべきコードを識別し、Engine 境界による分類を実施。

- **Why archived:** 監査結果は engine 別 README と responsibility-map に反映済み
- **What remains relevant:** リファクタリング対象の識別パターン（どのコードが Application 層に残るべきか）
- **Superseded by:** `04-engines/*/ts-responsibility-map.md`
