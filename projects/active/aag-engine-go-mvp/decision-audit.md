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

## DA-α-001: Phase 1 Go CLI Skeleton scope 判断 (= aag-engine/ 新設 + 3 サブコマンド + JSON output 経路)

### status

- 着手判断: **closed** (Phase 1 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 10 件すべて達成)

### context

Phase 1 plan.md の作業項目:
- `aag-engine/` (= Go module 新設、go.mod + cmd/aag/main.go + internal/contract/ + internal/report/)
- CLI 3 サブコマンド (= `aag validate` / `aag validate --format=json` / `aag fixtures`)
- JSON output 経路 (= 空 DetectorResult[] でも valid)
- exit code contract (= 0 = pass / 1 = fail / 2 = error)
- DA-α-001 entry articulate

完了条件:
- repo を書き換えない (= read-only verify)
- JSON output を返せる
- exit code contract がある
- DetectorResult[] の空配列を返せる

scope 判断点:
- (a) Go module path 命名: `aag-engine` vs `github.com/Watanabe-Masao/Test4/aag-engine`
- (b) CLI parsing library: 標準 `flag` vs cobra / urfave/cli
- (c) DetectorResult struct を Phase 1 で landing するか Phase 2 で landing するか
- (d) Phase 1 test の scope (= unit test を CLI 直接 vs run() 関数に inject)

### decision

以下を採用する:

1. **Go module path = `aag-engine`** (= simple module name、not full GitHub path):
   - 理由: 本 module は repo-internal、外部から import されない
   - workspace の root から相対 import 可能
   - alternative (= full GitHub path) は後続で必要なら rename 可能、early decision として軽量を選好
2. **CLI parsing = 標準 `flag` package** (= no external dependencies):
   - 理由: Phase 1 skeleton では subcommand 数 = 2 (= validate / fixtures)、flag 数 = 2 (= --repo / --format) で標準 flag で十分
   - 外部依存追加で go.sum / vendoring 議論を Phase 1 から走らせない
   - Phase 5+ で複雑化 (= subcommand tree が大きくなる) したら cobra 導入を別 DA で articulate 可能
3. **DetectorResult struct は Phase 1 で placeholder のみ landing、Phase 2 で populate**:
   - Phase 1 = report.DetectorResult{} 空 struct を articulate (= JSON output が `[]` を出せる最小)
   - Phase 2 = canonical schema (= docs/contracts/aag/detector-result.schema.json) と structurally identical な field 群を populate
   - 理由: Phase 1 は CLI 動作の skeleton 確認に集中、schema binding は別 DA (= DA-α-002) で articulate
4. **test 戦略 = run() 関数を inject test pattern**:
   - main() は os.Exit のみ、run() が pure な (args, stdout, stderr) → ExitCode を返す
   - test は run() を直接呼んで stdout/stderr buffer を assert
   - alternative (= os.Exec で別プロセス起動) は test 実行が遅くなるため不採用
5. **package 構造 = 2 internal package (= contract / report)**:
   - `internal/contract/` (= Phase 2 で DetectorResult struct 配置先、Phase 1 では placeholder PackageVersion のみ)
   - `internal/report/` (= RunResult + RenderJSON、Phase 1 で Skeleton 完了)
   - alternative (= 1 package に全部) は後続 Phase で contract / detection / report の責務分離が困難になる、不採用

### rationale

- **simple module name**: aag-engine は repo-internal の Go module、外部公開予定なし。GitHub path 形式は将来 public 化判断 (= Phase 12 closure) で議論。Phase 1 は "module が build できる最小" を選好
- **標準 flag package**: 外部依存ゼロ、Go 標準 library のみで動く skeleton。pre-push hook も go.sum チェックなしで通過 (= dependency review コストゼロ)
- **DetectorResult Phase 2 deferral**: Phase 1 = CLI skeleton + JSON output 経路、Phase 2 = schema binding。両方を Phase 1 で landing すると DA-α-001 §observation が膨らみ、振り返り判定の精度が下がる。Phase 分割で各 DA が独立 articulate
- **run() inject pattern**: testable な main は Go では一般的 pattern (= os.Args / os.Stdout / os.Stderr を関数引数化)。Phase 4-8 で detector test 追加時にも同 pattern で test 可能
- **2 internal package 構造**: 4 層 layered model (= collector / detector / evaluator / renderer) のうち renderer (= report) を Phase 1 で先行 landing、contract (= schema binding) を Phase 2 で populate、detector を Phase 4-8 で順次 landing する pattern。layered model articulation を物理 directory で表現

