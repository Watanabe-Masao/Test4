# AI_CONTEXT

## Project

Pure 計算責務再編（pure-calculation-reorg）

## Purpose

粗利管理ツール本体の `domain/calculations/` に存在する pure 計算群を、
意味責任ベースで再分類し、AI が誤読・誤実装しにくい構造へ整備する。

## Current Status

- Phase 0-7 の構造基盤が完了
- AAG 5.0.0 Phase A1-A5 完了（4層構造 + schema + カテゴリマップ + 導出自動化 + 運用再整理）
- Core / Project Overlay 分離済み（本ディレクトリが Project Overlay）
- **次の重心: AAG Core からの App 固有漏れの分離**

## Read Order

1. **本ファイル**（案件文脈の入口）
2. `HANDOFF.md`（完了済み Phase の概要、次にやること、ハマりポイント）
3. `plan.md`（全体計画。4不可侵原則 + Phase 定義）
4. `checklist.md`（Phase 単位の完了チェックリスト）

## Required Core References

AAG Core の共通ルール・思想。案件作業中に必ず参照する。

| ファイル | 役割 |
|---------|------|
| `references/01-principles/aag-5-constitution.md` | AAG 4層構造定義 |
| `references/01-principles/aag-5-layer-map.md` | 既存ファイルの層マッピング |
| `references/01-principles/aag-5-source-of-truth-policy.md` | 正本/派生/運用物ポリシー |
| `references/01-principles/semantic-classification-policy.md` | 意味分類ポリシー |
| `references/01-principles/engine-boundary-policy.md` | 3エンジン境界 |
| `app/src/test/calculationCanonRegistry.ts` | Master Registry（唯一の正本） |
| `app/src/test/architectureRules.ts` | 全ルール宣言的仕様 |
| `app/src/test/aagSchemas.ts` | AAG 5.0 スキーマ定義 |
| `app/src/test/guardCategoryMap.ts` | 全ルールのカテゴリマップ |
| `app/src/test/guardMetadataView.ts` | Guard Metadata 導出 view |

## Project-Specific Constraints

- `factorDecomposition` は business 扱い（`semanticClass=business`, `methodFamily=analytic_decomposition`）
- current と candidate は絶対に混ぜない
- Promote Ceremony なしに current 編入しない
- 正本は `calculationCanonRegistry` の1つだけ
- JS orchestration（hook / store / QueryHandler）は移行対象外

## Next Actions — AAG Core / App Domain 分離

前セッションで特定された「Core からの App 固有漏れ」を分離する。優先順:

### S: architectureRules.ts の意味フィールド分離

`ArchitectureRule` を 3 分割する:
- **RuleSemantics** — id, what, why, principleRefs, protectedHarm, ruleClass, confidence, slice
- **RuleGovernance** — fixNow, decisionCriteria, migrationPath, reviewPolicy, lifecyclePolicy, sunsetCondition
- **RuleDetectionSpec** — detection, thresholds, correctPattern, outdatedPattern

アプリ固有の imports / codeSignals / path names は Project Binding として分離。

### A: fixNow / decisionCriteria / migrationPath の schema 化

`aagSchemas.ts` に `AagRuleJudgmentPolicy` / `AagRuleMigrationContract` を追加。
運用区分（now / debt / review）はルールの意味ではなく運用判断。

### A: health-rules の target 値を Project Overlay に移す

`tools/architecture-health/src/config/health-rules.ts` の具体的しきい値は Project 固有。
- Core: HealthRuleSchema / HealthMetricDefinition / HealthEvaluationEngine
- Project: 具体 target 値

### B: allowlist retentionReason の Core / Project 分離

- Core 共通: structural / fallback / detection-limit
- Project 固有: no-readmodels / display-only

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
