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

---

## DA-α-003: Wave 1 #1 着手判断 — Task Capsule schema v1 単体 PR で landing、Go 実装 / sync guard 登録は Wave 1 #2 に分離

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

bootstrap PR (#1260、commit 4ee6898 → main 2026-05-06 08:09 UTC merged) 直後、user から merge 確認 + Health PASS 確認 + 計画評価 (= 7 項目 strong) + 「次は Task Capsule schema v1 から着手でよいです」の green light が articulate された。AI 側は Wave 1 #1 PR scope を提案 (= schema 単体 + checklist Wave 1 section 初期化 + DA-α-003 articulate + docs:generate + test:guards、branch = `claude/reposteward-ai-ops-platform-task-capsule-schema-v1`、Go 実装 / sync guard 登録は Wave 1 #2 に分離) し、user から「よろしくお願いします」で承認。

### decision

Wave 1 #1 を以下 scope で landing:

1. 新規 1 file: `docs/contracts/aag/task-capsule.schema.json` (= JSON Schema draft-07、13 field、`additionalProperties: false`、`required = 12 field` (= intent 以外))
2. 既存 file 2 件 update: `checklist.md` (= Wave 1 section 初期化 + #1 ticked-out 項目)、`decision-audit.md` (= 本 entry articulate)
3. bootstrap 規約 byproduct: `cd app && npm run docs:generate` 反映 + `cd app && npm run test:guards` PASS 確認

**やらない**: Go implementation / `aagContractSchemaSyncGuard.test.ts` 登録 / `reposteward task prepare` MVP / stats query / SourceFacts / AAG Parameters / hard gate / Human UI (= user 提示 nonGoals 完全継承)。

**branch 命名**: `claude/reposteward-ai-ops-platform-task-capsule-schema-v1` (= DA-α-001 規約 = `claude/reposteward-ai-ops-platform-<slug>` パターン適用、bootstrap branch (= `claude/reposteward-detection-ops-bootstrap-mqG14`) は historical artifact として close)。

### rationale

- **schema 単体 PR で landing する理由**: schema は JSON contract = 言語非依存 = consumer / producer が無くても valid 化可能。Go 実装 / TS consumer 追加と同 PR にすると、schema design / Go type design / sync guard registration の 3 軸が同時に動き、scope creep + review 負荷増 + rollback granularity 喪失。schema 単体ならば「contract 形状の合意」のみが review 対象になり、後続 PR で producer / consumer / guard を順次 articulate できる
- **`aagContractSchemaSyncGuard.test.ts` 早期登録を skip する理由**: 同 guard は schema (`required` / `properties`) と TS interface field の 1:1 一致を機械検証する設計。本 PR 時点で TS / Go 双方の対応 type が無いため、登録すると guard が「schema あり TS interface なし = 一致不可能」で hard fail する。Wave 1 #2 で Go 側 `TaskCapsule` type 追加 + (任意で) TS 側 type 追加と同 PR で sync registration するのが正しい順序 (= 不可侵原則 7 = Wave-by-wave delivery)
- **`additionalProperties: false` 採用**: 既存 `aag-response.schema.json` + `detector-result.schema.json` と同 strictness。誤った field 追加を schema validation で即検出。`currentState` / `repoHealth` / `repairPolicy` / `intent` 内部の柔軟性は object 内 `additionalProperties: true` で確保 (= 2 段の strictness articulate)
- **`required = 12 field` (= intent 以外) 採用**: 各 dimension (= goal / nonGoals / requiredReads / targetFiles / relatedCommands / expectedOutputs / repairPolicy / repoHealth / currentState) を必ず articulate させることで「dimension 欠落による silent な capsule 不完全性」を schema 段階で防御。空 array / 空 object は許容 (= 物理的に該当無しのケース対応)、ただし producer (= Wave 1 #2 `reposteward task prepare`) は常時 articulate する責務 (= producer policy として後続 PR で articulate)
- **`schemaVersion: const "task-capsule-v1"` 採用**: AI session が消費可能 schema を identify する anchor。後続 v2 / v3 で minor バージョン bump 時に producer / consumer 側で容易に discriminate (= `versionImpact aag delta=+0.1 minor` の articulation 整合)
- **`taskId` / `projectId` の pattern**: AAG project id 規約 (= `references/05-aag-interface/operations/project-checklist-governance.md` §10 Step 2 = `<domain>-<action>` kebab-case 3〜5 語) と同 family、producer 側で existence 検証する責務

### alternatives

- (a) **Go 実装 + schema を同 PR で landing**: 却下。scope creep + review 負荷増 + sync guard 登録時の baseline 動きが schema design と同時に動くため判断不能
- (b) **schema を `aag-engine/contracts/` に置く** (= TS path から外す): 却下。既存 AAG schema (= `aag-response` / `detector-result`) は `docs/contracts/aag/` に集約済、本 schema も同 family として配置することで consumer / producer 双方が予測可能な location で発見可能 (= AI navigation 原則整合)
- (c) **`required` を最小化** (= schemaVersion / taskId / projectId / goal の 4 field のみ): 却下。dimension 欠落を許容すると capsule の operating layer としての安全境界 articulation 機能が失われる。本 program の primary goal (= AI session の探索コスト最小化 + 安全境界 articulation) と矛盾
- (d) **`schemaVersion` を `enum` で v1/v2/v3 全て articulate**: 却下。本 schema は v1 の articulate であり、v2 / v3 の forward-looking inclusion は YAGNI + producer / consumer の version discrimination が困難になる。v2 を作る時は別 schema file (= `task-capsule-v2.schema.json`) として articulate するのが既存 AAG version 管理 (= aag-metadata.json + AAG version family) と整合
- (e) **format 選定 = TOML / YAML**: 却下。不可侵原則 1 (= JSON-first) 違反

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `docs/contracts/aag/task-capsule.schema.json` が存在 + valid JSON で parse 可能
2. schema が `$schema = draft-07` / `$id = https://aag.local/schemas/task-capsule-v1.json` / `additionalProperties: false` / `required` 12 field articulate
3. 既存 AAG schema 規約と structurally consistent (= `aag-response.schema.json` / `detector-result.schema.json` と同 family、`$comment` で format 選定根拠 articulate)
4. `aagContractSchemaSyncGuard.test.ts` が新 schema に対して fail しない (= 同 guard は対象 schema を hard-code、本 schema は登録対象外 = noop)
5. `cd app && npm run test:guards` 全 PASS (= 1060+ test、新 schema 追加で既存 guard 1 件も落ちない)
6. `cd app && npm run docs:generate` 反映後、Health 60/60 OK / Hard Gate PASS 維持
7. checklist.md の Wave 1 #1 section が初期化され、本 PR landing で全 checkbox が [x]
8. branch `claude/reposteward-ai-ops-platform-task-capsule-schema-v1` に push 成功 (= pre-push 5 段 PASS)
9. Wave 1 #2 (`reposteward task prepare` MVP) の着手 PR で本 schema を Go 側 `TaskCapsule` type と同期させる sync guard 登録が実行可能 (= 本 schema が producer 側の reference として機能)

### Lineage

- **preJudgementCommit**: `4cee7f6` (= bootstrap PR #1260 main merge 後の HEAD)
- **judgementCommit**: `<TBD>` (= Wave 1 #1 landing commit SHA、wrap-up commit で update)
- **retrospectiveCommit**: `<TBD>` (= wrap-up commit SHA、振り返り判定 articulate 時に確定)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可なら SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上)

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-004: Wave 1 #2 着手判断 — `reposteward task prepare` MVP の Go 実装、TS sync guard 拡張は skip して Go-side parity test で代替

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 1 #1 (Task Capsule schema v1) が `claude/reposteward-ai-ops-platform-task-capsule-schema-v1` branch で landing 済 (= remote push 完了、commit d3370e0)。本 session 中 user から「1を作業をつづけて完遂させましょう」(= Wave 全完遂モード) directive。Wave 1 #2 = `reposteward task prepare` MVP として、Wave 1 #1 schema を consume する Go 実装を Wave 1 #1 branch から stacked branch (= `claude/reposteward-ai-ops-platform-task-prepare-mvp`) で展開する。

### decision

Wave 1 #2 を以下 scope で landing:

1. 新規 3 file: `aag-engine/internal/taskcapsule/task_capsule.go` (= struct + enum + RequiredFields + AllJSONFields + Validate)、`prepare.go` (= Prepare function + helpers + slugify + MarshalJSON with SetEscapeHTML(false))、`task_capsule_test.go` (= schema parity + Validate + slugify + Prepare self-dogfood)
2. 既存 file 2 件 update: `aag-engine/cmd/aag/main.go` (= `task` subcommand + `prepare` action dispatch)、`main_test.go` (= 6 test 追加: no action / unknown action / missing --project / self-dogfood / unexpected positional / nonexistent project)
3. 既存 file 2 件 update: `projects/active/reposteward-ai-ops-platform/checklist.md` (= Wave 1 #2 section)、`decision-audit.md` (= 本 entry)
4. bootstrap 規約 byproduct: `cd app && npm run docs:generate` + `npm run test:guards` PASS 確認、`go test ./...` PASS 確認

**やらない (= 不可侵原則 + nonGoals 継承)**:
- TypeScript interface for TaskCapsule の追加 (= TS consumer 不在、AI session が直接 JSON を消費する)
- `aagContractSchemaSyncGuard.test.ts` 拡張 (= 同 guard は TS interface ↔ schema 一致を検証する設計、TS interface 不在のため適用不能、Go-side parity test で代替)
- Wave 1 #3 以降の機能 (= AAG Parameters / SourceFacts / Effective LOC / stats query)
- hard gate 化 (= read-only first 原則、advisory のみ)
- Human UI / browser dashboard

### rationale

- **Go 単独実装 + Go-side parity test で正しい理由**: 既存 `aag-engine/internal/contract/detector_result.go` は TS interface (`tools/architecture-health/src/detector-result.ts`) と並行して存在し、両側を `aagContractSchemaSyncGuard.test.ts` (TS) + `detector_result_test.go` (Go) の **2 系統 sync test** で守っている。本 task-capsule は Wave 1 段階で TS consumer を持たない (= AI session が aag CLI 出力 JSON を直接消費)、TS interface を speculative に追加するのは YAGNI + 不可侵原則 6 (= additive-only) に対しても余分な surface 追加。Go-side parity test で `task_capsule_test.go::TestSchemaSync_*` 4 種が schema $id / required / properties / struct tag を機械検証するため、schema drift は Go 側 test で確実に検出される
- **`SetEscapeHTML(false)` 採用**: Go の json.Marshal default は `&`, `<`, `>` を `\uXXXX` escape する (= HTML safe)。AI session が消費する JSON で shell command 文字列 (= `cd app && ...`) が `&&` になると読了性が著しく低下し、不可侵原則 2 (= AI-first) と矛盾。functionally valid JSON は parser 互換だが、可読性は AI session の primary value
- **Validate() で nil collection を hard fail**: schema は dimension 欠落を許容しないが、Go の zero-value (= nil slice / nil map) は JSON で `null` に marshal される。null と空 array / 空 object は schema 上区別される。Validate() で nil を error にすることで「dimension 欠落 = silent error」を防ぐ。producer (= Prepare) は常に空 slice / 空 map を articulate する
- **Prepare の入力**: `--project` のみ required、`--intent` / `--task` は optional。`--task` 不在時は `--intent` から slug 生成、両方不在時は `<projectID>-task` fallback。シンプルかつ predictable
- **architecture-health.json / project-health.json 不在時の挙動**: error にせず `hardGate=unknown` / `projectStatus=unknown` で gracefully degrade。理由: capsule 自体は依然 valid であり、producer の責務は「現時点の articulate された facts を渡す」こと。fail-stop すると AI session が capsule を取得できず、操作 layer 全体が機能停止する
- **stacked branch (= `claude/reposteward-ai-ops-platform-task-prepare-mvp` from #1 branch)**: Wave 1 #1 が main 未 merge のため、main から派生すると schema file が不在で Go test が fail する。stacked branch にすることで #1 が merge されるまでの review window でも #2 が独立に検証可能

### alternatives

- (a) **TS interface + sync guard 拡張も同 PR で実施**: 却下。TS consumer がまだ存在しない段階で speculative interface を追加するのは YAGNI、scope creep
- (b) **Go-side test を skip し TS sync guard だけで守る**: 却下。本 PR は Go 単独実装、TS sync guard は TS interface と schema を比較する設計で Go と schema の比較は対象外、parity 守れない
- (c) **task subcommand の代わりに新 subcommand `prepare` を top-level で追加**: 却下。Wave 5 で task validate / task close / task repair-context が articulate される予定で、`task` namespace に集約するのが命名整合
- (d) **stacked branch にせず main から派生**: 却下。Wave 1 #1 main 未 merge により schema 不在で Go parity test fail
- (e) **Validate() を omit + JSON Schema validator で検証**: 却下。Go binding 自体に value-level invariant を articulate することで、producer (Prepare) bug が静的に検出可能、deps 追加なし

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `aag-engine/internal/taskcapsule/` 配下 3 file が存在 + `go vet ./...` clean
2. `go test ./internal/taskcapsule/...` 全 PASS (= 13 test、schema parity 4 件 + Validate 4 件 + Prepare 5 件)
3. `go test ./cmd/aag/...` 全 PASS (= 既存 + 新規 6 test)
4. `aag task prepare --repo <root> --project reposteward-ai-ops-platform --intent "..."` 実行で stdout に valid TaskCapsule v1 JSON が出力される (= schemaVersion / projectId / nonGoals / repairPolicy / repoHealth が正しく articulate)
5. JSON 出力で `&` / `<` / `>` が literal のまま (= SetEscapeHTML(false) 効果)
6. `aag task prepare` で --project 不在 / 不正 project / 不正 positional の各 error path が ExitError (2) を返す
7. 既存 `aag validate / fixtures / shadow` subcommand に regression なし (= 既存 test 全 PASS)
8. `cd app && npm run test:guards` 1060 PASS 維持 (= TS guard は Go 追加で影響なし)
9. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
10. branch `claude/reposteward-ai-ops-platform-task-prepare-mvp` に push 成功 (= pre-push 5 段 PASS)

### Lineage

- **preJudgementCommit**: `d3370e0` (= Wave 1 #1 branch HEAD、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 1 #2 landing commit SHA)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-005: Wave 1 #3 着手判断 — AAG Parameters v1 (= effective LOC bucket / metric pinning / 除外 kinds) を schema 単独 + initial JSON で landing、collector / consumer 配線は #4 / #5 に分離

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 1 #2 (= `reposteward task prepare` MVP) push 中、Wave 全完遂モード (= user directive「1を作業をつづけて完遂させましょう」) 継続。本 step は Task Capsule の `currentState` / Wave 1 #4 SourceFacts collector / Wave 1 #5 Effective LOC statistics / Wave 1 #6 stats files query が共通参照する parameter 正本を articulate する。

### decision

Wave 1 #3 を以下 scope で landing:

1. 新規 1 file: `docs/contracts/aag/aag-parameters.schema.json` (= JSON Schema draft-07、top-level `additionalProperties: false`、`required = [schemaVersion, codeSize]`、`codeSize.metric: const "effectiveCodeLines"`、`codeSize.buckets` array of {id, label, min, max}、`codeSize.excludedKinds` enum array)
2. 新規 1 file: `aag/parameters/aag-parameters.json` (= schema 準拠、14 bucket 連続 articulate = 1-10 / 11-20 / 21-30 / 31-40 / 41-50 / 51-60 / 61-70 / 71-80 / 81-90 / 91-100 / 101-150 / 151-200 / 201-300 / 301+、`excludedKinds: [generated, fixture, archive]`)
3. 既存 file 2 件 update: `checklist.md` (= Wave 1 #3 section)、`decision-audit.md` (= 本 entry)
4. bootstrap 規約 byproduct: `cd app && npm run docs:generate` + `npm run test:guards` PASS 確認、Ajv で parameters が schema 準拠を確認

**やらない (= 不可侵原則 + nonGoals 継承)**:
- Collector 配線 (= `tools/architecture-health/src/facts/source-facts.ts` 等で本 parameters を実際に消費する layer は Wave 1 #4 で landing)
- Health KPI への bucket distribution 反映 (= Wave 1 #5 で landing)
- Stats query CLI (= Wave 1 #6 で landing)
- TS Reader 追加 (= consumer 不在のため YAGNI、Wave 1 #4 collector が必要時に追加)
- Sync guard 拡張 (= consumer / producer 確立後に Wave 後段で検討)

### rationale

- **schema + initial JSON の単独 landing が正しい理由**: parameters は consumer multiple (= SourceFacts collector / Health KPI / stats query / Wave 2 sizeGuard) で参照される共通 reference。consumer 配線と同 PR にすると、各 consumer が依存する parameter shape を一度に決める必要があり、scope creep + review 負荷増。schema + initial JSON の単独 landing なら「parameter shape 合意」のみが review 対象、後続 PR で各 consumer が順次追加 articulate
- **`codeSize.metric: const "effectiveCodeLines"` で v1 articulate**: 単一 metric pinning。v2 で複数 metric (= physicalLines / commentDensity / hookDensity 等) を articulate する場合は const → enum に拡張 (= versionImpact aag delta=+0.1 minor 整合)。speculative に enum 化すると producer / consumer が空 metric path を articulate せざるを得ず、不可侵原則 6 (= additive-only) 整合
- **14 bucket 採用**: user 提案 (= reposteward-ai-ops-platform plan.md §Wave 1 articulate) を full 採用。1-10 / 11-20 / 21-30 / 31-40 / 41-50 / 51-60 / 61-70 / 71-80 / 81-90 / 91-100 で 10 単位、101-150 / 151-200 / 201-300 で 50 単位、301+ で上限なし。code size の典型的 distribution (= short helper を 0-30 で articulate、medium-long を 50-200、outlier を 200+) を articulate するのに十分な resolution
- **`max: null` の articulation**: schema 上 `["integer", "null"]` で nullable 化。null = 上限なし (= 例: `loc.301_plus` の max=null)。`integer` 単独だと最終 bucket の上限を articulate できず、最大値 (= MaxInt 等) で逃げる approach は intent が articulate されない
- **bucket 連続性は producer 責務**: schema は articulation 形式のみ articulate (= AI vocabulary binding 哲学整合: schema は形を articulate、内容妥当性は人間判断)。連続性 guard を schema に articulate すると JSON Schema の expressiveness 限界を超える (= forall i, buckets[i].max + 1 == buckets[i+1].min は articulate 不能)。本 PR では Ajv 検証 + 手動連続性 check で articulate
- **`excludedKinds: enum [generated, fixture, archive]` で 3 enum 限定**: v1 で十分。v2 で `vendor` / `dependency` 等の追加候補だが speculative 化は YAGNI
- **`$comment` を schema properties に articulate**: top-level `additionalProperties: false` のため、parameters JSON の `$comment` は schema 側で許容必要。JSON Schema 業界 idiom (= `$comment` field は data instance でも documentation 用途で articulate 可) 整合
- **配置先 `aag/parameters/`**: 既存 `aag/_internal/` (= AAG framework 内部 articulation)、`aag/CHANGELOG.md` (= AAG framework version 履歴) と同 family。`docs/contracts/` は schema 専用、`references/` は人間 read 文書、`aag-engine/` は Go binary。parameters はそのいずれにも合致しない category のため、`aag/parameters/` を新設 (= AAG framework の可変設定 articulation の専用 dir)

### alternatives

- (a) **`aag/parameters/aag-parameters.json` を `docs/contracts/aag/` に置く**: 却下。`docs/contracts/` は schema 専用 dir、parameters (= data instance) は別 dir が適切
- (b) **`metric` を enum で複数 articulate**: 却下。speculative。v2 で necessary になった時点で minor bump
- (c) **bucket 配列を schema に articulate (= max 14 enum)**: 却下。bucket 数は producer の articulate 自由度であり、enum 化すると拡張性が損なわれる
- (d) **`max` を `integer` で MaxInt 採用**: 却下。intent が articulate されない、null による上限なし articulation が schema-friendly
- (e) **collector + parameters を同 PR で landing**: 却下。scope creep、配線レイヤを後続 PR に分離した方が rollback granularity 高い
- (f) **Wave 1 #4 SourceFacts と同 PR**: 却下。SourceFacts は producer (= TS collector) 単独で消費可能 / parameters は consumer multiple で参照、責任分離を明確化するため 2 step に分離

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `docs/contracts/aag/aag-parameters.schema.json` が存在 + valid JSON
2. `aag/parameters/aag-parameters.json` が存在 + valid JSON
3. parameters が schema を Ajv (draft-07) で PASS
4. 14 bucket 連続性 (= 隣接の min/max gap なし、最終 max=null) が articulate
5. schema $id = `https://aag.local/schemas/aag-parameters-v1.json`、$schema = draft-07、既存 AAG schema 規約整合
6. parameters の `$comment` 含めて schema 準拠 (= schema properties に `$comment` articulate)
7. `cd app && npm run test:guards` 1060 PASS 維持 (= TS guard は新 file 追加で影響なし)
8. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
9. branch `claude/reposteward-ai-ops-platform-aag-parameters-v1` に push 成功 (= pre-push 5 段 PASS、Wave 1 #2 branch から派生)
10. Wave 1 #4 SourceFacts collector が本 parameters を import 経路で参照可能 (= path / file existence の articulation 完成)

### Lineage

- **preJudgementCommit**: `9bb8fef` (= Wave 1 #2 landing commit SHA、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 1 #3 landing commit SHA)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-006: Wave 1 #4 着手判断 — SourceFacts v1 collector + 初期 generated artifact、docs:generate 統合は #5 に分離

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 1 #3 (= AAG Parameters v1) push 中、Wave 全完遂モード継続。本 step は Wave 1 #3 で articulate された `codeSize.metric=effectiveCodeLines` / `codeSize.excludedKinds=[generated,fixture,archive]` を実際に消費する **collector layer**。Wave 1 #5 Effective LOC statistics + Wave 1 #6 stats files query が本 facts を入力に集計 / query する base。

### decision

Wave 1 #4 を以下 scope で landing:

1. 新規 1 schema: `docs/contracts/aag/source-facts.schema.json` (= JSON Schema draft-07、bundle level (= schemaVersion + generatedAt + summary + facts[]) + SourceFact definition with `additionalProperties: false`)
2. 新規 2 ts file: `tools/architecture-health/src/facts/source-facts.ts` (= 約 290 行 collector、type 定義 + walkDir + factForFile + comment counting + TS/TSX/Go enrichment)、`source-facts-cli.ts` (= aag-parameters.json から excludedKinds を読み collector 実行 + `references/04-tracking/generated/source-facts.json` 書き出し)
3. 新規 1 test: `app/src/test/tools/sourceFactsCollector.test.ts` (= 12 件 contract test、temp dir fixture 経由で kind / layer / TS imports/exports / TSX hooks / Go imports/exports / MD / excludedKinds 3 種 / comment counting / sort / skip dirs を機械検証)
4. 新規 1 generated artifact: `references/04-tracking/generated/source-facts.json` (= 2710 file scan 結果、tsx 351 / typescript 1955 / markdown 358 / json 23 / go 23、Ajv schema 準拠検証済)
5. 既存 file 2 件 update: `checklist.md` (= Wave 1 #4 section)、`decision-audit.md` (= 本 entry)
6. byproduct: `cd app && npm run docs:generate` + `npm run test:guards` PASS 確認、初期 collector run

**やらない (= 不可侵原則 + nonGoals 継承)**:
- `docs:generate` pipeline への collector 統合 (= Wave 1 #5 = Effective LOC statistics で health collector に格上げ予定、本 PR では手動 / npm script 経由で執行)
- Wave 1 #5 以降の機能 (= statistics / stats query)
- TS interface ↔ schema sync guard 拡張 (= Wave 後段で consumer 確立後)
- imports/exports/hooks の AST-level 厳密 articulation (= regex-based MVP、十分実用的、誤検出は accept する範囲)
- generated artifact が機械生成された anchor metadata (= generatedFileEditGuard 対象化) を articulate (= 同 guard は specific generated section 規約用、source-facts.json は新規 generated として articulate される)

### rationale

- **schema + collector + test + 初期 artifact を 1 PR で landing**: Wave 1 #4 は collector layer を新設する step。schema 単独で landing して collector を別 PR にすると schema が orphan になり Wave 1 #5 まで価値を提供できない。collector + test + 初期 artifact まで 1 step で揃えることで「facts が事実上 query 可能」状態を最短で articulate
- **`docs:generate` 統合を Wave 1 #5 に分離**: 同 pipeline は health 系 KPI 収集の正本 + KPI render 経路、source-facts.json を加える際は health collector / renderer も articulate される必要がある。Wave 1 #5 は statistics layer も同 PR で articulate するため、pipeline 統合は同 step で実施する方が rollback granularity 高い
- **regex-based imports/exports/hooks 抽出**: AST-level 厳密 parsing (= TypeScript compiler API / babel) は collector 起動時間を秒単位に伸ばし、Wave 1 #5 statistics の集計時間にも影響。MVP では regex-based で 350ms scan / 2710 file 達成、十分実用的。AST 必要時は Wave 後段で additive に追加可能
- **comment counting の hand-rolled state machine**: TypeScript の `// line` + `/* block */` + `/** jsdoc */` を line-level に articulate するのに既存 lib (= comment-parser) を導入するのは依存追加コスト > 価値。約 30 行の state machine で十分なため hand-roll
- **`excludedKinds` の path-based filtering**: `generated` = `/generated/`, `fixture` = `/fixtures/` or `*.fixture.*`, `archive` = `projects/completed/` or `references/99-archive/`。AAG Parameters の意味と整合、producer (= collector) が articulate して consumer (= statistics / query) は filter 結果のみ参照
- **layer 推定の depth-2 articulate**: `app/src/features/<name>` のように 2 段で articulate。features の case-by-case 比較が Wave 1 #5 statistics で必要なため。他 layer は depth-1 で十分
- **temp dir fixture for unit test**: `mkdtempSync` で隔離、real repo を walk しない。test は collector の **contract** (= 入力 → 出力 mapping) に focus、real repo の現状値に依存しない
- **2710 file scan / 350ms**: Health budget 整合 (= ci.timing budget は別 KPI、本 collector は手動実行 / Wave 1 #5 で health pipeline 化時に integration test で計測)

### alternatives

- (a) **AST-based parsing (= TypeScript compiler API)**: 却下。MVP には overkill、起動時間 / dependency 増、regex-based で十分
- (b) **collector 単独 PR + 初期 artifact 別 PR**: 却下。schema が orphan になり、artifact が無いと Wave 1 #5 が consume できない、unnecessarily fine-grained
- (c) **`docs:generate` 統合を本 PR で実施**: 却下。pipeline の articulate は statistics layer (= Wave 1 #5) と同 PR の方が natural
- (d) **`source-facts.json` を git tracked にしない (= generated artifact を ignore)**: 却下。Wave 1 #5 の入力として参照、PR review でも数値が見えるべき。既存 generated artifact (= architecture-health.json 等) と同じ tracked 方針
- (e) **excludedKinds を hard-code (= parameters file 読まない)**: 却下。AAG Parameters の存在意義 (= 可変設定の articulation、3 origin = JSON 一本化) が損なわれる、parameters file から読むべき
- (f) **Markdown / JSON も imports/exports/hooks を articulate**: 却下。MD/JSON は import 概念がない (= MD link / JSON value は別 semantic)、speculative inclusion は YAGNI
- (g) **layer を full path で articulate (= 'app/src/presentation' 等)**: 却下。consumer (= statistics / query) は短い articulate を望む、`presentation` で十分

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `tools/architecture-health/src/facts/source-facts.ts` + `source-facts-cli.ts` 存在 + TypeScript build clean
2. `docs/contracts/aag/source-facts.schema.json` 存在 + valid JSON
3. `references/04-tracking/generated/source-facts.json` 存在 + 2710 file scan 結果 + Ajv で schema 準拠
4. `app/src/test/tools/sourceFactsCollector.test.ts` 12 test 全 PASS
5. `cd app && npm run test:guards` 1072 test PASS (= 既存 1060 + 新 12)
6. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
7. collector が aag-parameters.json の `codeSize.excludedKinds` を読み、generated / fixture / archive 配下を skip
8. SourceFact の `effectiveCodeLines = physicalLines - blankLines - commentLines` identity が全 fact で成立
9. TS imports は `import { x } from 'y'` / `import 'y'` 両 pattern を articulate (= 抽出 string は module path)
10. TSX hooks は `useState` / `useEffect` / `useMemo` 等 10 種を articulate (= 0 件は omit)
11. branch `claude/reposteward-ai-ops-platform-source-facts-v1` に push 成功 (= Wave 1 #3 から派生 stacked、pre-push 5 段 PASS)

### Lineage

- **preJudgementCommit**: `3cea2e7` (= Wave 1 #3 landing commit SHA、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 1 #4 landing commit SHA)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-007: Wave 1 #5 着手判断 — Effective LOC Statistics 集計 + 初期 generated artifact、Health KPI 統合は別 PR に分離

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 1 #4 (= SourceFacts v1 collector + 2710 file 初期 artifact) push 中、Wave 全完遂モード継続。本 step は Wave 1 #4 SourceFacts を入力に **bucket distribution + percentile + per-layer breakdown** を集計する **statistics layer**。Wave 1 #6 stats files query が本 statistics の bucket id 経由で file-level 詳細に到達、Wave 2 sizeGuard refactor が本 statistics で baseline / ratchet-down の base を articulate。

### decision

Wave 1 #5 を以下 scope で landing:

1. 新規 1 schema: `docs/contracts/aag/aag-size-statistics.schema.json` (= JSON Schema draft-07、`schemaVersion: const "aag-size-statistics-v1"`、summary 7 field (= p50/p75/p90/p95/p99/max/mean) + byBucket array + byLayer open object)
2. 新規 2 ts file: `tools/architecture-health/src/facts/source-facts-statistics.ts` (= computeSizeStatistics + computeSummary + computeBucketDistribution + computeLayerStatistics + percentile linear interpolation + floor)、`source-facts-statistics-cli.ts` (= source-facts.json + aag-parameters.json 読込 + 集計 + JSON 書き出し)
3. 新規 1 test: `app/src/test/tools/sourceFactsStatistics.test.ts` (= 10 件 contract test = 空入力 / 単一値 / percentile floor / bucket boundary inclusive / layer null 除外 / parameters 順序保持 / mean float / 等)
4. 新規 1 generated artifact: `references/04-tracking/generated/aag-size-statistics.json` (= 2714 file 集計、p50=80 / p90=249 / p95=330 / p99=626 / max=1606 / mean=115.15、14 bucket distribution、26 layer)
5. update: `tools/architecture-health/src/facts/source-facts.ts` (= `app/src/features/<name>` layer 推定 edge case 修正 = features 直下 file (README 等) を features/<name> にしない、segments.length > 4 条件)
6. update: `app/src/test/tools/sourceFactsCollector.test.ts` (= 上記 edge case の test 追加)
7. update: `references/04-tracking/generated/source-facts.json` (= edge case 修正後の再生成、layer 集合が clean)
8. update: `checklist.md` + `decision-audit.md`
9. byproduct: `cd app && npm run docs:generate` + `npm run test:guards` PASS 確認

**やらない (= 不可侵原則 + nonGoals 継承)**:
- Health KPI 3 件 (= `code.size.effectiveLoc.p90/p95/max`) の architecture-health pipeline 統合 → 別 PR で `tools/architecture-health/src/main.ts` に collector 配線 + `config/health-rules.ts` に rule 追加 + 各 renderer に項目追加 (= scope 大、本 PR では skip)
- Wave 1 #6 以降の機能 (= stats files query、Wave 2 sizeGuard refactor)
- bucket 連続性 / overlap の machine-verified guard 化 (= producer 責務、Wave 1 #3 articulate 整合)

### rationale

- **statistics 集計層を Health KPI 統合と分離する理由**: KPI 統合は main.ts collector 配線 + config/health-rules.ts rule 追加 + renderer 修正 + section-updater 修正 など 4-5 file 跨ぎになり、Wave 1 #5 の primary value (= effectiveCodeLines が計測可能 + bucket distribution が articulate) を超える scope creep。statistics generation 単独で「effectiveCodeLines が計測できる + bucket 分布が出る」は完全達成、KPI 統合は後続 PR で additive 配線
- **percentile を linear interpolation + floor**: 一般的な percentile algorithm の一つ (= NumPy default = linear)、半端 percentile (= idx が integer でない場合) は近接 2 値の linear blend、結果は floor で integer に articulate (= 行数 = 整数 semantic)。Wave 2 sizeGuard が percentile baseline (= 例: p95 を上限 = 330 行) を articulate する場合、integer baseline が natural
- **bucket boundary inclusive**: aag-parameters.json の bucket は `{ min, max }` で inclusive 両端 articulate (= max=10 は loc.001_010 に含まれる)、boundary value が複数 bucket に articulate されることを防ぐため最初に match した bucket で停止
- **layer null 除外**: source-facts.ts が layer 推定不能と articulate した file (= app/src/main.tsx 等の root レベル) は byLayer 集計対象外。layer-aware breakdown は articulate された layer のみ articulate
- **mean は float、percentile は integer**: mean = 算術平均は半端値が物理意味を持つ (= 1.5 行は articulate 可能 = 平均値)、percentile は行数の概念で integer。schema は型を区別 articulate (= summary.mean は number、その他は integer)
- **edge case fix (features/README.md)**: 初期実装で `app/src/features/README.md` が `features/README.md` という layer に articulate されていた (= length=4 の condition error)。length > 4 に修正することで、features/ 直下 file は単純に `features` layer になり、`features/<module>` (= length>=5) のみが module-level articulate

### alternatives

- (a) **percentile を nearest neighbor (interpolation なし)**: 却下。多 sample size での jitter が大きい、linear interpolation の方が percentile semantics 整合
- (b) **percentile を float でも返す**: 却下。consumer (= sizeGuard baseline) は integer line count を articulate、float は articulate 不要
- (c) **boundary を exclusive / inclusive で articulate**: 却下。aag-parameters.json は inclusive で articulate (= `min=11, max=20` は 11〜20 を articulate)、producer 整合
- (d) **layer null を 'unknown' layer として集約**: 却下。null は intent (= layer 不明) であり、unknown という偽の layer name で articulate するのは意味整合性損失
- (e) **Health KPI 統合を本 PR で実施**: 却下。pipeline 跨ぎ scope creep、main.ts / config / renderer 全 4-5 file 修正、本 step の primary value (= statistics 計算 + bucket articulate) と分離した方が rollback granularity 高い
- (f) **mean を articulate しない (= percentile only)**: 却下。mean は size distribution の skew 把握に有用、producer / consumer の articulate コスト低い
- (g) **edge case (features/README) を別 PR で fix**: 却下。本 PR で statistics を生成する際に layer 集合が clean でないと artifact が dirty、同 PR で fix する方が natural

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `tools/architecture-health/src/facts/source-facts-statistics.ts` + cli + schema 存在 + valid JSON
2. `references/04-tracking/generated/aag-size-statistics.json` 存在 + Ajv で schema 準拠 = STATISTICS_VALID
3. `app/src/test/tools/sourceFactsStatistics.test.ts` 10 test 全 PASS
4. `cd app && npm run test:guards` 1082 test PASS (= 既存 1072 + 新 10)
5. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
6. statistics の summary.mean は float、その他 (p50/p75/p90/p95/p99/max) は integer
7. byBucket は aag-parameters.json `codeSize.buckets` と同 ordering / 件数、各 bucket count は ≥ 0
8. byLayer は layer null を除外、26 layer (= aag-engine / app / application / docs / domain / features / features/<13>{budget,...,weather} / infrastructure / presentation / projects / references / stories / test / tools) を articulate
9. features/README.md は layer=features (= length=4 condition fix)、features/budget/foo.ts は layer=features/budget (= length>=5)
10. branch `claude/reposteward-ai-ops-platform-effective-loc-stats` に push 成功 (= Wave 1 #4 から派生 stacked、pre-push 5 段 PASS)

### Lineage

- **preJudgementCommit**: `551c550` (= Wave 1 #4 landing commit SHA、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 1 #5 landing commit SHA)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-008: Wave 1 #6 着手判断 — `aag stats files` query CLI、Go-side schema mirror で SourceFacts / Statistics / Parameters を read-only に集約

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 1 #5 (= Effective LOC Statistics 集計 + 初期 generated artifact) push 完了通知後、Wave 1 final step。本 step は Wave 1 #3 Parameters + Wave 1 #4 SourceFacts + Wave 1 #5 Statistics 三層を AI session が直接 query 可能な形で articulate する **operating CLI**。Task Capsule (= Wave 1 #2) と共に「AI が search なしで file 詳細に到達」状態を完成。

### decision

Wave 1 #6 を以下 scope で landing:

1. 新規 1 Go package: `aag-engine/internal/stats/stats.go` (= QueryInput / QueryOutput / FileEntry types + Query() function + parseRange / resolveBucket / resolvePercentileThreshold + MarshalJSON with SetEscapeHTML(false))
2. 新規 1 Go test: `aag-engine/internal/stats/stats_test.go` (= 14 unit test = parseRange valid/empty/malformed + empty input + unsupported metric + real repo no filter / range / bucket / unbounded / unknown / layer / above / unknown percentile / limit / sort order + MarshalJSON HTML escape)
3. update: `aag-engine/cmd/aag/main.go` (= `stats` subcommand + `files` action dispatch + import internal/stats + usage 拡張)
4. update: `aag-engine/cmd/aag/main_test.go` (= 8 CLI level test = no action / unknown action / no filter / range / bucket / malformed range / unexpected positional / etc.)
5. update: `checklist.md` + `decision-audit.md`
6. byproduct: `cd app && npm run docs:generate` + `npm run test:guards` PASS 確認

**やらない (= 不可侵原則 + nonGoals 継承)**:
- Wave 2 sizeGuard refactor (= effectiveCodeLines への切替 + baseline / ratchet-down 設計、独立 PR scope)
- AI navigation MVP (Wave 3) / Cleanliness rules (Wave 4) / Premise・Repair (Wave 5)
- Health KPI 統合 (= Wave 1 #5 で deferred、別 PR で main.ts collector 配線時に同 PR で実施候補)
- query result の caching (= file size 数千 file で 350ms scan、cache 不要)

### rationale

- **Go-side schema mirror で 3 input を articulate**: `SourceFact` / `SourceFactsBundle` / `SizeStatisticsBundle` / `ParameterBucket` / `aagParameters` を Go struct で articulate。TS-side schema (= source-facts.schema.json + aag-size-statistics.schema.json + aag-parameters.schema.json) と structural identical。Wave 1 #2 task_capsule.go と同 mirror pattern 整合
- **schemaVersion validation**: query 時に source-facts.json の `schemaVersion=source-facts-v1` + aag-size-statistics.json の `schemaVersion=aag-size-statistics-v1` を check。schema bump 時に query が silent に誤動作しない
- **filter compose**: `--range` / `--bucket` / `--layer` / `--above` を 4 軸独立 articulate、AND 結合。bucket 解決 / percentile 解決は必要時のみ別 file 読込み (= --bucket 不在時は parameters file 不要 = robust)
- **sort order: effectiveCodeLines DESC + path ASC tie-break**: outlier 探索が primary use case (= Wave 1 #6 spec 「stats files --range 21..30 で 21〜30 行の file を抽出」)、降順が natural。tie 時は path ASC で reproducibility 確保
- **--limit cap with totalMatched articulate**: AI consumer が「全体の何件中何件が cap された」を articulate 可能。output に `totalMatched` + `returned` 両方 articulate
- **HTML escape disabled**: Wave 1 #2 task prepare と同 idiom (= `&` / `<` / `>` literal articulate、AI consumer 読了性)
- **percentile lookup from generated artifact**: `--above p95` 入力時に aag-size-statistics.json から `summary.p95` を lookup (= recompute せず、既存 generated を re-use)。consumer が statistics regeneration 必要時は `npx tsx ...source-facts-statistics-cli.ts` を hint に articulate
- **bucket lookup from parameters**: `--bucket loc.021_030` 入力時に aag-parameters.json `codeSize.buckets` から min/max を resolve。unknown bucket → known list を error message に articulate
- **read-only な実 file 走査 unit test**: real repo を Go test 内で参照 (= existing detector_result_test.go pattern 継承)、generated artifact が存在する前提。CI で source-facts / statistics 不在時は test fail (= Wave 1 #4 / #5 の generated artifact が tracked = 常時存在)

### alternatives

- (a) **TS-side で query CLI 実装**: 却下。AI session が aag binary 経由で navigate する設計 (= Wave 1 #2 と同 surface)、Go-side に stats query を articulate する方が surface 整合
- (b) **filter を OR 結合**: 却下。AND 結合の方が AI session の意図 (= 「presentation 層の 21〜30 行 file」のような複合 query) を articulate
- (c) **--bucket を直接 min/max で articulate (= --min / --max flag)**: 却下。aag-parameters.json で articulate された bucket id をそのまま参照する方が consumer (= AI session) の articulation コストが低い、bucket 名が anchor として機能
- (d) **schemaVersion validation skip**: 却下。Wave 後段で schema bump 時に silent 誤動作するリスク、Wave 1 段階で hard fail を articulate しておくのが将来安全
- (e) **percentile recompute (= statistics 不要)**: 却下。Query 時に毎回 recompute は wasteful、generated artifact を re-use する方が JSON-first / read-only 整合
- (f) **JSON output format alternative (= TSV / Markdown table)**: 却下。AI consumer が消費する surface は JSON のみ (= 不可侵原則 1)、Human UI 向 format は別 step (= 必要時に articulate)

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `aag-engine/internal/stats/` 配下 2 file 存在 + go vet clean
2. `go test ./internal/stats/...` 14 test PASS
3. `go test ./cmd/aag/...` 8 stats CLI test 含む全 test PASS
4. `aag stats files --repo <root> --bucket loc.301_plus --limit 5` 実行で valid stats-files-query-v1 JSON が stdout に出力 (= totalMatched 件数 + top 5 file articulate)
5. JSON 出力で `&` literal (= SetEscapeHTML(false) 効果)
6. 各 filter (range / bucket / layer / above) が独立に correct な subset を articulate
7. unknown bucket / unknown percentile / malformed range が ExitError (2) を返す
8. sort order: effectiveCodeLines DESC + path ASC tie-break が articulate
9. `cd app && npm run test:guards` 1082 PASS 維持 (= TS guard は Go 追加で影響なし)
10. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
11. branch `claude/reposteward-ai-ops-platform-stats-files-query` に push 成功 (= Wave 1 #5 から派生 stacked、pre-push 5 段 PASS)
12. **Wave 1 全完遂 (= 6/6 step landed)**

### Lineage

- **preJudgementCommit**: `6f15a79` (= Wave 1 #5 landing commit SHA、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 1 #6 landing commit SHA、Wave 1 final)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-009: Wave 2 #7 着手判断 — sizeGuard を effective LOC 化、metric swap のみで threshold 維持、baseline tightening は分離

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 1 全 6 step 完遂 push 後、user directive「続けましょう」で Wave 2 (= 既存 guard の歪み修正) 入。本 step は plan.md §Wave 2 #7 = `app/src/test/guards/sizeGuard.test.ts` を raw line count から effective LOC に切替えることで「コメント追加が size penalty にならない」状態を articulate する。

### decision

Wave 2 #7 を以下 scope で landing:

1. update: `app/src/test/guardTestHelpers.ts` に `effectiveCodeLineCount(content)` helper を export 追加 (= line-based filter で blank + isCommentLine() 除外、既存 `stripComments` と同 idiom)
2. update: `app/src/test/guards/sizeGuard.test.ts` 6 site で `content.split('\n').length` → `effectiveCodeLineCount(content)` に swap (= AR-G5-HOOK-LINES / AR-G6-COMPONENT / Tier 2 / AR-G5-INFRA-LINES / AR-G5-DOMAIN-LINES / AR-G5-USECASE-LINES)
3. update: `checklist.md` + `decision-audit.md`
4. byproduct: `cd app && npm run docs:generate` + `npm run test:guards` PASS 確認

**threshold (300 / 400 / 600 / 660) は不変**:
- effective ≤ physical の identity により新規 violation 0 を保証
- 新規 hard gate / 新 baseline 設定 = 0 (= 不可侵原則 6 = additive-only 整合)

**やらない (= 不可侵原則 + 別 step に分離)**:
- baseline tightening (= effective LOC 値に基づく threshold 切下げ + ratchet-down): 別 step (Wave 2.1 candidate) で実施。理由: 切替と threshold tuning を同 PR にすると baseline 動きが metric semantics 変更と同時に動き、判断不能
- `app/src/test/audits/architectureStateAudit.test.ts` の raw line count 修正: Wave 2 #8 PR で実施 (= scope 分離)
- Health report の bucket distribution table 追加: Wave 2 #9 PR で実施
- source-facts.ts の state machine と guardTestHelpers の line-based filter の comment counting 統一: 後続 step で検討 (= MVP では effective ≤ physical identity を保つ範囲で両 algorithm が valid)

### rationale

- **metric swap のみで safe**: effective ≤ physical の identity は数学的に成立 (= 任意の content について effective(content) ≤ physical(content))。既存 threshold (= raw line count に対して設定) を維持すれば、effective に切替えても violation 数は **必ず減るか変わらない**、増えない。Wave 2 #7 PR は guarantee 付きで safe
- **`effectiveCodeLineCount` helper を guardTestHelpers に置く理由**: 既存 `stripComments` / `isCommentLine` と同 idiom。tools/architecture-health/src/facts/source-facts.ts の collector 側 (= state machine) と algorithm が異なる (= line-based vs state machine) が、両者とも `physical - blank - comment` という意味的 effective を articulate するため、両 algorithm の coexistence は意図的 (= guard test の偽陽性 zero、collector の精度高め、責務 articulate)
- **threshold 維持で「コメント penalty なし」articulate**: Wave 2 #7 の primary value は「コメント / 空行追加が size guard の violation を増やさない」状態を articulate すること。metric swap だけでこの value が full に articulate される、threshold tuning は別 step
- **stacked branch (= claude/reposteward-ai-ops-platform-size-guard-effective-loc from Wave 1 #6)**: Wave 1 全 PR が main 未 merge のため、Wave 1 #6 branch から派生。Wave 1 全 merge → Wave 2 PR rebase / merge の順序で operate
- **violation message の variable 名 `lineCount` 維持**: 内部変数の semantic は metric swap で変わるが、test 出力 (= "X 行 (上限: Y)") は articulate 上不変、metric semantics の articulation は本 DA + commit message + helper docstring で articulate 済

### alternatives

- (a) **threshold も同 PR で tighten (= effective LOC に基づく新 baseline)**: 却下。baseline 動きが metric 変更と同時に動き判断不能、scope creep、rollback granularity 喪失
- (b) **collector 側の `countCommentLines` を guardTestHelpers に統一 import**: 却下。source-facts.ts は collector 内部 helper として articulate (= 非 export)、export 化は collector の internal API 変更で別 scope。両 algorithm の coexistence は本 PR では accept、後続 step で検討
- (c) **`effectiveCodeLineCount` を tools/architecture-health/src/facts/source-facts.ts に置く + guardTestHelpers から import**: 却下。app/src/test/ → tools/ への依存方向は既存 guard で実例あり (= source-facts test 等) だが、本 helper は guard test 専用 (= production code には使わない) のため guardTestHelpers が natural location
- (d) **`lineCount` 変数を `effectiveLines` に rename**: 却下。diff size 増、test 振る舞い不変、metric semantics は helper docstring + commit + DA で articulate 済
- (e) **metric swap を Wave 1 #5 statistics 同 PR で landing**: 却下。Wave 1 #5 は statistics 集計 layer の articulate、Wave 2 #7 は existing guard の metric swap、責任分離 (= 不可侵原則 7 = Wave-by-wave delivery 整合)

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `effectiveCodeLineCount(content)` が `guardTestHelpers.ts` に export として存在
2. `sizeGuard.test.ts` の `content.split('\n').length` 6 site が全て `effectiveCodeLineCount(content)` に swap (= grep verification)
3. `sizeGuard.test.ts` 11 test 全 PASS (= 既存 violation 数不変 / 増加無し)
4. `cd app && npm run test:guards` 1082 test PASS (= 全 guard regression なし)
5. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
6. Health 前回比が `Flat` または `Improved` (= effective LOC 化により tighter measurement、悪化方向ではない)
7. threshold 値 (300 / 400 / 600 / 660) が `architectureRules.ts` で不変
8. branch `claude/reposteward-ai-ops-platform-size-guard-effective-loc` に push 成功 (= Wave 1 #6 から派生 stacked、pre-push 5 段 PASS)
9. Wave 2 #8 (architectureStateAudit) / #9 (Health bucket distribution) は本 PR scope 外、別 PR で landing

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 1 #6 final commit SHA、format-fix commit、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 2 #7 landing commit SHA)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-010: Wave 2 #8 着手判断 — architectureStateAudit を effective LOC 化、Wave 2 #7 helper を再利用

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 2 #7 (= sizeGuard.test.ts effective LOC 化) push 後、Wave 2 #8 = `architectureStateAudit.test.ts` で同 metric 切替を articulate する step。本 audit は「違反を止める」のではなく「状態を観測し数値化する」役割 (= 構造状態の正本)。bridge inventory + complexity hotspot 2 site で raw line count を articulate しており、Wave 2 #7 の effective LOC 化と整合させる。

### decision

Wave 2 #8 を以下 scope で landing:

1. update: `app/src/test/audits/architectureStateAudit.test.ts` で `effectiveCodeLineCount` を import (= Wave 2 #7 で landing 済 helper)
2. update: 同 file で 2 site を effective LOC に swap (= bridge inventory line 115 + complexity hotspot line 141)
3. update: `checklist.md` + `decision-audit.md`
4. byproduct: `cd app && npm run docs:generate` + `npm run test:guards` PASS 確認

**やらない (= 不可侵原則 + nonGoals 継承)**:
- audit 側 threshold 変更 (= 本 audit は state 観測のみ、threshold articulate せず)
- bridge file inventory の filter 条件変更 (= `Bridge.ts` 名前 + dual-run 痕跡 articulate 維持)
- complexity hotspot の articulate 数 (= `memoCount + stateCount >= 4` threshold) 変更
- 他 site の line count 利用 (= line 89 の `lines.length` は re-export 検出用、size measure ではないため対象外)

### rationale

- **Wave 2 #7 helper を再利用**: 同 codebase の effective LOC 計算を 2 箇所で重複 articulate する必要なし、import で接続することで algorithm 一貫性を guarantee
- **audit は articulate 対象、guard は enforce 対象**: state audit は markdown report に line count を articulate するのみ (= violation 判定なし)。effective LOC に切替えても enforce 結果は変わらず、articulate 数値が tighter になるだけ
- **2 site とも swap**: bridge inventory + complexity hotspot 両者 effective LOC に articulate 整合 = audit 出力 markdown table の line count 数値が一貫
- **line 89 の `lines.length` は対象外**: re-export pattern 検出用 (= 5 line 以下 + re-export only かを判定)、size measure ではない。`split` 直後の length を pattern 検査の guard として articulate しており、effective LOC 化すると意味が変わるため不変

### alternatives

- (a) **Wave 2 #7 と同 PR で実施**: 却下。Wave 2 #7 は guard (= enforce)、Wave 2 #8 は audit (= articulate) で責務異なる、scope 分離 (= 不可侵原則 7) で rollback granularity 確保
- (b) **audit 側で別 helper を articulate (= guard helper を import しない)**: 却下。algorithm 重複 + 一貫性 risk、import が natural
- (c) **line 89 も swap**: 却下。site の semantics が異なる (= size measure ではない)、不要
- (d) **bridge inventory の lines field を effectiveLines に rename**: 却下。diff size 増、外部 articulate (= markdown table 出力) 不変、metric semantics は commit + DA で articulate 済

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `architectureStateAudit.test.ts` の bridge inventory + complexity hotspot 2 site が effective LOC に swap (= grep verification)
2. `effectiveCodeLineCount` を import で接続 (= Wave 2 #7 helper 再利用)
3. line 89 の `lines.length` (= re-export pattern 検出) は不変
4. audit 11 test 全 PASS
5. `cd app && npm run test:guards` 1082 test PASS (= 全 guard regression なし)
6. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
7. branch `claude/reposteward-ai-ops-platform-state-audit-effective-loc` に push 成功 (= Wave 2 #7 から派生 stacked、pre-push 5 段 PASS)

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 2 #7 landing commit SHA、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 2 #8 landing commit SHA)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-011: Wave 2 #9 着手判断 — Health bucket distribution を Approach B (独立 generated MD) で landing、既存 health report touch なし

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 2 #7 + #8 完了後、Wave 2 final step = Health report に bucket distribution table を articulate する step。plan.md §Wave 2 #9 spec は「`references/04-tracking/generated/architecture-health.generated.md` に bucket distribution table 追加」。実装 approach は 2 通り考えられる:

- **Approach A**: 既存 `architecture-health.generated.md` の md-renderer.ts を拡張して bucket distribution section を articulate
- **Approach B**: 独立 generated artifact `aag-size-statistics.generated.md` を新設、Wave 1 #5 で landing 済 `aag-size-statistics.json` を入力に rendering

### decision

**Approach B を採用**:

1. 新規: `tools/architecture-health/src/facts/source-facts-statistics-md.ts` (= renderStatisticsMarkdown 関数、Summary + Bucket Distribution + By Layer の 3 section articulate)
2. update: `source-facts-statistics-cli.ts` (= MD 出力経路追加、JSON と並行で MD 書き出し)
3. 新規 generated: `references/04-tracking/generated/aag-size-statistics.generated.md` (= 2714 file 集計、Summary + Bucket Distribution + By Layer table、生成 timestamp + 関連 query 言及)
4. update: `checklist.md` + `decision-audit.md`

**やらない (= Approach A 棄却 + nonGoals 継承)**:
- 既存 `architecture-health.generated.md` への section 追加 (= md-renderer.ts 拡張)
- md-renderer.ts への新 section 統合 (= section-updater.ts も touch する必要あり、scope 拡大)
- architecture-health.json KPI への bucket distribution 統合 (= Wave 1 #5 で deferred 済、別 PR 候補)

### rationale

- **Approach B (独立 generated MD) が正しい理由**:
  - **blast radius 最小**: 既存 `md-renderer.ts` / `section-updater.ts` / `architecture-health.generated.md` を一切 touch しない。既存 health report の generation pipeline は不変
  - **Wave 1 #5 の単独成果物として完成**: 既に存在する `aag-size-statistics.json` を消費する MD view layer を追加するだけ。JSON が canonical, MD が view という layering は健全 (= 不可侵原則 1 = JSON-first 整合)
  - **CLI 一発で再生成可能**: `source-facts-statistics-cli.ts` を実行すると JSON + MD 両方が atomic に再生成される。既存 docs:generate pipeline と独立で実行可能
  - **rollback granularity 高**: Approach B の rollback は 3 file 削除のみ、Approach A は md-renderer.ts の section 削除 + section-updater 再構成が必要
- **Approach A 棄却理由**:
  - md-renderer.ts に 26 layer × 6 metric の table を articulate するには renderer の拡張 + section-updater の anchor 追加が必要 (= 4-5 file 跨ぎ scope)
  - architecture-health.generated.md は health KPI の primary report、bucket distribution は size 専用 view = 責務混在の risk
  - 既存 health pipeline を touch すると Health 値が drift する可能性、現在 Healthy / Hard Gate PASS の良好状態を維持する方が safe
- **`renderStatisticsMarkdown` の 3 section 構成**: Summary (= 全 file p50-p99/max/mean) + Bucket Distribution (= 14 bucket × file count + ratio + 累積) + By Layer (= 26 layer × p50/p90/p95/max)。AI consumer が outlier 探索 (= bucket / layer / percentile) で entry point とする 3 軸全 articulate
- **Bucket Distribution の `比率 + 累積` 列**: AI consumer が「`50% 以下が 71 行未満`」のような shape を一目で articulate 可能、Wave 1 #6 stats files query との接続が natural

### alternatives

- (a) **Approach A (既存 health report に統合)**: 却下 (上記 §rationale)
- (b) **Bucket Distribution + By Layer を別 MD file で articulate**: 却下。3 section を 1 MD で articulate する方が AI consumer の navigation コスト低い、cumulatively articulate された方が context 把握しやすい
- (c) **MD output を CLI が選択 (= --md flag)**: 却下。CLI 単純化、JSON と MD を atomic に生成する idiom (= 一貫性 guarantee)
- (d) **MD output を docs:generate pipeline に統合**: 却下。Wave 1 #5 で deferred 済 (= main.ts collector 配線 scope 大)、本 PR は MD layer 追加のみ
- (e) **`generated.md` suffix 不採用**: 却下。既存 generated artifact 命名規約 (= `architecture-health.generated.md` / `project-health.generated.md` etc.) と整合させる、`generated` suffix で「機械生成 = 手編集禁止」を articulate

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. `source-facts-statistics-md.ts` 存在 + TypeScript build clean
2. `source-facts-statistics-cli.ts` が JSON + MD 両方を atomic に書き出す
3. `references/04-tracking/generated/aag-size-statistics.generated.md` 存在 + 3 section (= Summary + Bucket Distribution + By Layer) 含む
4. MD で 14 bucket distribution + 26 layer 全 articulate
5. 比率 + 累積 が 100% に達する (= 全 file が articulate されている)
6. 既存 `architecture-health.generated.md` / `md-renderer.ts` / `section-updater.ts` は touch なし (= git diff verification)
7. `cd app && npm run test:guards` 1082 test PASS (= 全 guard regression なし)
8. `cd app && npm run docs:generate` 反映後 Health 60/60 OK / Hard Gate PASS 維持
9. branch `claude/reposteward-ai-ops-platform-size-statistics-md` に push 成功 (= Wave 2 #8 から派生 stacked、pre-push 5 段 PASS)
10. **Wave 2 全完遂 (= 3/3 step landed = #7 + #8 + #9)**

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 2 #8 landing commit SHA、本 PR の派生元)
- **judgementCommit**: `<TBD>` (= Wave 2 #9 landing commit SHA、Wave 2 final)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-012: Wave 3 #10 着手判断 — `aag where-am-i`、active dir lookup を projectId 解決の正本とする

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 2 完遂後、user directive「3を完遂させてください」で Wave 3 (= AI navigation MVP) 入口。本 step は AI session bootstrap 時の現在地確認 command。branch 名 + activeProject + repoHealth + openObligations + 推奨 next command を 1 JSON で articulate。

### decision

Wave 3 #10 を以下 scope で landing:

1. 新規: `aag-engine/internal/navigation/whereami.go` (= WhereAmI() function + DeriveActiveProjectFromActiveDirs + recommendNextCommand + MarshalJSON shared helper、package navigation 新設)
2. 新規: `whereami_test.go` (= 7 test)
3. update: `cmd/aag/main.go` (= where-am-i subcommand 追加 + import navigation)
4. update: `main_test.go` (= 2 CLI test)
5. update: `checklist.md` + `decision-audit.md`

**projectId 解決方針**: 「branch 名から regex 抽出」を棄却、`projects/active/<id>/` directory に対する **longest prefix match** を正本とする。理由: `claude/foo-bar-extension` で projectId が `foo-bar` か `foo-bar-extens` か `foo-bar-extension` かは branch 名単独からは決定不能、active dir の存在のみが確定的 source。test 段階で同 ambiguity を踏んだため早期に design decision として articulate。

**openObligations source**: architecture-health.json `kpis[id=docs.obligation.violations].value` から articulate。

### rationale

- **active dir lookup を正本**: regex-based 抽出は ambiguous (= projectId と slug の境界が branch 名単独で決まらない)、active dir lookup は確定的
- **recommendNextCommand 3 path**: openObligations > 0 → fix command / activeProject 有 → context command / 無 → stats query。AI session の bootstrap path を 3 軸に articulate
- **`navigation` package を新設**: Wave 3 #11〜#14 で同 package に context / changed / rule / detector を順次 landing する設計、最初に MarshalJSON shared helper も articulate

### alternatives

- (a) regex fallback も articulate: 却下 (= ambiguity を残す、test 段階で踏んだ)
- (b) `where-am-i` を `task prepare` の subset として実装: 却下 (= responsibility 違い、where-am-i は global state、task prepare は project-specific capsule)
- (c) `recommendedNextCommand` を articulate しない: 却下 (= AI session の操作 layer として next action の articulate は core value)

### 観測点

1. `internal/navigation/whereami.go` + test 存在 + go vet clean
2. `go test ./internal/navigation/...` 全 PASS
3. real repo dogfood で valid where-am-i-v1 JSON、activeProject 正しく articulate
4. recommendedNextCommand が openObligations / activeProject に応じて articulate
5. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
6. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 2 #9 final landing commit SHA、本 PR 派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-013: Wave 3 #11 着手判断 — `aag context --project`、checklist.md parsing で nextActions を articulate、AI 自己レビュー / 最終レビュー section は skip

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 3 #10 (= where-am-i) push 後、Wave 3 #11 = light-weight project context bootstrap command。Task Capsule (Wave 1 #2) の subset (= constraints + requiredReads + nextActions のみ) を articulate、Task Capsule をフル生成しない場合の simplified entry point。

### decision

1. 新規: `internal/navigation/context.go` (= Context() + readUncheckedChecklistItems + readContextProjectConfig)
2. 新規: `context_test.go` (= 6 contract test)
3. update: `cmd/aag/main.go` (= context subcommand + --project required + --max-next-actions optional)
4. update: `main_test.go` (= 3 CLI test)
5. update: `checklist` + `decision-audit` (= 本 entry)

**checklist parsing 仕様**: `- [ ] ` / `* [ ] ` line → unchecked item articulate。`## AI 自己レビュー` / `## 最終レビュー` section の checkbox は skip (= 終了直前の儀式、現在の next action ではない)。

### rationale

- **Task Capsule の subset として articulate**: 本 command は AI session が「fast browse」で project を articulate するための entry。Task Capsule は full operating capsule (= goal / repoHealth / repairPolicy 等) を articulate するが、 navigation phase では constraints + reads + nextActions の 3 軸で十分
- **AI 自己レビュー / 最終レビュー section skip**: これら section は project 完了直前の儀式 checkbox で、Wave 着手中の next action とは responsibility 違い
- **`--max-next-actions` flag**: AI consumer が「最初の N 件のみ」articulate したい場合の cap、default 5
- **navigation package を Wave 3 #10 と共有**: MarshalJSON / shared types を一箇所に articulate、helper 重複回避

### alternatives

- (a) AI_CONTEXT.md の "Read Order" section を parse: 却下 (= markdown parse 複雑、5 file fixed list で十分)
- (b) plan.md の "やってはいけないこと" section から constraints articulate: 却下 (= config の nonGoals が canonical、parsing redundancy 回避)
- (c) AI 自己レビュー / 最終レビュー も nextActions に含める: 却下 (= 終了直前の儀式、Wave 着手中の next action ではない)
- (d) Task Capsule の full output を返す: 却下 (= responsibility 違い、Wave 1 #2 で実装済)

### 観測点

1. `internal/navigation/context.go` + test 存在 + go vet clean
2. `go test ./internal/navigation/...` 全 PASS
3. real repo dogfood で title + 5 requiredReads + 11 constraints + 1+ nextActions articulate
4. AI 自己レビュー section の checkbox が nextActions に articulate されていない
5. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
6. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 3 #10 commit、派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-014: Wave 3 #12 着手判断 — `aag changed --explain`、obligation map の Go-side mirror subset (= core 11 rule)

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 3 #11 (= context --project) push 後、Wave 3 #12 = changed-explain command。git diff <base>..<head> の changed file を path prefix で classify、TS-side OBLIGATION_MAP の subset と PATH_TO_REQUIRED_READS の subset を Go-side で mirror して articulate。

### decision

1. 新規: `internal/navigation/changed.go` (= Changed() + areaRules 30 件 + obligationRules 11 件 + requiredReadsByPrefix 10 prefix)
2. 新規: `changed_test.go` (= 6 contract test)
3. update: `cmd/aag/main.go` (= changed subcommand + --base / --head / --explain / --repo)
4. update: `main_test.go` (= 2 CLI test)
5. update: `checklist` + `decision-audit` (= 本 entry)

**obligation rules subset 採用**: TS-side 18 rule をすべて mirror する代わりに、AI session が即値で articulate したい core 11 rule を Go-side で articulate。残りは Wave 後段で必要時に追加 (= YAGNI 整合)。

### rationale

- **Go-side embed map で mirror**: TS-side OBLIGATION_MAP を Go から動的 read するのは parse 複雑、embed map で十分実用的。TS-side が canonical、Go-side は subset mirror、責務 articulate
- **areaRules 30 件**: repo の典型的 directory 構造を articulate (= app/src/test/guards/ 〜 .github/workflows/ 〜 wasm/)。priority order で longest prefix match を articulate
- **--explain flag は default true**: AI consumer は常に explanation 必要、--explain=false の non-explanation mode は YAGNI、MVP では default true
- **PATH_TO_REQUIRED_READS の subset**: 10 prefix で AI session の typical workflow をカバー、完全 mirror は不要

### alternatives

- (a) TS-side OBLIGATION_MAP を JSON 経由で Go から読む: 却下 (= 既存 articulate 経路なし、parse 複雑、embed で十分)
- (b) すべての 18 rule を mirror: 却下 (= YAGNI、core 11 で AI session の primary need カバー)
- (c) --explain=false で raw changed file list のみ出力: 却下 (= JSON-first surface としては明示的に explanation 含む方が AI consumer-friendly、command 名が `changed --explain` なので explanation always articulate)
- (d) 'other' area を出さない (= filter): 却下 (= AI consumer は articulate されない area を articulate されたくない、明示的に "other" として articulate する方が信号として有用)

### 観測点

1. `internal/navigation/changed.go` + test 存在 + go vet clean
2. `go test ./internal/navigation/...` 全 PASS
3. real repo dogfood で changed file 一覧 + area 分類 + obligation match + required reads が articulate
4. obligation match で `obligation.guard.health` / `obligation.aag-engine.gotest` / `obligation.project.checklist-format` が core path で fire
5. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
6. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 3 #11 commit、派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-015: Wave 3 #13 着手判断 — `aag rule locate <ruleId>`、merged-architecture-rules.json + grep で guard reference articulate

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 3 #12 (= changed --explain) 後、Wave 3 #13 = ruleId から rule の definition / guards / docs / thresholds を locate する command。merged-architecture-rules.json (= 172 rule registry) を入力に、grep で guard ファイル参照を articulate。

### decision

1. 新規: `internal/navigation/rule.go` (= RuleLocate() + loadMergedRules + findGuardsReferencingRule + suggestSimilarRuleIds)
2. 新規: `rule_test.go` (= 5 contract test)
3. update: `cmd/aag/main.go` (= rule subcommand + locate action)
4. update: `main_test.go` (= 5 CLI test)
5. update: `checklist` + `decision-audit` (= 本 entry)

**flag 規約**: `aag rule locate --repo PATH <ruleId>` のように **flag は ruleId の前に articulate**。Go 標準 flag library 制約 (= flag.Parse は最初の positional で停止)。usage に明記。

### rationale

- **merged-architecture-rules.json を canonical input**: 既存 generated artifact、172 rule の単一 source of truth。Go-side で再 parse 不要 (= TS-side が canonical、Go-side は consumer)
- **grep ベースの guard reference**: ruleId 文字列を `app/src/test/guards/` + `app/src/test/audits/` 配下で grep。simple かつ implicit な reference (= `getRuleById('XXX')` 等) を articulate
- **definition path hardcode**: `app-domain/gross-profit/rule-catalog/base-rules.ts` (= CLAUDE.md articulate の canonical)。動的 lookup より hardcode が確実
- **suggestSimilarRuleIds**: unknown ruleId 時に prefix + substring score で 5 件 hint 提示。AI session が typo を rapid に articulate
- **flag 規約**: standard flag library で interspersed flag/positional は unsupported、規約として「flag 先 / positional 後」を articulate

### alternatives

- (a) Go-side で base-rules.ts を parse: 却下 (= TS AST parse は heavyweight、generated artifact で十分)
- (b) cobra/pflag library 採用 (= interspersed flag 対応): 却下 (= dependency 追加コスト > 規約整備コスト、既存 detector / stats も標準 flag 採用で整合)
- (c) guard reference を `architectureRules.ts` の getRuleById 呼び出しから抽出: 却下 (= regex parse は brittle、grep で十分実用的)
- (d) parameters field articulate (= aag-parameters.json への reference): 却下 (= MVP では rule ↔ parameters の binding articulation 未確立、後続 step で必要時に追加)

### 観測点

1. `internal/navigation/rule.go` + test 存在 + go vet clean
2. `go test ./internal/navigation/...` 全 PASS
3. real repo dogfood で AR-G5-HOOK-LINES → slice / what / why / doc / principleRefs / thresholds / definition / guards articulate
4. unknown ruleId で `Similar:` hint 提示
5. flag 規約 (= --repo 先 / ruleId 後) で test pass
6. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
7. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 3 #12 commit、派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-016: Wave 3 #14 着手判断 — `aag detector refs <detectorId>`、Wave 3 final、5 detector の goImpl + tsImpl + fixtures articulate

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 3 #13 (= rule locate) push 後、Wave 3 final step = detectorId から detector の goImpl + tsImpl + schema + fixtures を articulate する command。aag-engine-go-mvp で landing 済の 5 detector を id mapping 経由で articulate。

### decision

1. 新規: `internal/navigation/detector.go` (= DetectorRefs() + detectorIdMappings 5 件 + KnownDetectorIds + listFixtures + existsAt)
2. 新規: `detector_test.go` (= 5 contract test)
3. update: `cmd/aag/main.go` (= detector subcommand + refs action)
4. update: `main_test.go` (= 4 CLI test)
5. update: `checklist` + `decision-audit` (= 本 entry、Wave 3 全完遂 articulate)

**id 命名規約**:
- CLI surface (= input) = kebab-case (例: `archive-manifest`)
- Go file = snake_case (例: `archive_manifest.go`)
- TS file = kebab-case + `-detector.ts`
- Fixture dir = kebab-case (= 通常 input id と一致、archive-manifest だけは `archive-v2/` に articulate されている既存規約に追従)

### rationale

- **id mapping を embed**: 5 detector は固定 (= Wave 1 articulate 時点で確定)、動的探索より明示的 mapping が確実
- **archive-manifest → archive-v2/ の non-uniform mapping**: aag-engine-go-mvp 時点で既に確立されている規約 (= archive-manifest detector が Archive v2 schema を検証する semantic)、新 program で uniform 化するのは scope 違い、既存 idiom 整合
- **schema = detector-result.schema.json (共通)**: 全 detector の output contract は detector-result-v1。各 detector の input schema (= project-archive / doc-registry / etc.) は別 family、本 articulate には含めない
- **fixtures は subdir 列挙**: 各 fixture case = 1 subdir (= aag-engine-go-mvp で確立)、count + path list を articulate
- **flag 規約**: rule locate と同 (= flag を positional の前に articulate)

### alternatives

- (a) detector id を動的に探索 (= aag-engine/internal/detectors/ 配下を walk): 却下 (= mapping が必要 = Go file name と input id の対応、結局 mapping を articulate する必要)
- (b) input schema も articulate: 却下 (= detector ごとに異なる、複雑性増、後続 step で必要時)
- (c) input id と Go file を統一 (= archive-manifest.go に rename): 却下 (= 既存 codebase の rename は scope 違い、本 program は additive)

### 観測点

1. `internal/navigation/detector.go` + test 存在 + go vet clean
2. `go test ./internal/navigation/...` 全 PASS
3. real repo dogfood (= archive-manifest) で goImpl / goTest / tsImpl / schema / 3 fixtures articulate
4. 全 5 detector で impl + fixture が存在する (= TestDetectorRefs_AllKnownDetectors_HaveImplsAndFixtures)
5. unknown detector で `Known detectors:` hint
6. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
7. branch push 成功
8. **Wave 3 全完遂** (= 5/5 step landed = where-am-i / context --project / changed --explain / rule locate / detector refs)

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 3 #13 commit、派生元)
- **judgementCommit**: `<TBD>` (= Wave 3 final commit)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-017: Wave 4 #15 着手判断 — `aag clean check`、3 rule MVP (= generated-handauthored / archive-missing-manifest / projectid-duplicate)

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 3 完遂後、Wave 4 入口 (= cleanliness rules detection)。plan.md §Wave 4 #15 spec は generated 混入 / docs/contracts narrative / fixtures production doc / archive-manifest 不在 / projectId 重複 / generated metadata 不在 など 6+ rule を articulate。本 step では AI session が即値で踏みやすい core 3 rule を Go-side で articulate。

### decision

1. 新規: `internal/cleanliness/clean.go` (= Check() + 3 rule = generated-handauthored / archive-missing-manifest / projectid-duplicate + summarize)
2. 新規: `clean_test.go` (= 7 contract test、synthetic temp dir で 3 rule + helper を機械検証)
3. update: `cmd/aag/main.go` (= clean subcommand + check action)
4. update: `main_test.go` (= 2 CLI test)
5. update: `checklist` + `decision-audit` (= 本 entry)

**3 rule の選択理由**:
- **generated-handauthored**: AI session が誤って `references/04-tracking/generated/` 等に hand-authored doc を混入する pattern を検出
- **archive-missing-manifest**: Archive v2 idiom (= ARCHIVE.md + archive.manifest.json) を articulate しているが manifest が欠落する pattern を検出
- **projectid-duplicate**: active と completed に同 id が articulate されている pattern を検出 (= quick-fixes 例外あり = 長期 collection)

**やらない (= 後続 step で必要時に追加)**:
- docs/contracts narrative 検出 (= 既存 directory 内容が articulate されているかの heuristic 必要)
- fixtures production doc 検出 (= fixture と production の境界 articulation 必要)
- generated metadata 不在 (= generatedFileEditGuard のような既存 mechanism と整合させる scope)

### rationale

- **3 rule MVP 採用**: AI session の primary risk path をカバー、残りは後続で必要時に additive
- **`*.generated.md` convention pass**: 命名規約で「機械生成」を articulate する idiom を尊重 (= 既存 codebase の architecture-health.generated.md / aag-size-statistics.generated.md 等が articulate)
- **content marker pattern subset**: `> Generated:` / `機械生成` / `"generatedAt"` / `"timestamp"` 等を articulate (= 実 generated artifact から発見した pattern)
- **quick-fixes 例外**: `projects/active/quick-fixes/` は long-running collection、`projects/completed/quick-fixes/` がたまたま存在しても duplicate ではない (= idiom 整合)
- **violations articulate / no fail**: AI session の判断材料を articulate するのが responsibility、強制 fail は後続 step (Wave 5 hard gate) で検討
- **synthetic temp dir test**: `t.TempDir()` で隔離、real repo 走査せず contract 入出力 mapping のみ検証 (= 既存 collector test pattern 整合)

### alternatives

- (a) 6+ rule すべて MVP で実装: 却下 (= scope creep、core 3 で AI session の primary risk カバー)
- (b) violation で ExitFail (= 違反あれば exit 1): 却下 (= read-only first 不可侵原則 3、enforce ではなく articulate)
- (c) 既存 detector framework (= aag-engine/internal/detectors/) に統合: 却下 (= detector framework は fixture parity 用、cleanliness は別 idiom、別 package で articulate)
- (d) `*.generated.md` 規約 pass を articulate しない: 却下 (= 既存 codebase の正当な generated artifact が flag される、false positive 大)

### 観測点

1. `internal/cleanliness/clean.go` + test 存在 + go vet clean
2. `go test ./internal/cleanliness/...` 全 PASS
3. real repo dogfood で 0 violations (= 現状 repo は 3 rule すべて clean)
4. synthetic test で 3 rule すべて検出 (= bad fixture で violation 1 件返す)
5. quick-fixes 例外 articulate
6. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
7. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 3 #14 final commit、派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-018: Wave 4 #16 着手判断 — `aag comments list --kind`、3 kind (todo / suppression / expired) + 厳密 anchor regex

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 4 #15 (= clean check) 後、Wave 4 #16 = comment governance scan。AI session が repo 内 TS/TSX/Go の TODO / FIXME / XXX、suppression idiom、expired-at marker を kind 別に articulate するための CLI。

### decision

1. 新規: `internal/commentscan/comments.go` (= List() + CommentKind enum + scanFile + 5 regex pattern + scanDirs 3 件)
2. 新規: `comments_test.go` (= 8 contract test)
3. update: `cmd/aag/main.go` (= comments subcommand + list action + --kind required)
4. update: `main_test.go` (= 4 CLI test)
5. update: `checklist` + `decision-audit` (= 本 entry)

**3 kind の articulate**:
- **todo**: `// TODO` / `// FIXME` / `// XXX` で keyword 直後 (= `:` または `[A-Za-z]` content) を要求 = 厳密 anchor。projectId / reviewAfter annotation の有無を articulate
- **suppression**: `// eslint-disable*` / `// @ts-ignore` / `// @ts-expect-error` / `// @ts-nocheck`。reason / expiresAt 不在を articulate
- **expired**: `expiresAt: YYYY-MM-DD` で today を超過しているもの

**厳密 anchor regex 採用** (= 当初 broad pattern で false positive 多発):
- 当初: `(?i)//[^\n]*\b(TODO|FIXME|XXX)\b` → 文中の TODO 言及もマッチ (= docstring 等で keyword を articulate するだけで誤検出)
- 修正後: `(?i)//\s*(TODO|FIXME|XXX)\b\s*[:(]|//\s*(TODO|FIXME|XXX)\s+[A-Za-z]` → keyword 直後に `:` / `(` / 英字 content が必要 = 「実 TODO comment」 のみ articulate

### rationale

- **3 kind 単一 command**: kind を flag で articulate (= todo|suppression|expired)、別々の command にしない。consumer (= AI session) が同じ idiom で query
- **厳密 anchor**: false positive を抑止 (= docstring / 仕様書中の keyword 言及を flag しない)。dogfood で当初 4096+ 件 → 6 件に削減を確認
- **scanDirs limit (= app/src + aag-engine + tools/architecture-health/src)**: production code path のみ走査、references/ や docs/ のような doc text は対象外 (= comment governance は code に対する規約)
- **annotation parser**: projectId / reviewAfter / reason / expiresAt の各 annotation を regex で articulate、missingFields に articulate されないものを列挙
- **scanFile per file**: bufio.Scanner で line-by-line 走査、64KB max line buffer (= long minified file 対応)

### alternatives

- (a) AST-based parsing (= TypeScript compiler API 経由): 却下 (= dependency 追加 + 起動時間増、regex で十分実用的)
- (b) `--all-kinds` で 3 kind 同時 list: 却下 (= consumer は kind ごとに用途が違う、別 query が natural)
- (c) hard fail with exit code: 却下 (= read-only first 不可侵原則 3、enforce ではなく articulate)
- (d) 当初 broad pattern を維持: 却下 (= false positive 4096+ 件、AI consumer 価値破綻)
- (e) docstring / commentblock を skip する zone heuristic: 却下 (= AST なしで厳密判定不能、anchor 強化で十分)

### 観測点

1. `internal/commentscan/comments.go` + test 存在 + go vet clean
2. `go test ./internal/commentscan/...` 全 PASS (= 8 test、3 kind synthetic + skip dirs + regex precision)
3. real repo dogfood で todo kind = 6 items (= 主に test fixture、production code に未整理 TODO ほぼなし)
4. todo missingFields に projectId or reviewAfter が articulate
5. suppression missingFields に reason / expiresAt が articulate
6. expired は today 超過の expiresAt のみ articulate
7. node_modules / dist / .git は skip
8. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
9. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 4 #15 commit、派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-019: Wave 4 #17 着手判断 — `aag docs placement-check`、2 rule MVP + 6 convention articulate

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 4 #16 後、Wave 4 #17 = doc placement convention articulate command。schema / generated / fixture / project doc 配置の規約違反を read-only に検出。

### decision

1. 新規: `internal/cleanliness/docs_placement.go` (= PlacementCheck() + 2 rule + 6 conventions + scanRoots)
2. 新規: `docs_placement_test.go` (= 6 contract test)
3. update: `cmd/aag/main.go` (= docs subcommand + placement-check action)
4. update: `main_test.go` (= 2 CLI test)
5. update: `checklist` + `decision-audit` (= 本 entry)

**2 rule の articulate**:
- **schema-misplaced**: `*.schema.json` outside of `docs/contracts/` (= fixtures + projects/<id>/derived/ 例外あり)
- **generated-misplaced**: `*.generated.md` / `*.generated.json` outside of canonical generated dirs (= `references/04-tracking/` 全体 + `docs/generated/`)

**6 conventions articulate**:
1. long-term-policy → references/
2. active-project → projects/active/<id>/
3. archived-project → projects/completed/<id>/ + Archive v2
4. schema → docs/contracts/
5. generated → references/04-tracking/ or docs/generated/
6. fixture → fixtures/

### rationale

- **`references/04-tracking/` 全体を canonical generated dir として articulate**: 既存 codebase が複数 subdir (= generated/ + dashboards/ + elements/ + root-level recent-changes.generated.md) で generated artifact を articulate しており、それぞれ generatedFileEditGuard 対象。subdir ごとに canonical 列挙すると new dir 追加時に false positive 発生、root level で articulate するのが整合
- **`projects/<id>/derived/` 例外**: project template に `derived/` subdir が articulate されており (= projects/_template/derived/)、project-internal generated artifact の慣例。canonical AAG schema ではない、例外として articulate
- **6 conventions を output に articulate**: AI session が「正しい配置」を確認できるよう、output 自体に conventions を articulate (= self-documenting)
- **2 rule MVP**: plan.md spec の placement-check 範囲 (= 長期方針=references / project work=projects/active / archived=projects/completed+Archive v2 / schema=docs/contracts / generated=references/04-tracking/generated / fixture=fixtures) は文書 articulate であり、機械検出可能な subset を 2 rule で MVP

### alternatives

- (a) 6 rule 全実装 (= long-term-policy / active-project / archived-project の placement 違反も検出): 却下 (= "長期方針" の判定は文書内容依存、MVP scope 外、AI session が articulate)
- (b) `*.generated.md` を strict に `references/04-tracking/generated/` のみ canonical と articulate: 却下 (= 既存 codebase が dashboards / elements / root-level でも articulate、false positive 大)
- (c) project derived schema も violation として flag: 却下 (= template 規約整合、project-internal は canonical AAG schema ではない)

### 観測点

1. `internal/cleanliness/docs_placement.go` + test 存在 + go vet clean
2. `go test ./internal/cleanliness/...` 全 PASS
3. real repo dogfood で 0 violations (= 現状 repo の placement は規約整合)
4. synthetic test で 2 rule 各 1 件 articulate
5. output で 6 conventions が articulate
6. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
7. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 4 #16 commit、派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-020: Wave 4 #18 着手判断 — Detection Inventory v2 (= preparatory doc work、Wave 4 完遂)

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 4 #17 後、Wave 4 final step = Detection Inventory v2 preparatory doc work。AI session が repo 内 4 kind (= guard / audit / detector / collector) の articulate を 1 JSON で query できるよう、schema + narrative + 初期 inventory を articulate。Wave 5 #21 (`reposteward repair-context`) の入力として再利用予定。

### decision

1. 新規: `docs/contracts/aag/detection-inventory.schema.json` (= Detection definition with id / kind enum / location / what)
2. 新規: `references/03-implementation/detection-inventory-v2.md` narrative (= 動機 + 4 kind articulate + 更新方針 + 関連 Wave map)
3. 新規 generated: `references/04-tracking/generated/detection-inventory.json` (= 167 detection、guard 137 / collector 14 / detector 10 / audit 6)
4. update: `docs/contracts/doc-registry.json` (= 2 entry 追加 = schema + narrative)
5. update: `references/README.md` (= narrative entry 追加、docRegistryGuard 整合)
6. update: `checklist` + `decision-audit` (= 本 entry、Wave 4 全完遂 articulate)

**MVP scope**:
- inventory artifact は Python script で hand-author + 簡易 listing で articulate
- 自動生成 (= collector による継続更新) は v2 で検討、本 step は preparatory のみ
- Detection の `id` は kind ごとに unique (= 例: guard なら test 関数名、collector なら export 関数名)

### rationale

- **doc-only step として articulate**: plan.md spec 「preparatory doc work」整合。Go code / 新 command 追加なし、schema + narrative + initial artifact で Wave 5 への入力を articulate
- **Python script で hand-author**: TS collector 自動生成は scope 大、初期 articulate は scriptable な hand-build で十分。後続 v2 で `tools/architecture-health/src/collectors/detection-inventory-collector.ts` 化を検討
- **4 kind enum (= guard / audit / detector / collector)**: 既存 codebase の articulate 整合 (= app/src/test/guards/ + app/src/test/audits/ + aag-engine/internal/detectors/ + tools/architecture-health/src/detectors/ + tools/architecture-health/src/collectors/)
- **`what` field は best-effort articulate**: Python script で file 冒頭の docstring から候補抽出、なければ filename based。完全自動化は AST parse 必要、MVP では十分実用的
- **Wave 5 #21 への入力としての設計**: violation kind から関連 detection を look up する用途を articulate

### alternatives

- (a) TS collector で自動生成: 却下 (= scope 大、preparatory doc work scope 外、後続 v2 で検討)
- (b) inventory を生成しない (= schema + narrative のみ): 却下 (= 「Wave 4 の入力として完成」 spec 整合のため初期 artifact が必要)
- (c) 4 kind を guard / detector の 2 kind に縮小: 却下 (= audit と collector は責務が異なる、4 kind articulate が integrity 高)
- (d) `what` を全 manual articulate (= 各 file の意図を hand-write): 却下 (= 167 file への hand-write は preparatory scope を超える、auto-extract で十分)

### 観測点

1. `docs/contracts/aag/detection-inventory.schema.json` 存在 + valid JSON
2. `references/03-implementation/detection-inventory-v2.md` 存在 + 4 kind articulate
3. `references/04-tracking/generated/detection-inventory.json` 存在 + Ajv 準拠 + 167 detection articulate
4. `byKind.{guard, audit, detector, collector}` が articulate
5. doc-registry に 2 entry 追加、README.md に narrative entry 追加 (= docRegistryGuard PASS)
6. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
7. branch push 成功
8. **Wave 4 全完遂** (= 4/4 step landed = clean check / comments list / docs placement-check / Detection Inventory v2)

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 4 #17 commit、派生元)
- **judgementCommit**: `<TBD>` (= Wave 4 final commit)
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD

---

## DA-α-021: Wave 5 #19 着手判断 — Premise Contracts v1 schema + 5 initial contracts、structural premise articulation

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Wave 4 完遂後、Wave 5 入口 = Premise Contracts。AI session が「A を変えたら B も確認・更新する」を path-based に articulate する正本。Wave 5 #20 obligation check が本契約集合を消費。既存 OBLIGATION_MAP (= TS-side) と並行する layer。

### decision

1. 新規: `docs/contracts/aag/premise-contract.schema.json` (= JSON Schema、PremiseContract / PremiseRequirement definition + mode enum 3 件)
2. 新規: `aag/parameters/premise-contracts.json` (= 5 initial contract、AAG framework core)
3. update: `docs/contracts/doc-registry.json` (= 1 entry 追加)
4. update: `checklist` + `decision-audit` (= 本 entry)

**5 initial contracts**:
- PC-DETECTOR-RESULT-CONTRACT (= schema + Go binding + TS interface + sync guard + fixture)
- PC-AAG-RESPONSE-CONTRACT (= schema + TS implementation + sync guard)
- PC-TASK-CAPSULE-CONTRACT (= schema + Go producer + parity test + Prepare consumer)
- PC-SOURCE-FACTS-CONTRACT (= schema + TS collector + statistics consumer + Go stats consumer)
- PC-AAG-PARAMETERS-CONTRACT (= schema + parameters JSON + statistics + Go consumer)

### rationale

- **OBLIGATION_MAP との責務分離**: OBLIGATION_MAP は live triggers (= changed file → obligation check)、本 schema は structural premise (= 三角依存・複数 file の同時更新必要性) を articulate。同 layer ではなく直交 (= 補完関係)
- **mode 3 enum**: `must-pass` (= 該当 test PASS 必須) / `review` (= AI session 手動 review、内容判断) / `co-update` (= 同 PR で更新が必要)。AI session の判断 path を articulate
- **id pattern `PC-<UPPERCASE-KEBAB>`**: AAG rule の `AR-<KEBAB>` family と articulate 整合
- **MVP 5 contract**: AAG framework の core schema 5 件をカバー、後続で repo 固有 contract を追加可能
- **trigger.paths は file path or glob 両対応**: `**/*` で directory match (= 例: `fixtures/aag` で配下全 file が trigger)、prefix match で十分実用的

### alternatives

- (a) OBLIGATION_MAP に統合 (= TS-side で全 articulate): 却下 (= structural premise vs live trigger は責務違い、separation of concern)
- (b) Go-side で contract definition (= aag-engine/internal/contract/): 却下 (= parameters family の中で articulate するのが整合、`aag/parameters/` 既存 family)
- (c) trigger に optional な `severity` 追加: 却下 (= mode で十分、severity は要件 (`must-pass`) に内包される articulate)

### 観測点

1. `docs/contracts/aag/premise-contract.schema.json` 存在 + valid JSON
2. `aag/parameters/premise-contracts.json` 存在 + Ajv で schema 準拠 (= PREMISE_VALID)
3. 5 initial contract が articulate
4. doc-registry に entry 追加
5. TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
6. branch push 成功

### Lineage

- **preJudgementCommit**: `<TBD>` (= Wave 4 #18 final commit、派生元)
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `未確定`
- **観測点達成状況**: TBD
- **学習**: TBD
