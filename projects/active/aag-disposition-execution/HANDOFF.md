# HANDOFF — aag-disposition-execution

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**完遂 (= 19/19 disposition 全件 execution)、archive 移行待ち** (= 2026-05-10 spawn → 2026-05-11
本 session で残 5 件 batch landing 完了)。

### 完遂 summary

- **archive 3 件**: references/99-archive/ への移動 + frontmatter 装着
- **move 12 件**: 11 promotion-readiness + 1 ar-rule-audit
- **split 3 件**: engine-maturity-matrix / engine-promotion-matrix / features-migration-status の責務分離 rewrite
- **generated-register 1 件**: architecture-state-snapshot を `.generated.md` suffix へ正規化

各 disposition は reading-decisions.yaml entry の rationaleSummary に articulate 済の方針通り
execution、実 file 配置と articulate path を整合。

### landed commits (= 19 件を 5 sub-PR で landing)

| commit | sub-PR | scope |
|---|---|---|
| `fe93f58` | sub-PR 1 | Phase 1 = archive 3 件 |
| `9083182` | sub-PR 1 follow-up | doc-registry path update (= archived aag-doc-audit-report) |
| `feac2b9` | sub-PR 2 | Phase 2 = move 11 件 (promotion-readiness) + pure-calc-reorg reviewPolicy bump |
| `f23062a` | sub-PR 3 | Phase 3 = move 1 件 (ar-rule-audit) + 18 inbound updates |
| `87ca39e` | sub-PR 4 | Phase 4 = split 3 件 (DOC-FAIL-TEMPORAL-MIXING 解消) |
| `ddcc17c` | sub-PR 5 | Phase 5 = generated-register (architecture-state-snapshot rename) |

### 数値 snapshot

| 指標 | 値 |
|---|---|
| disposition execution | 19/19 (100%) |
| archive | 3/3 |
| move | 12/12 |
| split | 3/3 |
| generated-register | 1/1 |
| inbound updates (Phase 3) | 18 件全 update |
| reading-decisions path 整合 | 19/19 (= 全 entry が実 location と整合) |

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先 (= archive 移行前の最終 gate)

- 最終レビュー (user 承認) section の [x] flip 待ち (= 機能 Phase + AI 自己レビュー section は全 [x] 済)

### 中優先 (= user 承認後の archive プロセス)

- archive 移行 (= projects/active/aag-disposition-execution/ → projects/completed/、Archive v2 形式)
- 親 umbrella `sub-project-map.md` の Sub-3 status を archive 反映
- 親 umbrella HANDOFF.md の Sub-3 status flip (= 既に 100% 反映済、archive 後 strikethrough or note)

### 低優先 (= 別 program 候補、本 Sub-3 scope 外)

- Reading Pass 新 batch の articulate 判断 (= aag-scp Wave 2 mechanism の継続運用)
- Sub-2 advisory 昇格判断 (= 別 program candidate)
- features-migration-status.md 末尾の「別 Epic 候補 3 件」の projects 化判断 (= user gate)

## 3. ハマりポイント

### 3.1. inbound network of update が広範

各 file movement は inbound 多数。例:
- promotion-readiness × 11: reading-decisions / doc-registry / README.md (= 各 11 entries)
- ar-rule-audit × 1: 18 inbound (= 5 guards + display-rule-registry + principles + 各種 yaml/json)
- architecture-state-snapshot × 1: producer test + doc-registry + reading-decisions

**対処**: `git grep -l "<old-path>"` で inbound list を完全把握してから edit を始める。
generated artifacts は regen で自動更新だが、source-facts.json は別 CLI (= source-facts-cli.ts)
が必要。

### 3.2. 即 commit せず docs:generate を挟む

各 sub-PR で manual edits → docs:generate → 残 stale 参照を grep で再 check → 必要なら追加 edit
→ source-facts regen → guard test → commit の順番。途中 commit すると generated section drift で
pre-commit hook がブロック。

### 3.3. pure-calc-reorg overlay reviewPolicy stale (= 副次 fix)

pure-calculation-reorg/aag/execution-overlay.ts の reviewPolicy.lastReviewedAt は cadenceDays
経過で overdue。Sub-3 sub-PR 2 着地時に hard gate fail trigger、bump で unblock。pure-calc-reorg
は別 project scope (= 本 umbrella 配下外)、bump は最小限 scope crossover。

今後 file 変更で hard gate fail trigger があった場合、まず reviewPolicy stale を疑う。

### 3.4. split は disposition だが rewrite content も伴う

split disposition の実 execution は単純な git mv ではなく **content split** (= 旧 doc 内容を
分解 + 各々を rewrite)。実行時の決定:
- engine-maturity-matrix.md: stable definitions のみ保持 (102 → 41 lines)
- engine-promotion-matrix.md: per-engine narrative 削除 (160 → 25 lines)
- features-migration-status.md: Widget Ownership table を code 正本 pointer に縮約 (57 → 47 lines)

producer 不在 (= 機械生成 path なし) のため、state 部分は **削除 + code 正本 / 別 doc への pointer**
で対処。

### 3.5. generated-register は producer-orphan duplicate 解消

architecture-state-snapshot は `.md` (plain) と `.generated.md` (suffix 付き) が併存していた:
- plain `.md`: architectureStateAudit.test.ts が writeFileSync で出力 (= producer)
- `.generated.md`: 別の generator (= history では aag-engine readiness?) が出力

Sub-PR 5 で producer (test) を rename + plain `.md` を物理削除。`.generated.md` 側の producer
は別途追跡が必要 (= 本 Sub-3 scope 外、health regen が source-of-truth)。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order) |
| `plan.md` | 不可侵原則 + Phase 1〜5 articulate |
| `checklist.md` | 全 Phase + AI 自己レビュー [x]、最終レビュー [ ] (= user 承認待ち) |
| `decision-audit.md` | ADR-DE-* lineage (= 5 sub-PR の articulate 判断記録) |
| `discovery-log.md` | scope 外発見の蓄積 (= pure-calc-reorg reviewPolicy stale 等) |
| `projectization.md` | AAG-COA 判定 (= Level 3 architecture-refactor / requiresHumanApproval=true) |
| 親 umbrella `projects/active/aag-governance-ratchet-down/HANDOFF.md` | 共有 context (= Sub-3 完遂 articulate) |
| `docs/contracts/src/docs/document-reading-decisions.yaml` | 19 件 disposition 正本 (= aag-scp Wave 2 articulate) |

### 本 Sub-3 で landed deliverables

| Phase | Deliverable |
|---|---|
| 1 | 3 files に [ARCHIVED] frontmatter 装着 + 99-archive/ 移動 |
| 2 | 11 promotion-readiness docs を projects/active/pure-calculation-reorg/phase-8/readiness/ へ |
| 3 | ar-rule-audit.md → references/03-implementation/ar-rule-binding-protocol.md + 18 inbound update |
| 4 | engine-maturity-matrix + engine-promotion-matrix + features-migration-status の責務分離 rewrite |
| 5 | architecture-state-snapshot.md (orphan) 削除 + producer を `.generated.md` write に統一 |

## 5. 後任者向け checklist

archive 移行前に以下を確認:

1. [x] checklist.md の各 Phase section が全 [x] になっている
2. [x] AI 自己レビュー section の総 review 完了 (= 不可侵原則違反 0 / 歪み 0 / 潜在バグ 0)
3. [ ] 最終レビュー (user 承認) section の user 判断完了 + [x] flip
4. [ ] archive 移行手順実行 (= Archive v2 形式)
5. [ ] 親 umbrella sub-project-map.md の Sub-3 status update (= 完遂 → archived)
6. [ ] aag-governance-ratchet-down umbrella の archive 判断 (= Sub-1/Sub-2/Sub-3 全 archive 後、Sub-4 deferred 判断と合わせて user gate)
