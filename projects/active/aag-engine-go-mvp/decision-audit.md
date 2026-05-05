# decision-audit — aag-engine-go-mvp

> **役割**: L3 重変更 routing で institute される判断履歴の正本 articulate。
> 各 DA entry は 5 軸 (= context / decision / rationale / alternatives / 観測点) +
> Lineage (= preJudgement / judgement / postJudgementRegen / retrospective commit SHA) +
> 振り返り判定 (= 正しい / 部分的 / 間違い + 学習) で articulate。
>
> **scope 含む**: 本 project scope 内で行った重判断の lineage。
> **scope 外 (= 別 doc)**: scope 外発見 (= `discovery-log.md`)、Phase 進行手順 (= `plan.md`)、達成条件 (= `checklist.md`)。
>
> 機械検証: `projectizationPolicyGuard` PZ-13 (= AI 自己レビュー section + 最終レビュー section の存在 + ordering、本 file の DA entry 内容妥当性は AI session 責任)。
>
> 詳細: `references/05-aag-interface/protocols/complexity-policy.md` §3.4 (= L3 routing) +
> `references/05-aag-interface/operations/project-checklist-governance.md` §13 (= Phase 進行 commit pattern)。

## DA-α-000: 本 project の進行モデル institute (= readiness refactor DA-α-000 pattern 継承)

### status

- 着手判断: **closed** (Phase 0 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 10 件すべて達成)

### context

`aag-engine-readiness-refactor` (= 2026-05-05 archive、self-dogfood 4 件目) で
articulate された engine readiness の implementation 段階に入る project。

readiness refactor は以下を deliverable として永続維持済:

- 5 detector (= archive manifest / doc registry / generated metadata / project lifecycle / schema validation)
- 8 fixture (= 5 系統 coverage)
- DetectorResult TS implementation + canonical schema (= forward-looking、aag-platformization Pilot で landing)
- path-helpers (= RepoPath / RepoFileEntry / 4 規約)
- Logic Boundary Reference (= per-detector engine 移植 boundary articulate)
- Vitest wrapper thin 化 reference

本 project はこれらを **Go engine の input** として使用、5 detector を Go で
parallel 実装し、shadow mode で TS 側との parity を機械検証する。

最終目標は AAG を **repo 内の文化・test 群** から **repo 外側から読む read-only
governance engine** へ段階昇格させること。但し **TS guard を全廃しない**:
app-specific guard (= calculation / presentation / WASM / TS AST) は永続維持、
本 MVP の対象は repo / governance / archive / lifecycle / metadata の 5 系統に限定。

### decision

以下を採用する:

1. **進行モデル = AI judgement + retrospective + commit-bound rollback** (= readiness refactor DA-α-000 pattern 継承):
   - 各 Phase で **judgement commit** を打つ (= landing commit、deliverable + DA articulate)
   - **retrospective commit** を打つ (= wrap-up commit、Lineage 実 sha + 振り返り判定)
   - rollback target = preJudgementCommit を SHA 直接参照 (= AI infrastructure で annotated tag 不可)
2. **§13.1 / §13.2 / §13.3 commit pattern を全 Phase で strict adherence**:
   - §13.1 = Phase landing + wrap-up 二段 commit
   - §13.2 = references/ 新 doc 追加時の atomic dependent update
   - §13.3 = checkbox flip 後の docs:generate 別 commit (= post-flip regen)
3. **不可侵原則 10 件を全 Phase で maintain**:
   1. MVP は validator のみ、generator ではない
   2. TypeScript guard を全廃しない
   3. rule semantics を Go 側に複製しない
   4. app-specific TS guard を engine 化対象に含めない
   5. CI hard gate を即時置換しない
   6. §13.1 / §13.2 / §13.3 commit pattern を全 Phase 適用
   7. L3 重変更 routing に従う
   8. 実装 AI が完了承認しない (= PZ-13 strict adherence)
   9. Go engine が source of truth にならない
   10. fixture parity を必須にする
