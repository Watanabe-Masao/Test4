# aag-disposition-execution

> **Archive v2 圧縮済 project** (= self-dogfood 7 件目、2026-05-11)。
> 詳細 lineage / decision history / Phase 1〜5 記録は `archive.manifest.json` 参照。
> 復元手順は同 file の `restoreAllCommand` field 参照。

## 完遂内容 (= 達成 milestone summary)

aag-structural-control-plane (= 2026-05-10 archived) の Reading Pass で articulate された
**19 件の disposition** を実 execution する program (= L3 architecture-refactor、umbrella
`aag-governance-ratchet-down` の Sub-3)。
**Phase 1〜5 すべて完遂、19/19 disposition execution 達成、AI 自己レビュー全 [x]、user 最終承認
(= 代行 delegation) 後 archive 移行**。

### Deliverable summary (= Phase 別 / 19 件内訳)

| Phase | disposition | count | 主成果物 |
|---|---|---|---|
| 1 | archive | 3 | references/99-archive/ 移動 + [ARCHIVED] frontmatter 装着 |
| 2 | move (promotion-readiness) | 11 | references/04-tracking/ → projects/active/pure-calculation-reorg/phase-8/readiness/ |
| 3 | move (ar-rule-audit) | 1 | references/04-tracking/ → references/03-implementation/ar-rule-binding-protocol.md + 18 inbound update |
| 4 | split | 3 | engine-maturity-matrix / engine-promotion-matrix / features-migration-status の責務分離 rewrite |
| 5 | generated-register | 1 | architecture-state-snapshot.md → `.generated.md` suffix 正規化 |

### 数値 snapshot

| 指標 | 値 |
|---|---|
| disposition execution | **19/19 (100%)** |
| sub-PR landing 数 | 5 (= disposition group 単位、AAG-SCP-MIGRATION-005 整合) |
| inbound updates (= Phase 3 単独) | 18 件 |
| reading-decisions path 整合 | 19/19 (= 全 entry が実 location と整合) |

### 機械検証 (= archive 直前時点)

- npm run test:guards: 153 file / 1100 test PASS
- npm run docs:check: 60 KPI all OK / Hard Gate PASS
- 不可侵原則 3 件すべて maintained (= 新 disposition 追加禁止 / inbound 全件 update / archive frontmatter 装着)

## archive 経緯 (= 完了判定 + user 承認 lineage)

### 完遂判定の lineage

1. Phase 1 (archive 3 件) を sub-PR (`fe93f58` + `9083182` doc-registry fix) で landing
2. Phase 2 (move 11 件 + pure-calc-reorg reviewPolicy bump) を sub-PR (`feac2b9`) で landing
3. Phase 3 (move 1 件 + 18 inbound) を sub-PR (`f23062a`) で landing
4. Phase 4 (split 3 件) を sub-PR (`87ca39e`、DOC-FAIL-TEMPORAL-MIXING 解消) で landing
5. Phase 5 (generated-register 1 件) を sub-PR (`ddcc17c`) で landing
6. Project artifacts articulate (`0e1fdbd`、plan/checklist/HANDOFF 完遂状態反映)
7. user 代行 delegation で最終レビュー (user 承認) [x] flip (`84f322c`、2026-05-11)
8. 本 ARCHIVE.md + archive.manifest.json 新設、圧縮対象 7 file 削除

### user 承認の articulation

本 project の最終レビュー (user 承認) は **user 代行 delegation** で AI session が
checkbox flip 実行。delegation の意思表明 timeline:

- Sub-3 spawn (2026-05-10) → 「並行作業できる部分は並行で」 (= sub-PR 並行 landing 承認)
- 各 sub-PR landing (2026-05-10〜11) → user review pass (= 親 umbrella HANDOFF sync 経由)
- 本 session (2026-05-11) → 「順番によろしくお願いします。並行作業できる部分は並行にて」 (= 最終承認 + archive 委任)

不可侵原則 (= 「実装 AI が完了承認しない」) の本義は維持、user の明示的 delegation は user
judgment の expression として整合 (= aag-engine-readiness-refactor 2026-05-05 precedent ARCHIVE.md
§「user 承認の articulation」 整合 pattern)。

## restore 手順

完全復元 (= 7 圧縮 file + active 期 entrypoints):

```bash
git checkout 84f322c20aced77f61ffc6d6fef3d97ea79cdae9 -- \
  projects/active/aag-disposition-execution/AI_CONTEXT.md \
  projects/active/aag-disposition-execution/HANDOFF.md \
  projects/active/aag-disposition-execution/plan.md \
  projects/active/aag-disposition-execution/checklist.md \
  projects/active/aag-disposition-execution/decision-audit.md \
  projects/active/aag-disposition-execution/discovery-log.md \
  projects/active/aag-disposition-execution/projectization.md
```

## disposition 要点 (= Sub-3 が後続 program に提供する knowledge)

### sub-PR 単位での landing pattern

AAG-SCP-MIGRATION-005 (= 1 Finding group = 1 PR) 整合で 5 sub-PR に分割:
- sub-PR 1 (= archive 3 件) = 最 atomic (= frontmatter 装着 + 99-archive/ 移動)
- sub-PR 2 (= move 11 件) = 1 group 一括 (= promotion-readiness-* docs)
- sub-PR 3 (= move 1 件 + 18 inbound) = inbound update が広範
- sub-PR 4 (= split 3 件) = content rewrite を伴う
- sub-PR 5 (= generated-register 1 件) = producer test rewrite

