# scp-checkers — aag-structural-control-plane project-scoped boundary protection

> **役割**: 本 program が約束する **「触ってはいけない / 変更してはいけない / 崩してはいけない」boundary protection** を CI level で foul させる project-scoped checker 群（plan.md「やってはいけないこと」§A2、ADR-SCP-014 / AAG-SCP-GUIDANCE-007）。
>
> **image**: AI が安心してアクセルを踏めるように、事前にコース固有のガードレールを敷く。AI は本筋（Tree / Document / Temporal の構造補助設計）に集中でき、boundary 逸脱の不安に認知資源を奪われない。
>
> **scope narrowing**: parse-free 限定（`git diff --name-only` / `grep` のみ）+ phase 不変（本 program 全期間 Phase 0〜10 を通じて一貫禁止）+ project lifetime（archive 時に Archive v2 §6.4 で `aag/` folder ごと物理削除）。

## 1. 設計原則（GUIDANCE-007）

- **lifecycle**: 本 program active 期間のみ。archive 時に物理削除（次 program は別の boundary を持つため、コース固有 guardrail は撤去）
- **invocation**: `aag scp check --project aag-structural-control-plane <checker>`（reposteward `aag-engine` 経由、Phase 1+ で landing）
- **output**: Finding JSON（ADR-SCP-013 schema 準拠、`docs/contracts/schema/aag-finding.schema.json`）
- **配置**: 本 directory（`projects/active/aag-structural-control-plane/aag/scp-checkers/`）
- **detection method**: **parse-free 限定**（`git diff --name-only` / `grep` のみ。TypeScript AST / Markdown 構造解析 / YAML schema 解析 不要）
- **promotion**: 通常は §A1 へ promote しない（boundary protection は本 program 固有 nonGoal、universal rule にはなりにくい）。例外は archive 直前 user 判断

## 2. checker 一覧（4 件、boundary protection 限定）

| checker | image | 検出ロジック | 違反根拠 |
|---|---|---|---|
| `app-untouched` | 触ってはいけない（既存実装層） | `git diff --name-only HEAD..` で `^app/src/` patterns 検出。業務 logic / domain calculations / readModels への変更も同 checker で carry | projectization.md §4 nonGoal |
| `docs-contracts-aag-untouched` | 触ってはいけない（既存 reposteward AAG contract schemas） | `git diff --name-only HEAD..` で `^docs/contracts/aag/` の move / delete / modify 検出 | ADR-SCP-002 / projectization.md §4 nonGoal |
| `no-new-references-doc` | 触ってはいけない（既存 references/ への新 doc 追加） | `git diff --name-only --diff-filter=A HEAD..` で `^references/.*\.md$` 検出。Reading Pass `disposition: split / move / archive` の split target は disposition 確認で許可 | 本 program scope 外（plan.md やってはいけないこと §A2） |
| `hard-gate-count` | 崩してはいけない（既存 advisory state） | `grep -c "hard.\?gate"` で `.github/workflows/` + `tools/git-hooks/pre-push` を検査、本 program 開始時 baseline からの増加があれば finding | 不可侵原則 8 |

## 3. 実装方針（Phase 1+ で実装）

各 checker は以下の interface を満たす TypeScript module（lightweight、parse-free）:

```typescript
import type { Finding } from '@/test/aag-core-types' // Phase 1 で aag-finding.schema.json に基づく型を articulate

export interface ScpChecker {
  readonly name: string
  readonly description: string
  readonly imageMetaphor: string // 触ってはいけない / 変更してはいけない / 崩してはいけない のいずれか
  readonly violationBasis: string // 不可侵原則 / ADR / nonGoal への参照
  readonly detectionMethod: 'git-diff' | 'grep' | 'git-ls-files' // parse-free のみ
  check(repoRoot: string, baseRef: string): Finding[] // 検出ロジック
}
```

invocation flow（Phase 1+）:

```
aag scp check --project aag-structural-control-plane <checker>
  ↓
aag-engine reads projects/active/aag-structural-control-plane/aag/scp-checkers/
  ↓
load <checker>.ts module
  ↓
invoke check(repoRoot, baseRef='HEAD~1') → Finding[]
  ↓
output JSON (ADR-SCP-013 schema)
```

## 4. archive 時の処理

本 program archive 時:

1. archive 直前: §A2 checker のうち promotion candidate を user 判断で評価（通常は無し、boundary protection は project 固有）
2. promotion 採用（例外的）: `tools/governance/check-<checker>.ts` へ実装 move + decision-audit.md 振り返り判定 articulate
3. promotion 棄却 / 該当なし（通常）: そのまま放置（§A2 のまま）
4. Archive v2 §6.4: `projects/active/aag-structural-control-plane/aag/` folder が `projects/completed/aag-structural-control-plane/` 移動時に物理削除（archive.manifest.json `deletedPaths` に記録）
5. restore 経路: archive.manifest.json `restoreAllCommand` で preCompressionCommit 時点を復元すれば §A2 checker も復活

## 5. 現在の実装状態

Phase 0 では本 directory + README のみ landing。実 checker 4 件は Phase 1+ で順次 landing する（checklist.md の Phase 0 acceptance criteria は本 directory 存在 + README articulation を含む）。

## 6. §A2 から外したもの（参考: plan.md §A1 / §B 配置）

以下は §A2 narrowing rationale により §A1 / §B へ移動:

| 元案項目 | 移動先 | 理由 |
|---|---|---|
| `obligation-migration-staging`（OBLIGATION_MAP 比較器） | §A1（`tools/governance/check-obligation-drift.ts`） | parse-heavy + universal な migration safety pattern |
| `reading-pass-review`（YAML schema 検証） | §A1（`tools/governance/check-reading-pass-schema.ts`） | parse-heavy + universal な reading-pass.schema.json validation |
| `phase-ordering`（commit history 検証） | §A1（`tools/governance/check-phase-ordering.ts`） | 多 phase project の universal pattern |
| `finding-group-pr`（PR description parse） | §A1（`tools/governance/check-finding-group-pr.ts`） | parse-heavy + universal な migration PR convention |
| `inquiry-scope`（Markdown KPI grep） | §B（AI が `grep` で self-check） | 軽量、AI self-check で十分 |
| `Reading Pass 中の対象 zone 編集禁止` | §B（AI が `git diff` で self-check） | phase 依存 transient rule、§A2 phase 不変条件に該当しない |
| `既存 references/99-archive/ への 1 PR 大量移動禁止` | §A1 promote（universal Finding group convention） | universal な migration PR convention |
