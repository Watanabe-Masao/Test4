# checklist — aag-legacy-retirement

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: 必要性 re-evaluate + 拡張案件 inventory

- [ ] **着手前判断**: Project A Phase 5 完了状況を確認 (本 project 必要性 re-evaluate の前提)
- [ ] Project A Phase 5 完遂状況 grep (各旧 doc の archive 移管完了 / 未完了の identify)
- [ ] 未完遂 doc の複雑性分析 (Split 必要 / 複数 doc 横断 / inbound 60+ 件 等の判定基準を articulate)
- [ ] **判定**: case A (拡張案件あり、Phase 2 へ) / case B (なし、本 project archive 候補に migrate) を articulate
- [ ] case A の場合: `references/02-status/legacy-retirement-extended.md` 新設 (拡張案件 articulation の集約 doc)
- [ ] case B の場合: 本 project archive プロセス着手 articulation (checklist 末尾「最終レビュー (人間承認)」 [x] flip 経由)

## Phase 2: 拡張案件の Split + Rewrite (case A 限定)

- [ ] case A 確定後、各拡張案件の責務分割 articulate (例: `adaptive-architecture-governance.md` = 戦略マスター + 文化論 + 旧 4 層 + バージョン履歴 同居 → 4 分割)
- [ ] Split 先の新 doc (or 既存 doc、Project A の `aag/` 配下 doc を活用) への内容書き起こし
- [ ] 各分割成果物の独立 commit
- [ ] archive 前 mapping table の landing (新 doc 内に「旧概念 → 新概念 mapping」articulate)
- [ ] build / lint / docs:check 全 PASS

## Phase 3: 拡張案件の inbound migration + archive 移管 (case A 限定)

- [ ] 各拡張案件の inbound grep + 全件 update (`git grep "<旧 path>"` で 0 件確認)
- [ ] archive 移管 (`mv references/01-principles/<旧 path>.md references/99-archive/<旧 path>.md`)
- [ ] frontmatter `archived: true` + `archivedAt: 2026-XX-XX` + `archivedBy: <commit SHA>` 追加
- [ ] `docs/contracts/doc-registry.json` の archive section update
- [ ] inbound 0 機械検証 PASS + docRegistryGuard / docCodeConsistencyGuard 全 PASS

## Phase 4: 物理削除 (人間判断後、case A 限定)

- [ ] **判断**: 各 archive file の人間 approval 状態確認 (人間判断 gate、AI 判断しない)
- [ ] 各 archive file の frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit` の articulate (人間レビューアが記入)
- [ ] AI 側で `humanDeletionApproved: true` を検出した case のみ物理削除 commit を実行
- [ ] 物理削除完遂を本 project HANDOFF / 親 project HANDOFF に通知 update

## 途中判断 (decision gates、AI 自主判断 + judgement criteria)

> `references/03-guides/deferred-decision-pattern.md` 適用。

### Phase 1 着手前判断

- [ ] **Project A Phase 5 完了状況確認**
  - **判断基準**: Project A checklist Phase 5 全 [x] / 全旧 doc が `references/99-archive/` に移管済
  - **判断材料**: Project A checklist 状態 + `git ls-files references/99-archive/` 結果
- [ ] **必要性 re-evaluate (case A / case B 判定)**
  - **判断基準**: case A = Project A Phase 5 で完遂しなかった doc あり (複雑性 = Split 必要 / 複数 doc 横断 / inbound 60+ 件 等)、case B = 完遂済で拡張案件なし
  - **判断材料**: Project A Phase 5 残作業 grep + 各 doc の inbound count + 複雑性分析結果

### Phase 2 着手前判断 (case A 限定)

- [ ] **各拡張案件の Split 粒度確定**
  - **判断基準**: 1 doc 1 責務 (C1 適用) / 後任が責務継承を Trace 可能か / Project A `aag/` 配下 doc との重複回避
  - **判断材料**: 各拡張案件の責務 inventory / Project A `aag/` 配下 doc の articulate 状態

### Phase 4 進行中判断 (case A 限定、毎 archive file ごと)

- [ ] **物理削除の人間 approval 確認** (人間判断必須、AI 判断しない)
  - **trigger 条件**: archive 配下 file への inbound 0 機械検証 + 人間 deletion approval (frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit`)
  - **判断者**: 人間レビューア (AI でなく)
  - **AI action**: archive 移管後の物理削除は AI が独自判断で実行しない、人間 approval を待つ

## Future follow-up project candidate consideration (必ず触れる原則、user articulate 2026-04-30)

> **趣旨**: AI / 人間は checklist に沿って作業する。checklist にないものは触れられない。Future follow-up project candidate (= Project E + F、AAG Decision Traceability + AI Utilization、9 insight 統合) を本 project の作業中に **必ず触れる** mechanism として articulate (= 「いつ考えるか / どう brush up するか」は別問題、必ず engage することのみ義務化)。
>
> **正本 articulation**: `projects/aag-bidirectional-integrity/HANDOFF.md` §2 + `projects/aag-bidirectional-integrity/checklist.md` の「Future follow-up = Project E」section。
>
> **本 project との特別 relevance**: 本 project は legacy 撤退 + 物理削除 trigger (= Project E の `AAG-REQ-MILESTONE-ACKNOWLEDGMENT` + `AAG-REQ-ROLLBACK-ANCHOR-PRESERVATION` の application instance precursor) を扱う。物理削除 trigger は **不可逆 milestone** の典型例、archive 移管は rollback anchor の典型例。本 project Phase 1 (必要性 re-evaluate) で case A / B 判定する decision 自体が Project E DecisionTrace schema の sample candidate。

- [ ] 本 project の各 Phase 着手前 / 完了時に **Project E + F candidate を一読** + 本 project の context で **新たな insight / 反証 / brush up があれば articulate** (= 親 HANDOFF §2 に追記 or 本 checklist の note に articulate、決定的な action は不要、engage のみ義務)
- [ ] 本 project Phase 1 (必要性 re-evaluate、case A/B 判定) を Project E DecisionTrace schema の retrospective retrofit candidate として articulate (= 本 project 自体の存在判断が DecisionTrace の典型例)
- [ ] 本 project archive 前に Project E candidate spawn 着手 trigger を確認

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
