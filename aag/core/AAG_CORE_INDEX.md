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

- AAG 4 層構造（Constitution / Schema / Execution / Operations）
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
2. 必要に応じて `references/01-principles/aag-5-constitution.md` — 4 層構造定義
3. 必要に応じて `app/src/test/aag-core-types.ts` — Core 型定義

## 関連ファイル（現在の配置）

| Core 資産 | 現在の配置 | 備考 |
|---|---|---|
| 4 層構造定義 | `references/01-principles/aag-5-constitution.md` | 将来 Core 移動候補 |
| Source-of-truth policy | `references/01-principles/aag-5-source-of-truth-policy.md` | 将来 Core 移動候補 |
| AAG スキーマ型 | `app/src/test/aagSchemas.ts` | Core 型定義 |
| Core ルール型 | `app/src/test/aag-core-types.ts` | Core 型定義（新規） |
| 共通運用ガイド | `references/03-guides/architecture-rule-system.md` | 将来 Core 移動候補 |
| Allowlist 管理 | `references/03-guides/allowlist-management.md` | 将来 Core 移動候補 |
