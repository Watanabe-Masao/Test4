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

- 着手判断: **open** (Phase 1 landing commit articulate 中、Lineage 実 sha は wrap-up commit で update)
- 振り返り判定: **未** (= Phase 1 wrap-up commit で articulate 予定)

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
- **judgementCommit**: 本 Phase 1 landing commit (= SHA は landing 直後 git log で確定 → wrap-up commit で本 entry に書き込み)
- **postJudgementRegenCommit**: 該当時 §13.3 適用 (= checkbox flip による project.checklist.* KPI drift が検出されたら別 regen commit で sync)
- **retrospectiveCommit**: 本 Phase 1 wrap-up commit (= Lineage 実 sha update + 振り返り判定 articulate)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可、SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上、rollback target = preJudgementCommit `1c8ae86` を SHA 直接参照)

### 振り返り判定

(= Phase 1 wrap-up commit で articulate 予定。観測点 1〜5 の達成状況 + 学習を後続 commit で update。)

---

> 後続 DA entry (DA-α-002 〜 007) は各 Phase landing commit 時に articulate 追加。