### alternatives

- (a-alt) **full GitHub module path**: Phase 1 から `github.com/Watanabe-Masao/Test4/aag-engine`、外部公開前提。Phase 12 で public 化判断する設計 (= MVP scope 内では決定不要) と矛盾、不採用
- (b-alt) **cobra/urfave-cli 導入**: 外部依存追加 + go.sum 管理 + dependency review コスト、Phase 1 skeleton には過剰、不採用
- (c-alt) **Phase 1 で DetectorResult struct を full populate**: Phase 1 / Phase 2 の DA 分離が崩れ、振り返り判定の精度低下、不採用
- (d-alt) **os.Exec ベースの integration test**: test 実行時間が遅い、CI 上で flake risk 増加、不採用 (= run() inject pattern を採用)

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. ✅ `aag-engine/go.mod` が landing、module name = `aag-engine`、go version 1.24
2. ✅ `cmd/aag/main.go` (= run() 関数 inject pattern) が landing、3 サブコマンド (= validate / fixtures / help) ルーティング動作
3. ✅ `internal/contract/contract.go` placeholder landing (= Phase 2 populate target)
4. ✅ `internal/report/report.go` (= RunResult struct + RenderJSON) landing
5. ✅ Go test 全 PASS (= cmd/aag/main_test.go + internal/report/report_test.go、計 11 test = cmd/aag 8 + internal/report 3)
6. ✅ `go build ./...` が clean (= warning 0)
7. ✅ CLI 動作確認 (= `aag validate` / `aag fixtures` / `aag --help` がすべて期待 JSON / usage を返す)
8. ✅ exit code contract: 0 = pass / 1 = fail / 2 = error が test で機械検証
9. ✅ TS guard 1057 test 全 PASS (= aag-engine/ 新設で TS 側 baseline 影響なし)
10. ✅ repo を書き換えない (= go test 実行で write 操作 0 件、CLI 出力は stdout のみ)

### Lineage

- **preJudgementCommit**: `2ba85dd` (= Phase 0 wrap-up regen 後 HEAD)
- **judgementCommit**: `2172c25` (= Phase 1 landing commit、aag-engine/ Go module + 3 サブコマンド + 11 Go test + DA-α-001 articulate)
- **postJudgementRegenCommit**: `3e3f143` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 1 wrap-up commit
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可、SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上、rollback target = preJudgementCommit `2ba85dd` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `aag-engine/go.mod` landing、module name = `aag-engine`、go 1.24
  2. ✅ `cmd/aag/main.go` (= run() inject pattern) landing、3 サブコマンド (= validate / fixtures / help) ルーティング動作確認
  3. ✅ `internal/contract/contract.go` placeholder landing (= PackageVersion = "phase-1-skeleton")
  4. ✅ `internal/report/report.go` (= RunResult struct + RenderJSON) landing
  5. ✅ Go test 全 PASS (= cmd/aag 8 test + internal/report 3 test = 11 test、internal/contract は test なし)
  6. ✅ `go build ./...` clean (= warning 0)
  7. ✅ CLI 動作確認 (= `aag --help` で usage、`aag validate` で `{schemaVersion, status, repo, detectorResults: []}`、`aag fixtures` で同 + note articulate)
  8. ✅ exit code contract 機械検証 (= test で TestRun_NoArgs / Help / UnknownCommand / Validate_DefaultArgs / UnsupportedFormat / InvalidFlag が exit code を assert)
  9. ✅ TS guard 1057 test 全 PASS (= aag-engine/ 新設で TS baseline 維持)
  10. ✅ repo を書き換えない (= go test で write 操作 0 件、CLI 出力は stdout のみ)
- **学習**:
  - **simple module name の wisdom**: `aag-engine` という repo-internal module name で Phase 1 を skeleton 完成させた。GitHub path 形式の検討は Phase 12 closure (= public 化判断) で再評価可能。Phase 1 で early decision を軽量に保つ approach は scope creep 防止に effective
  - **標準 flag package + run() inject pattern の wisdom**: 外部依存ゼロ + testable main の組合せで、Phase 1 skeleton + 11 test を 6 file (~450 line) で landing。cobra 等の外部 lib 導入を deferred することで go.sum / vendoring 議論を Phase 1 で発生させない、scope lock の strict adherence
  - **2 internal package 構造の wisdom**: contract (= Phase 2 schema binding target) + report (= Phase 1 で skeleton 完了) の責務分離を Phase 1 から articulate。Phase 4-8 detector 追加時に detection logic は別 package (= internal/detectors/) に閉じる pattern が確立可能
  - **Phase 0 institutional knowledge transfer の effectiveness**: Phase 0 で institutionalize した「§13.1 二段 commit + §13.3 post-flip regen」 pattern を Phase 1 で機械的に再適用、guard 修正 0 件 / push fail 0 件で完遂。readiness refactor からの institutional memory transfer (= 本 MVP project bootstrapping 経由) が成立、後続 Phase 2-12 でも同 pattern 継続候補

