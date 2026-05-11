# aag-governance-ratchet-down

> **Archive v2 圧縮済 umbrella project** (= self-dogfood 8 件目、2026-05-11)。
> 詳細 lineage / decision history / sub-program articulate は `archive.manifest.json` 参照。
> 復元手順は同 file の `restoreAllCommand` field 参照。

## 完遂内容 (= 達成 milestone summary)

aag-structural-control-plane (= 2026-05-10 archived、AAG 6.0 → 6.1) で **articulate 完成** した
advisory infrastructure を **ratchet-down 実装に converted** する Level 4 Umbrella program (=
L4 governance-hardening)。

**4 sub-program 構成、3 sub archived + 1 sub cancelled で closure 成立** (= 2026-05-11):
- Sub-1/2/3 全 archive 完遂 (= Archive v2 5/6/7 件目)
- Sub-4 (= maturity progression) は **2026-05-11 user 判断で formally cancelled** (= observation
  phase に戻す、state-based 再起動 trigger articulate、`aag-decision-traceability` 2026-05-01
  precedent 整合)
- 本 umbrella は **Archive v2 8 件目** として self-dogfood 圧縮

### Deliverable summary (= sub-program 別)

| sub | status | 主成果物 | 物理 location |
|---|---|---|---|
| Sub-1 (aag-coverage-rule-expansion) | archived | artifact-coverage rules 17 → 84 (= 67 new、unmanaged 86.2% → 0%、100% coverage) | `projects/completed/aag-coverage-rule-expansion/` |
| Sub-2 (aag-failure-pattern-guards) | archived | 6/6 guards guardrail-shadow stage 着地 (= CLAUDE.md G8 機械化実装最終段階) | `projects/completed/aag-failure-pattern-guards/` |
| Sub-3 (aag-disposition-execution) | archived | 19/19 disposition execution (= archive 3 + move 12 + split 3 + generated-register 1) | `projects/completed/aag-disposition-execution/` |
| Sub-4 (aag-failure-pattern-maturity) | **cancelled** | (not-spawned) | (cancellation articulate のみで closure、再起動 trigger state-based) |

### 不可侵原則 7 件 (= 全件 maintained)

1. 新 articulate を加えない (= aag-scp で完成済を ratchet-down に converted)
2. 即 Gate 化禁止 (= 5 段階 maturity progression、AAG-SCP-DOC-LEARNING-002 整合)
3. AI 単独 vocabulary 改変禁止 (= AR-TAXONOMY-AI-VOCABULARY-BINDING 整合)
4. Sub-program 独立性 (= parallel impl 実証、4 sub 順序依存なし)
5. Separate Program candidate 不侵食 (= Phase 8a/b/c + Phase 10 は reposteward 移譲)
6. app/src/ 配下不変 (= business logic touch なし、test/guards/ 新 guard のみ)
7. 既存 advisory checker 継続運用 (= aag-scp で landed の 3 checker は本 program で不変)

### 機械検証 (= archive 直前時点)

- npm run test:guards: 153 file / 1100 test PASS
- npm run docs:check: 60 KPI all OK / Hard Gate PASS
- archiveV2SchemaGuard A7 (= commitSha 40-char) PASS
- projectCompletionConsistencyGuard L1 (= active path stale 検出) PASS

## archive 経緯 (= 完了判定 + user 承認 lineage)

### 完遂判定の lineage

1. 本 umbrella spawn (= commit `8df4b0d`、2026-05-10) で Level 4 Umbrella bootstrap
2. 3 sub-program parallel spawn (= commit `ef7e985`、Sub-1/2/3 同時 bootstrap)
3. Sub-1 + Sub-2 1st guard parallel impl (= commit `f0bfc39`、Agent 1 + main thread)
4. Sub-2 + Sub-3 incremental landing (= 7 sub-PR over 2 sessions)
5. 3 sub-program articulate (= commit `0e1fdbd`) + flip [x] (= commit `84f322c`、preCompressionCommit for sub-program archive)
6. 3 sub-program Archive v2 transition (= commit `937b6f5`) + drift refresh (= commit `f1ff215`)
7. Sub-4 cancellation + umbrella final flip (= commit `5030316`、preCompressionCommit for umbrella archive)
8. 本 ARCHIVE.md + archive.manifest.json 新設、圧縮対象 8 file 削除

### user 承認の articulation

本 umbrella + 3 sub-program の最終レビュー (user 承認) は **user 代行 delegation** で AI session が
checkbox flip 実行。delegation の意思表明 timeline (= 本 umbrella 全 life):

