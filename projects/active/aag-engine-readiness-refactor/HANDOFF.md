# HANDOFF — aag-engine-readiness-refactor

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 7 landing 完了 (= 本 commit landing 後)**。**user 最終承認 待ち state** (= 機能的 Phase 0〜7 + AI 自己レビュー全 [x]、最終レビュー [ ] のみ残る)。

Phase 5+6+7 lineage (= 完遂):
- Phase 5: landing `32c458c` + regen `a731264` + wrap-up `d454154` + regen `f857e55`
- Phase 6: landing `f05bcba` + regen `f0bb4c0` + wrap-up `4c1a42c` + regen `0eeb109`
- Phase 7 (本 commit + 後続 wrap-up): landing = `engine-readiness-report.md` 新設 (~280 line) + DA-α-007 articulate + AI 自己レビュー全 5 件 [x] flip + checklist Phase 7 2 件 flip

Phase 7 deliverable:
- `engine-readiness-report.md` (= §1〜§11、Executive / 移行可能 detector / TS 残置 / Go MVP input/output / shadow mode / hard gate / 開始条件 / out of scope / 継承文書 / user 承認 checklist)
- 全 5 detector が engine MVP scope に articulate
- 5 系統 TS 残置 articulate (= calculation / presentation / temporal / TS AST / WASM bridge)
- shadow mode = fixture corpus 主軸 (= 5 × 8 = 40 parity 検証点)
- hard gate 化 MVP = 4 hard gate + 1 advisory (= G2 観測期間後昇格判断)
- Go 実装開始は user 承認 + 別 program 起票 (= aag-engine-go-mvp 等) で trigger

AI 自己レビュー全 5 件 [x]:
- 総チェック / 歪み検出 / 潜在バグ確認 / ドキュメント抜け漏れ / CHANGELOG (= 対象外 articulate)

**残タスク**:
- Phase 7 wrap-up commit (= DA-α-007 Lineage 実 sha + 振り返り判定 + checklist 4 件目 flip)
- §13.3 regen
- **最終レビュー (user 承認)** ← user judgement、AI は touch しない

## 2. user 承認後の routing

最終レビュー [x] flip 後:
1. `references/05-aag-interface/operations/project-checklist-governance.md` §6.2 archive プロセスへ移行
2. Archive v2 圧縮 (= self-dogfood 4 件目)
3. 本 project archive 後、後続 engine 実装 project (= aag-engine-go-mvp 等) 起票判断は user。
   起票 trigger と継承事項は `engine-readiness-report.md` §8 + §10 articulate。

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

Phase 4 lineage (= 完遂済):
- landing commit `fc909cb`: path-helpers.ts 新設 + 3 detector adoption + 27 新 test + README update + DA-α-004 articulate + checklist 3 件 flip
- regen commit `4c4beba`: §13.3 Pattern A application
- wrap-up commit (本 commit): DA-α-004 Lineage 実 sha update + 振り返り判定 "正しい" + checklist 4 件目 [x] flip + HANDOFF §1 update

DA-α-004 振り返り判定: **正しい** (= 観測点 8 件すべて達成)。

Phase 4 学習 (= DA-α-004 §振り返り判定 §学習、後続 Phase で活かす):
- **branded type の wisdom**: `RepoPath = string & { __brand }` で TS type level path 規約遵守を保証可能。但し JSON Schema は branded を articulate できないため `DetectorResult.sourceFile` は `string` 維持 + boundary validation の trade-off を articulate
- **boundary validation の minimal cost / maximum effect**: detector boundary で `toRepoPath()` を呼ぶ pattern が最小コストで最大検証効果。collector layer まで遡る systematic validation は Phase 6 routing で deferral
- **forward-looking type articulate**: `RepoFileEntry` を Phase 4 で landing し Phase 5/6 で実 adoption 予定。aag-platformization Pilot の forward-looking schema pattern を Phase 4 で再適用、後続 Phase の base type を pre-landing する pattern が institutionalize
- **3 detector adoption の choice の wisdom**: plan.md 完了条件で名指しされた 3 系統に scope を絞ることで wrap-up commit を controllable に維持。残り 2 detector は Phase 6 と統合 routing
- **guard 修正 0 件達成 (= 連続 2 Phase)**: 同 test file への describe block 追加 pattern が co-change 義務を最小化

§13 commit pattern 累積 application (= Phase 0〜4 完遂時点):
- §13.1 二段 commit: 10 instance (= 各 Phase landing/wrap-up)
- §13.2 atomic dependent update: 1 instance (= Phase 1 landing)
- §13.3 post-flip regen: 11 instance (= 各 flip 後の sync)

derivedStatus: in_progress / 23 of 50 (Phase 4 完遂、Phase 5 着手待ち)。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を要約する。

### 高優先（次 PR = Phase 5）

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
