# AAG 5.0.0 — 既存ファイルの層マッピング

> 既存の全主要 AAG アーティファクトがどの層に属するかの棚卸し。
> 件数は書かない（正本ポリシーに従い、件数は generated section に寄せる）。

## Layer 1: Constitution

### AAG フレームワーク

| ファイル | 役割 |
|---------|------|
| `references/01-principles/adaptive-architecture-governance.md` | AAG マスター定義 |
| `references/01-principles/adaptive-governance-evolution.md` | 進化設計（発見→蓄積→評価） |
| `references/01-principles/aag-four-layer-architecture.md` | 4層アーキテクチャ |
| `references/01-principles/aag-operational-classification.md` | now / debt / review 分類 |
| `references/01-principles/aag-rule-splitting-plan.md` | ルール分割戦略 |

### 設計原則

| ファイル | 役割 |
|---------|------|
| `references/01-principles/design-principles.md` | 9カテゴリ 50タグ |
| `references/01-principles/safe-performance-principles.md` | H カテゴリ詳細 |
| `references/01-principles/critical-path-safety-map.md` | Safety Tier 分類 |
| `references/01-principles/engine-boundary-policy.md` | 3エンジン境界 |
| `references/01-principles/semantic-classification-policy.md` | 意味分類ポリシー |
| `references/01-principles/engine-responsibility.md` | JS vs DuckDB 責務 |
| `references/01-principles/data-flow.md` | 4段階データフロー |
| `references/01-principles/data-pipeline-integrity.md` | パイプライン整合性 |
| `references/01-principles/temporal-scope-semantics.md` | 期間スコープ |
| `references/01-principles/modular-monolith-evolution.md` | モジュラーモノリス進化 |

### 正本化原則

| ファイル | 役割 |
|---------|------|
| `references/01-principles/canonicalization-principles.md` | 正本化原則 P1-P7 |
| `references/01-principles/canonical-value-ownership.md` | 正本値所有権台帳 |
| `references/01-principles/canonical-input-sets.md` | 正本入力セット |
| `references/01-principles/calculation-canonicalization-map.md` | 計算分類マップ |

### 業務値定義書

| ファイル | 正本 |
|---------|------|
| `sales-definition.md` | 売上・販売点数 |
| `discount-definition.md` | 値引き |
| `customer-definition.md` | 客数 |
| `purchase-cost-definition.md` | 仕入原価 |
| `gross-profit-definition.md` | 粗利 |
| `pi-value-definition.md` | PI値 |
| `customer-gap-definition.md` | 客数GAP |
| `budget-definition.md` | 予算 |
| `kpi-definition.md` | KPI |
| `authoritative-calculation-definition.md` | WASM 計算 |
| `free-period-analysis-definition.md` | 自由期間分析 |
| `free-period-budget-kpi-contract.md` | 自由期間予算KPI |
| `dual-period-definition.md` | 2期間比較 |

---

## Layer 2: Schema

| ファイル | 種別 | 正本/派生 |
|---------|------|----------|
| `app/src/test/calculationCanonRegistry.ts` | Master Registry | **正本** |
| `app/src/test/architectureRules.ts` | ルール宣言的仕様 | **正本** |
| `app/src/test/guardTagRegistry.ts` | ガードタグ定義 | **正本** |
| `app/src/test/responsibilityTagRegistry.ts` | 責務タグ定義 | **正本** |
| `app/src/test/migrationTagRegistry.ts` | 移行タグ定義 | **正本** |
| `app/src/test/allowlists/types.ts` | AllowlistEntry 型 | **正本** |
| `docs/contracts/principles.json` | 原則メタデータ | **正本** |
| `docs/contracts/doc-registry.json` | 文書レジストリ | **正本** |
| `docs/contracts/project-metadata.json` | プロジェクトメタデータ | **正本** |
| `app/src/test/aagSchemas.ts` | AAG 5.0 スキーマ型定義 | **正本** |

---

## Layer 3: Execution

### ガードテスト

