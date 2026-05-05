# HANDOFF — aag-engine-readiness-refactor

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 3 完遂 (= 本 wrap-up commit landing 後)**。次は Phase 4 Path Normalization / RepoFileIndex。

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
- landing commit `c9b0bed`: 4 detector file 新設 (= archive-manifest / doc-registry / generated-metadata / schema-validation) + `detector-result.ts` に `evaluateDetectorResults` evaluator 追加 + `detectors/README.md` 新設 (= 4 層 layered model articulate) + `detectorResultModuleGuard.test.ts` +26 test (20 → 46) + guard-test-map.md update + DA-α-003 articulate (Lineage 仮 sha) + checklist Phase 3 3 件 flip
- regen commit `3de426e`: §13.3 Pattern A application (= obligation + project-structure.md + 14 KPI/generated artifact sync)
- wrap-up commit (本 commit): DA-α-003 Lineage 実 sha update + 振り返り判定 "正しい" + checklist 4 件目 [x] flip + HANDOFF §1 update

DA-α-003 振り返り判定: **正しい** (= 観測点 8 件すべて達成)。

Phase 3 学習 (= DA-α-003 §振り返り判定 §学習、後続 Phase で活かす):
- **demonstration pattern の institutionalization 効果**: Phase 2 で 1 系統で確立した pattern を Phase 3 で 4 系統に mechanical に展開可能だった (= scope candidate B での 2 段 Phase 設計が wisdom)
- **layered model README の navigation 効果**: 4 層 model + 5 detector 一覧 + 追加手順を 1 file に articulate、後続 navigation cost 大幅低下
- **evaluator layer で 4 層 layered model 完成**: plan.md mention の分離 model が reference implementation として揃った (= 後続 engine 実装 project の base case)
- **renderer 分離 parity test の G8 整合**: plan.md 完了条件 hand-wave を test 化 (= 「気をつける」 exhortation を mechanism に転化)
- **guard 修正 0 件達成**: 同 test file への describe block 追加 pattern が co-change 義務を最小化

§13 commit pattern 累積 application (= Phase 0〜3 完遂時点):
- §13.1 二段 commit: 8 instance (= Phase 0 + 1 + 2 + 3 各 landing/wrap-up)
- §13.2 atomic dependent update: 1 instance (= Phase 1 landing)
- §13.3 post-flip regen: 8 instance (= Phase 0 後 + Phase 1 × 2 + Phase 2 × 3 + Phase 3 × 2)

derivedStatus: in_progress / 19 of 50 (Phase 3 完遂、Phase 4 着手待ち)。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を要約する。

### 高優先（次 PR = Phase 4）

- **Phase 4 Path Normalization / RepoFileIndex landing commit**:
  - repo-relative POSIX path を標準化、絶対 path を artifact に入れない
  - `RepoFileEntry` 型を導入し共通 path helper 整備
  - DA-α-004 entry articulate

### 低優先（Phase 5 以降、後続 PR）

- Phase 5: Archive v2 / Project Lifecycle Fixture Corpus
- Phase 6: Pure Detector Extraction
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
