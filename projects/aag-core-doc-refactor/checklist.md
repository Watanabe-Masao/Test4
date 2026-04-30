# checklist — aag-core-doc-refactor

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `- [ ]` または `- [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: AAG Core doc Create 段階 (新 path 新 doc 直接 Create)

- [x] `references/01-principles/aag/strategy.md` を新規 Create (戦略マスター、Layer 0+1、5 層位置付け + drill-down pointer + 旧概念 mapping section 装着)
- [x] `references/01-principles/aag/architecture.md` を新規 Create (5 層構造定義 + 旧 4 層 → 新 5 層 mapping table、Layer 1+2)
- [x] `references/01-principles/aag/evolution.md` を新規 Create (進化動学、Layer 1+2、旧 `adaptive-governance-evolution.md` から Rewrite + Relocate + Rename)
- [x] `references/01-principles/aag/operational-classification.md` を新規 Create (now/debt/review 区分、Layer 2、旧 `aag-operational-classification.md` から Rewrite + Relocate)
- [x] `references/01-principles/aag/source-of-truth.md` を新規 Create (正本/派生物/運用物、Layer 2、旧 `aag-5-source-of-truth-policy.md` から Rewrite + Relocate + Rename)
- [x] `references/01-principles/aag/layer-map.md` を新規 Create (5 層 マッピング、Layer 2、旧 `aag-5-layer-map.md` から Rewrite + Relocate + Rename)
- [x] 各新 doc を独立 commit で landing (parallel comparison 期間を確保、旧 doc は touch せず併存) — 本 commit で 6 doc 一括 landing (parallel comparison 期間は本 commit 以降〜Phase 5 archive まで継続、各 doc 独立 section で articulate 済)
- [x] 各新 doc に **5 層位置付け + drill-down pointer + 旧概念 mapping section** 全て articulate 済を機械検証 (grep で section heading 確認) — 全 6 doc 冒頭に「5 層位置付け」「drill-down pointer」articulate、「§(旧概念 → 新概念) mapping」section 装着済

## Phase 2: AAG Core doc Split / Rewrite 段階 (旧 doc 内容を新 doc に書き起こし)

- [x] `adaptive-architecture-governance.md` を Split (戦略マスター → strategy.md §1 / 文化論 → strategy.md §2 / AAG の本質 + AI 対話インターフェース → strategy.md §3 / AAG Response フロー → operational-classification.md §6 / 旧 4 層 → architecture.md §4 → Archive (Phase 5) / バージョン履歴 → per-doc 分散 (recent-changes.md + per-PR commit message))
- [x] 各新 doc に **5 層位置付け + drill-down pointer + semantic articulation** Rewrite 完了 — Phase 1 で 6 doc 全て articulate 済 (各 doc 冒頭の位置付け section + §1.5 archive 前 mapping 義務 articulate)
- [x] 旧 4 層構造の説明を新 5 層 (目的 / 要件 / 設計 / 実装 / 検証) に書き換え完了 — architecture.md §1 (新 5 層定義) + §4.1 (旧 4 層 → 新 5 層 mapping) + §4.2 (旧 旧 4 層 → 新 5 層 2 重 mapping) で landing
- [x] 各 Split / Rewrite を独立 commit で landing — Phase 1 commit `7b49436` (6 doc Create + Rewrite + 旧概念 mapping section 装着) + 本 commit (strategy.md §3 AI 対話 + operational-classification.md §6 AAG Response フロー migrate)
- [x] docCodeConsistencyGuard / docRegistryGuard 全 PASS — Phase 1 commit で確認済、本 commit でも PASS 維持

## Phase 3: CLAUDE.md AAG セクション薄化 (§8.13 判断 = B 適用)

- [ ] CLAUDE.md AAG セクションを **鉄則 quote 3-5 行 + 詳細 link** に薄化
- [ ] AI session 開始時の dynamic thinking trigger を維持 (manifest.json discovery hint と併用)
- [ ] CLAUDE.md test-contract guard (canonicalization-tokens / features-modules / generated-sections / canonical-table / reference-link-existence / no-static-numbers) 全 PASS

## Phase 4: doc-registry / principles.json / manifest.json 整合 + deprecation marker

- [ ] `docs/contracts/doc-registry.json` の AAG category 全 update (新 doc 登録 + 旧 doc deprecated flag)
- [ ] `docs/contracts/principles.json` の `$comment` update (本 project 進行状態の articulate)
- [ ] `.claude/manifest.json` の discovery hint update (byTopic / byExpertise / pathTriggers)
- [ ] `references/README.md` の AAG 関連 doc 索引 update
- [ ] docRegistryGuard / docCodeConsistencyGuard / manifestGuard 全 PASS

## Phase 5: 旧 AAG Core doc archive (legacy retirement、inbound 0 trigger)

- [ ] `adaptive-architecture-governance.md` の inbound 全件 grep + 新 path に書き換え完了 (inbound 0 機械検証 PASS)
- [ ] `adaptive-architecture-governance.md` を `references/99-archive/` に移管 (frontmatter `archived: true` 追加)
- [ ] `aag-5-constitution.md` の inbound 全件 update + archive 移管
- [ ] `aag-5-source-of-truth-policy.md` の inbound 全件 update + archive 移管
- [ ] `aag-5-layer-map.md` の inbound 全件 update + archive 移管
- [ ] `aag-operational-classification.md` の inbound 全件 update + archive 移管
- [ ] `adaptive-governance-evolution.md` の inbound 全件 update + archive 移管
- [ ] 各旧 doc archive 前に新 doc 内 mapping table が landed 済を確認 (§1.5 archive 前 mapping 義務、plan 不可侵原則 5)
- [ ] `breaking-changes.md` 各 entry 完遂 articulate
- [ ] `legacy-retirement.md` 各旧 path の取り扱い完遂 articulate
- [ ] build / lint / docs:check / 全 guard PASS

## 途中判断 (decision gates、AI 自主判断 + judgement criteria)

> `references/03-guides/deferred-decision-pattern.md` 適用。各 Phase 着手前に AI が criteria を
> 適用し、decision を decision log に記録。判断材料の収集元を doc に embed し、後任 AI が
> 一貫した judgement を継承可能。

### Phase 1 着手前判断

- [ ] **Create 順序の確定**: AAG Core 8 doc を直列 Create か parallel Create か (依存順 = meta.md → strategy.md → architecture.md → 他)
  - **判断基準**: 各 doc の依存関係 (例: architecture.md は meta.md の Layer 定義に依存) / commit 履歴の clean さ / parallel comparison の必要性
  - **判断材料**: 親 plan §3.5 / aag-doc-audit-report.md §1 各 doc の drill-down pointer
- [ ] **Phase 4.2 Split 粒度の最終確認** (親 plan §Phase 4.2 articulation 踏襲 / revisit)
  - **判断基準**: `adaptive-architecture-governance.md` を何 doc に Split するか (戦略 + 文化論 + 旧 4 層 + バージョン履歴 = 4 分割か、それ以下に圧縮可能か)
  - **判断材料**: 親 plan §Phase 4.2 / 旧 doc の line count / 責務 C1 適用結果

### Phase 3 着手前判断

- [ ] **§8.13 CLAUDE.md 薄化方式の最終確認** (B = 鉄則 quote + link、Phase 1 判断時点を踏襲 / revisit)
  - **判断基準**: aag/meta.md / aag/strategy.md の current articulation 量 / CLAUDE.md AAG セクション current core 内容 / AI session 開始時の dynamic thinking trigger 必要性
  - **判断材料**: 親 plan §8.13 decision rationale / Phase 1-2 で landed した新 doc の articulate 量

### Phase 5 進行中判断 (各旧 doc archive 時、毎 doc ごと)

- [ ] **旧 path への inbound 0 機械検証** PASS (各 doc ごと、AI 自主判断)
  - **判断基準**: 旧 path への inbound 参照が `git grep "<旧 path>"` で 0 件
  - **判断材料**: grep 結果 / docRegistryGuard / docCodeConsistencyGuard PASS 状態
- [ ] **§1.5 archive 前 mapping 義務** PASS (各 doc ごと、AI 自主判断)
  - **判断基準**: 新 doc に「旧概念 → 新概念 mapping table」が landed 済
  - **判断材料**: 新 doc 内 mapping section grep
- [ ] **物理削除 trigger** (anti-ritual と orthogonal な安全装置、**人間判断必須、AI 判断しない**)
  - **trigger 条件**: archive 配下 file への inbound 0 機械検証 + **人間 deletion approval** (frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit`)
  - **判断者**: 人間レビューア (AI でなく)

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