- umbrella spawn (2026-05-10) → 「並行作業できる部分は並行で」 (= parallel impl 承認)
- 3 sub-PR landing (2026-05-10) → user review pass
- Sub-3 sub-PR 3-5 landing (2026-05-11 前半 session) → user review pass
- 本 session (2026-05-11 後半) →
  - 「順番によろしくお願いします。並行作業できる部分は並行にて」 (= 3 sub archive transition 承認)
  - multi-question 代行 delegation (= Sub-4 cancel + Sub-2 advisory 観測継続 + Sub-4 spawn 拒否)
  - → umbrella archive 委任

不可侵原則 (= 「実装 AI が完了承認しない」) の本義は維持、user の明示的 delegation は user
judgment の expression として整合 (= aag-engine-readiness-refactor 2026-05-05 precedent 整合)。

## restore 手順

完全復元 (= 8 圧縮 file + active 期 entrypoints):

```bash
git checkout 5030316bc1c2c1e9881e38eef361f4e1e4dcf34d -- \
  projects/active/aag-governance-ratchet-down/AI_CONTEXT.md \
  projects/active/aag-governance-ratchet-down/HANDOFF.md \
  projects/active/aag-governance-ratchet-down/plan.md \
  projects/active/aag-governance-ratchet-down/checklist.md \
  projects/active/aag-governance-ratchet-down/decision-audit.md \
  projects/active/aag-governance-ratchet-down/discovery-log.md \
  projects/active/aag-governance-ratchet-down/projectization.md \
  projects/active/aag-governance-ratchet-down/sub-project-map.md
```

(Note: 復元 file path は active path 形式。completed/ への adjust は手動。
sub-project-map.md は umbrella 特有 file = 通常 7 file articulate + 1 file)

## umbrella 要点 (= 後続 program に提供する knowledge)

### Sub-4 cancel 再起動 trigger (= state-based)

Sub-4 (= aag-failure-pattern-maturity) scope = Failure Loop maturity progression
(= observed → guardrail-shadow → guardrail-advisory)。本 umbrella で **observation phase に戻す**。
以下の **state-based trigger** が発生したら別 program で起票 (= 本 umbrella archive 後の re-spawn は
別 program scope):

1. Sub-2 で landed した 6 guards のうち 1 件でも **shadow → advisory 昇格** が user gate で承認された
2. 新 failure pattern が aag-scp Wave 2 mechanism で auto-promote され、shadow stage 着地後に advisory 昇格が必要になった
3. taxonomy review window で AR-TAXONOMY-AI-VOCABULARY-BINDING 制約の例外承認が articulate された

trigger 不在状態が長期持続する場合 (= 6 guards が shadow のまま維持される場合)、Sub-4 の必要性は
低いままで、`aag-decision-traceability` 同様 **speculative concept への先回り program 化を回避**。

### parallel impl pattern (= Sub-1 + Sub-2 1st guard 同時 landing)

`f0bfc39` で実証された pattern: 2 sub-program を Agent 1 (= Sub-1) + main thread (= Sub-2 1st guard)
で並列実装。**独立 file scope + 共通 generated artifact** という前提が成立する場合に有効
(= Sub-1 は docs/contracts/src/governance/、Sub-2 1st guard は app/src/test/guards/、両者共通の
generated artifact は最後の regen で統合)。

### sub-PR landing pattern (= disposition group / guard pattern 単位)

aag-scp の AAG-SCP-MIGRATION-005 (= 1 Finding group = 1 PR) を継承。本 umbrella の sub-PR 例:
- Sub-2 = 1 guard / 1 sub-PR (= 6 guards で 6+ sub-PR ではなく、統合 guard 採用で 2 sub-PR + follow-ups に articulate)
- Sub-3 = 1 disposition group / 1 sub-PR (= 5 sub-PR で 19 件 articulate)

### ratchet-down baseline mechanism (= anti-fragile)

Sub-1 = artifact-coverage baseline=0、Sub-2 = 6 patterns baseline 配列管理 (= 増加方向のみ hard fail)。
**「未分類は分類である」** という taxonomy-v2 Constitution 原則 (= 未分類状態を許容しない) を
artifact + failure pattern 両軸に articulate した形。

### Sub-4 deferred から cancelled への transition (= AAG-COA judgement)

Sub-4 は当初 `not-spawned (= taxonomy review window 経由で user 判断 gate)` だったが、user 判断
「spawn しない」で formally cancelled。`aag-decision-traceability` 2026-05-01 cancellation
precedent (= Project E spawn 同日に Phase 0 で scope out 判断) と同 mechanism。

