# plan — aag-core-doc-refactor

> **正本**: 親 project (`projects/aag-bidirectional-integrity/plan.md`) の Phase 4 + Phase 5
> articulation を継承。本 plan は Project A scope (Phase 4 + Phase 5) に絞った operational plan。
> 5 層 × 5 縦スライス matrix / 7 operation taxonomy / drill-down chain semantic
> の概念定義は親 plan を正本とし、本 plan で再記述しない。

## 不可侵原則

1. **edit-in-place 禁止**: 既存 AAG Core doc (`adaptive-architecture-governance.md` / `aag-5-*.md` 等)
   を直接 edit しない。**新規書き起こし優先** = 新 path (`references/01-principles/aag/`) に Create
   → 内容を確定 → 旧 doc を archive、の順序を厳守 (§3.5 操作順序原則)。
2. **inbound 0 trigger のみ**: 旧 path の archive trigger は **inbound 参照 0 件の機械検証** のみ。
   期間 buffer (例: 30 日待機) は anti-ritual として **禁止**。grep で 0 件 → archive 移管。
3. **5 層位置付けの装着義務**: 全新 doc に **Layer 0/1/2/3/4 のどれかを冒頭で articulate**
   する。位置付けなしの新 doc を Create しない (drill-down chain semantic 管理の前提)。
4. **drill-down pointer の articulate 義務**: 全新 doc に **上位 back-pointer + 下位 drill-down**
   を articulate する。pointer のみでなく **problem + resolution** の semantic 文を伴う
   (親 plan §3.4 SemanticTraceBinding 設計に整合)。
5. **§1.5 archive 前 mapping 義務**: 旧 doc を archive する前に、新 doc に **「旧概念 → 新概念
   mapping table」が landed 済**であることを機械検証で確認。mapping なしの archive は禁止。
6. **breaking-changes / legacy-retirement の articulate 義務**: 本 project は breakingChange = true
   (doc path rename) + requiresLegacyRetirement = true (旧 path archive) のため、両 doc は project
   の必須 deliverable。
7. **scope 越境禁止**: BaseRule schema 拡張 / AR-rule binding 記入 / meta-guard 実装 / DFR registry
   構築は **Project B / C / D 所掌** であり、本 project では touch しない。

## Phase 構造

> 親 plan §Phase 4 (4 sub-phase 構成) + §Phase 5 を継承。本 plan では sub-phase の概要のみ
> 列挙し、詳細 deliverable は親 plan を正本として参照する。

### Phase 1: AAG Core doc Create 段階 (新 path 新 doc 直接 Create)

**目的**: 親 plan §3.5 step 1 (Create 先行) を実行。新 path に新 doc を直接 Create し、5 層位置付け
+ drill-down pointer + semantic articulation を装着。

**deliverable** (親 plan §Phase 4.1 articulation を継承):
- `references/01-principles/aag/strategy.md` (戦略マスター、Layer 0+1)
- `references/01-principles/aag/architecture.md` (5 層構造定義 + 旧 4 層 → 新 5 層 mapping table、Layer 1+2)
- `references/01-principles/aag/evolution.md` (進化動学、Layer 1+2)
- `references/01-principles/aag/operational-classification.md` (now/debt/review 区分、Layer 2)
- `references/01-principles/aag/source-of-truth.md` (正本/派生物/運用物、Layer 2)
- `references/01-principles/aag/layer-map.md` (5 層 マッピング、Layer 2)

**完了条件**: 各新 doc が独立 commit で landing、5 層位置付け + drill-down pointer + 旧概念
mapping section が articulate 済、doc-registry.json + principles.json に新 doc 登録、build /
lint / docs:check 全 PASS、parallel comparison 期間が確保 (旧 doc は touch せず併存)。

### Phase 2: AAG Core doc Split / Merge / Rewrite 段階

**目的**: 親 plan §3.5 step 2-3 (Split / Merge / Rewrite 中段) を実行。旧 doc から内容を選別して
新 doc に書き起こし、4 層位置付け + drill-down pointer を装着。

**deliverable** (親 plan §Phase 4.2 + §Phase 4.3 articulation を継承):
- `adaptive-architecture-governance.md` の Split (戦略マスター → strategy.md / 文化論 →
  strategy.md or meta.md / 旧 4 層 → Archive / バージョン履歴 → per-doc 分散)
