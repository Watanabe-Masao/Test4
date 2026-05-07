# scp-checkers — aag-structural-control-plane project-scoped AI tools

> **役割**: 本 program 固有の制約（plan.md「やってはいけないこと」§A2）を CI level で foul させる **project-scoped checker** 群。AI が `aag scp check --project aag-structural-control-plane <checker>` で呼び出し可能。
>
> **規約**: ADR-SCP-014 / AAG-SCP-GUIDANCE-007 に従う。本 program archive 時に Archive v2 §6.4 で `projects/active/aag-structural-control-plane/aag/` folder ごと物理削除されるため、§A2 checker は archive 後 invocation 不能（restore 経由でのみ復活）。

## 1. 設計原則

- **lifecycle**: 本 program active 期間のみ。archive 時に物理削除
- **invocation**: `aag scp check --project aag-structural-control-plane <checker>`（reposteward `aag-engine` 経由、Phase 1+ で landing）
- **output**: Finding JSON（ADR-SCP-013 schema 準拠、`docs/contracts/schema/aag-finding.schema.json`）
- **配置**: 本 directory（`projects/active/aag-structural-control-plane/aag/scp-checkers/`）
- **promotion**: archive 直前に user 判断で「universal」と判明した checker は `tools/governance/check-*.ts` へ promote（§A2 → §A1）

## 2. checker 一覧（Phase 1+ で順次 landing）

| checker name | 検出対象 | landing phase | promotion candidate? |
|---|---|---|---|
| `obligation-migration-staging` | OBLIGATION_MAP / PATH_TO_REQUIRED_READS の一発切替 | Phase 8a/8b/8c | yes（OBLIGATION_MAP migration pattern は universal） |
| `reading-pass-review` | Reading Pass の機械分類代替 + 期間中の対象 zone 編集 | Phase 2.5 | partial（reading-decisions.yaml schema は universal、対象 zone 編集禁止は project-scoped） |
| `phase-ordering` | Phase 順序逆行 | Phase 1 | partial（多 phase project の universal pattern） |
| `hard-gate-count` | Wave 1 milestone 到達前の Hard Gate 追加 | Phase 1 | no（reposteward Wave 1 state に依存、本 program 固有） |
| `docs-contracts-aag-untouched` | `docs/contracts/aag/*.schema.json` 再配置 | Phase 0 完了後即時 | no（本 program nonGoal） |
| `app-untouched` | `app/src/` 配下 touch + 業務 logic 変更 | Phase 0 完了後即時 | no（本 program nonGoal） |
| `finding-group-pr` | references/99-archive/ への 1 PR 大量移動 | Phase 5 | yes（Finding group 単位 PR は universal pattern） |
| `no-new-references-doc` | references/ への新 doc 追加（本 program scope 外） | Phase 0 完了後即時 | no（本 program scope） |
| `inquiry-scope` | inquiry/ への generated artifact 直書き | Phase 1 | yes（inquiry/ skeleton 限定は universal） |

## 3. 実装方針

各 checker は以下の interface を満たす TypeScript module（Phase 1+ で実装）:

```typescript
import type { Finding } from '@/test/aag-core-types' // Phase 1 で aag-finding.schema.json に基づく型を articulate

export interface ScpChecker {
  readonly name: string
  readonly description: string
  readonly violationBasis: string // 不可侵原則 / ADR / nonGoal への参照
  readonly landingPhase: 'phase-0-post' | 'phase-1' | 'phase-2-5' | 'phase-3' | 'phase-4' | 'phase-5' | 'phase-6' | 'phase-8a' | 'phase-8b' | 'phase-8c'
  readonly promotionCandidate: 'yes' | 'no' | 'partial'
  check(): Finding[] // 検出ロジック
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
invoke check() → Finding[]
  ↓
output JSON (ADR-SCP-013 schema)
```

## 4. archive 時の処理

本 program archive 時:

1. archive 直前: §A2 checker のうち promotion candidate を user 判断で評価
2. promotion 採用: `tools/governance/check-<checker>.ts` へ実装 move + decision-audit.md 振り返り判定 articulate
3. promotion 棄却 / 該当なし: そのまま放置（§A2 のまま）
4. Archive v2 §6.4: `projects/active/aag-structural-control-plane/aag/` folder が `projects/completed/aag-structural-control-plane/` 移動時に物理削除（archive.manifest.json `deletedPaths` に記録）
5. restore 経路: archive.manifest.json `restoreAllCommand` で preCompressionCommit 時点を復元すれば §A2 checker も復活

## 5. 現在の実装状態

Phase 0 では本 directory + README のみ landing。実 checker は Phase 1+ で順次 landing する（checklist.md の Phase 0 acceptance criteria は本 directory 存在 + README articulation を含む）。
