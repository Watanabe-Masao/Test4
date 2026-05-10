# HANDOFF — aag-structural-control-plane

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Wave 1 + Wave 2 + Wave 3 すべて完遂、archive 移行前の最終 review 段階**。project-health は 98%、
architecture-health は Total 60 KPI / OK 60 / Hard Gate PASS。後任者は本 doc → checklist.md →
plan.md の順で確認、最終レビュー section の user 承認 [x] flip で archive 移行可。

### 完遂 milestones (= 時系列、merged main の状態)

| milestone | landed | scope |
|---|---|---|
| Phase 0 (= ADR + Existing Asset Mapping) | 完遂 | ADR-SCP-001〜022 + inquiry/01〜08 + 8 ファイル一式 |
| Wave 1 / Phase 1 (Schema MVP) | 完遂 | aag-finding / tree-contracts / doc-kind-registry の 3 schema |
| Wave 1 / Phase 2 (Skeleton-aware Parse、PARSE2) | 完遂 | Phase 2A〜2E すべて landing (= structural skeleton + repo topology + skeleton diff + managed-zone inventories + top-level disposition) |
| Wave 1 / Phase 3 (Tree Contract Shadow advisory) | 完遂 | check-tree.mjs landing |
| Wave 2 / Phase 2.5 (Document Reset Pass + Failure Loop + Universe Index) | **100% 完遂** | Reading Pass 22 batches で 398 docs articulate / Failure Loop 11 patterns / 5 guard candidates / DOC-FAIL-STALE-DESCRIPTION 追加 |
| Wave 2 / Phase 4 (Document Kind + Temporal Scope Shadow) | 完遂 | doc-kind-registry + temporal-scope-policy + 2 advisory checkers |
| Wave 3 / Phase 6 (AI Instruction Pack) | 完遂 | 20 kinds + generator + post-write checker + collection mode governance gap fix + 3 stale docs rewrite + 9 files delete-cleanup |
| Wave 3 / Phase 7 (Required Docs Matrix) | 完遂 | 5 rules / 46 targets / 0 missing / advisory checker |
| Wave 3 / Phase 9 (Artifact Coverage Gate) | 完遂 | 17 rules / 3704 tracked / 86.2% unmanaged baseline / advisory checker |

### 数値 snapshot (= 直近 docs:generate 反映後)

- Reading Pass: **398 / 398 docs articulate (= 100%)**、proposedKind 20 種、disposition 7 種
- Failure Loop: 11 patterns / 53 observed references / 5 guard candidates (= PROJECT-CONTENT-IN-REFERENCE 16 + LOCATION-MISMATCH 13 + DUPLICATE-RESPONSIBILITY 8 + TEMPORAL-MIXING 6 + GENERATED-AS-MANUAL 5)
- AI Instruction Pack: 20 kinds / generator + post-write checker / advisory baseline 0 findings (= collection mode exception articulate 後)
- Required Docs Matrix: 5 rules / 46 targets / 0 missing
- Artifact Coverage: 17 rules / 3704 tracked / managed 511 / unmanaged 3193 (= Wave 4+ ratchet-down 候補)
- project-health 進捗: **722/734 (= 98%)** / architecture-health Hard Gate PASS

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先 (= archive 移行前の最終整合)

- **checklist.md の最終 sweep** (= 各 sub-PR section の checkbox 状態確認、未完了 item があれば再 review or 残作業 articulate)
- **AI 自己レビュー section の総 review** (= 全 Phase / 全 sub-PR 成果物の最終確認、scope 内 / 内容妥当 / 不可侵原則違反 0 / 歪み検出 / 潜在バグ 確認)
- **本 HANDOFF.md の最終 review** (= 本 sync で再現性確保、後任 AI が実態を正しく認識可能か)
- **最終レビュー (user 承認) section** の [x] flip 待ち (= user 判断 gate)

### 中優先 (= user 承認後の archive プロセス)

- archive 移行 (= projects/active/aag-structural-control-plane/ → projects/completed/、Archive v2 形式で ARCHIVE.md + archive.manifest.json 装着)
- references/04-tracking/open-issues.md の active projects 索引から削除 + completed 索引に追加
- 本 program で landing した generated docs の継続運用 articulate (= 各 generator は archive 後も実行継続、authoring source は別 program で運用)

### 低優先 (= 別 program 候補、本 program scope 外)