- 各新 doc の **5 層位置付け + drill-down pointer + semantic articulation** Rewrite 完了
- 旧 4 層構造の説明を新 5 層 (目的 / 要件 / 設計 / 実装 / 検証) に書き換え

**完了条件**: Split / Rewrite 完遂、各新 doc が parallel comparison 期間中も矛盾なく併存、
docCodeConsistencyGuard / docRegistryGuard 全 PASS。

### Phase 3: CLAUDE.md AAG セクション薄化 (§8.13 判断 = B 適用)

**目的**: 親 plan §8.13 判断 = B (鉄則 quote 3-5 行 + 詳細 link) を実施。CLAUDE.md AAG セクションを
薄化し、core 内容を `aag/meta.md` および aag/strategy.md / architecture.md に逃がす。

**deliverable**:
- CLAUDE.md AAG セクション = 鉄則 quote (3-5 行、例: 「製本されないものを guard 化しない」「期間
  buffer は anti-ritual」「重複と参照を切り分ける」) + 詳細 link (aag/README.md)
- AI session 開始時の dynamic thinking trigger を維持 (manifest.json の discovery hint と併用)
- CLAUDE.md test-contract に違反しないこと (canonicalization-tokens / features-modules / etc.)

**完了条件**: CLAUDE.md AAG セクション薄化 commit が landing、test-contract guard 全 PASS、
AI session 開始時の AAG context が aag/README.md → aag/meta.md → aag/strategy.md の drill-down
で取得可能であることを確認。

### Phase 4: doc-registry / principles.json / manifest.json 整合 + deprecation marker 段階

**目的**: 新 doc 登録 + 旧 doc deprecation marker、Phase 5 archive の前段階を整える。

**deliverable**:
- `docs/contracts/doc-registry.json` の AAG category 全 update (新 doc 登録 + 旧 doc deprecated
  flag)
- `docs/contracts/principles.json` の `$comment` update (本 project 進行状態の articulate)
- `.claude/manifest.json` の discovery hint update (byTopic / byExpertise / pathTriggers)
- `references/README.md` の AAG 関連 doc 索引 update

**完了条件**: registry / manifest 整合、docRegistryGuard / docCodeConsistencyGuard / manifestGuard
全 PASS、新 doc が discovery 経由でも辿れる。

### Phase 5: 旧 AAG Core doc archive (legacy retirement、inbound 0 trigger)

**目的**: 親 plan §Phase 5 articulation を継承。旧 doc への inbound 参照を全件 update し、inbound
0 機械検証 PASS 後に `99-archive/` 配下に移管。

**deliverable**:
- 各旧 doc (`adaptive-architecture-governance.md` / `aag-5-constitution.md` / `aag-5-source-of-truth-policy.md` /
  `aag-5-layer-map.md` / `aag-operational-classification.md` / `adaptive-governance-evolution.md`) の inbound
  全件 grep + 新 path に書き換え (160+ file references、段階的 commit)
- 各旧 doc の archive 移管 (`99-archive/<旧 path>` に mv、frontmatter `archived: true` 追加)
- archive 前 mapping table が新 doc に landed 済を確認 (§1.5 義務、本 project 不可侵原則 5)
- breaking-changes.md update (各 archive を category 化)
- legacy-retirement.md update (各旧 path の取り扱い完遂を articulate)

**完了条件**: 旧 doc 全 archive、inbound 0 機械検証 PASS、breaking-changes / legacy-retirement
全 entry 完遂、build / lint / docs:check / 全 guard PASS。

### Phase 6: 最終レビュー (人間承認)

**目的**: 全 deliverable の人間 review 通過、archive プロセスへの移行 gate。

**deliverable**:
- 全 Phase 1〜5 の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビュー
- 親 project (`aag-bidirectional-integrity`) との archive 連動を articulate (Project B〜D 進行状況に
  応じて親 archive timing を判断)
- 8-step archive 準備 (status=archived 移行、本 project 自体の archive は人間承認後)

**完了条件**: 人間 review 通過、checklist 末尾「最終レビュー (人間承認)」 [x] flip。

