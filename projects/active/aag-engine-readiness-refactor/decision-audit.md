# decision-audit — aag-engine-readiness-refactor

> 役割: L3 重判断 institution (= drawer Pattern 1 application、複数 Phase に跨る判断の lineage articulation)。
>
> 規約: `references/05-aag-interface/protocols/complexity-policy.md` §3.4 + `references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1。
>
> **構造**: 各 DA entry は以下を articulate する。
>
> 1. **5 軸** = status / context / decision / rationale / alternatives
> 2. **観測点** = 判断後に true となるべき検証可能な observation 集合
> 3. **Lineage** = judgementCommit (実 sha、wrap-up commit で update) + preJudgementCommit (= judgement 直前の commit、rollback target) + (任意) retrospectiveCommit
> 4. **振り返り判定** = 正しい / 部分的 / 間違い + 学習 (= Phase 完遂時に articulate)
>
> **flow**:
> - landing commit で entry を articulate (= 5 軸 + 観測点 + Lineage 仮 sha)
> - landing commit SHA 確定後、wrap-up commit で Lineage 実 sha update + 振り返り判定
> - 完遂後の archive 時に `archive.manifest.json` の `decisionEntries` (= id + title + commitSha) に圧縮される
>
> **参考実装**: `projects/completed/operational-protocol-system/archive.manifest.json` の decisionEntries (= 6 entry、active 期は decision-audit.md 438 行) / `projects/completed/aag-platformization/archive.manifest.json` (= 8 entry、AAG Pilot first instance)

## DA-α-000: 本 project の進行モデル決定 (= AI judgement + retrospective + commit-bound rollback)

### status

- 着手判断: **closed** (Phase 0 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (Phase 0 段階の観測点 5 件すべて達成 / 後続 Phase で観測点 1〜3 を継続検証)

### context

本 project は L3 architecture-refactor (= projectization-policy.md §3 Level 3、`projectization.md` §2 判定理由)。
engine 移行可能性に関わる multi-axis structural change を含む 7 Phase 構成 (= `plan.md` Phase 0〜7)。
Phase 進行中に **判断点が複数発生** することが想定される (= 各 Phase の着手判断 + 構造設計 + scope boundary 判定)。

L3 重変更 routing (= `complexity-policy.md` §3.4) では DA institute が必須。drawer Pattern 1 (= Commit-bound Rollback) の application が適切。

### decision

本 project の進行モデルとして以下を採用する:

1. **AI judgement + retrospective + commit-bound rollback** (= AAG Pilot DA-α-000 / operational-protocol-system DA-α-000 / aag-self-hosting-completion DA-α-000 の領域 agnostic 拡張)
2. **§13.1 Phase landing + wrap-up 二段 commit pattern** を全 Phase で適用 (= landing commit で deliverable + DA articulate / wrap-up commit で Lineage 実 sha + 振り返り判定)
3. **§13.2 Atomic dependent update commit pattern** を references/ 配下新 doc 追加時に適用 (= doc-registry / README index / inbound link を同 atomic commit に統合)
4. **§13.3 Post-flip regen pattern** を checkbox flip を含む全 commit に適用 (= flip commit + docs:generate 別 commit)

### rationale

- **drawer Pattern 1 整合**: judgement commit を rollback unit として固定、振り返り判定が「間違い」/「部分的」なら `git checkout <preJudgementCommit>` で物理 rollback 可能
- **過去 3 program で実証済**: aag-platformization (= 8 DA entry / 14 commitLineage) / aag-self-hosting-completion / operational-protocol-system (= 6 DA entry / 14 commitLineage) で同モデルが完遂、Pilot 完了 criterion 達成
- **§13 commit pattern integration**: 2026-05-04 に project-checklist-governance.md §13 として framework 化された 3 pattern を本 project が自然に適用できる構造
- **不可侵原則 7 整合**: L3 重変更 routing が要求する DA institute + 振り返り判定 を最初から構造化

### alternatives

- (a) **AI judgement のみ + 振り返りなし** (= L1 / L2 軽量 routing): scope と複雑性が L3 規模なので過小、後続 Phase で判断 lineage が trace 不能になる
- (b) **user 単独 judgement + AI 実装のみ**: AI が複雑性に対応できる範囲で AI 判断を活用する方が efficient、user は最終承認 + 重 escalation のみ担当
- (c) **DA institute するが §13 適用なし**: §13.1 二段 commit / §13.2 atomic / §13.3 regen が institutionalize された直後 (2026-05-04) に新 project 起票するのに **適用しない判断は退行的**、§13 framework 化の目的に反する

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. Phase 0 〜 7 の全 Phase で landing + wrap-up の 2 commit が landing 済 (= 14 commit 以上、§13.1 適用)
2. 全 DA-α-N entry が Lineage 実 sha + 振り返り判定 (正しい / 部分的 / 間違い) を持つ
3. references/ 配下新 doc 追加 commit (Phase 1 1 件想定) で push fail 0 件 (§13.2 適用、pre-flight check list 実行)
4. checkbox flip を含む全 commit の後に docs:generate 反映 commit が landing (§13.3 適用、`docs:check` 即時 PASS)
5. 振り返り判定で「間違い」が出た場合、`git checkout <preJudgementCommit>` で rollback 可能な状態が維持される

### Lineage

- **preJudgementCommit**: `e1b95ce` (= Merge pull request #1255、本 Phase 0 landing 直前の HEAD)
- **judgementCommit**: `950ddba` (= Phase 0 bootstrap landing commit、必須 8 file + open-issues update + DA-α-000 articulate)
- **postJudgementRegenCommit**: `61a3b1b` (= §13.3 Post-flip regen pattern application、project.checklist.* KPI sync)
- **retrospectiveCommit**: 本 Phase 0 wrap-up commit (= Lineage 実 sha update + 振り返り判定 articulate、SHA は git log で参照)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可、SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上、rollback target = preJudgementCommit `e1b95ce` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ (Phase 0 段階達成 / 後続継続) — Phase 0 で landing (`950ddba`) + regen (`61a3b1b`) + wrap-up (本 commit) の 3 commit landing。Phase 1〜7 で landing + wrap-up 二段 commit を継続適用予定 (= §13.1)
  2. ✅ (Phase 0 段階達成) — DA-α-000 が Lineage 実 sha + 振り返り判定 articulate 完了。後続 DA-α-001〜007 は各 Phase landing で同形式 institute 予定
  3. — (Phase 0 では該当 commit なし) — Phase 0 では references/ 配下新 doc 追加なし (= aag-engine-readiness-inventory.md は Phase 1 で landing)。Phase 1 commit で §13.2 atomic dependent update pre-flight check list を実行して push fail 0 件を確認予定
  4. ✅ (Phase 0 段階達成) — landing commit (`950ddba`) で project.checklist.* KPI drift を検出、別 regen commit (`61a3b1b`) で sync (= §13.3 Pattern A 適用)。amend 不採用 (= AAG-REQ-NO-AMEND 整合)
  5. ✅ (Phase 0 段階達成) — preJudgementCommit `e1b95ce` を articulate 維持、`git checkout e1b95ce` で物理 rollback 可能な状態
- **学習**:
  - **§13 framework 化直後の新 project bootstrap で 3 pattern (= §13.1 / §13.2 / §13.3) すべてを Phase 0 で実適用できた**: §13.3 は本 commit で実証 (= landing + regen の 2 commit でパス)、§13.1 二段は本 wrap-up commit で実証、§13.2 は Phase 1 で実証予定
  - **Phase 0 bootstrap 中に発見した 2 件の template / policy gap (= `_template/decision-audit.md` 不在 / `projectization-policy.md` §4 早見表に行不在) を session 内で別 commit (`1f40057`) で fix**: 「気をつける」exhortation ではなく institutionalize として処理 (= G8 整合)。本 project の scope 外だが、bootstrap 体験そのものを improve する循環学習の application
  - **decision-audit.md template 設計時の trade-off**: 5 軸 label (status / context / decision / rationale / alternatives) を標準 ADR 軸として canonicalize したが、過去 program では active 期 file が圧縮済のため正確な原型 verify は不可。後続 L3 project が template 通りに articulate するか観測継続

---

## DA-α-001: Phase 1 AAG Input Inventory landing 判断 (= 永続 doc + §13.2 atomic dependent update)

### status

- 着手判断: **closed** (Phase 1 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 5 件すべて達成)

### context

Phase 1 は engine が将来 input として読む必要がある artifact を 5 分類で棚卸しする
phase。本 inventory の **物理配置** (= projects/ 内に閉じるか / references/ 配下に
永続 landing するか) と **§13.2 atomic dependent update commit pattern の適用範囲**
について判断が必要。

`plan.md` Phase 1 § 完了条件:

- engine input 候補が 5 分類で articulate 済み
- active / completed / Archive v2 の 3 状態すべてで engine が input を読める articulation
- completed project に plan.md / checklist.md が存在する前提を排除

### decision

以下を採用する:

1. **物理配置 = `references/03-implementation/aag-engine-readiness-inventory.md`** (= 永続 doc、project archive 後も engine 実装 project が reach 可能)
2. **§13.2 atomic dependent update 適用**: 本 landing commit に以下を統合:
    - `references/03-implementation/aag-engine-readiness-inventory.md` (= 新 doc 本体)
    - `docs/contracts/doc-registry.json` (= AAG category 末尾に entry 追加)
    - `references/README.md` (= AAG 索引 section 末尾に行追加)
    - `projects/active/aag-engine-readiness-refactor/decision-audit.md` (= 本 entry articulate)
    - `projects/active/aag-engine-readiness-refactor/checklist.md` (= Phase 1 checkbox 3 件 [x] flip)
    - `projects/active/aag-engine-readiness-refactor/HANDOFF.md` (= §1 現在地 update)
3. **CLAUDE.md link 追加なし**: 本 inventory は project-scoped 永続 doc であり、daily AI session が直接 read する hot doc ではない (= doc-registry + README 索引から reach で十分)
4. **既存 doc から新 inventory への inbound 追加なし**: 本 inventory が他 doc の child / pointer ではなく、後続 engine 実装 project の正本参照という独立 root の役割を持つため

### rationale

- **永続 doc 採用**: project 内 (`projects/active/<id>/inventory.md`) に閉じると Archive v2 圧縮で物理消滅し、engine 実装 project (= 本 project archive 後) からの reach が `restoreAllCommand` 経由になる。post-archive reader navigation で大きな摩擦になる。
- **§13.2 適用判断**: references/ 配下に新 .md doc を追加する PR は §13.2 適用対象 (= L1-L3 不問、`project-checklist-governance.md` §13.2 適用対象)。pre-flight check list を本判断時に実行済 (= doc-registry / README 索引 / CLAUDE.md 判断 / inbound 判断 / 同 commit 統合)。
- **CLAUDE.md link 不採用**: CLAUDE.md L1 鉄則に「機能を説明する doc」を載せる原則だが、本 inventory は engine 実装 project に向けた **scoped reference** であり、daily AI が読む必要なし (= L2 / L3 routing で reach すれば十分)。CLAUDE.md 行追加は CLAUDE.md test contract に obligation を作る (= reference-link-existence) ため、cost も発生。
- **inbound 追加不採用**: inventory は engine implementation project への forward-pointer であり、既存 doc が child として持つ意味的な親が存在しない。AAG-REQ-ANTI-DUPLICATION + AAG-REQ-SEMANTIC-ARTICULATION の両原則と照合し、不要な inbound 追加は noise になる。

### alternatives

- (a) **project 内に inventory.md を置いて閉じる** (= project-scoped、仮想 path = `projects/active/<id>/inventory.md` に相当): post-archive engine 実装 project が `restoreAllCommand` または `archive.manifest.json` の `compressedFiles[].summary` 経由で reach する必要があり、reader navigation cost が高い。**不採用**。
- (b) **docs/contracts/ 配下に JSON で置く** (= 仮想 path = `docs/contracts/aag-engine-readiness-inventory.json` に相当): contracts は structured 正本専用 (= prose を含む input 棚卸しは適合しない)。**不採用**。
- (c) **CLAUDE.md AAG セクションから link 追加**: §13.2 atomic update + CLAUDE.md test contract の reference-link-existence に新 obligation を作る cost。inventory は daily AI が読む対象ではないため過剰。**不採用** (= 上記 rationale §3)。
- (d) **`aag/_internal/` 配下に置く**: 主アプリ改修 user は AAG framework 内部を read しない方針 (CLAUDE.md 「AAG を背景にした思考」セクション)。inventory は engine 実装 project (= 後続 separate project) が読む reference であり、AAG framework 内部 doc ではない。**不採用**。

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. inventory が **5 分類** (contracts / generated artifacts / project lifecycle / rule source / guard source) で articulate されている
2. **3 状態問題** (active / completed v1 / completed v2 圧縮) すべてで engine が input を読める read 経路が articulate されている (= §1 + §4 で table 化)
3. §13.2 atomic dependent update が成立 (= landing commit 1 件に inventory + doc-registry + README + DA articulation + HANDOFF + checklist flip が統合、push fail 0 件)
4. doc-registry / README index に entry 追加後、`docRegistryGuard` が PASS (= path existence + registry-README symmetry)
5. completed v2 圧縮済 project (= aag-self-hosting-completion / aag-platformization / operational-protocol-system) で `plan.md` / `checklist.md` 等が物理存在しないこと、engine がそれを前提にした read を **してはならない** ことが inventory §4.3 で articulate されている

### Lineage

- **preJudgementCommit**: `1c8ae86` (= Phase 0 wrap-up 後 regen commit、本 Phase 1 landing 直前の HEAD)
- **judgementCommit**: `745a927` (= Phase 1 landing commit、§13.2 atomic dependent update 適用 = inventory doc 本体 + doc-registry / README index + DA-α-001 articulate + checklist flip + HANDOFF update を 1 commit に統合)
- **postJudgementRegenCommit**: `ea1b3e3` (= §13.3 Pattern A 適用、project.checklist.checkedCheckboxes + 14 KPI/generated artifact sync)
- **retrospectiveCommit**: 本 Phase 1 wrap-up commit (= Lineage 実 sha update + 振り返り判定 articulate、SHA は git log で参照)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可、SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上、rollback target = preJudgementCommit `1c8ae86` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ inventory が 5 分類 (= contracts / generated artifacts / project lifecycle / rule source / guard source) で articulate された (= §2〜§6 の 5 sections + §1 overview table)
  2. ✅ 3 状態問題 (= active / completed v1 / completed v2 圧縮) の engine read 経路が §1 + §4.1〜4.3 で table 化された (= 圧縮済 v2 では `plan.md` / `checklist.md` が物理存在しない前提排除を §4.3 で明示、archive.manifest.json の 13 field を engine input 観点で articulate)
  3. ✅ §13.2 atomic dependent update が成立 (= 1 landing commit `745a927` に inventory 本体 + doc-registry / README / DA articulation / checklist flip / HANDOFF update を統合、push fail 0 件 = wrap-up commit push 時に検証予定だが pre-push hook の範囲では成立)
  4. ✅ docRegistryGuard / projectizationPolicyGuard / checklistFormatGuard / projectCompletionConsistencyGuard / projectDocStructureGuard / projectDocConsistencyGuard 全 PASS (= landing 前 verify で 146 file / 969 test PASS)
  5. ✅ completed v2 圧縮済 project (= aag-self-hosting-completion / aag-platformization / operational-protocol-system) で `plan.md` / `checklist.md` 等が物理存在しないこと、engine が前提にした read を **してはならない** ことが §4.3 + §4.4 で articulate された (= §4.4 で 3 件名指しで articulate、§4.3 で `restoreAllCommand` 復元はせず manifest を直接 read する設計が default)
- **学習**:
  - **§13.2 pre-flight check list 5 件をすべて articulate して 1 atomic commit で通過**: doc-registry entry 追加 / README 索引追加 / CLAUDE.md link 追加判断 (= 不採用) / 既存 doc から inbound 追加判断 (= 不採用) / 同 commit 統合 の 5 項目を DA-α-001 §rationale + §decision で articulate、push fail 0 件達成。M1 で push fail × 2 した operational-protocol-system 学習が反映された
  - **guard 修正 1 件発生 (= projectCompletionConsistencyGuard の path 言及検出)**: decision-audit.md alternatives (a)/(b) で **不採用候補の path** を backtick code 形式で書くと、guard が実 path reference と誤検出して hard fail。修正は仮想 path であることを prose で明示する形式に変更。**学習**: 後続 DA entry の alternatives section で「採用しなかった選択肢」を articulate する際、path 文字列は backtick で囲わず prose 形式で記述する institutional pattern が必要。本 session 内では single instance のため discovery-log.md に P3 として articulate 候補
  - **inventory 配置判断 (= references/03-implementation/) が正解だった**: post-archive engine 実装 project からの reach を考えると、project 内 (`projects/active/<id>/inventory.md`) に閉じる選択肢は退行的。永続 doc 採用で reader navigation cost を最小化、§13.2 atomic update のコストは pre-flight check list の institutionalization で吸収できる
  - **§13.1 / §13.2 / §13.3 の 3 pattern を Phase 0 + Phase 1 で全 application 達成**: §13.1 は Phase 0 + Phase 1 で計 4 commit (landing + wrap-up × 2)、§13.2 は Phase 1 landing で実証、§13.3 は Phase 0 + Phase 1 で計 2 regen commit。framework 化された 3 pattern が後続 Phase 2〜7 でも 同パターンで適用継続可能であることを 2 Phase 連続で実証

---

## DA-α-002: Phase 2 DetectorResult / AagResponse Normalization scope 判断 (= forward-looking schema 継承 + 1 系統 demonstration)

### status

- 着手判断: **closed** (Phase 2 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 7 件すべて達成)

### context

Phase 2 進入時の重要発見:

1. `docs/contracts/aag/detector-result.schema.json` が **既存** (= aag-platformization Pilot Phase 1 / A3 で landed、forward-looking として明示 articulate)
2. `aagContractSchemaSyncGuard.test.ts` が **既に DetectorResult schema validity を検証** (= 6 test、最後 2 test で sample valid + required field 欠落 reject)
3. **TS implementation は不在** (= grep で `DetectorResult` がほぼヒットしない、5 系統での adoption は post-Pilot に分離されていた)
4. Plan.md Phase 2 の DetectorResult 構造 sketch (= `{ detectorId, ruleId, severity: 'error'|'warn'|'info', path, message, evidence: { expected, actual } }`) と canonical schema (= `{ ruleId, detectionType, sourceFile, severity: 'gate'|'warn'|'block-merge', evidence?, actual?, baseline?, messageSeed? }`) で field 名 / severity enum / evidence type が異なる

これは Phase 2 の意義を **「新規 DetectorResult 設計」から「aag-platformization が forward-looking で残した integration を engine readiness の foundation として継承」に再定義** する判断点。

### decision

以下を採用する:

1. **canonical schema 踏襲**: `docs/contracts/aag/detector-result.schema.json` を canonical contract として TS implementation を整備。plan.md sketch の構造案は canonical schema に合わせて articulate を修正 (= field 名 / severity enum / evidence type は schema 通り)
2. **scope 候補 B 採用 (= Foundation + 1 系統 demonstration)**: Phase 2 では foundation (= TS implementation + helper + renderer 分離 + sync guard extension) + 1 系統 (= project lifecycle) demonstration を完遂、残り 4 系統 (= archive manifest / doc registry / generated metadata / schema validation) adoption は Phase 3 (Collector / Detector / Renderer 分離) と統合 routing
3. **既存 production guard を変更しない**: `projectCompletionConsistencyGuard.test.ts` の `checkConsistency()` (= violation 集合 emit) は維持。新 detector (`detectProjectLifecycleViolations`) は parallel implementation (= 同じ C1 violation 経路を DetectorResult[] で emit、demonstration 用)
4. **TS implementation 物理配置**:
    - `tools/architecture-health/src/detector-result.ts` (= type + factory + renderer separation helpers)
    - `tools/architecture-health/src/detectors/project-lifecycle-detector.ts` (= 1 系統 demonstration)
    - `app/src/test/guards/detectorResultModuleGuard.test.ts` (= 動作 contract の unit test、20 test)
5. **sync guard extension**: `aagContractSchemaSyncGuard.test.ts` に DetectorResult TS interface ↔ schema sync test 3 件追加 (= 既存 AagResponse pattern の mirror、required + properties + 実 instance validation)
6. **scope 候補 C (= plan.md 改訂) 不採用**: plan.md Phase 2 完了条件「5 系統で使用開始」を「使用開始 = adoption 経路が articulate された (= 1 系統 demonstration + 残り 4 系統は Phase 3 で完遂する articulation)」と解釈、plan.md 改訂は不要

### rationale

- **canonical schema 踏襲**: 不可侵原則 2 (= 既存 guard の意味は変えない) 整合。schema は既に sync guard で機械検証済 + AAG Pilot で landing 済の canonical。plan.md sketch は draft であり、**真の正本は schema** (= aag-platformization Pilot で landing 時に articulate 済)。schema 再設計は退行的
- **scope 候補 B 採用**: 候補 A (= 5 系統全 adoption) は単一 Phase が大きくなりすぎ、§13.1 二段 commit pattern が weight 過多 (= landing + wrap-up が両方とも複数 hours レビュー対象)。候補 B では Phase 2 = foundation、Phase 3 = 5 系統への systematic adoption + 分離、と役割分担が明確。Phase 3 の「Collector / Detector / Renderer 分離」は本来 5 系統への構造変更を含むため、DetectorResult adoption と同 phase で進める方が natural
- **既存 production guard 不変**: 不可侵原則 2 の strict adherence。既存 guard の violation 検出条件は **parity check できる状態** で残す (= demonstration detector は同じ C1 を emit、test で意味的 等価性 articulate)
- **物理配置**: `tools/architecture-health/src/` は engine readiness scope の中心 (= 親 project plan.md 不可侵原則 5 で「app-specific TS guard を engine 化対象に含めない」と明示、本 path は engine 化対象側)。`detectors/` subdirectory は Phase 3 で 5 系統 detector が並ぶ予定の物理配置 articulation
- **sync guard extension**: AagResponse / DetectorResult の TS ↔ schema 整合は **同じ sync guard で扱う方が duplication を避ける** (= 別 guard 新設は AAG-REQ-ANTI-DUPLICATION 違反候補)
- **plan.md 改訂不要**: plan.md の Phase 2 完了条件は文字通り解釈すると「5 系統 adoption」だが、context (= Phase 3 で 5 系統への systematic 構造変更が予定されている) を踏まえると「使用開始 = adoption 経路 articulation」と解釈する方が plan の責務分割と整合

### alternatives

- (a) **scope 候補 A (= 5 系統全 adoption を Phase 2 で完遂)**: 規模 ~10-15 file / ~500-800 line、§13.1 二段 commit 重量化、Phase 3 との責務 overlap、不採用
- (b) **scope 候補 C (= plan.md 改訂)**: Phase 2 / 3 の責務分割を update する判断 = plan.md 改訂を伴うので別判断 (= L3 で plan.md 改変は authority 軸 trigger)。本 candidate B では plan.md 表現を維持できるため不要、不採用
- (c) **canonical schema 再設計** (= plan.md sketch 通りに schema を修正): aag-platformization Pilot で landed 済の canonical contract を後続 project が再設計するのは退行的、不可侵原則 2 違反、不採用
- (d) **既存 production guard を直接置換** (= projectCompletionConsistencyGuard を pure detector に書き換える): 不可侵原則 2 違反 (= 既存 violation 検出条件を変える可能性)、規模も大きい、不採用。**parallel implementation** (= demonstration detector が既存 guard と並存) で代替

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `tools/architecture-health/src/detector-result.ts` が canonical schema (`docs/contracts/aag/detector-result.schema.json`) と structurally identical (= sync guard 3 新 test で機械検証)
2. `createDetectorResult` factory が field validation (= ruleId / detectionType / sourceFile / messageSeed が空文字なら throw、severity enum) を hard fail で enforce
3. `aggregateDetectorResults` の severity 集約が articulate (= gate / block-merge → fixNow=now、全件 warn → fixNow=debt)
4. `renderDetectorResultsAsJson` が deterministic ordering (= severity → ruleId → sourceFile)
5. demonstration detector (`detectProjectLifecycleViolations`) が **既存 production guard `projectCompletionConsistencyGuard` の C1 と意味的に等価** (= 同じ project に対して同じ violation 集合を emit、test で parity 検証)
6. 既存 production guard (`projectCompletionConsistencyGuard.test.ts`) は **変更されていない** (= git diff で `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` が touch されていない)
7. 既存 全 guard test PASS (= 992 test、新 detectorResultModuleGuard 20 test + 既存 aagContractSchemaSyncGuard 3 test 拡張で 989 → 992)

### Lineage

- **preJudgementCommit**: `2cc8fa9` (= Phase 1 wrap-up 後 regen commit、本 Phase 2 landing 直前の HEAD)
- **judgementCommit**: `75257d7` (= Phase 2 landing commit、DetectorResult TS implementation + 1 系統 demonstration + sync guard extension)
- **postJudgementRegenCommit**: `1949db8` (= §13.3 Pattern A application、project-structure.md generated section + 14 KPI/generated artifact sync)
- **retrospectiveCommit**: 本 Phase 2 wrap-up commit (= Lineage 実 sha update + 振り返り判定 articulate、SHA は git log で参照)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可、SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上、rollback target = preJudgementCommit `2cc8fa9` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `tools/architecture-health/src/detector-result.ts` の TS interface field set (= ruleId / detectionType / sourceFile / severity required + evidence / actual / baseline / messageSeed optional) が canonical schema と structurally identical (= aagContractSchemaSyncGuard 新 3 test で機械検証済)
  2. ✅ `createDetectorResult` factory validation hard fail (= ruleId / detectionType / sourceFile / messageSeed 空文字 throw、evidence 空文字 throw、severity enum、4 throw test + 1 frozen test PASS)
  3. ✅ `aggregateDetectorResults` severity 集約 articulate (= gate / block-merge → fixNow=now、全件 warn → fixNow=debt、3 test PASS)
  4. ✅ `renderDetectorResultsAsJson` deterministic ordering (= severity → ruleId → sourceFile、3 test PASS = sort + empty + indent)
  5. ✅ `detectProjectLifecycleViolations` が既存 `projectCompletionConsistencyGuard` の C1 と意味的に等価 (= 4 test PASS = completed-not-archived emit / in_progress 等は emit せず / 複数 violation all detect / 空 array で 0 件)
  6. ✅ 既存 production guard `projectCompletionConsistencyGuard.test.ts` は **変更されていない** (= git show 75257d7 --stat で対象 file が file list に存在しないことを確認、demonstration detector が parallel implementation として並存)
  7. ✅ 全 guard test PASS (= 147 file / 992 test、既存 969 + detectorResultModuleGuard 20 + aagContractSchemaSyncGuard 拡張 3)
- **学習**:
  - **plan.md は draft、canonical schema が真の正本という learning**: Phase 2 進入時に detector-result.schema.json が既存 forward-looking として landed されていることを発見 (= aag-platformization Pilot Phase 1 / A3 での deliverable)。plan.md の DetectorResult 構造 sketch は draft であり、canonical schema (= sync guard で機械検証済) を踏襲する判断が正しかった。後続 Phase でも plan.md sketch と canonical contract で差異がある場合は **canonical contract 優先** という pattern を articulate
  - **scope 候補 B (= Foundation + 1 系統 demonstration) の wisdom**: 候補 A (= 5 系統全 adoption) を Phase 2 単独で完遂すると ~10-15 file / ~500-800 line PR となり、§13.1 二段 commit pattern が weight 過多になる。候補 B では Phase 2 (= foundation 8 file / ~985 line) と Phase 3 (= 残り 4 系統 adoption + collector / detector / renderer 分離) で role を分担、各 Phase の commit pattern が natural なサイズで進行可能
  - **demonstration detector の parallel implementation pattern**: 既存 production guard を変更せず、新 detector を **同じ violation 経路** で parallel に articulate することで、不可侵原則 2 (= 既存 guard 意味不変) と Phase 2 完了条件 (= 5 系統で使用開始) を両立。後続 Phase 3 で他 4 系統に展開する際の base pattern として institutionalize
  - **guard test 新規追加の 3 経路 co-change**: 新 guard test file 追加には (a) guard-test-map.md 登録 (= ratchet-down baseline 維持) (b) project-structure.md generated section regen (= guards-files-list update) (c) KPI baseline 維持 (= 件数 advisory) の 3 経路 co-change が必要。これを landing commit (= guard-test-map manual + 新 file) + §13.3 regen commit (= project-structure.md generated section + KPI sync) の 2 commit に articulate するのが pattern。Phase 3 で 4 系統分の guard 追加が予定されているため、本 pattern を repeating template として後続適用

---

## DA-α-003: Phase 3 Collector / Detector / Renderer 分離 scope 判断 (= 4 系統 systematic adoption + layered model articulation)

### status

- 着手判断: **open** (Phase 3 landing commit articulate 中、Lineage 実 sha は wrap-up commit で update)
- 振り返り判定: **未** (= Phase 3 wrap-up commit で articulate 予定)

### context

Phase 2 で foundation (= DetectorResult TS implementation + evaluator helper の足場) +
1 系統 (= project lifecycle) demonstration を landing 済 (= DA-α-002 §decision)。
Phase 3 は plan.md で「Collector / Detector / Renderer 分離」と articulate されているが、
具体的な scope は以下 2 軸で判断必要:

1. **detector layer 拡張**: 残り 4 系統 (= archive manifest / doc registry / generated metadata / schema validation) を pure detector として articulate するか
2. **layered model 確立**: collector / detector / **evaluator** / renderer の 4 層を明示的に articulate するか (= plan.md は分離モデルとして mention するが、evaluator 層の reference implementation は未 landing)

Phase 6 (Pure Detector Extraction) は別 Phase で「Vitest や CLI に密着した guard
から pure detector を切り出す」と articulate (= production guard の **置換**)、
Phase 3 とは role が異なる:

- Phase 3 = 新 detector を **追加** (= parallel implementation、production guard 不変)
- Phase 6 = production guard 内部を **refactor** (= Vitest wrapper を thin 化)

### decision

以下を採用する:

1. **4 系統 systematic adoption**: 残り 4 系統 すべてに 1 violation rule の demonstration detector を新設
    - `archive-manifest-detector.ts` (= AR-ARCHIVE-MANIFEST-A2 = top-level required field 欠落)
    - `doc-registry-detector.ts` (= AR-DOC-REGISTRY-D1 = registered path が存在しない)
    - `generated-metadata-detector.ts` (= AR-GENERATED-METADATA-G2 = GENERATED marker / ISO timestamp 欠落)
    - `schema-validation-detector.ts` (= AR-SCHEMA-VALIDATION-PZ2 = level が 0〜4 範囲外)
2. **evaluator layer 確立**: `detector-result.ts` に `evaluateDetectorResults(results) → DetectorEvaluationSummary` を追加 (= pure function、severity 集計 + hardGatePass / mergeBlockPass 判定)
3. **layered model README**: `tools/architecture-health/src/detectors/README.md` を新設し、collector / detector / evaluator / renderer の 4 層を table + 設計原則で articulate
4. **既存 production guard を変更しない (= Phase 2 と同 pattern)**: 全 detector は parallel implementation、ruleId / sourceFile / severity は既存 guard と 1:1 整合
5. **renderer 分離 parity test**: 同じ `DetectorResult[]` から JSON / AagResponse / evaluator summary の 3 経路が独立して articulate されることを test で機械検証 (= 「renderer 変更で detector logic が変わらない」 plan.md 完了条件)
6. **新 test file は作らない**: Phase 2 で landing 済の `detectorResultModuleGuard.test.ts` に describe block を追加 (= 4 detector + evaluator + layered model parity の test)、guard-test-map 件数 20 → 46 に update

### rationale

- **4 系統 systematic adoption**: Phase 2 で 1 系統 demonstration を landing 済、pattern は institutionalize 済。Phase 3 で残り 4 系統に展開すると 5 系統 全 demonstration が揃い、Phase 6 (= production guard refactor) の base reference として機能する。各 detector は ~50-80 line + test ~80-150 line で controllable な規模
- **evaluator layer 確立**: plan.md Phase 3 分離モデル (= collector / detector / evaluator / renderer) のうち evaluator が unimplemented だった。`evaluateDetectorResults` を追加することで 4 層 layered model の reference implementation が完成、後続 Phase / engine 実装 project が pattern を継承可能
- **layered model README**: 4 層 model + 設計原則 + 5 detector 一覧 + 新 detector 追加手順 を 1 file に articulate することで、後続 detector 追加時の navigation cost を最小化。AAG-REQ-ANTI-DUPLICATION 整合 (= plan.md の分離 model articulate + README の reference implementation で reader が異なる)
- **既存 production guard 不変 (= 不可侵原則 2 strict adherence)**: Phase 2 で確立した parallel implementation pattern を継承。production guard は existing AagResponse 経路で動作継続、detector layer は engine 化対象として独立進化。Phase 6 で必要があれば production guard 内部から detector を呼ぶ refactor を別 program で行う
- **renderer 分離 parity test**: plan.md Phase 3 完了条件 「renderer 変更で detector logic が変わらない」 を **test 化** することで、layered model の構造的健全性を機械検証。既存 hand-wave articulation を test 化する pattern (= G8 整合 = 「気をつける」を mechanism に転化)
- **新 test file 不要**: 同 module の test を 1 file に集約することで、guard-test-map 登録 cost (= 1 entry update) と guardTestMapConsistencyGuard baseline cost (= 0 件追加) を最小化。test file 数増加は別の co-change 義務を生む (= projectStructureGuard / guardTestMapConsistencyGuard 等)

### alternatives

- (a) **Phase 3 = layered model README のみ + evaluator + 1 系統追加** (= scope 縮小): Phase 6 で 4 系統全部を refactor 形式で行う案。但し Phase 6 は production guard refactor (= 別 task class)、Phase 3 で demonstration detector を 5 系統揃えておくと Phase 6 の reference として有用、不採用
- (b) **Phase 3 = 既存 production guard 内部を refactor (= Phase 6 と統合)**: 単一 Phase で「Phase 3 + Phase 6」を完遂する案。但し production guard refactor は scope 大 (= violation rule 数 5 系統合計 ~40+ rule、production guard 全変更)、Phase 3 単独の wrap-up に収まらない、不採用
- (c) **layered model 文書化を CLAUDE.md / references/ に追加**: doc-registry / README index update が necessary (= §13.2 atomic update 増加コスト)。本 README は detectors/ directory 内に閉じる方が navigation 自然 (= directory 内 README は repo 慣習)、不採用
- (d) **新 test file を 5 個に分割** (= 1 detector につき 1 test file): test file 数増加で guard-test-map / projectStructureGuard 登録 cost が増加。同 module の test は同 file に集約する方が cohesion 高い、不採用

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. 4 detector file (= archive-manifest-detector / doc-registry-detector / generated-metadata-detector / schema-validation-detector) が `tools/architecture-health/src/detectors/` 配下に存在
2. 各 detector は pure function (= fs / glob 直接依存なし、引数 facts のみ参照) で articulate
3. `evaluateDetectorResults(results) → DetectorEvaluationSummary` が `detector-result.ts` に articulate、hardGatePass + mergeBlockPass + countBySeverity + countByRuleId を pure に compute
4. `tools/architecture-health/src/detectors/README.md` が 4 層 layered model + 5 detector 一覧 + 新 detector 追加手順 を articulate
5. layered model parity test (= 「同じ DetectorResult[] から JSON / AagResponse / evaluator summary が独立に articulate される」) が PASS
6. 既存 production guard (= projectCompletionConsistencyGuard / archiveV2SchemaGuard / docRegistryGuard / generatedFileEditGuard / projectizationPolicyGuard) は **変更されていない** (= git show <landing commit> --stat で対象 file 不在を確認)
7. 全 guard test PASS (= 147 file / +26 test from Phase 2 = 1018 test、46 detectorResultModuleGuard 全 PASS)
8. Phase 3 完了条件 (= plan.md): detector が fs / glob に直接依存しない箇所が増える / test wrapper と detection logic が分離される / renderer 変更で detector logic が変わらない の 3 件すべてが達成されている

### Lineage

- **preJudgementCommit**: `de62efc` (= Phase 2 fix 後 regen commit、本 Phase 3 landing 直前の HEAD)
- **judgementCommit**: 本 Phase 3 landing commit (= SHA は landing 直後 git log で確定 → wrap-up commit で本 entry に書き込み)
- **postJudgementRegenCommit**: 該当時 §13.3 適用 (= 新 detector file 追加で project-structure.md 変動なし、checkbox flip による project.checklist.* drift)
- **retrospectiveCommit**: 本 Phase 3 wrap-up commit
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可、SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上、rollback target = preJudgementCommit `de62efc` を SHA 直接参照)

### 振り返り判定

(= Phase 3 wrap-up commit で articulate 予定。観測点 1〜8 の達成状況 + 学習を後続 commit で update。)

---

> 後続 DA entry (DA-α-004 〜 007) は各 Phase landing commit 時に articulate 追加。