4. **readiness refactor deliverable を required reads として明示列挙** (= AI_CONTEXT.md §「Required reads」 17 file):
   - readiness archive (= ARCHIVE.md + archive.manifest.json)
   - inventory (= aag-engine-readiness-inventory.md)
   - 5 detector (= TS source as Go 移植 reference)
   - layered model README + Logic Boundary Reference
   - path-helpers
   - 8 fixture + README
   - canonical schema 2 件
   - test contract 2 件
5. **Phase 0 scope = bootstrap / scope lock / required reads / DA-α-000 のみ**:
   - Go 実装は Phase 1 以降
   - aag-engine/ directory は Phase 0 では作らない
   - Phase 0 完了条件「Go 実装にはまだ入っていない」 を明示

### rationale

- **進行モデル継承**: readiness refactor で 8 instance の §13.1 二段 commit + 1 instance §13.2 + 21 instance §13.3 を実適用、すべての DA 振り返り判定が「正しい」 で完遂。同 pattern を本 MVP でも採用する根拠は十分。learning curve 不要 (= AI session 間で institutional knowledge transfer が成立)
- **不可侵原則 10 件**: readiness refactor の 8 件を継承 + 新 2 件 (= 9. Go engine が source of truth にならない / 10. fixture parity 必須)。Go engine 導入が「第二の正本」 を生まないこと、shadow mode の primary metric が fixture parity であることを strict articulation
- **required reads 17 file の明示列挙**: readiness archive で「永続維持 file」 として articulate された deliverable をすべて required read に含める。後続 AI session が部分的に readiness deliverable を読み落とすと scope 逸脱や parity drift の risk があるため、明示列挙が wisdom
- **Phase 0 scope 限定**: bootstrap で Go 実装に踏み込むと scope creep になりやすく、§13.1 二段 commit pattern も weight 過多。Phase 0 = scope lock のみに絞ることで Phase 1 以降の判断 (= Go module structure / CLI design / contract binding) を独立 DA で articulate できる

### alternatives

- (a) **Phase 0 で Go skeleton を着手**: scope creep + Phase 0 weight 過多、不採用
- (b) **不可侵原則を readiness 8 件のみ継承** (= 新 2 件 9/10 を articulate しない): Go engine 導入特有の risk (= source of truth 二重化 / fixture parity 軽視) を articulate せず、後続 Phase で violation 発見時の対応が遅れる、不採用
- (c) **required reads を ARCHIVE.md / archive.manifest.json の 2 file のみに絞る**: 後続 AI session が永続維持 deliverable に reach するために archive metadata 経由で navigation する必要、cost 高、不採用 (= user 提案通り 17 file 明示列挙)
- (d) **Rust MVP も同時着手**: scope 大、Phase 12 で Rust 必要性再評価する設計と矛盾、不採用

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `projects/active/aag-engine-go-mvp/` 配下に 8 必須 file (= AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit + config/project.json) が landing
2. `references/04-tracking/open-issues.md` active project 索引に本 project が articulate
3. AI_CONTEXT.md §「Required reads」 が 17 file を明示列挙 (= readiness deliverable + readiness archive)
4. 不可侵原則 10 件が plan.md §不可侵原則 で articulate
5. Phase 0〜12 の 13 Phase 構造が plan.md で articulate (= readiness Phase 0〜7 = 8 Phase に対し本 MVP は 13 Phase = scope 拡張)
6. Long-term Target が plan.md + AI_CONTEXT.md で articulate (= AAG 2 layer + 段階昇格 vision)
7. `aag-engine/` directory が **存在しない** (= Phase 0 では Go 実装に入らない)
8. checklistFormatGuard / projectCompletionConsistencyGuard / projectizationPolicyGuard / archiveV2SchemaGuard すべて PASS
9. docs:check / test:guards PASS (= Phase 0 landing 後)
10. project-health.json に本 project が `derivedStatus = in_progress` として articulate