## やってはいけないこと

- **edit-in-place** → 旧 doc を直接 edit すると Create / Split / Rewrite の段階パスが崩れ、
  parallel comparison 期間が消失する (不可侵原則 1)。
- **新 doc に 5 層位置付けを articulate しない** → drill-down chain semantic 管理が機能せず、後任 AI
  session が「この doc は Layer 何か」を判別できなくなる (不可侵原則 3)。
- **新 doc に旧概念 mapping table を書かずに旧 doc を archive する** → 旧 → 新の semantic continuity
  が消失し、後任が変更履歴を辿れなくなる (不可侵原則 5)。
- **inbound 0 検証なしに archive する** → 旧 path に dangling reference が残り、docRegistryGuard /
  docCodeConsistencyGuard が hard fail する (不可侵原則 2)。
- **期間 buffer (30 日待機等) を archive trigger として導入する** → anti-ritual、親 project の
  Constitution 違反 (不可侵原則 2)。
- **BaseRule schema を touch する** → Project B 所掌の越境 (不可侵原則 7)。
- **AR-rule binding (canonicalDocRef / metaRequirementRefs) を記入する** → Project B 所掌の越境
  (不可侵原則 7)。

## 途中判断 (decision gates)

> 親 plan §8 + 本 project の各 Phase 着手前判断は `references/03-guides/deferred-decision-pattern.md`
> に従い AI 自主判断 + 判断基準 + 収集元 + decision log を運用。詳細は `checklist.md` の
> decision gates section を参照。

主要な途中判断:
- **Phase 1 着手前**: AAG Core 8 doc の Create 順序 (例: meta.md → strategy.md の依存順、parallel か直列か)
- **Phase 2 着手前**: Split 粒度 (例: `adaptive-architecture-governance.md` を何 doc に Split するか、
  親 plan §Phase 4.2 articulation の踏襲 / revisit 判断)
- **Phase 3 着手前**: §8.13 CLAUDE.md 薄化方式 = B 鉄則 quote の最終確認 (3-5 行に何を articulate するか)
- **Phase 5 進行中**: 各旧 doc archive 前の inbound 0 機械検証 + §1.5 archive 前 mapping 義務 PASS

## 関連実装

| パス | 役割 |
|---|---|
| `references/01-principles/aag/meta.md` | AAG Meta charter (Phase 1 で landing 済、本 project が refer する目的 + 要件 + 達成判定総括) |
| `references/01-principles/aag/README.md` | aag/ ディレクトリ index (Phase 1 で landing 済、本 project が新 doc を追加する先) |
| `references/01-principles/adaptive-architecture-governance.md` | 旧戦略マスター (Phase 2 で Split、Phase 5 で archive) |
| `references/99-archive/adaptive-governance-evolution.md` | 旧進化動学 (Phase 1 で aag/evolution.md として Rewrite + Relocate、Phase 5 で archive) |
| `references/01-principles/aag-5-constitution.md` | 旧 Constitution (Phase 1 で aag/architecture.md に統合 Rewrite、Phase 5 で archive) |
| `references/01-principles/aag-5-source-of-truth-policy.md` | 旧正本/派生物/運用物 (Phase 1 で aag/source-of-truth.md として Rewrite + Relocate、Phase 5 で archive) |
| `references/99-archive/aag-5-layer-map.md` | 旧 5 層 マッピング (Phase 1 で aag/layer-map.md として Rewrite + Relocate、Phase 5 で archive) |
| `references/01-principles/aag-operational-classification.md` | 旧 now/debt/review 区分 (Phase 1 で aag/operational-classification.md として Rewrite + Relocate、Phase 5 で archive) |
| `CLAUDE.md` | AAG セクション (Phase 3 で §8.13 判断 = B 適用、鉄則 quote + link に薄化) |
| `docs/contracts/doc-registry.json` | 新 doc 登録 + 旧 doc deprecation flag (Phase 4) |
| `docs/contracts/principles.json` | $comment update (各 Phase commit で進行状態 articulate) |
| `.claude/manifest.json` | discovery hint update (Phase 4) |
| `references/02-status/aag-doc-audit-report.md` | Phase 3 audit 正本 (本 project の入力、各 doc の operation 判定の根拠) |
