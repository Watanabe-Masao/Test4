# AI_CONTEXT

## Project

Pure 計算責務再編（pure-calculation-reorg）

## Purpose

粗利管理ツール本体の `domain/calculations/` に存在する pure 計算群を、
意味責任ベースで再分類し、AI が誤読・誤実装しにくい構造へ整備する。

## Current Status

- Phase 0-7 の構造基盤が完了
- AAG 5.0.0 Phase A1-A5 完了（4層構造 + schema + カテゴリマップ + 導出自動化 + 運用再整理）
- **AAG 3 層分離 Phase 0+2+3+4 完了**（境界ポリシー + 型分割 + スキーマ + allowlist 分離）
- 次の重心: Inventory（Phase 1）→ App Domain 抽出（Phase 3）→ health 契約化（Phase 5）

## 3 層モデル — AI のナビゲーション

AAG は 3 層に分離されている。AI はこの順で読む:

| 層 | 入口 | 役割 |
|---|---|---|
| **Project Overlay**（本ディレクトリ） | 本ファイル | 案件の進行状態。HANDOFF / plan / checklist |
| **App Domain** | `app-domain/gross-profit/APP_DOMAIN_INDEX.md` | アプリ固有の意味空間。業務定義・契約・ルールカタログ |
| **AAG Core** | `aag/core/AAG_CORE_INDEX.md` | 共通フレームワーク。型・原則・評価器 |

## Read Order

1. **本ファイル**（案件文脈の入口）
2. `HANDOFF.md`（完了済み Phase の概要、次にやること、ハマりポイント）
3. `plan.md`（全体計画。4不可侵原則 + Phase 定義）
4. `checklist.md`（Phase 単位の完了チェックリスト）
5. 必要に応じて `app-domain/gross-profit/APP_DOMAIN_INDEX.md`（アプリ意味空間）
6. 必要に応じて `aag/core/AAG_CORE_INDEX.md`（共通フレームワーク）

## Required Core References

AAG Core の共通ルール・思想。案件作業中に必ず参照する。

| ファイル | 層 | 役割 |
|---------|---|------|
| `aag/core/AAG_CORE_INDEX.md` | Core | Core 入口 |
| `aag/core/principles/core-boundary-policy.md` | Core | 3 層境界ポリシー（5 原則） |
| `app/src/test/aag-core-types.ts` | Core | Core ルール型（RuleSemantics / Governance / DetectionSpec） |
| `app/src/test/aagSchemas.ts` | Core | AAG 5.0 スキーマ定義 |
| `references/01-principles/aag-5-constitution.md` | Core | AAG 4層構造定義 |
| `references/01-principles/aag-5-source-of-truth-policy.md` | Core | 正本/派生/運用物ポリシー |

## Required App Domain References

アプリ固有の意味空間。業務値定義・ルールカタログ。

| ファイル | 役割 |
|---------|------|
| `app-domain/gross-profit/APP_DOMAIN_INDEX.md` | App Domain 入口 |
| `app/src/test/calculationCanonRegistry.ts` | Master Registry（唯一の正本） |
| `app/src/test/architectureRules.ts` | 全ルール宣言的仕様（App Domain データ） |
| `app/src/test/guardCategoryMap.ts` | 全ルールのカテゴリマップ |
| `references/01-principles/semantic-classification-policy.md` | 意味分類ポリシー |
| `references/01-principles/engine-boundary-policy.md` | 3エンジン境界 |

## Project-Specific Constraints

- `factorDecomposition` は business 扱い（`semanticClass=business`, `methodFamily=analytic_decomposition`）
- current と candidate は絶対に混ぜない
- Promote Ceremony なしに current 編入しない
- 正本は `calculationCanonRegistry` の1つだけ
- JS orchestration（hook / store / QueryHandler）は移行対象外

## Completed — AAG 3 層分離

| 項目 | 状態 | 成果物 |
|------|------|--------|
| 境界ポリシー文書 | **完了** | `aag/core/`, `app-domain/gross-profit/` |
| ArchitectureRule 型分割 | **完了** | `aag-core-types.ts`（RuleSemantics / Governance / DetectionSpec） |
| aagSchemas.ts Core re-export | **完了** | Core 型を aagSchemas.ts 経由でもアクセス可能 |
| allowlist RetentionReason 分離 | **完了** | CoreRetentionReason / AppRetentionReason + RemovalKind |

## Next Actions — AAG 3 層分離の続き

### Phase 1: Inventory

全 AAG 資産を Core / App Domain / Project Overlay / Mixed に分類する。
成果物: `projects/pure-calculation-reorg/status/aag-separation-inventory.md`

### Phase 3（分離計画）: App Domain 抽出

業務値定義書（12 ファイル）を Constitution から App Domain へ移す。
50 ファイル 76 箇所の参照更新が必要（高リスク）。

### Phase 5（分離計画）: health-rules 契約化

`tools/architecture-health/src/config/health-rules.ts` の target 値を Project Overlay へ。
Core は評価器、Project は予算。

## Immediate Next Actions — 案件本体

1. **最優先:** データロード冪等化（`references/03-guides/data-load-idempotency-plan.md`）
2. **Phase 8:** Promote Ceremony（`references/03-guides/promote-ceremony-template.md`）
   - EvidencePack 生成: `cd app && npx tsx src/test/generators/generateEvidencePack.ts BIZ-012`

## Update Points

- status を変えたら `HANDOFF.md` と `checklist.md` を更新
- guard / allowlist を変えたら `cd app && npm run docs:generate`
- `references/` に .md 追加したら 4箇所連鎖更新（HANDOFF.md §6 参照）
- Core 文書に案件固有の current status を書かない
- Project Overlay に system principle を再定義しない
