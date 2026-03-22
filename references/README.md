# references/ ドキュメントガイド

> 運用仕様書群。AIと人間が安全に作業するための設計制約・ルール・参照情報を格納する。

## 構造

| ディレクトリ | 内容 | ファイル数 |
|---|---|---|
| `01-principles/` | 設計原則・制約（Engine 境界、禁止事項、パイプライン整合性） | 10 |
| `02-status/` | 進捗・品質状態（maturity, promotion, 品質監査） | 6 |
| `03-guides/` | 実装ガイド・リファレンス（API, データモデル, 天気基盤, 拡張手順） | 22 |
| `99-archive/` | 旧文書の圧縮要約（現行では参照しない） | 1 |

## 正本一覧

各事実の定義元は1箇所。他の文書は正本を参照のみ。

| テーマ | 正本 |
|---|---|
| 設計思想 19 原則 | `01-principles/design-principles.md` |
| 禁止事項 13 件 | CLAUDE.md §禁止事項（クイックリファレンス: `01-principles/prohibition-quick-ref.md`） |
| Engine 境界・3 エンジン定義 | `01-principles/engine-boundary-policy.md` |
| JS vs DuckDB 責務 | `01-principles/engine-responsibility.md` |
| データパイプライン整合性 | `01-principles/data-pipeline-integrity.md` |
| 期間スコープの意味論 | `01-principles/temporal-scope-semantics.md` |
| データフロー 4 段階 | `01-principles/data-flow.md` |
| ドメイン率プリミティブ | `01-principles/domain-ratio-primitives.md` |
| 観測期間仕様 | `01-principles/observation-period-spec.md` |
| UI/UX 4 原則 | `01-principles/uiux-principles.md` |
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

## AI 向け索引

| 目的 | 参照先 |
|---|---|
| 原則・制約を知りたい | `01-principles/` |
| 進捗・品質状態を確認 | `02-status/` |
| 実装の作法・API 仕様 | `03-guides/` |
| `99-archive/` は現行の判断に使わない | — |
