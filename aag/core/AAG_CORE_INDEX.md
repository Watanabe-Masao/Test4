# AAG Core — 再利用可能な品質 OS

> AAG（Adaptive Architecture Governance）の恒久資産。
> 本体アプリや案件が変わっても残る、品質管理の共通基盤。

## このディレクトリの役割

AAG Core は「何を守るか」「どう検出するか」「どう運用するか」の共通フレームワークを提供する。
具体的な業務意味（粗利、売上、PI 値等）や案件進行状態（HANDOFF、plan、checklist 等）は含まない。

## 3 層モデルにおける位置づけ

| 層 | 役割 | 状態 |
|---|---|---|
| **AAG Core**（本層）| 共通原則、schema、共通 guard、共通運用 | 恒久。アプリ・案件に依存しない |
| App Domain | アプリ固有の意味定義、契約、ルールカタログ | 恒久。アプリに依存、案件に依存しない |
| Project Overlay | 案件ごとの handoff / plan / checklist / health budget | 一時的。案件ごとに差し替わる |

## Core に置くもの

- AAG 5 層構造 (目的 / 要件 / 設計 / 実装 / 検証、Project A Phase 1 で `aag/architecture.md` に landed、旧 4 層 = Constitution / Schema / Execution / Operations は §4.1 mapping table で参照保持)
- Source-of-truth policy
- Violation / Evidence / Promote / Retire の schema
- Rule Semantics / Governance / DetectionSpec の schema
- Allowlist 共通 schema（AllowlistEntry, AllowlistLifecycle, CoreRetentionReason）
- Health 共通 schema（HealthRule, HealthKpi, evaluator）
- 共通 evaluator / renderer / derived view engine

## Core に置かないもの

- 業務値定義書（sales, gross-profit, PI 等）→ App Domain
- 具体的なルールインスタンス（AR-PATH-*, AR-CAND-BIZ-* 等）→ App Domain
- 具体名（readSalesFact, useDataStore, UnifiedWidgetContext 等）→ App Domain binding
- 案件進行状態（HANDOFF, plan, checklist）→ Project Overlay
- Health の具体 target 値（allowlist.total <= 20 等）→ Project Overlay

## 読み順

1. `aag/core/principles/core-boundary-policy.md` — 境界ポリシー（5 原則）
2. 必要に応じて `aag/_internal/architecture.md` — 5 層構造定義 + §4.1 旧 4 層 → 新 5 層 mapping (Project A Phase 1 で landing 済)
3. 必要に応じて `app/src/test/aag-core-types.ts` — Core 型定義

## 型の命名規約

| 分類 | プレフィックス | 例 | 理由 |
|---|---|---|---|
| Core 汎用概念 | なし | RuleSemantics, DecisionCriteria, DetectionConfig | アプリに依存しない汎用概念 |
| AAG 固有スキーマ | `Aag` | AagViolation, AagEvidencePack, AagPromoteRecord | AAG フレームワーク固有の構造化データ |
| App Domain | なし | ArchitectureRule, PrincipleId, RuleBinding | アプリ固有だが Core 型ファイルには置かない |

- `AagSlice` は AAG 固有の関心スライスなので `Aag` プレフィックス付き
- `RuleBinding` は App Domain 型なので `Aag` プレフィックスなし
- 配置: Core 型 → `aag-core-types.ts`、AAG スキーマ型 → `aagSchemas.ts`、App 型 → `architectureRules.ts`

## 関連ファイル（現在の配置）

| Core 資産 | 現在の配置 | 備考 |
|---|---|---|
| 5 層構造定義 (旧 4 層 → 新 5 層 mapping を §4.1 に含む) | `aag/_internal/architecture.md` | 将来 Core 移動候補 |
| Source-of-truth policy | `aag/_internal/source-of-truth.md` | 将来 Core 移動候補 |
| AAG スキーマ型 | `app/src/test/aagSchemas.ts` | Core 型定義 |
| Core ルール型 | `app/src/test/aag-core-types.ts` | RuleSemantics, RuleGovernance, RuleDetectionSpec |
| App バインディング型 | `app/src/test/architectureRules.ts` | RuleBinding（App Domain 型。Core には置かない） |
| 共通運用ガイド | `references/03-implementation/architecture-rule-system.md` | 将来 Core 移動候補 |
| Allowlist 管理 | `references/03-implementation/allowlist-management.md` | 将来 Core 移動候補 |