### Lineage

- **preJudgementCommit**: `c72c2a8` (= readiness refactor PR #1258 merge commit、main 最新 HEAD)
- **judgementCommit**: `cc6e824` (= Phase 0 landing commit、必須 8 file landing + open-issues update + DA-α-000 articulate + checklist 5 件 flip)
- **postJudgementRegenCommit**: `ed348eb` (= §13.3 Pattern A application、project-structure.md + 14 KPI/generated artifact sync)
- **retrospectiveCommit**: 本 Phase 0 wrap-up commit (= Lineage 実 sha update + 振り返り判定 articulate)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可、SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上、rollback target = preJudgementCommit `c72c2a8` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `projects/active/aag-engine-go-mvp/` 配下に 8 必須 file (= AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit + config/project.json) が landing
  2. ✅ `references/04-tracking/open-issues.md` active project 索引に本 project が articulate
  3. ✅ AI_CONTEXT.md §「Required reads」 が 17 file を明示列挙 (= readiness deliverable + readiness archive)
  4. ✅ 不可侵原則 10 件が plan.md §不可侵原則 で articulate (= readiness 8 件継承 + Go engine source of truth 不可 / fixture parity 必須 の新 2 件)
  5. ✅ Phase 0〜12 の 13 Phase 構造が plan.md で articulate
  6. ✅ Long-term Target が plan.md + AI_CONTEXT.md で articulate (= AAG 2 layer + 段階昇格 vision)
  7. ✅ `aag-engine/` directory が **存在しない** (= Phase 0 では Go 実装に入らない、scope lock 順守)
  8. ✅ checklistFormatGuard / projectCompletionConsistencyGuard / projectizationPolicyGuard / archiveV2SchemaGuard すべて PASS (= 147 file / 1057 test の既存 baseline 維持)
  9. ✅ docs:check / test:guards PASS (= Phase 0 landing 後)
  10. ✅ project-health.json に本 project が `derivedStatus = in_progress` として articulate (= regen commit で生成済)
- **学習**:
  - **readiness refactor 進行モデル継承の wisdom**: readiness refactor で 8 instance §13.1 + 1 instance §13.2 + 21 instance §13.3 を実適用、全 DA 振り返り判定が「正しい」 で完遂したため、同 pattern を本 MVP に継承する根拠が institutional knowledge として確立済。learning curve 不要 (= AI session 間で institutional memory transfer が成立)
  - **Required reads 17 file 明示列挙の wisdom**: readiness archive 経由で archive.manifest.json の `compressedFiles[].summary` を navigation する route も論理上は可能だが、後続 AI session が部分的に readiness deliverable を読み落とす risk を排除するため、project bootstrap 時に **明示列挙** が user 提案通り正しい。このパターンは relatedPrograms.child 関係を持つ後続 program すべてに適用可能 (= institutionalize 候補)
  - **Phase 0 scope 限定の wisdom**: Phase 0 で Go skeleton を着手すると scope creep + §13.1 二段 commit weight 過多。Phase 0 = scope lock のみに絞ることで Phase 1 以降の判断 (= Go module structure / CLI design / contract binding) を独立 DA で articulate 可能。readiness refactor Phase 0 と同 pattern (= scope lock のみ) で wisdom 確立
  - **新 不可侵原則 2 件 (= Go engine が source of truth にならない / fixture parity 必須) の articulate wisdom**: readiness 8 件継承だけでは Go engine 導入特有の risk (= source of truth 二重化 / fixture parity 軽視) が articulate されず、後続 Phase で violation 発見時の対応が遅れる候補。新 2 件を Phase 0 で institutionalize することで Phase 1〜12 全期間で strict adherence 可能

---

> 後続 DA entry (DA-α-001 〜 012) は各 Phase landing commit 時に articulate 追加。