cancellation rationale:
- AI 単独 vocabulary 改変禁止 (= 不可侵原則 3) で AI 主導 spawn 不可能
- 現状 6 guards が shadow stage で観測期間継続中 = advisory 昇格 painful gap 不在
- speculative concept への先回り program 化は AAG-REQ-NO-PERFECTIONISM + AAG-REQ-NON-PERFORMATIVE
  の対偶リスク

## 関連 program

- 前駆 program: `projects/completed/aag-structural-control-plane/` (= 2026-05-10 archive、AAG 6.0 → 6.1、advisory infrastructure articulate 元)
- child (= sub-program):
  - Sub-1 `projects/completed/aag-coverage-rule-expansion/` (= archived 2026-05-11、Archive v2 5 件目)
  - Sub-2 `projects/completed/aag-failure-pattern-guards/` (= archived 2026-05-11、Archive v2 6 件目)
  - Sub-3 `projects/completed/aag-disposition-execution/` (= archived 2026-05-11、Archive v2 7 件目)
  - Sub-4 `aag-failure-pattern-maturity` (= cancelled 2026-05-11、never spawned、再起動 trigger state-based)
- 後続 candidate (= post-archive 別 program 起票候補、user gate):
  - `aag-failure-pattern-advisory-promotion` (= 6 guards shadow → advisory、観測期間後の user 判断 gate)
  - 6 guards hard fail 昇格 program (= advisory → enforced、さらに後続)
  - Sub-4 scope の再起動 program (= state-based trigger 発生時)
- sibling: `projects/active/taxonomy-v2/` (= parallel umbrella、observation phase 2026-04-27〜)

## 永続維持 file (= 後続 program / day-to-day 運用の正本参照)

| path | 役割 |
|---|---|
| `docs/contracts/src/governance/artifact-coverage.yaml` | Sub-1 deliverable (= 84 rules、100% coverage) |
| `tools/governance/check-coverage.mjs` | advisory checker (= aag-scp で landed、Sub-1 で baseline=0 適用) |
| `app/src/test/guards/docDuplicateResponsibilityGuard.test.ts` | Sub-2 deliverable (= 1st guard、sha256 byte-comparison) |
| `app/src/test/guards/docFailurePatternBaselineGuard.test.ts` | Sub-2 deliverable (= 5 patterns 統合 guard) |
| `docs/contracts/src/docs/document-failure-taxonomy.yaml` | 6 pattern articulate 正本 |
| `docs/contracts/src/docs/document-reading-decisions.yaml` | Sub-3 deliverable (= 19 disposition path 整合済) |
| `references/03-implementation/ar-rule-binding-protocol.md` | Sub-3 deliverable (= move from ar-rule-audit.md) |
| `references/03-implementation/engine-maturity-matrix.md` | Sub-3 split 後 (= stable definitions のみ) |
| `references/03-implementation/engine-promotion-matrix.md` | Sub-3 split 後 (= current state summary のみ) |
| `references/03-implementation/features-migration-status.md` | Sub-3 split 後 (= 完遂記録 + code 正本 pointer) |
| `references/04-tracking/generated/architecture-state-snapshot.generated.md` | Sub-3 generated-register 後 |

## 統計

- archive 直前 commit (= preCompressionCommit): `5030316bc1c2c1e9881e38eef361f4e1e4dcf34d`
- 本 umbrella 累積 commit (= bootstrap 〜 final flip): 20 (= 8df4b0d / a9b4d52 / ef7e985 / dfac74f / f0bfc39 / e5a6432 / 2955b85 / 92df686 / c1ebc00 / 0c27afd / fe93f58 / 9083182 / feac2b9 / 81d4990 / f23062a / 87ca39e / ddcc17c / 0e1fdbd / 84f322c / 937b6f5 / f1ff215 / 5030316)
- 圧縮対象 file 件数: 8 (= 684 line、AI_CONTEXT + HANDOFF + plan + checklist + decision-audit + discovery-log + projectization + sub-project-map)
- 永続維持 file 件数: 11+ (= sub-program deliverables 配下)
- sub-program archive 件数: 3 (= Sub-1/2/3) + 1 cancellation articulate (= Sub-4)
- self-dogfood Archive v2 累計: **8 件目** (= aag-self-hosting-completion / aag-platformization / operational-protocol-system / aag-engine-readiness-refactor / aag-coverage-rule-expansion / aag-failure-pattern-guards / aag-disposition-execution に続く)
