# decision-audit — reposteward-ai-ops-platform

> 役割: L3 重判断 institution (= drawer Pattern 1 application、複数 Phase に跨る判断の lineage articulation)。
>
> 規約: `references/05-aag-interface/protocols/complexity-policy.md` §3.4 + `references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1。
>
> **DA entry 構造** (= 各 entry が以下を articulate):
>
> 1. **5 軸** = status / context / decision / rationale / alternatives (= 標準 ADR 軸)
> 2. **観測点** = 判断後に true となるべき検証可能な observation 集合
> 3. **Lineage** = judgementCommit (= 実 sha、wrap-up commit で update) + preJudgementCommit (= judgement 直前の commit、rollback target) + (任意) retrospectiveCommit
> 4. **振り返り判定** = 正しい / 部分的 / 間違い + 学習 (= Phase 完遂時に articulate)
>
> **flow** (= §13.1 Phase landing + wrap-up 二段 commit pattern):
>
> - landing commit で entry を articulate (= 5 軸 + 観測点 + Lineage 仮 sha)
> - landing commit SHA 確定後、wrap-up commit で Lineage 実 sha update + 振り返り判定
> - 完遂後の archive 時に `archive.manifest.json` の `decisionEntries` (= id + title + commitSha) に圧縮される (= Archive v2)

## DA-α-000: 本 project の進行モデル決定

### status

- 着手判断: **active** (= 仮 sha 段階)
- 振り返り判定: **未確定**

### context

本 project は L3 governance-hardening (= projectization.md §2 判定理由)。`aag-engine-go-mvp` (2026-05-06 archive、AAG 6.0 institute、5 detector × 8 fixture = 40 parity 維持) の post-MVP 後継として、**validator から AI-first repo operations engine への phase shift** を 5 Wave / 23 step (= step 数は landing 時に articulate) で展開する。Phase 構成と判断点の articulate が必要であり、過去 program (= aag-platformization / aag-self-hosting-completion / aag-engine-readiness-refactor / aag-engine-go-mvp) で institute された AI judgement + retrospective + commit-bound rollback pattern を継承する。

### decision

進行モデルとして以下を採用:

1. **AI judgement + retrospective + commit-bound rollback** (= drawer Pattern 1 application)
2. **§13.1 Phase landing + wrap-up 二段 commit pattern** を全 Phase / Wave で適用 (= landing commit で DA articulate → SHA 確定後 wrap-up で Lineage 実 sha update)
3. **§13.2 Atomic dependent update commit pattern** を `references/` 配下新 doc 追加時に適用 (= doc + doc-registry.json + README.md を atomic commit)
4. **§13.3 Post-flip regen pattern** を checkbox flip を含む全 commit に適用 (= flip → docs:generate → commit を 1 step)
5. **Wave-by-wave delivery / 1 Wave 内も step 単位の独立 PR** (= plan.md 不可侵原則 7、肥大化抑止 + review 負荷分散 + rollback granularity 確保)

### rationale

- drawer Pattern 1 (= AI judgement + retrospective + commit-bound rollback) は AAG Pilot 以降の L3 program で institute 済 (= aag-platformization 8 DA / aag-self-hosting-completion / aag-engine-go-mvp 14+ DA)、本 program で再利用可能
- §13.1〜13.3 commit pattern は本 repo の commit lineage articulation の確立形 (= project-checklist-governance.md §13)
- Wave-by-wave + step 独立 PR は Go MVP archive で articulate された後続 program 候補 (= `aag-engine-real-repo-dispatch-impl` / `aag-engine-domain-coverage-extension` 等) を本 program に束ねる際の肥大化リスクを抑止する
- 不可侵原則 1〜8 (= JSON-first / AI-first / read-only first / 構造主検出 / DetectorResult-first / additive-only / Wave-by-wave / versionImpact declare) が本 program の方向性を articulate しており、進行モデル decision はこれと整合

### alternatives

- (a) **monolithic 1 PR でフル landing**: 却下。23+ step を 1 PR にすると review 不可能 + rollback granularity 喪失 + 不可侵原則 7 違反
- (b) **Wave 単位 PR (= 各 Wave を 1 PR)**: 却下。Wave 1 だけで 6 step あり、1 PR が肥大化する。step 独立 PR が安全
- (c) **DA articulate 不要 / sub-task-list 管理 only**: 却下。L3 + 複数 Phase + 不可侵原則を独自に持つため §3.4 で DA institute 必須

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. 全 Phase / Wave に対応する DA entry が `decision-audit.md` に articulate される (= Phase landing 時に追加)
2. 全 commit が landing commit + wrap-up commit の 2 段で構成される (= §13.1 適用)
3. 各 PR は単一 Wave 内の単一 step に限定され、scope creep が生じない (= 不可侵原則 7)
4. 全 generated artifact 更新が atomic commit で landing する (= §13.2/13.3 適用、checkbox flip と generated 同時更新)
5. archive 時に `archive.manifest.json` の `decisionEntries` に全 DA entry が圧縮される (= Archive v2)

### Lineage

- **preJudgementCommit**: `fc76849` (= Merge pull request #1259 from Watanabe-Masao/claude/aag-engine-go-mvp-Bk7Px、bootstrap 直前の最新 main commit)
- **judgementCommit**: `<TBD>` (= bootstrap landing commit SHA、wrap-up commit で update)
- **retrospectiveCommit**: `<TBD>` (= wrap-up commit SHA、振り返り判定 articulate 時に確定)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可なら SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上)

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-001: Project naming = `reposteward-detection-ops-platform` → `reposteward-ai-ops-platform`

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

bootstrap session 開始時、project ID は当初 `reposteward-detection-ops-platform` を想定して branch (`claude/reposteward-detection-ops-bootstrap-mqG14`) が切られた。直前の AI 提案 message でも `reposteward-detection-ops-platform` で articulate していた。しかし bootstrap 直前の user 提案で `reposteward-ai-ops-platform` への rename が articulate された。

### decision

projectId = `reposteward-ai-ops-platform` を採用する。branch 名 (`claude/reposteward-detection-ops-bootstrap-mqG14`) は **本 bootstrap 限定で名残として維持**、後続 PR の branch 命名は `claude/reposteward-ai-ops-platform-<slug>` パターンを採用する。

### rationale

- 本 program の本質は **detection** ではなく **AI が repo を安全に操作するための operations layer** (= AI_CONTEXT.md Purpose で articulate)
- `detection-ops` だと scope を「検出機構」に狭める示唆になり、Task Capsule (= 作業仕様書 surface) / repository cleanliness / repair-context generator / next action recommendation 等の **operations** 機能群と整合しない
- `ai-ops-platform` は AI session 全体を operating する platform という program の本質を articulate
- branch 名は historical artifact として維持しても scope 違反にはならない (= ハマりポイントとして HANDOFF.md §3.1 で articulate 済)

### alternatives

- (a) **`reposteward-detection-ops-platform` のまま維持**: 却下。本 program は detection 単体ではなく operations layer であり、命名が scope を狭める
- (b) **branch を切り直す**: 却下。bootstrap 開始済の branch を作り直すと既存 session-start hook (= pre-push 設置済) との整合が崩れる + commit graph が複雑化
- (c) **`reposteward-ops-platform` (= ai- 接頭辞なし)**: 却下。本 program の primary user は AI session であり、`ai-` を接頭辞で articulate することで AI-first 原則 (= 不可侵原則 2) を命名にも反映

### 観測点

1. `config/project.json#/projectId` = `reposteward-ai-ops-platform` で articulate される
2. `references/04-tracking/open-issues.md` の active projects 索引に `reposteward-ai-ops-platform` 行が追加される
3. 後続 PR の branch 命名が `claude/reposteward-ai-ops-platform-<slug>` パターンを採用する
4. branch 名 historical artifact (= `claude/reposteward-detection-ops-bootstrap-mqG14`) が HANDOFF.md §3.1 で documented されており、後続 session が混乱しない

