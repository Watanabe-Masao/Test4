# AI_CONTEXT

## Project

Pure 計算責務再編（pure-calculation-reorg）

## Purpose

粗利管理ツール本体の `domain/calculations/` に存在する pure 計算群を、
意味責任ベースで再分類し、AI が誤読・誤実装しにくい構造へ整備する。

## Current Status

Phase 0-7 の構造基盤が完了。Phase 8（Promote Ceremony）待ち。
AAG 5.0.0 骨格再編済み。

## Read Order

1. **本ファイル**（案件文脈の入口）
2. `HANDOFF.md`（完了済み Phase の概要、次にやること、ハマりポイント）
3. `plan.md`（全体計画。4不可侵原則 + Phase 定義）
4. `checklist.md`（Phase 単位の完了チェックリスト）

## Required Core References

AAG Core の共通ルール・思想。案件作業中に必ず参照する。

- `references/01-principles/aag-5-constitution.md` — AAG 4層構造定義
- `references/01-principles/aag-5-source-of-truth-policy.md` — 正本/派生/運用物ポリシー
- `references/01-principles/semantic-classification-policy.md` — 意味分類ポリシー
- `references/01-principles/engine-boundary-policy.md` — 3エンジン境界
- `app/src/test/calculationCanonRegistry.ts` — Master Registry（唯一の正本）
- `app/src/test/architectureRules.ts` — 全ルール宣言的仕様
- `app/src/test/aagSchemas.ts` — AAG 5.0 スキーマ定義

## Project-Specific Constraints

- `factorDecomposition` は business 扱い（`semanticClass=business`, `methodFamily=analytic_decomposition`）
- current と candidate は絶対に混ぜない
- Promote Ceremony なしに current 編入しない
- 正本は `calculationCanonRegistry` の1つだけ
- JS orchestration（hook / store / QueryHandler）は移行対象外

## Immediate Next Actions

1. **最優先:** データロード冪等化（`references/03-guides/data-load-idempotency-plan.md`）
2. **Phase 8:** Promote Ceremony（`references/03-guides/promote-ceremony-template.md`）
   - EvidencePack 生成: `cd app && npx tsx src/test/generators/generateEvidencePack.ts BIZ-012`

## Update Points

- status を変えたら `HANDOFF.md` と `checklist.md` を更新
- guard / allowlist を変えたら `cd app && npm run docs:generate`
- `references/` に .md 追加したら 4箇所連鎖更新（HANDOFF.md §6 参照）
