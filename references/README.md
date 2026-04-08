# references/ ドキュメントガイド

> 運用仕様書群。AIと人間が安全に作業するための設計制約・ルール・参照情報を格納する。

## 構造

| ディレクトリ | 内容 | ファイル数 |
|---|---|---|
| `01-principles/` | 設計原則・制約・正本定義書（Engine 境界、正本化原則、業務値定義、AAG） | 35 |
| `02-status/` | 進捗・品質状態（maturity, promotion, 品質監査, 課題管理） | 11+ |
| `03-guides/` | 実装ガイド・リファレンス（API, データモデル, ガードテスト, 不変条件, 責務分離） | 39 |
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

## AI 向け索引 — カテゴリ別ファイルマップ

> 「この概念に関するドキュメントはどれか」を即座に特定するための索引。
> ファイルを探すときはまずここを見る。

### AAG（Adaptive Architecture Governance）

| ファイル | 内容 |
|---------|------|
| `01-principles/adaptive-architecture-governance.md` | **AAG 正本** — 構成要素、設計原則、バージョン履歴 |
| `01-principles/adaptive-governance-evolution.md` | 進化の設計 — 3 層サイクル（発見→蓄積→評価） |
| `01-principles/design-principles.md` | 設計原則 9 カテゴリ A-H + Q（48 タグ） |
| `01-principles/safe-performance-principles.md` | H カテゴリ（Screen Runtime）の詳細 |
| `01-principles/critical-path-safety-map.md` | Safety Tier 分類 |
| `03-guides/architecture-rule-system.md` | Architecture Rule 運用ガイド |
| `03-guides/allowlist-management.md` | Allowlist 管理ガイド |
| `03-guides/guard-test-map.md` | ガードテスト対応表 |
| `03-guides/active-debt-refactoring-plan.md` | Active-Debt リファクタリング計画 |
| `01-principles/architecture-rule-feasibility.md` | ルール導入の実現可能性評価 |

### 正本化（Canonicalization）

| ファイル | 内容 |
|---------|------|
| `01-principles/canonicalization-principles.md` | 正本化原則 P1-P7 |
| `01-principles/canonical-value-ownership.md` | 値の所有権台帳（移行状態の追跡） |
| `01-principles/canonical-input-sets.md` | 正本入力セットの定義 |
| `01-principles/calculation-canonicalization-map.md` | domain/calculations/ 全ファイルの分類 |

### 業務値定義書（Definition）

| ファイル | 正本関数 |
|---------|---------|
| `01-principles/sales-definition.md` | `readSalesFact()` |
| `01-principles/discount-definition.md` | `readDiscountFact()` |
| `01-principles/customer-definition.md` | `readCustomerFact()` |
| `01-principles/purchase-cost-definition.md` | `readPurchaseCost()` |
| `01-principles/gross-profit-definition.md` | `calculateGrossProfit()` |
| `01-principles/pi-value-definition.md` | `calculateQuantityPI()` / `calculateAmountPI()` |
| `01-principles/customer-gap-definition.md` | `calculateCustomerGap()` |
| `01-principles/budget-definition.md` | StoreResult（統一済み） |
| `01-principles/kpi-definition.md` | StoreResult（統一済み） |
| `01-principles/authoritative-calculation-definition.md` | WASM authoritative 計算 |
| `01-principles/free-period-analysis-definition.md` | `readFreePeriodFact()` |
| `01-principles/free-period-budget-kpi-contract.md` | `readFreePeriodBudgetFact()` / `readFreePeriodDeptKPI()` |

### アーキテクチャ設計

| ファイル | 内容 |
|---------|------|
| `01-principles/engine-boundary-policy.md` | 3 エンジン境界（Authoritative / Application / Exploration） |
| `01-principles/engine-responsibility.md` | JS vs DuckDB の責務分担 |
| `01-principles/data-flow.md` | データフロー 4 段階 |
| `01-principles/data-pipeline-integrity.md` | パイプライン整合性 |
| `01-principles/temporal-scope-semantics.md` | 期間スコープの分離ルール |
| `01-principles/modular-monolith-evolution.md` | モジュラーモノリス進化方針 |
| `01-principles/cache-responsibility.md` | キャッシュ責務 |
| `01-principles/domain-ratio-primitives.md` | ドメイン率プリミティブ |
| `01-principles/monthly-data-architecture.md` | 月次データ構造 |