- **Wave 4 candidate (= Artifact Coverage Gate ratchet-down)**: unmanaged 86.2% を coverage rule 拡張で ratchet-down (= app/src/ → 'source-code' category 等の追加 rule articulate)
- **Phase 8a/8b/8c (Obligation / Required Reads 3 段階 Shadow Migration)**: plan §Separate Program candidate articulate 済、reposteward Premise Contract 拡張に移譲候補
- **Phase 10 (Runner Parity Contract)**: 同上、reposteward `aag-engine-runner-parity-extension` に移譲候補
- **DOC-FAIL-STALE-DESCRIPTION guard 化** (= Wave 4 candidate、本 HANDOFF staleness 観測で 5 件閾値到達、guard candidate 昇格)
- **その他 staleness pattern variant articulate** (= machine ↔ doc drift variant、separate articulate candidate)

## 3. ハマりポイント

この project の archive 前後で踏みやすい罠を列挙する。

### 3.1. project-health は 98% だが checkbox 残あり (= 本 HANDOFF rewrite 含む)

`projects/active/aag-structural-control-plane/checklist.md` には sub-PR ごとの checkbox がすべて
[x] になっているが、最終 section (= AI 自己レビュー / 最終レビュー) は user 判断待ち。**user 承認
[x] flip 前に archive を実行しない** (= projectizationPolicyGuard PZ-13 + project-checklist-governance §3.1)。

### 3.2. HANDOFF.md staleness pattern 自体が観測対象 (= meta-instructive)

本 HANDOFF.md の rewrite (= 2026-05-10) は **DOC-FAIL-STALE-DESCRIPTION pattern** の 5 件目観測。
- Wave 2 で 3 件 (= protocols/README + aag/_internal/README + taxonomy-constitution)
- Wave 3 / sub-PR 2 で 1 件 (= machine ↔ doc drift case in project-checklist-governance)
- 本 sync で 1 件 (= aag-scp/HANDOFF.md 自身)

→ 計 5 件 = guard candidate threshold 到達 (= ≥5 occurrences で auto-promotion eligible)。Wave 4
candidate articulate 済 (= taxonomy review window 経由で正式 guard 化判断)。

**Lesson**: 大量 commit + 長 session で **HANDOFF / 起点文書の sync を後回しにしない**。本 program
は 41 commits + 22 batches を 1 session で landing したが、HANDOFF.md は Phase 0 直後のままだった
(= user external review で発見)。

### 3.3. Reading Pass 完遂後の document movement / archive / contract declaration

reading-decisions.yaml は 398 docs を articulate 済、各 entry に disposition (= 7 種使用) が articulate。
ただし、disposition の **実 execution** は本 program では **部分的に実行済**:
- delete-candidate 9 → 全件 delete 完遂 (sub-PR 5)
- rewrite-and-contract 4 → 3 件 rewrite 完遂 (sub-PR 4)、残 1 件 (= machine ↔ doc drift case in project-checklist-governance) は sub-PR 3 で fix
- move 12 → **未実行** (= Wave 4 candidate、physical move + reference update)
- split 3 → **未実行** (= Wave 4 candidate)
- archive 3 → **未実行** (= Wave 4 candidate)
- generated-register 1 → **未実行** (= Wave 4 candidate)

→ Wave 3 完遂 ≠ 全 disposition 実 execution。残 disposition は本 program archive 後の別 program
で扱う (= AAG-SCP-DOC-LEARNING-002 整合、即 Gate 化禁止)。

### 3.4. Failure Loop guard candidates の guard 化は別 program

5 guard candidates (= ≥5 observations) は Wave 3 で **candidate 状態に articulate のみ**:
- DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE (16)
- DOC-FAIL-LOCATION-MISMATCH (13)
- DOC-FAIL-DUPLICATE-RESPONSIBILITY (8)
- DOC-FAIL-TEMPORAL-MIXING (6)
- DOC-FAIL-GENERATED-AS-MANUAL (5)

→ 各 candidate を実 guard test に articulate するのは別 program candidate (= AAG-SCP-DOC-LEARNING-002
整合、'observed → pattern-articulated → guardrail-candidate-emitted → guardrail-shadow → guardrail-advisory'
の 5 段階 progression を経る)。

### 3.5. Artifact Coverage 86.2% unmanaged baseline は intentional

Wave 3 / Phase 9 で着地した artifact-coverage は **inventory only** (= Wave 3 完了基準)。
unmanaged 86.2% は initial baseline、Wave 4+ の coverage rule 拡張で ratchet-down 対象。

