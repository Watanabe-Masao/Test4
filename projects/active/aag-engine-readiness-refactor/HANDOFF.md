# HANDOFF — aag-engine-readiness-refactor

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 4 landing 完了 (= 本 commit landing 後)**。次は Phase 4 wrap-up commit。

Phase 0 lineage (= 完遂済):
- landing commit `950ddba`: 必須 8 file landing + open-issues update + DA-α-000 articulate (Lineage 仮 sha)
- regen commit `61a3b1b`: §13.3 Post-flip regen pattern application (= project.checklist.* KPI sync)
- L1 fix commit `1f40057`: bootstrap 中に発見した 2 件 template / policy gap を session 内で別 commit fix
- wrap-up commit `fe66b18`: DA-α-000 Lineage 実 sha update + 振り返り判定 "正しい"
- regen commit `1c8ae86`: §13.3 Post-flip regen pattern application (= checkedCheckboxes KPI sync)

DA-α-000 振り返り判定: **正しい** (= Phase 0 段階達成、§13.1 / §13.3 を Phase 0 で実適用済)。詳細は `decision-audit.md` DA-α-000 §振り返り判定 参照。

Phase 1 lineage (= 完遂済):
- landing commit `745a927`: `references/03-implementation/aag-engine-readiness-inventory.md` 新設 + §13.2 atomic update
- regen commit `ea1b3e3`: §13.3 Pattern A application
- wrap-up commit `6613d54`: DA-α-001 Lineage 実 sha + 振り返り判定 "正しい"
- regen commit `2cc8fa9`: §13.3 Pattern A application

Phase 2 lineage (= 完遂済):
- landing `75257d7` + regen `1949db8` + wrap-up `3d7378a` + regen `5b71722` + L1 fix `495e740` + regen `de62efc`
- DA-α-002 振り返り判定: **正しい** (= 観測点 7 件すべて達成)

Phase 3 lineage (= 完遂済):
- landing `c9b0bed` + regen `3de426e` + wrap-up `56d98fa` + regen `72872c8`
- DA-α-003 振り返り判定: **正しい** (= 観測点 8 件すべて達成)

Phase 4 lineage (= landing 段階):
- landing commit (本 commit): `path-helpers.ts` 新設 (= ~155 line、`RepoPath` branded type + `RepoFileEntry` + 5 helper function) + 3 detector adoption (= project-lifecycle / archive-manifest / doc-registry が `toRepoPath()` で sourceFile boundary validate) + `detectorResultModuleGuard.test.ts` +27 test (46 → 73) + `detectors/README.md` 更新 (= path-helpers section + 4 規約 + adoption pattern code 例) + guard-test-map.md update + DA-α-004 articulate (Lineage 仮 sha) + checklist Phase 4 3 件 flip

Phase 4 重要決定 (= DA-α-004 §decision):
- path-helpers foundation 新設 (= 4 規約: POSIX separator / repo-relative / non-traversal / non-empty)
- 3 detector adoption (= plan.md 完了条件「project / archive / doc registry validator が共通 path helper を使う」に対応)
- 残り 2 detector (generated-metadata / schema-validation) は Phase 6 adoption に deferral
- 既存 production guard 不変 (= 不可侵原則 2 strict adherence)

§13 commit pattern 累積 application (= Phase 0〜4 landing 時点):
- §13.1 二段 commit: 8 instance + Phase 4 landing/wrap-up = 10 instance (Phase 4 wrap-up は本 commit 後の次 commit)
- §13.2 atomic dependent update: 1 instance (= Phase 1 landing)
- §13.3 post-flip regen: 9 instance + Phase 4 後 regen = 10 instance (Phase 4 regen は本 commit 後)

derivedStatus: in_progress / 22 of 50 (Phase 4 landing 段階達成、wrap-up 待ち)。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を要約する。

### 高優先（直近 = Phase 4 wrap-up）

- **(該当時) docs:generate 反映 commit** (= §13.3 適用):
  - 本 landing commit に新 file (path-helpers.ts) + 3 detector touch + checkbox 3 件 flip が含まれるため、obligation + project-structure.md + KPI drift 発生想定
  - flip commit 後に `cd app && npm run docs:generate` で sync、別 commit で push
- **Phase 4 wrap-up commit** (= §13.1 適用):
  - decision-audit.md DA-α-004 Lineage 実 sha update
  - decision-audit.md DA-α-004 振り返り判定 articulate (= 観測点 1〜8 達成状況 + 学習)
  - checklist Phase 4 4 件目 (= DA-α-004 振り返り判定) checkbox を [x] flip
  - 本 HANDOFF §1 を Phase 4 完遂状態に update

### 中優先（次 PR = Phase 5）