| カテゴリ | ファイル数 | 代表例 |
|---------|----------|--------|
| 責務分離 | 6 | responsibilitySeparation, responsibilityTag |
| 正本化 | 7 | calculationCanon, canonicalizationSystem, canonicalInput |
| データ整合性 | 9 | dataIntegrity, pipelineSafety, purity, queryPattern |
| ドメインパス | 11 | grossProfitPath, salesFactPath, purchaseCostPath |
| アーキテクチャ | 10 | architectureRule, layerBoundary, comparisonScope |
| 所有権・システム | 5 | docRegistry, migrationTag, dualRunExitCriteria |

### 派生物（手編集禁止）

| ファイル | 導出元 |
|---------|--------|
| `app/src/test/semanticViews.ts` | calculationCanonRegistry |
| `references/02-status/generated/architecture-health.json` | health tool |
| `references/02-status/generated/architecture-health.md` | health tool |
| `references/02-status/generated/architecture-health-certificate.md` | health tool |
| `CLAUDE.md` の generated section | health tool |

### ツール

| ファイル | 役割 |
|---------|------|
| `tools/architecture-health/` | Health 収集・評価・レンダリング |
| `tools/git-hooks/pre-commit` | docs 自動再生成 |
| `tools/git-hooks/pre-push` | 修正漏れ検出 |
| `tools/aag-render-cli.ts` | AAG Response 統一出力 |

### 例外管理

| ファイル | 役割 |
|---------|------|
| `app/src/test/allowlists/architecture.ts` | 層境界例外 |
| `app/src/test/allowlists/complexity.ts` | 複雑度例外 |
| `app/src/test/allowlists/duckdb.ts` | DuckDB hook 例外 |
| `app/src/test/allowlists/size.ts` | サイズ例外 |
| `app/src/test/allowlists/performance.ts` | パフォーマンス例外 |
| `app/src/test/allowlists/migration.ts` | 移行例外 |
| `app/src/test/allowlists/responsibility.ts` | 責務例外 |
| `app/src/test/allowlists/docs.ts` | 文書例外 |
| `app/src/test/allowlists/misc.ts` | その他 |

---

## Layer 4: Operations

### 4A. System Operations（AAG Core）

プロジェクトが変わっても残る共通手順。

| ファイル | 役割 |
|---------|------|
| `promote-ceremony-template.md` | 昇格共通手順 + EvidencePack 接続 |
| `guard-consolidation-and-js-retirement.md` | JS 退役共通手順 |
| `architecture-rule-system.md` | ルール運用ガイド |
| `allowlist-management.md` | 例外管理手順 |
| `rollback-policy.md` | Rollback 共通手順 |

### 4B. Project Operations（Overlay — 案件ごと差し替え）

| ファイル | 役割 | 配置先 |
|---------|------|--------|
| `HANDOFF.md` | 起点文書 | `projects/pure-calculation-reorg/` |
| `plan.md` | 案件計画 | `projects/pure-calculation-reorg/` |
| `checklist.md` | 進行管理 truth | `projects/pure-calculation-reorg/` |
| `tier1-business-migration-plan.md` | BIZ 移行計画 | `references/03-guides/`（案件固有だが参照多数のため） |
| `analytic-kernel-migration-plan.md` | ANA 移行計画 | 同上 |
| `data-load-idempotency-plan.md` | データロード冪等化 | 同上 |
| `promotion-readiness-*.md` | 昇格判定表 | `references/02-status/` |

### ルートポインタ

`ACTIVE_PROJECT.md` — 現在のアクティブ案件を指す

### 生成レポート（派生物）

`references/02-status/generated/` — 全て手編集禁止

---

## Parse1 未整理 → Parse2 で分類確定

| ファイル | 確定層 | 理由 |
|---------|--------|------|
| `architecture-rule-feasibility.md` | **Constitution** | ルール導入の判断基準を定義。思想寄り |
| `contract-definition-policy.md` | **Schema** | BIZ / ANA 契約テンプレートの型定義。Schema の契約仕様 |
| `current-maintenance-policy.md` | **Operations** | current 群の保守手順書 |
| `migration-tag-policy.md` | **Operations** | 移行タグの運用手順書 |
| `discovery-review-checklist.md` | **Operations** | レビュー手順書 |
| `widgetOwnershipRegistry.ts` | **Schema** | Widget 所有権レジストリ。型と登録の正本 |