### UI/UX・画面設計

| ファイル | 内容 |
|---------|------|
| `01-principles/uiux-principles.md` | UI/UX 4 原則 |
| `01-principles/dual-period-definition.md` | 2 期間比較の定義 |
| `01-principles/observation-period-spec.md` | 観測期間仕様 |
| `01-principles/app-lifecycle-principles.md` | アプリライフサイクル原則 |

### 実装ガイド

| ファイル | 内容 |
|---------|------|
| `03-guides/coding-conventions.md` | コーディング規約 |
| `03-guides/runtime-data-path.md` | 実行時データ経路 |
| `03-guides/responsibility-separation-catalog.md` | 責務分離 24 パターン |
| `03-guides/invariant-catalog.md` | 不変条件カタログ |
| `03-guides/metric-id-registry.md` | MetricId レジストリ（50 定義） |
| `03-guides/new-page-checklist.md` | 新規ページチェックリスト |
| `03-guides/extension-playbook.md` | 拡張プレイブック |
| `03-guides/compare-conventions.md` | 比較共通規約 |
| `03-guides/pr-review-checklist.md` | PR レビューチェックリスト |

### DuckDB・クエリ

| ファイル | 内容 |
|---------|------|
| `03-guides/duckdb-architecture.md` | DuckDB アーキテクチャ + Query Access Rules |
| `03-guides/duckdb-data-loading-sequence.md` | データロード順序図 |
| `03-guides/duckdb-type-boundary-contract.md` | 型境界契約 |
| `03-guides/data-model-layers.md` | データモデル層 |
| `03-guides/data-models.md` | データモデル詳細 |

### 計算エンジン・WASM

| ファイル | 内容 |
|---------|------|
| `03-guides/calculation-engine.md` | 計算エンジン設計 |
| `03-guides/wasm-dual-run-runbook.md` | WASM 二重実行ランブック |
| `03-guides/safety-first-architecture-plan.md` | 安全設計改善計画 |

### ウィジェット・チャート

| ファイル | 内容 |
|---------|------|
| `03-guides/widget-coordination-architecture.md` | ウィジェット連携アーキテクチャ |
| `03-guides/widget-readmodel-migration.md` | Widget ReadModel 移行 |
| `03-guides/chart-data-flow-map.md` | チャートデータフローマップ |
| `03-guides/explanation-architecture.md` | 説明責任（Explanation）アーキテクチャ |
| `03-guides/authoritative-display-rules.md` | Authoritative 表示ルール |

### 天気・外部データ

| ファイル | 内容 |
|---------|------|
| `03-guides/weather-architecture.md` | 天気データ基盤 |
| `03-guides/temporal-analysis-policy.md` | Temporal 分析ポリシー |

### インフラ・運用

| ファイル | 内容 |
|---------|------|
| `03-guides/api.md` | API リファレンス |
| `03-guides/operations.md` | 運用ガイド |
| `03-guides/security.md` | セキュリティ |
| `03-guides/file-import-guide.md` | ファイルインポートガイド |
| `03-guides/cloudflare-worker-setup.md` | Cloudflare Worker セットアップ |
| `03-guides/rollback-policy.md` | ロールバックポリシー |
| `03-guides/ui-components.md` | UI コンポーネント |
| `03-guides/faq.md` | FAQ |
| `03-guides/app-lifecycle-implementation.md` | ライフサイクル実装 |

### 移行・廃止

| ファイル | 内容 |
|---------|------|
| `03-guides/purchase-cost-unification-plan.md` | 仕入原価統合計画 |
| `03-guides/legacy-governance-retirement.md` | レガシーガバナンス廃止 |
| `99-archive/` | 旧文書の圧縮要約（現行では参照しない） |