- **Phase 5 Archive v2 / Project Lifecycle Fixture Corpus landing commit**:
  - `fixtures/aag/` 配下に pass / fail fixture を整備
  - 各 fixture に expected DetectorResult を定義
  - DA-α-005 entry articulate

### 低優先（Phase 6 以降、後続 PR）

- Phase 6: Pure Detector Extraction (= 残り 2 detector の path-helpers adoption も含む)
- Phase 7: Engine Readiness Report / No-Go Boundary

## 3. ハマりポイント

### 3.1. 不可侵原則 1 (engine 実装に入らない) を見失わない

本 project は **engine 実装そのものを scope 外** にする事前リファクタリング。
途中で「Go で書き始めれば parity 確認しやすい」「Rust で proof-of-concept だけ」
等の誘惑が来ても踏み込まない。engine 実装は本 project archive 後の別 program。

trigger: Phase 5 fixture corpus / Phase 6 pure detector extraction で「これなら
Go 移植が一瞬」と思った瞬間が最も危険。`projectization.md` §5 の Escalation
判定で user に escalate して別 project 起票を判断する。

### 3.2. §13.1 二段 commit pattern を 1 commit に統合しない

Phase landing と wrap-up を 1 commit に纏めると drawer Pattern 1 (Commit-bound
Rollback) 違反 + Lineage 実 sha が landing commit に書けない (chicken-and-egg)。
必ず:
- landing commit で deliverable + DA articulate (Lineage 仮 sha)
- wrap-up commit で DA Lineage 実 sha + 振り返り判定 + 最終 checkbox flip

### 3.3. §13.2 atomic dependent update を忘れると push fail

Phase 1 で `references/03-implementation/aag-engine-readiness-inventory.md` を
新設する commit は、同 commit に以下を統合する必要がある:
- `docs/contracts/doc-registry.json` に entry 追加
- `references/README.md` 索引 section に entry 追加
- (該当時) CLAUDE.md link 追加
- (該当時) 既存 doc から新 doc への inbound link 追加

これを忘れると pre-push hook の docRegistryGuard が hard fail。同 commit 統合で
push fail 0 件。

### 3.4. §13.3 post-flip regen を amend で混ぜない

checkbox `[x]` flip を含む commit の後で `npm run docs:generate` を実行すると
generated section + KPI が drift し、pre-push hook の `docs:check` が hard fail。
解消は `git commit -m "chore(docs): docs:generate 反映 (= [x] flip 後 KPI sync)"`
で **別 commit** として landing。flip commit に amend で書き戻すと AAG-REQ-NO-AMEND
違反 + drawer Pattern 1 違反。

### 3.5. 既存 guard の意味は変えない (不可侵原則 2)

pure detector 抽出時 (Phase 6)、「ついでに条件を厳しくしよう」は禁止。
Vitest wrapper 経由で同じ test が同じ結果 (PASS / FAIL の数 + 検出 rule ID
+ 検出 path) を返すことを parity test で確認する。意味変更が必要と判明したら
別 project 起票。

### 3.6. 実装 AI が最終レビューを [x] にしない (不可侵原則 8)

機能的 Phase 0〜7 と AI 自己レビュー全項目が [x] になっても、最終レビュー
(user 承認) は user 判断。AI が単独で [x] flip すると PZ-10/PZ-13 違反。
Phase 7 の engine readiness report 完成時点で user に articulate して承認待ち。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/active/aag-engine-readiness-refactor/AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order) |
| `projects/active/aag-engine-readiness-refactor/plan.md` | 不可侵原則 8 件 + Phase 0〜7 構造 + commit pattern |
| `projects/active/aag-engine-readiness-refactor/checklist.md` | completion 判定の入力 (= required checkbox 集合) |
| `projects/active/aag-engine-readiness-refactor/projectization.md` | AAG-COA 判定結果 (= L3 / architecture-refactor) |
| `projects/active/aag-engine-readiness-refactor/decision-audit.md` | DA-α 系 lineage articulation (= 5 軸 + 観測点 + Lineage 実 sha + 振り返り判定) |
| `projects/active/aag-engine-readiness-refactor/discovery-log.md` | scope 外発見蓄積 |
| `references/05-aag-interface/operations/project-checklist-governance.md` §13 | Phase 進行 commit pattern (§13.1 二段 / §13.2 atomic / §13.3 post-flip) |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定基準、L3 required artifacts |
| `references/05-aag-interface/protocols/complexity-policy.md` §3.4 | L3 重変更 routing (= DA institute + judgement commit + 振り返り判定) |
| `aag/_internal/architecture.md` | AAG 5 層構造 (本 project は Layer 3 Execution の structural refactor) |
| `tools/architecture-health/` | Phase 1〜3 の主な refactor 対象 |
| `app/src/test/guards/` | Phase 6 pure detector 抽出元 |