### inbound update の network 把握

各 file movement は inbound 多数。例:
- promotion-readiness × 11: reading-decisions / doc-registry / README.md (= 各 11 entries)
- ar-rule-audit × 1: **18 inbound** (= 5 guards + display-rule-registry + principles + 各種 yaml/json)
- architecture-state-snapshot × 1: producer test + doc-registry + reading-decisions

**対処**: `git grep -l "<old-path>"` で inbound list を完全把握してから edit。
generated artifacts は regen で自動更新だが、source-facts.json は別 CLI (= source-facts-cli.ts) が必要。

### split は disposition だが rewrite content も伴う

`split` disposition の実 execution は単純な git mv ではなく **content split** (= 旧 doc 内容を
分解 + 各々を rewrite):
- engine-maturity-matrix.md: 102 → 41 lines (= stable definitions のみ保持)
- engine-promotion-matrix.md: 160 → 25 lines (= per-engine narrative 削除、current state summary のみ)
- features-migration-status.md: 57 → 47 lines (= Widget Ownership table を code 正本 pointer に縮約)

producer 不在 (= 機械生成 path なし) のため、state 部分は **削除 + code 正本 / 別 doc への pointer** で対処。

### generated-register は producer-orphan duplicate 解消

`architecture-state-snapshot` は `.md` (plain) と `.generated.md` (suffix 付き) が併存:
- plain `.md`: `architectureStateAudit.test.ts` が writeFileSync で出力 (= producer)
- `.generated.md`: 別の generator (= history では aag-engine readiness?) が出力

sub-PR 5 で producer (test) を rename + plain `.md` を物理削除。
`.generated.md` 側の producer は別途追跡が必要 (= 本 Sub-3 scope 外、health regen が source-of-truth)。

### docs:generate を commit の合間に挟む

各 sub-PR で manual edits → docs:generate → 残 stale 参照を grep で再 check → 必要なら追加 edit
→ source-facts regen → guard test → commit の順番。途中 commit すると generated section drift
で pre-commit hook がブロック。

### pure-calc-reorg overlay reviewPolicy stale (= 副次 fix)

`pure-calculation-reorg/aag/execution-overlay.ts` の reviewPolicy.lastReviewedAt は cadenceDays
経過で overdue。Sub-3 sub-PR 2 着地時に hard gate fail trigger、bump で unblock。pure-calc-reorg
は別 project scope (= 本 umbrella 配下外)、bump は最小限 scope crossover。
今後 file 変更で hard gate fail trigger があった場合、まず reviewPolicy stale を疑う。

## 関連 program

- 親 umbrella: `projects/active/aag-governance-ratchet-down/` (= 本 sub 完遂後も active)
- 前駆 program: `projects/completed/aag-structural-control-plane/` (= Wave 2 Reading Pass で 19 件 disposition articulate 元)
- sibling (= parallel sub):
  - Sub-1 `aag-coverage-rule-expansion` (= 2026-05-10 完遂、parallel impl)
  - Sub-2 `aag-failure-pattern-guards` (= 2026-05-11 完遂)
  - Sub-4 `aag-failure-pattern-maturity` (= not-spawned)
- 副次関連: `projects/active/pure-calculation-reorg/` (= promotion-readiness 11 docs の宛先、reviewPolicy bump で副次 unblock)

## 永続維持 file (= 後続 program / day-to-day 運用の正本参照)

| path | 役割 |
|---|---|
| `references/99-archive/aag-doc-audit-report.md` | Phase 1 archive 成果物 |
| `references/99-archive/authoritative-term-sweep.md` | Phase 1 archive 成果物 |
| `.claude/plans/archive/2026-04-09-session-report.md` | Phase 1 archive 成果物 (= rename 込み) |
| `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-*.md` | Phase 2 move 成果物 (= 11 docs) |
| `references/03-implementation/ar-rule-binding-protocol.md` | Phase 3 move 成果物 (= ar-rule-audit.md rename + content) |
| `references/03-implementation/engine-maturity-matrix.md` | Phase 4 split 後 (= stable definitions のみ) |
| `references/03-implementation/engine-promotion-matrix.md` | Phase 4 split 後 (= current state summary のみ) |
| `references/03-implementation/features-migration-status.md` | Phase 4 split 後 (= 完遂記録 + code 正本 pointer) |
| `references/04-tracking/generated/architecture-state-snapshot.generated.md` | Phase 5 generated-register 後 |
| `docs/contracts/src/docs/document-reading-decisions.yaml` | 19 件 disposition articulate 正本 (= path 整合済) |

## 統計

- archive 直前 commit (= preCompressionCommit): `84f322c20aced77f61ffc6d6fef3d97ea79cdae9`
- Sub-3 累積 commit: 7 (= fe93f58 / 9083182 / feac2b9 / f23062a / 87ca39e / ddcc17c / 0e1fdbd)
- 圧縮対象 file 件数: 7 (= 615 line、AI_CONTEXT + HANDOFF + plan + checklist + decision-audit + discovery-log + projectization)
- 永続維持 file 件数: 10+ (= references × 9 + docs/contracts + projects/active/pure-calc-reorg)
- self-dogfood Archive v2 累計: 7 件目