### Lineage

- **preJudgementCommit**: `fc76849`
- **judgementCommit**: `<TBD>` (= bootstrap landing commit SHA)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-002: Wave 1 reordering — Task Capsule schema v1 + `reposteward task prepare` MVP を最先頭に prepend

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

bootstrap session 中、Wave 1 を当初以下 5 step で articulate する案を AI が提示した:

1. Detection Inventory v2
2. AAG Parameters v1
3. SourceFacts v1
4. effective LOC statistics
5. stats files query

この後、user から **AI Task Capsule** (= 作業目的 + 現在地 + 読むべき正本 + 触るべき file + 触ってはいけない範囲 + 関連 rule + 検証 command + 失敗時 repair policy を 1 JSON に束ねる operating layer) を Wave 1 最先頭に置く提案が articulate された。

user の rationale: stats files / rule locate / changed --explain は **個別の道具** だが、Task Capsule は **作業仕様書 surface** で、これが先にあると後続の全 command が AI-friendly に接続される。AI session の探索コスト最小化が本 program の primary goal であり、Task Capsule はその最も直接的な解。

### decision

Wave 1 を以下 6 step に再編成:

1. **Task Capsule schema v1** (= `docs/contracts/aag/task-capsule.schema.json` 単体の最小 PR)
2. **`reposteward task prepare` MVP** (= `aag-engine/internal/taskcapsule/`、最初の対象 project は `reposteward-ai-ops-platform` 自身 = self-dogfood)
3. **AAG Parameters v1** (= Task Capsule の constraints source として接続)
4. **SourceFacts v1** (= Task Capsule の facts source として接続)
5. **Effective LOC statistics**
6. **`reposteward stats files` query** (= Task Capsule v3 `--intent` の入力 backend)

