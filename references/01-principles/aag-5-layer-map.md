# AAG 5.0.0 — 既存ファイルの層マッピング

> 既存の全主要 AAG アーティファクトがどの層に属するかの棚卸し。

## Layer 1: Constitution（39 ファイル）

### AAG フレームワーク（5）

| ファイル | 役割 |
|---------|------|
| `references/01-principles/adaptive-architecture-governance.md` | AAG マスター定義 |
| `references/01-principles/adaptive-governance-evolution.md` | 進化設計（発見→蓄積→評価） |
| `references/01-principles/aag-four-layer-architecture.md` | 4層アーキテクチャ |
| `references/01-principles/aag-operational-classification.md` | now / debt / review 分類 |
| `references/01-principles/aag-rule-splitting-plan.md` | ルール分割戦略 |

### 設計原則（10）

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

### 正本化原則（4）

| ファイル | 役割 |
|---------|------|
| `references/01-principles/canonicalization-principles.md` | 正本化原則 P1-P7 |
| `references/01-principles/canonical-value-ownership.md` | 正本値所有権台帳 |
| `references/01-principles/canonical-input-sets.md` | 正本入力セット |
| `references/01-principles/calculation-canonicalization-map.md` | 計算分類マップ |

### 業務値定義書（13）

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

## Layer 2: Schema（9 ファイル）

| ファイル | 種別 | 正本/派生 |
|---------|------|----------|
| `app/src/test/calculationCanonRegistry.ts` | Master Registry | **正本** |
| `app/src/test/architectureRules.ts` | ルール定義（140） | **正本** |
| `app/src/test/guardTagRegistry.ts` | ガードタグ定義 | **正本** |
| `app/src/test/responsibilityTagRegistry.ts` | 責務タグ定義 | **正本** |
| `app/src/test/migrationTagRegistry.ts` | 移行タグ定義 | **正本** |
| `app/src/test/allowlists/types.ts` | AllowlistEntry 型 | **正本** |
| `docs/contracts/principles.json` | 原則メタデータ | **正本** |
| `docs/contracts/doc-registry.json` | 文書レジストリ | **正本** |
| `docs/contracts/project-metadata.json` | プロジェクトメタデータ | **正本** |

---

## Layer 3: Execution（113+ ファイル）

### ガードテスト（48）

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
| `tools/architecture-health/` | Health 収集・評価（21 ファイル） |
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

## Layer 4: Operations（89+ ファイル）

### 起点文書（3）

| ファイル | 役割 | 正本性 |
|---------|------|--------|
| `HANDOFF.md` | 起点文書 | 運用物 |
| `plan.md` | 全体計画と原則 | 運用物 |
| `plan-checklist.md` | 進行管理 | progress truth |

### 移行計画（6）

| ファイル | 対象 |
|---------|------|
| `tier1-business-migration-plan.md` | BIZ 候補 6件 |
| `analytic-kernel-migration-plan.md` | ANA 候補 9件 |
| `guard-consolidation-and-js-retirement.md` | Guard 統合 + JS 縮退 |
| `promote-ceremony-template.md` | 昇格手順 |
| `data-load-idempotency-plan.md` | データロード冪等化 |
| `active-debt-refactoring-plan.md` | active-debt リファクタ |

### 昇格判定表（11）

`references/02-status/promotion-readiness-*.md` — 各候補の判定表

### 生成レポート（派生物）

`references/02-status/generated/` — 全て手編集禁止

---

## 未整理・要分類

| ファイル | 現在の位置 | 候補層 | 備考 |
|---------|-----------|--------|------|
| `architecture-rule-feasibility.md` | 01-principles | Constitution or Operations | ルール実現可能性評価 |
| `contract-definition-policy.md` | 03-guides | Schema（契約テンプレート定義） | 型定義に近い |
| `current-maintenance-policy.md` | 03-guides | Operations | current 群の保守手順 |
| `migration-tag-policy.md` | 03-guides | Operations | タグ運用手順 |
| `discovery-review-checklist.md` | 03-guides | Operations | レビュー手順 |
| `widgetOwnershipRegistry.ts` | app/src/test | Schema | レジストリ |
