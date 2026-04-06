# references/ ドキュメントガイド

> 運用仕様書群。AIと人間が安全に作業するための設計制約・ルール・参照情報を格納する。

## 構造

| ディレクトリ | 内容 | ファイル数 |
|---|---|---|
| `01-principles/` | 設計原則・制約・正本定義書（Engine 境界、正本化原則、業務値定義） | 29 |
| `02-status/` | 進捗・品質状態（maturity, promotion, 品質監査, 課題管理） | 11+ |
| `03-guides/` | 実装ガイド・リファレンス（API, データモデル, ガードテスト, 不変条件, 責務分離） | 36 |
| `99-archive/` | 旧文書の圧縮要約（現行では参照しない） | 4 |

## 正本一覧

各事実の定義元は1箇所。他の文書は正本を参照のみ。

| テーマ | 正本 |
|---|---|
| 設計原則 9 カテゴリ A-H + Q（48 タグ） | `01-principles/design-principles.md` |
| 設計原則が兼ねる禁止事項 | CLAUDE.md §設計原則（A1-H6 + Q3-Q4 の各項目が禁止事項を兼ねる） |
| Engine 境界・3 エンジン定義 | `01-principles/engine-boundary-policy.md` |
| JS vs DuckDB 責務 | `01-principles/engine-responsibility.md` |
| データパイプライン整合性 | `01-principles/data-pipeline-integrity.md` |
| 期間スコープの意味論 | `01-principles/temporal-scope-semantics.md` |
| データフロー 4 段階 | `01-principles/data-flow.md` |
| ドメイン率プリミティブ | `01-principles/domain-ratio-primitives.md` |
| 観測期間仕様 | `01-principles/observation-period-spec.md` |
| UI/UX 4 原則 | `01-principles/uiux-principles.md` |
| 正本化原則（P1-P7） | `01-principles/canonicalization-principles.md` |
| 仕入原価の正本定義 | `01-principles/purchase-cost-definition.md` |
| 粗利の正本定義 | `01-principles/gross-profit-definition.md` |
| 売上の正本定義 | `01-principles/sales-definition.md` |
| 値引きの正本定義 | `01-principles/discount-definition.md` |
| 予算の正本定義 | `01-principles/budget-definition.md` |
| KPIの正本定義 | `01-principles/kpi-definition.md` |
| PI値の正本定義 | `01-principles/pi-value-definition.md` |
| 客数GAPの正本定義 | `01-principles/customer-gap-definition.md` |
| Authoritative計算の定義 | `01-principles/authoritative-calculation-definition.md` |
| 正本化マップ | `01-principles/calculation-canonicalization-map.md` |
| MetricId レジストリ | `03-guides/metric-id-registry.md`（50 定義/42 実装済み） |
| 不変条件カタログ | `03-guides/invariant-catalog.md` |
| Compare 共通規約 | `03-guides/compare-conventions.md` |
| 天気データ基盤 | `03-guides/weather-architecture.md` |
| ウィジェット連携アーキテクチャ | `03-guides/widget-coordination-architecture.md` |
| Authoritative 表示ルール | `03-guides/authoritative-display-rules.md` |
| Engine maturity 定義 | `02-status/engine-maturity-matrix.md` |
| Engine 昇格マトリクス | `02-status/engine-promotion-matrix.md` |
| Engine 昇格基準 | `02-status/promotion-criteria.md` |
| 品質監査レポート | `02-status/quality-audit-latest.md` |
| 技術的負債ロードマップ | `02-status/technical-debt-roadmap.md` |
| ガードテスト対応表 | `03-guides/guard-test-map.md` |
| 許可リスト運用 | `03-guides/allowlist-management.md` |
| DuckDB アーキテクチャ・Query Access Rules（Q1-Q6） | `03-guides/duckdb-architecture.md` |
| 計算エンジン | `03-guides/calculation-engine.md` |
| WASM 二重実行ランブック | `03-guides/wasm-dual-run-runbook.md` |
| 拡張プレイブック | `03-guides/extension-playbook.md` |
| 仕入原価統合計画 | `03-guides/purchase-cost-unification-plan.md` |
| Temporal 分析ポリシー | `03-guides/temporal-analysis-policy.md` |

## AI 向け索引

| 目的 | 参照先 |
|---|---|
| 原則・制約を知りたい | `01-principles/` |
| 進捗・品質状態を確認 | `02-status/` |
| 実装の作法・API 仕様 | `03-guides/` |
| `99-archive/` は現行の判断に使わない | — |