---

---

## DA-α-002: Phase 2 DetectorResult Contract Binding scope 判断 (= canonical schema mirror + Phase 1 positional args fix 統合)

### status

- 着手判断: **open** (Phase 2 landing commit articulate 中、Lineage 実 sha は wrap-up commit で update)
- 振り返り判定: **未** (= Phase 2 wrap-up commit で articulate 予定)

### context

Phase 2 plan.md の作業項目:
- `aag-engine/internal/contract/detector_result.go` に canonical schema (= `docs/contracts/aag/detector-result.schema.json`) 整合 Go struct を populate
- JSON serialization が `expected.json` と field-level 比較可能
- schema sync test (= TS 側 aagContractSchemaSyncGuard と同 articulate)

scope 進入時の発見:
1. **plan.md checklist の field 列挙が canonical schema と乖離**: plan.md は「schemaVersion / detectorId / ruleId / severity / sourceFile / evidence / actual / baseline / messageSeed」 と articulate していたが、canonical schema には schemaVersion / detectorId は **存在しない** (= ruleId / detectionType / sourceFile / severity / evidence? / actual? / baseline? / messageSeed? の 8 field)。canonical 優先 (= readiness refactor DA-α-002 学習 = plan.md sketch より canonical 優先)
2. **Phase 1 deliverable bug の発見** (= user feedback): `aag validate /tmp/repo` のような positional argument が silent ignore される。`fs.NArg()` check 不在で repo flag が默秘的に "." 維持、user が想定 path と異なる directory を validate する状況。user 期待違いを silent に発生させるため hard fail にすべき

### decision

以下を採用する:

1. **canonical schema を strict mirror** (= readiness refactor DA-α-002 学習継承):
   - 8 field (= 4 required + 4 optional) を Go struct に articulate
   - severity enum 3 値 (= gate / block-merge / warn) を Go const として articulate
   - plan.md の field 列挙誤りは checklist articulate 時点で canonical 準拠に修正
2. **Optional field は pointer 型** (= TS の `?` 接尾辞 mirror):
   - `*string` / `*float64` で nil / non-nil を articulate
   - `omitempty` json tag で nil 時は JSON output から field 不在
3. **factory + validation pattern** (= TS createDetectorResult mirror):
   - `CreateDetectorResult(input) (DetectorResult, error)` で required 空文字 / 不正 enum / optional 空文字を hard fail
4. **schema sync test を 5 件 articulate**:
   - $id 一致 / required 一致 / properties 一致 / struct json tag 一致 / severity enum 一致
   - reflection で Go struct field set を抽出 (= 静的 list を AllJSONFields として export)
5. **placeholder contract.go を削除** (= contract package の唯一 file は detector_result.go):
   - PackageVersion redeclaration を回避
   - placeholder は Phase 1 articulate のみに使用、Phase 2 で正規 binding に移行
6. **Phase 1 positional args fix を Phase 2 landing に統合** (= user feedback 由来):
   - 物理的に main.go を両方 (= Phase 2 work + fix) が touch するため別 commit 分割は scope 過剰
   - 不可侵原則 1 整合 (= silent ignore による user 期待違いを hard fail で防ぐ)
   - validate / fixtures 両 subcommand に `fs.NArg() > 0` check 追加、hint message 付き ExitError 返す
   - test 3 件追加 (= validate positional / mixed flag+positional / fixtures positional)

### rationale

