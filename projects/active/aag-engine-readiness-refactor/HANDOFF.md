# HANDOFF — aag-engine-readiness-refactor

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 完遂 (= 本 wrap-up commit landing 後)**。次は Phase 1 AAG Input Inventory。

Phase 0 lineage:
- landing commit `950ddba`: 必須 8 file landing + open-issues update + DA-α-000 articulate (Lineage 仮 sha)
- regen commit `61a3b1b`: §13.3 Post-flip regen pattern application (= project.checklist.* KPI sync)
- L1 fix commit `1f40057`: bootstrap 中に発見した 2 件 template / policy gap を session 内で別 commit fix
- wrap-up commit (本 commit): DA-α-000 Lineage 実 sha update + 振り返り判定 "正しい" + checklist 残 3 checkbox flip + HANDOFF §1 update

DA-α-000 振り返り判定: **正しい** (= 観測点 5 件中 3 件達成 + 2 件は後続 Phase で継続検証、§13.1 / §13.3 を Phase 0 で実適用済、§13.2 は Phase 1 で実証予定)。詳細は `decision-audit.md` DA-α-000 §振り返り判定 参照。

derivedStatus: in_progress / 7 of 50 (Phase 0 完遂、Phase 1 着手待ち)。完了基準は checklist Phase 1〜7 + AI 自己レビュー 5 件 + 最終レビュー (user 承認) 1 件の全 [x]。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を要約する。

### 高優先（直近 = Phase 0 wrap-up）

- **Phase 0 wrap-up commit** (= §13.1 適用):
  - decision-audit.md DA-α-000 Lineage 実 sha update (= 本 landing commit SHA を articulate)
  - decision-audit.md DA-α-000 振り返り判定 articulate
  - checklist Phase 0 振り返り判定 checkbox を [x] flip
  - 本 HANDOFF §1 を Phase 0 完遂状態に update
- **(該当時) docs:generate 反映 commit** (= §13.3 適用):
  - flip commit 後に `cd app && npm run docs:generate` で project-health 等 KPI sync
  - 別 commit で push

### 中優先（次 PR = Phase 1）

- **Phase 1 AAG Input Inventory landing commit**:
  - `references/03-implementation/aag-engine-readiness-inventory.md` 新設
  - 5 分類 (contracts / generated / project lifecycle / rule source / guard source) で input 棚卸し
  - §13.2 適用: 同 commit で `docs/contracts/doc-registry.json` + `references/README.md` 索引 + 必要な inbound link を統合
  - DA-α-001 entry articulate (= 5 軸 + 観測点 + Lineage 仮 sha)
  - checklist Phase 1 該当 checkbox flip
- **Phase 1 wrap-up commit**:
  - DA-α-001 Lineage 実 sha + 振り返り判定
  - checklist Phase 1 振り返り判定 checkbox flip

### 低優先（Phase 2 以降、後続 PR）

- Phase 2: DetectorResult / AagResponse Normalization
- Phase 3: Collector / Detector / Renderer 分離
- Phase 4: Path Normalization / RepoFileIndex
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
