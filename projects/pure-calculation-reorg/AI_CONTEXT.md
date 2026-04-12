# AI_CONTEXT

## Project

Pure 計算責務再編（pure-calculation-reorg）

## Purpose

粗利管理ツール本体の `domain/calculations/` に存在する pure 計算群を、
意味責任ベースで再分類し、AI が誤読・誤実装しにくい構造へ整備する。

## Current Status

- Phase 0-7 の構造基盤が完了
- AAG 5.0.0 Phase A1-A5 完了（4層構造 + schema + カテゴリマップ + 導出自動化 + 運用再整理）
- **AAG 3 層分離 完了**（境界ポリシー + 型分割 + スキーマ + allowlist 分離）
- **Phase C 完了**: BaseRule を App Domain へ物理移動、direct import 禁止 guard、project resolver 一元化
- **Phase 6 完了**: collector / resolver / merge 契約テスト + quote-agnostic 化
- **本 project の次の重心: Phase 8 Promote Ceremony**（Tier 1 Business 候補の current 昇格）

## Scope の境界

本 project は **pure 計算責務の再編** に閉じる。以下は本 project の scope ではない:

- データロード冪等化 → [`projects/data-load-idempotency-hardening`](../data-load-idempotency-hardening/AI_CONTEXT.md)
- AAG ルール分割 → [`projects/aag-rule-splitting-execution`](../aag-rule-splitting-execution/AI_CONTEXT.md)
- Presentation 品質強化 → [`projects/presentation-quality-hardening`](../presentation-quality-hardening/AI_CONTEXT.md)

これらは独立した live project であり、本 project の checklist には書かない。

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

## Governance 3 分割 — AI 向け正本マップ

| 概念 | ファイル | 役割 |
|---|---|---|
| **BaseRule**（App Domain 正本） | `app-domain/gross-profit/rule-catalog/base-rules.ts` | 何を守るか / なぜ / どう直すか |
| **ExecutionOverlay**（Project Overlay 正本） | `projects/pure-calculation-reorg/aag/execution-overlay.ts` | この案件でどう扱うか（fixNow / priority / reviewCadence） |
| **merged**（derived artifact） | `app/src/test/architectureRules/merged.ts` | 両者を ruleId で合成 |
| **facade**（consumer 入口） | `app/src/test/architectureRules/index.ts` / `app/src/test/architectureRules.ts` | 全 consumer はここからのみ参照 |

**禁止**: consumer は `architectureRules/rules` や `@project-overlay/execution-overlay` を直接 import してはならない（`AR-AAG-DERIVED-ONLY-IMPORT` / `AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT` / `AR-AAG-NO-DIRECT-OVERLAY-IMPORT` で強制）。

**project 切替点**: `CURRENT_PROJECT.md` の `active: <project-id>` 1 行 + `projects/<id>/config/project.json` の `overlayRoot` フィールド。vite / vitest / tools は `resolve-project-overlay.mjs` / `project-resolver.ts` 経由で解決する。

詳細: `references/03-guides/governance-final-placement-plan.md`

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
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | **BaseRule 物理正本**（Phase C で app/src/test から物理移動済み） |
| `app/src/test/calculationCanonRegistry.ts` | Master Registry（唯一の正本） |
| `app/src/test/architectureRules.ts` | **Consumer facade**（全 consumer はここ経由。直 import 禁止） |
| `app/src/test/architectureRules/merged.ts` | Derived merge（BaseRule + ExecutionOverlay 合成点） |
| `app/src/test/architectureRules/README.md` | ディレクトリ役割マップ |
| `app/src/test/guardCategoryMap.ts` | 全ルールのカテゴリマップ |
| `references/01-principles/semantic-classification-policy.md` | 意味分類ポリシー |
| `references/01-principles/engine-boundary-policy.md` | 3エンジン境界 |
| `references/03-guides/governance-final-placement-plan.md` | Governance 3 分割の現行正本文書 |

## Project-Specific Constraints

- `factorDecomposition` は business 扱い（`semanticClass=business`, `methodFamily=analytic_decomposition`）
- current と candidate は絶対に混ぜない
- Promote Ceremony なしに current 編入しない
- 正本は `calculationCanonRegistry` の1つだけ
- JS orchestration（hook / store / QueryHandler）は移行対象外

## Completed — AAG 3 層分離 + Phase C + Phase 6

| 項目 | 状態 | 成果物 |
|------|------|--------|
| 境界ポリシー文書 | **完了** | `aag/core/`, `app-domain/gross-profit/` |
| ArchitectureRule 型分割 | **完了** | `aag-core-types.ts`（RuleSemantics / Governance / DetectionSpec） |
| aagSchemas.ts Core re-export | **完了** | Core 型を aagSchemas.ts 経由でもアクセス可能 |
| allowlist RetentionReason 分離 | **完了** | CoreRetentionReason / AppRetentionReason + RemovalKind |
| **Phase C1: project 参照点一元化** | **完了** | `project-resolver.ts` / `resolve-project-overlay.mjs` / `project.json` 追加（tsconfig は暫定静的） |
| **Phase C2: direct import 禁止 guard** | **完了** | `AR-AAG-DERIVED-ONLY-IMPORT` 系 3 ルール + `aagDerivedOnlyImportGuard.test.ts` |
| **Phase C3: 入口文書整理** | **完了** | `governance-final-placement-plan.md` 現行化 + `architectureRules/README.md` 追加 |
| **Phase C4: BaseRule 物理移動** | **完了** | `app-domain/gross-profit/rule-catalog/base-rules.ts` + `@app-domain/*` alias |
| **Phase 6-1: Collector 契約テスト** | **完了** | `guardCollectorContract.test.ts` / `temporalGovernanceCollectorContract.test.ts` + quote-agnostic 化 |
| **Phase 6-2: Resolver 契約テスト** | **完了** | `projectResolverContract.test.ts` / `resolveProjectOverlayScript.test.ts` |
| **Phase 6-3: Merge / Facade smoke** | **完了** | `architectureRulesMergeSmokeGuard.test.ts` |
| **Phase 6-4: docs / health smoke** | **完了** | `docs:check` PASS, Healthy |

## Immediate Next Actions — 案件本体

1. **最優先:** データロード冪等化（`references/03-guides/data-load-idempotency-plan.md`）
2. **Phase 8:** Promote Ceremony（`references/03-guides/promote-ceremony-template.md`）
   - EvidencePack 生成: `cd app && npx tsx src/test/generators/generateEvidencePack.ts BIZ-012`

## Next Actions — Governance 保守

- `tsconfig.app.json` の `@project-overlay/*` / include 静的直書きの解消（C1 暫定事項）
- `tools/architecture-health/src/config/health-rules.ts` の target 値を Project Overlay へ移す検討（health 契約化）

## Update Points

- status を変えたら `HANDOFF.md` と `checklist.md` を更新
- guard / allowlist を変えたら `cd app && npm run docs:generate`
- `references/` に .md 追加したら 4箇所連鎖更新（HANDOFF.md §6 参照）
- Core 文書に案件固有の current status を書かない
- Project Overlay に system principle を再定義しない