- **canonical 優先**: readiness refactor DA-α-002 で確立した「plan.md sketch と canonical contract で差異がある場合は canonical contract 優先」 pattern を本 MVP でも継承。plan.md の field 誤りは不可侵原則 9 (= Go engine が source of truth にならない) 整合で canonical schema が正本
- **pointer 型 optional**: Go の慣用的 pattern。値型 + omitempty では「articulate された 0」 と「未 articulate」 を区別できない (= `actual: 0` は意味がある). Pointer + nil で 2 状態を articulate
- **factory pattern**: TS createDetectorResult と field-level parity を確保、Phase 4-8 で各 detector が同 factory 経由した instance を返す統一 pattern を articulate
- **schema sync test 5 件**: TS 側 aagContractSchemaSyncGuard が 3 sync test を articulate、Go 側は同等 + reflection-based struct tag check + severity enum coverage を加えた 5 test。schema drift 検出を 5 軸で機械検証
- **placeholder 削除**: 内部一貫性。Phase 2 で正規 binding が landing したため Phase 1 placeholder の存在意義は消滅。残置すると PackageVersion 重複 + 未使用 placeholder の保守コスト
- **positional args fix 統合**: user feedback で Phase 1 deliverable bug が判明、main.go が Phase 2 work と物理 conflict するため atomic commit が natural。silent な user 期待違いは不可侵原則 1 (= MVP は validator として trust 可能であるべき) と整合する hard fail に articulate

### alternatives

- (a-alt) **schemaVersion / detectorId field を Go 側で articulate** (= plan.md sketch 通り): canonical schema にない field を Go 側で勝手に追加、不可侵原則 9 違反、schema sync test fail、不採用
- (b-alt) **Optional field を値型 + omitempty**: `actual: 0` / `baseline: 0` の articulate を JSON output から落とすため意味的に間違い (= 0 は valid count)、不採用
- (c-alt) **factory なし、struct literal 直接 articulate**: 各 detector が個別に validation 実装、duplication + 不整合 risk、不採用
- (d-alt) **schema sync を runtime JSON Schema validator (= santhosh-tekuri/jsonschema 等) で実装**: 外部依存追加、Phase 2 skeleton には過剰 (= reflection ベース sync test で field-level 検証は十分)、不採用
- (e-alt) **positional args fix を別 commit に分割**: main.go が Phase 2 work と物理 conflict、分割 cost が articulate 価値より大きい、不採用 (= atomic commit + DA で articulate)
- (f-alt) **positional args を warning にとどめる** (= silent fix で repo を positional から取る): user 期待違いを silent に発生させ続ける、不採用 (= hard fail で正しい)

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. ✅ `internal/contract/detector_result.go` が 8 field DetectorResult struct + Severity 3-enum + factory + helper を articulate
2. ✅ canonical schema $id (= `https://aag.local/schemas/detector-result-v1.json`) と Go const CanonicalSchemaID が一致
3. ✅ schema required (= 4 field) と Go RequiredFields が一致
4. ✅ schema properties (= 8 field) と Go AllJSONFields が一致
5. ✅ schema severity enum (= 3 値) と Go AllSeverities が一致
6. ✅ Go struct json tag 集合が AllJSONFields と一致 (= reflection で機械検証)
7. ✅ CreateDetectorResult factory が required 空文字 / 不正 severity / optional 空文字を hard fail
8. ✅ JSON marshal が canonical schema 準拠 shape (= field name camelCase + omitempty)
9. ✅ internal/report が contract.DetectorResult を import、placeholder DetectorResult は削除済
10. ✅ Phase 1 placeholder `internal/contract/contract.go` は削除済 (= PackageVersion 重複なし)
11. ✅ `aag validate /tmp/repo` が ExitError + hint message を返す (= positional args fix)
12. ✅ `aag fixtures /tmp/repo` も同 pattern (= 両 subcommand 一貫)
13. ✅ Go test 33 件 PASS (= Phase 1 の 11 + Phase 2 contract 14 + report 8 件追加)
14. ✅ TS guard 1057 test PASS (= aag-engine/ 変更で TS baseline 維持)

### Lineage

- **preJudgementCommit**: `62844c3` (= Phase 1 wrap-up regen 後 HEAD)
- **judgementCommit**: 本 Phase 2 landing commit (= SHA は landing 直後 git log で確定 → wrap-up commit で本 entry に書き込み)
- **postJudgementRegenCommit**: 該当時 §13.3 適用
- **retrospectiveCommit**: 本 Phase 2 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `62844c3` を SHA 直接参照)

### 振り返り判定

(= Phase 2 wrap-up commit で articulate 予定。観測点 1〜14 の達成状況 + 学習を後続 commit で update。)

---

> 後続 DA entry (DA-α-003 〜 012) は各 Phase landing commit 時に articulate 追加。