**Lesson**: 本 baseline を「品質の悪さ」と誤認しない (= advisory による visibility 提供が Wave 3 の
目的、reduction は Wave 4 以降の scope)。

### 3.6. Separate Program candidate の移譲判断

plan.md §Separate Program candidate articulate 済の Phase 8a/8b/8c + Phase 10 は本 program scope 外。
本 program archive 時に user 判断で reposteward 系統 (= reposteward Premise Contract 拡張 +
aag-engine-runner-parity-extension) に移譲。

**Lesson**: 本 program で着手しない (= scope 違い + reposteward 重複 risk)。archive 時に移譲先を
articulate するのみ。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order) |
| `plan.md` | 不可侵原則 + Wave 構造 (Wave 1〜3 + Separate Program) + Phase 0〜10 articulate |
| `checklist.md` | 全 Phase / 全 sub-PR の checkbox (= 最終レビュー section の user 承認 [x] 待ち) |
| `decision-audit.md` | DA-α-000 + ADR-SCP-001〜022 lineage articulate |
| `discovery-log.md` | scope 外発見の蓄積 inventory |
| `projectization.md` | AAG-COA 判定 (= Level 3 / governance-hardening / requiresHumanApproval=true) |
| `inquiry/01〜08` | Phase 0 投資調査記録 (= 全 8 件 採用済 status) |
| `aag/scp-checkers/README.md` | project-scoped boundary protection checkers articulate (= archive 時に物理削除予定) |

### 本 program で landing した主要 deliverables

| Wave / Phase | Deliverable |
|---|---|
| Wave 1 / Phase 1 | docs/contracts/schema/{aag-finding, tree-contracts, doc-kind-registry}.schema.json |
| Wave 1 / Phase 2 | docs/contracts/src/governance/structural-skeleton.yaml + tools/governance/{build-tree-contracts, build-repo-topology, build-skeleton-diff, build-{markdown,yaml,generated-artifact}-inventory}.mjs |
| Wave 2 / Phase 2.5 | docs/contracts/src/docs/{document-reading-decisions, document-failure-taxonomy, doc-kind-registry, temporal-scope-policy}.yaml + tools/governance/{build-document-{reading-candidates, universe, failure-taxonomy}, check-{document-universe, doc-temporal-scope}}.mjs |
| Wave 2 / Phase 4 | tools/governance/check-doc-temporal-scope.mjs |
| Wave 3 / Phase 6 | docs/contracts/src/docs/ai-doc-template-rules.yaml + tools/governance/{build-ai-doc-instructions, check-doc-postwrite}.mjs |
| Wave 3 / Phase 7 | docs/contracts/src/docs/required-docs-matrix.yaml + tools/governance/{build-required-docs-matrix, check-required-docs}.mjs |
| Wave 3 / Phase 9 | docs/contracts/src/governance/artifact-coverage.yaml + tools/governance/{build-artifact-coverage, check-coverage}.mjs |

### 本 program で実施した cleanups

| sub-PR | cleanup |
|---|---|
| Wave 3 / sub-PR 3 | Collection mode governance gap fix (= machine ↔ doc drift、3 段 articulate) |
| Wave 3 / sub-PR 4 | DOC-FAIL-STALE-DESCRIPTION 新 pattern 追加 + 3 stale docs rewrite (= protocols/README + aag/_internal/README + taxonomy-constitution) |
| Wave 3 / sub-PR 5 | delete-candidate 9 件 cleanup (= taxonomy-v2 duplicates 8 + quality-audit-latest 1) |
| 本 sync | HANDOFF.md staleness fix (= 5 件目観測、Wave 4 guard 化 candidate 到達) |

## 5. 後任者向け checklist

archive 移行前に以下を確認:

1. [ ] checklist.md の各 sub-PR section が全 [x] になっている
2. [ ] AI 自己レビュー section の総 review 完了 (= 不可侵原則違反 0 / 歪み 0 / 潜在バグ 0)
3. [ ] 最終レビュー (user 承認) section の user 判断完了 + [x] flip
4. [ ] Wave 4 candidate articulate を separate program proposal として整理 (= 本 program scope 外)
5. [ ] Separate Program candidate (Phase 8a/8b/8c / Phase 10) の移譲先判断 (= reposteward 系統)
6. [ ] archive 移行手順実行 (= Archive v2 形式、git mv + ARCHIVE.md + archive.manifest.json)