Detection Inventory v2 は Wave 4 #18 (= preparatory doc work / 任意 / 並行) に降格、Wave 1 critical path から外す。

### rationale

- Task Capsule は **operating layer** であり、stats / rule locate / detector refs / changed --explain 等の個別 command を **束ねる上位 surface**。先に schema を articulate すれば後続 command 全てが Task Capsule 互換で設計される
- Task Capsule v1 schema は最小 (= taskId / projectId / repoHealth / currentState / goal / nonGoals / requiredReads / targetFiles / relatedCommands / expectedOutputs / repairPolicy) で landing 可能、後続 v2/v3 で `--changed-only` / `--intent` 等を additive 拡張
- self-dogfood (= 最初の対象 project = 本 program 自身) で feedback loop を確立、後続 PR で対象を拡張
- Detection Inventory v2 は cleanliness / comments rules (= Wave 4) の入力として完成すれば十分、Wave 1 critical path に置く必要なし
- 不可侵原則 7 (= Wave-by-wave delivery) と整合、step 数 5→6 でも step 独立 PR で肥大化しない

### alternatives

- (a) **Wave 1 を当初 5 step のまま維持**: 却下。stats files / rule locate を後で landing しても Task Capsule との接続を retroactive に articulate するコストが大きく、user の articulate (= AI のパフォーマンス最大化には Task Capsule が最も強い手) と矛盾
- (b) **Task Capsule を Wave 3 (= AI navigation MVP) に統合**: 却下。Wave 3 は where-am-i / context --project / changed --explain / rule locate / detector refs の 5 navigation を articulate しており、これら全てが Task Capsule の構成要素として再利用される設計。Task Capsule schema が Wave 3 より後だと subset の articulation が先行して整合性が崩れる
- (c) **Task Capsule を別 program に切り出す**: 却下。本 program の本質と最も整合する operating layer であり、別 program 化は scope 分断 + 探索コスト最小化 goal を希薄化

### 観測点

1. `plan.md` Phase 構造に Wave 1 = 6 step (= Task Capsule schema v1 → task prepare MVP → Parameters → SourceFacts → statistics → stats query) が articulate される
2. Wave 1 #1 (Task Capsule schema v1) の landing PR が **schema 単独** で landing され、`reposteward task prepare` 実装と分離される (= 不可侵原則 7)
3. Wave 1 #2 (`reposteward task prepare` MVP) の landing PR で self-dogfood (= 最初の対象 project = `reposteward-ai-ops-platform` 自身) が articulate され、出力が schema v1 valid
4. Detection Inventory v2 が Wave 4 #18 (= preparatory doc work) に articulate され、Wave 1 critical path から外れている
5. Task Capsule v3 (= `--intent` 対応) で SourceFacts + Parameters + stats query が再利用される設計が `plan.md` で articulate される

### Lineage

- **preJudgementCommit**: `fc76849`
- **judgementCommit**: `<TBD>` (= bootstrap landing commit SHA、本 reordering を含む)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD
