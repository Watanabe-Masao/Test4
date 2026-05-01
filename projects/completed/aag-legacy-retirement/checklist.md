# checklist — aag-legacy-retirement

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: 必要性 re-evaluate + 拡張案件 inventory

- [x] **着手前判断**: Project A Phase 5 完了状況を確認 (本 project 必要性 re-evaluate の前提) — Project A は 2026-04-30 archive 完遂 (`projects/completed/aag-core-doc-refactor/`、commit `cf8d995`)。Phase 5.1〜5.8 全 [x]、最終レビュー人間承認済
- [x] Project A Phase 5 完遂状況 grep (各旧 doc の archive 移管完了 / 未完了の identify) — 8 旧 doc 全て `references/99-archive/` 配下に移管済 (`adaptive-architecture-governance.md` / `aag-5-constitution.md` / `aag-5-layer-map.md` / `aag-5-source-of-truth-policy.md` / `aag-four-layer-architecture.md` / `aag-operational-classification.md` / `aag-rule-splitting-plan.md` / `adaptive-governance-evolution.md`)。各旧 doc の active inbound = 0 (`principles.json` $comment 内の歴史的 changelog 言及 1 件のみ存在、これは migration 対象外の historical articulation)
- [x] 未完遂 doc の複雑性分析 (Split 必要 / 複数 doc 横断 / inbound 60+ 件 等の判定基準を articulate) — **未完遂 doc = 0 件** (全 8 doc archive 完遂)。複雑性分析対象なし
- [x] **判定**: case A (拡張案件あり、Phase 2 へ) / case B (なし、本 project archive 候補に migrate) を articulate — **case B 確定** (拡張案件 0 件、Project A Phase 5 で全 8 doc archive 完遂のため)
- [x] case A の場合: `references/02-status/legacy-retirement-extended.md` 新設 (拡張案件 articulation の集約 doc) — N/A (case B 確定、本 doc 新設不要)
- [x] case B の場合: 本 project archive プロセス着手 articulation (checklist 末尾「最終レビュー (人間承認)」 [x] flip 経由) — Phase 1 完遂、最終レビュー (人間承認) 待ち状態へ移行

## Phase 2: 拡張案件の Split + Rewrite (case A 限定) — **N/A (case B 確定、Phase 1 で本 Phase scope out)**

- [x] case A 確定後、各拡張案件の責務分割 articulate — N/A (case B 確定)
- [x] Split 先の新 doc への内容書き起こし — N/A (case B 確定)
- [x] 各分割成果物の独立 commit — N/A (case B 確定)
- [x] archive 前 mapping table の landing — N/A (case B 確定)
- [x] build / lint / docs:check 全 PASS — N/A (case B 確定、Phase 2 着手しないため独立検証不要、Phase 1 完遂時の Hard Gate PASS で代替)

## Phase 3: 拡張案件の inbound migration + archive 移管 (case A 限定) — **N/A (case B 確定)**

- [x] 各拡張案件の inbound grep + 全件 update — N/A (case B 確定)
- [x] archive 移管 — N/A (case B 確定)
- [x] frontmatter 装着 — N/A (case B 確定)
- [x] doc-registry.json の archive section update — N/A (case B 確定)
- [x] inbound 0 機械検証 PASS + docRegistryGuard / docCodeConsistencyGuard 全 PASS — N/A (case B 確定、Phase 1 完遂時に検証済 = 8 旧 doc active inbound 0)

## Phase 4: 物理削除 (人間判断後、case A 限定) — **N/A (case B 確定)**

- [x] **判断**: 各 archive file の人間 approval 状態確認 — N/A (case B 確定、本 project では物理削除 trigger 発火しない)
- [x] frontmatter `humanDeletionApproved: true` 等の articulate — N/A (case B 確定)
- [x] AI 側で `humanDeletionApproved: true` を検出した case のみ物理削除 commit を実行 — N/A (case B 確定)
- [x] 物理削除完遂を本 project HANDOFF / 親 project HANDOFF に通知 update — N/A (case B 確定、本 project archive 完遂を親 HANDOFF に articulate で代替)

## 途中判断 (decision gates、AI 自主判断 + judgement criteria)

> `references/03-guides/deferred-decision-pattern.md` 適用。

### Phase 1 着手前判断

- [x] **Project A Phase 5 完了状況確認**
  - **判断基準**: Project A checklist Phase 5 全 [x] / 全旧 doc が `references/99-archive/` に移管済
  - **判断材料**: Project A checklist 状態 + `git ls-files references/99-archive/` 結果
  - **判断結果 (2026-04-30)**: Project A は archive 完遂 (`projects/completed/aag-core-doc-refactor/`、commit `cf8d995`)。Phase 5.1〜5.8 全 [x]、最終レビュー人間承認済 (commit `306c8b9`)。8 旧 doc 全て `references/99-archive/` 配下に物理移管済を `ls` で確認
- [x] **必要性 re-evaluate (case A / case B 判定)**
  - **判断基準**: case A = Project A Phase 5 で完遂しなかった doc あり (複雑性 = Split 必要 / 複数 doc 横断 / inbound 60+ 件 等)、case B = 完遂済で拡張案件なし
  - **判断材料**: Project A Phase 5 残作業 grep + 各 doc の inbound count + 複雑性分析結果
  - **判断結果 (2026-04-30)**: **case B 確定**。8 旧 doc 全 archive 完遂 + 全 doc の active inbound = 0 (`principles.json` $comment 内の歴史的 changelog 言及 1 件は migration 対象外)。拡張案件 (= Project A Phase 5 で完遂しなかった複雑案件) は **0 件**、本 project は MVP scope を Phase 1 のみで完遂し、Phase 2-4 は scope out

### Phase 2 着手前判断 (case A 限定) — N/A (case B 確定)

- [x] **各拡張案件の Split 粒度確定** — N/A (case B 確定)

### Phase 4 進行中判断 (case A 限定、毎 archive file ごと) — N/A (case B 確定)

- [x] **物理削除の人間 approval 確認** — N/A (case B 確定、本 project では物理削除 trigger 発火しない)

## Future follow-up project candidate consideration (必ず触れる原則、user articulate 2026-04-30)

> **趣旨**: AI / 人間は checklist に沿って作業する。checklist にないものは触れられない。Future follow-up project candidate (= Project E + F、AAG Decision Traceability + AI Utilization、9 insight 統合) を本 project の作業中に **必ず触れる** mechanism として articulate (= 「いつ考えるか / どう brush up するか」は別問題、必ず engage することのみ義務化)。
>
> **正本 articulation**: `projects/aag-bidirectional-integrity/HANDOFF.md` §2 + `projects/aag-bidirectional-integrity/checklist.md` の「Future follow-up = Project E」section。
>
> **本 project との特別 relevance**: 本 project は legacy 撤退 + 物理削除 trigger (= Project E の `AAG-REQ-MILESTONE-ACKNOWLEDGMENT` + `AAG-REQ-ROLLBACK-ANCHOR-PRESERVATION` の application instance precursor) を扱う。物理削除 trigger は **不可逆 milestone** の典型例、archive 移管は rollback anchor の典型例。本 project Phase 1 (必要性 re-evaluate) で case A / B 判定する decision 自体が Project E DecisionTrace schema の sample candidate。

- [x] 本 project の各 Phase 着手前 / 完了時に **Project E + F candidate を一読** + 本 project の context で **新たな insight / 反証 / brush up があれば articulate** — Phase 1 着手前に親 `aag-bidirectional-integrity/HANDOFF.md` §2 を一読、case B 判定の事実 (= 「Project A の単純 archive 範囲が当初想定より広く、Project D の拡張 scope が空集合になった」) は Project E `AAG-REQ-DECISION-TRACEABILITY` の sample candidate として保持。本 project の context での新たな反証なし (engage 義務満たす)
- [x] 本 project Phase 1 (必要性 re-evaluate、case A/B 判定) を Project E DecisionTrace schema の retrospective retrofit candidate として articulate — **本 project 自体の存在判断 = case B = early scope-out** が Project E DecisionTrace の典型例 (decision = case B / criteria = 拡張案件 0 件 / evidence = 8 旧 doc archive 完遂状況 grep / outcome = Phase 2-4 scope out + archive 候補 migrate)
- [x] 本 project archive 前に Project E candidate spawn 着手 trigger を確認 — Project E spawn trigger = Project A〜D 全完了。Project A 完遂 (✅) / 本 project (D) MVP scope 完遂で archive 候補 (本 commit) / Project B/C は別途進行。本 project archive 完遂時点で Project A + D = 2/4 完了、Project E spawn 条件 (4/4) は未充足、引き続き Project B/C 完遂を待つ

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。

- [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する — **2026-04-30 ユーザー承認** (case B 確定 + 8-step archive 着手承認)

### Approval Record (Insight 7-b milestone acknowledgment application instance)

> 本 approval は Project E vision の `AAG-REQ-MILESTONE-ACKNOWLEDGMENT` (Insight 7-b、不可逆ステップでの ceremonial commitment) の direct application instance。承認は「正しい / 間違い」軸ではなく「不可逆ステップ (= Project D archive プロセス移行) を今ここで踏む」の announcement。

**View List (人間がレビューした内容)**:

- ✅ Phase 1 完遂: 必要性 re-evaluate + 拡張案件 inventory → **case B 確定** (commit `59bb8e1`)
- ✅ 判定根拠: Project A archive 完遂 (`projects/completed/aag-core-doc-refactor/`、commit `cf8d995`) + 8 旧 AAG Core doc 全 archive 移管済 + 各旧 doc active inbound = 0 + 拡張案件 0 件
- ✅ scope decision: Phase 2-4 は N/A (拡張案件 0 件のため発火条件未充足)
- ✅ Future follow-up engagement: Project E DecisionTrace candidate articulate 済
- ✅ 全 guard PASS / Hard Gate PASS (commit `59bb8e1`)

**判定 (case B early scope-out)**: 本 project は MVP scope を Phase 1 のみで完遂。拡張案件 0 件のため Phase 2-4 は scope out。

**承認の意味**: 「本 project archive プロセス (8-step) への移行を承認する」 — 承認後 AI は archive を実行
