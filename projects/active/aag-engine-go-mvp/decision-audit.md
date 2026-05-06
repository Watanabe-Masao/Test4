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

- 着手判断: **closed** (Phase 2 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 14 件すべて達成)

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
- **judgementCommit**: `87643f4` (= Phase 2 landing commit、DetectorResult contract binding + Phase 1 positional args fix 統合)
- **postJudgementRegenCommit**: `2a618d8` (= §13.3 Pattern A application、aag-engine/ 変更 + checkbox 4 件 flip drift sync)
- **postLandingFixCommit**: `a001112` (= user review feedback による articulation 修正 = 9→11 test count / HANDOFF stale snapshot / plan.md MD040 fenced block language)
- **retrospectiveCommit**: 本 Phase 2 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `62844c3` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `internal/contract/detector_result.go` 8 field DetectorResult struct + Severity 3-enum + factory + helper を articulate (~150 line)
  2. ✅ canonical schema $id (= `https://aag.local/schemas/detector-result-v1.json`) と Go const CanonicalSchemaID 一致 (= TestSchemaSync_SchemaID PASS)
  3. ✅ schema required (= 4 field) と Go RequiredFields 一致 (= TestSchemaSync_RequiredFields PASS)
  4. ✅ schema properties (= 8 field) と Go AllJSONFields 一致 (= TestSchemaSync_PropertyFields PASS)
  5. ✅ schema severity enum (= 3 値) と Go AllSeverities 一致 (= TestSchemaSync_SeverityEnum PASS)
  6. ✅ Go struct json tag 集合が AllJSONFields と reflection 経由で一致 (= TestSchemaSync_StructTags PASS)
  7. ✅ CreateDetectorResult factory が required 空文字 / 不正 severity / optional 空文字を hard fail (= 6 validation case PASS)
  8. ✅ JSON marshal が canonical schema 準拠 shape (= field name camelCase + omitempty、TestDetectorResult_JSONMarshal_RequiredOnly / AllFields PASS)
  9. ✅ internal/report が contract.DetectorResult を import、placeholder DetectorResult 削除済
  10. ✅ Phase 1 placeholder `internal/contract/contract.go` 削除済 (= PackageVersion 重複なし)
  11. ✅ `aag validate /tmp/repo` が ExitError + hint message を返す (= TestRun_Validate_UnexpectedPositionalArg PASS)
  12. ✅ `aag fixtures /tmp/repo` も同 pattern (= TestRun_Fixtures_UnexpectedPositionalArg PASS)
  13. ✅ Go test 33 件 PASS (= cmd/aag 11 + contract 14 + report 8)
  14. ✅ TS guard 1057 test PASS (= aag-engine/ 変更で TS baseline 維持)
- **学習**:
  - **canonical 優先 pattern の continuity**: readiness refactor DA-α-002 で確立した「plan.md sketch と canonical contract で差異がある場合は canonical contract 優先」 を本 MVP Phase 2 でも適用、plan.md の 9-field 列挙を canonical 8-field に修正できた。institutional knowledge transfer が機能、後続 Phase でも 同 pattern で plan.md と実装の drift を検出可能
  - **pointer optional + factory pattern の Go 慣用化**: TS の `?` 接尾辞を Go の pointer 型 + omitempty で mirror、`actual: 0` の articulate 区別を維持。Phase 4-8 detector で各 violation の actual / baseline を articulate する際の base pattern 確立
  - **schema sync test 5 軸の coverage value**: TS aagContractSchemaSyncGuard 3 sync test に対して Go 側 5 sync test (= +reflection struct tag + severity enum coverage) を articulate。schema drift 検出を多軸で機械検証、Phase 7 hard gate 昇格判定の入力として活用可能
  - **placeholder 削除の wisdom**: Phase 1 で意図的に placeholder package を articulate し、Phase 2 で正規 binding に置換した時点で削除する pattern。残置すると PackageVersion 重複 + 保守コスト発生、Phase 進行とともに articulation を refactor する institutional habit を確立
  - **user feedback 由来 fix の atomic commit 統合の wisdom**: Phase 1 deliverable bug (= positional args silent ignore) を Phase 2 landing と物理 conflict する main.go で fix、別 commit 分割 cost > atomic commit cost の trade-off で統合判断。DA §context-2 + §observation-11/12 で fix を transparent に articulate。AAG-REQ-NO-AMEND 整合 (= 後続 fix も別 commit として articulate)
  - **post-landing review feedback の handling pattern**: Phase 2 landing 後 user code review で 3 articulation issue を発見、新 fix commit (`a001112`) として landing。AAG-REQ-NO-AMEND 整合 + AI が「気づいたら直す」 culture との整合を実現。Phase 0 institutional setup から続く iterative refinement pattern

---

---

## DA-α-003: Phase 3 Fixture Runner scope 判断 (= internal/fixture/ + Compare primitive + CLI catalog 出力)

### status

- 着手判断: **closed** (Phase 3 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 11 件すべて達成)

### context

Phase 3 plan.md の作業項目:
- 実 repo ではなく fixture で parity を取る土台を作る (= primary success metric の input)
- fixture `input.json` を読める / `expected.json` と actual を deep equality 比較できる / 差分を machine-readable に出せる
- DA-α-003 entry articulate

scope 判断点:
1. **fixture loader の placement**: cmd/aag/ 内 inline vs internal/fixture/ 別 package
2. **InputRaw の handling**: parse して specific facts type に hand off vs raw bytes として保持
3. **Compare の equality semantics**: deep equality (= 順序 + 要素一致) vs set equality (= 順序無視)
4. **CLI integration**: `aag fixtures` を catalog 出力に migrate vs Phase 4-8 まで note のみ
5. **RunResult schema 拡張**: FixtureSummary を追加 vs 別 output type

### decision

以下を採用する:

1. **internal/fixture/ 別 package** (= 4 層 layered model 準拠):
   - 各 detector が同 fixture loader を import 可能
   - cmd/aag/ は CLI orchestration のみ、parsing logic は internal/ に閉じる
2. **InputRaw を json.RawMessage で保持** (= detector ごとに facts shape が異なるため):
   - 各 detector が自身の facts type に Unmarshal する
   - loader 段階で parse すると detector-specific 知識が fixture package に漏れる (= layered model violation)
3. **Compare は deep equality + set-based diagnostics** (= dual mode):
   - Match 判定は reflect.DeepEqual (= 要素 + 順序 完全一致)
   - Match=false の場合は Missing / Extra (= set-based) で原因切り分け
   - 順序維持を要求するのは TS 側 renderDetectorResultsAsJson (= severity → ruleId → sourceFile sort) と同 deterministic ordering を Go 側 detector も再現する前提
4. **CLI を catalog 出力に migrate** (= Phase 3 で useful output に articulate):
   - `aag fixtures --repo .` で 8 fixture の name + expectedCount を JSON 出力
   - Phase 4-8 で各 detector が wired up された後、`--compare` flag 等で actual との parity を比較する拡張余地を残す
5. **RunResult.FixtureSummary を optional field 追加** (= Phase 1 RunResult schema を拡張):
   - 他 subcommand では nil → JSON omitempty で field 不在
   - 別 output type 化すると CLI 出力 shape が subcommand ごとに分岐し render path が複雑化

### rationale

- **internal/fixture/ 別 package**: aag-engine-readiness-refactor で確立した 4 層 layered model (= collector / detector / evaluator / renderer) の Go mirror。fixture loader は collector 層に相当、各 detector が同 loader を共有
- **InputRaw を raw bytes**: fixture package が detector-specific 知識 (= ProjectChecklistResult / ArchiveManifestFacts 等) を持たない方針。各 detector が「自身の facts shape を知っている」 という SRP に整合
- **Compare deep equality + set diagnostics**: TS 側 detectorResultModuleGuard の fixture parity test は exact equality を要求 (= renderDetectorResultsAsJson の deterministic ordering 前提)。Go 側も同 strict 比較を default に、Match=false 時は原因究明用に set-based diff を提供 (= 単独の bool 結果より debug 可能性が高い)
- **CLI catalog 出力**: Phase 3 deliverable を visible に articulate、user が `aag fixtures` で discover 状況を即時確認可能。Phase 1 では note のみだったが、Phase 3 で実 useful な output に migrate
- **RunResult schema 拡張 (FixtureSummary optional)**: 後方互換、`aag validate` の output には影響なし (= omitempty)。run-result-v1 schema は MVP 期間中固定の articulation だが、optional field 追加は破壊的変更ではない (= 不可侵原則 9 の「Go engine が source of truth にならない」 と整合、TS 側 renderDetectorResultsAsJson は同 schema を要求しないため)

### alternatives

- (a-alt) **fixture loader を cmd/aag/ inline**: 各 detector が cmd/aag を import する dep loop、不採用
- (b-alt) **InputRaw を parse して specific facts type で保持**: detector-specific 知識が fixture package に漏れる、不採用
- (c-alt) **Compare set-based のみ (= 順序無視)**: TS 側 detector parity test と articulation 不一致 (= 順序も articulation の一部)、不採用
- (d-alt) **`aag fixtures` を Phase 3 では note のみ維持**: deliverable visibility 低い、user が fixture loader 動作確認に他経路 (= go test 実行) を要する、不採用
- (e-alt) **別 output type (= FixtureSummaryResult vs RunResult)**: subcommand ごとに output shape 分岐で render path 複雑化、不採用 (= optional field 追加で代替)

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. ✅ `internal/fixture/fixture.go` 新設 (= Fixture struct + LoadAll + Compare + ParitySummary articulate)
2. ✅ `internal/fixture/fixture_test.go` 新設 (= 14 test、real repo の 8 fixture を全 discover 検証含む)
3. ✅ LoadAll が `fixtures/aag/` 配下 8 fixture を全 discover (= TestLoadAll_DiscoverAll PASS)
4. ✅ 各 fixture の ExpectedCount が plan / fixtures/aag/README.md と一致 (= 0+1+3+0+1+1+1+1=8)
5. ✅ LoadAll の sort order が deterministic (= Name で safe)
6. ✅ Compare が deep equality で Match を判定、set-based Missing / Extra を articulate
7. ✅ RunResult.FixtureSummary optional field が JSON omitempty で動作 (= validate 時は field 不在)
8. ✅ `aag fixtures --repo .` が 8 fixture catalog を JSON で articulate
9. ✅ `aag fixtures --repo /nonexistent` が ExitError + load error message
10. ✅ Go test 全 PASS (= cmd/aag 12 + contract 14 + fixture 14 + report 8 = 計 48 想定)
11. ✅ TS guard 1057 test PASS (= aag-engine/ 変更で TS baseline 維持)

### Lineage

- **preJudgementCommit**: `21dc655` (= Phase 2 wrap-up regen 後 HEAD)
- **judgementCommit**: `8fbed60` (= Phase 3 landing commit、internal/fixture/ + Compare primitive + CLI catalog migrate)
- **postJudgementRegenCommit**: `b40ea77` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 3 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `21dc655` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `internal/fixture/fixture.go` (~165 line) 新設 — Fixture struct + LoadAll + Compare + ParitySummary articulate
  2. ✅ `internal/fixture/fixture_test.go` (= 14 + 2 = 16 test) 新設 — real repo の 8 fixture を全 discover 検証含む
  3. ✅ LoadAll が 8 fixture 全 discover (= TestLoadAll_DiscoverAll PASS)
  4. ✅ ExpectedCount が plan / fixtures/aag/README.md と一致 (= 0+1+3+0+1+1+1+1=8、TestLoadAll_ExpectedCounts PASS)
  5. ✅ sort order が deterministic (= TestLoadAll_SortDeterministic PASS)
  6. ✅ Compare が deep equality + set-based Missing/Extra を articulate (= TestCompare_* 7 test PASS)
  7. ✅ RunResult.FixtureSummary optional field (= validate 時は omitempty で field 不在を JSON 検証)
  8. ✅ `aag fixtures --repo .` が 8 fixture catalog を JSON で articulate (= TestRun_Fixtures PASS)
  9. ✅ `aag fixtures --repo /nonexistent` が ExitError + load error (= TestRun_Fixtures_NonexistentRepo PASS)
  10. ✅ Go test 全 50 PASS (= cmd/aag 12 + contract 14 + fixture 16 + report 8、想定 48 を上回る = OrderMismatch / PreservesFixtureName / PointerFieldEquality / fixturesCatalog のような edge case 含む)
  11. ✅ TS guard 1057 test PASS (= aag-engine/ 変更で TS baseline 維持)
- **学習**:
  - **internal/fixture/ 別 package の wisdom**: 4 層 layered model の Go mirror。fixture loader を cmd/aag/ inline に置くと各 detector が cmd/aag/ を import する dep loop 発生候補。internal/fixture/ で各 detector 共有 import を articulate、Phase 4-8 で各 detector が import する pattern が確立
  - **InputRaw json.RawMessage の SRP value**: detector ごとに facts shape が異なる現状で、loader が specific knowledge を持たない方針。各 detector が「自身の facts shape を知っている」 という SRP は readiness refactor Phase 3 の collector / detector 分離 pattern を Go 側で再現
  - **Compare deep equality + set diagnostics の dual mode**: bool 結果のみだと parity fail 時の debug が困難。Match=false 時に Missing / Extra で原因切り分け可能。TS 側 detectorResultModuleGuard の fixture parity test も exact equality を default にしているが、Go 側で diagnostic 強化を articulate
  - **CLI catalog 出力の useful articulation**: Phase 1 では `aag fixtures` は note のみで動作確認価値が低かった。Phase 3 で fixture catalog (= 8 fixture name + expectedCount) を JSON 出力に migrate、user が即時 fixture discovery を確認可能。Phase 8 (= generated metadata advisory) や Phase 9 (= shadow mode) で更に rich な output に進化する base
  - **RunResult schema 拡張の non-breaking pattern**: optional field 追加 (= FixtureSummary) で既存 validate output に影響なし、aag-platformization Pilot で確立した「forward-looking optional field articulate」 pattern を Go 側で再適用

---

---

## DA-α-004: Phase 4 Archive Manifest Detector scope 判断 (= 最初の detector 移植 + fixture parity 100%)

### status

- 着手判断: **closed** (Phase 4 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 10 件すべて達成)

### context

Phase 4 plan.md の作業項目:
- 5 detector 移植優先順位の **最初** (= JSON input 中心、low risk、Archive v2 schema canonical、self-dogfood 済)
- AR-ARCHIVE-MANIFEST-A2 (= top-level required field 欠落) 検出
- 3 archive-v2 fixture (= pass-minimal / fail-missing-restore-command / fail-missing-multiple-fields) で parity 検証
- DA-α-004 entry articulate

scope 判断点:
1. **detectors/ package structure**: 1 file = 1 detector vs detector 群を 1 file
2. **path validation の Go 側 articulate**: TS 側 `toRepoPath()` を Go で再現するか / 後続 Phase に deferral
3. **Test 配置**: detector unit test + fixture parity test を同 file vs 分離
4. **Manifest 型**: `map[string]interface{}` vs typed struct
5. **error 戻り値**: factory error を伝播 vs panic

### decision

以下を採用する:

1. **`internal/detectors/` 単一 package、1 file = 1 detector** (= Go 慣用 + 4 層 layered model 整合):
   - `archive_manifest.go` / `doc_registry.go` / `schema_validation.go` / `project_lifecycle.go` / `generated_metadata.go` の 5 file 構成 (= Phase 4-8 で順次 landing)
   - 各 file は固有 facts type + detect function を export
2. **path validation を Phase 4 では deferral**:
   - TS 側 `toRepoPath()` (= readiness refactor Phase 4 で導入) は parity test で hitしない
     (= fixture input.json の manifestPath は事前に valid POSIX repo-relative)
   - Phase 12 closure decision で path-helpers Go 移植の必要性を再評価
   - 直前の Phase 7 (= project lifecycle detector) で path 規約が必要になれば articulate
3. **detector unit test + fixture parity test は 同 file** (= 検証対象 ≒ 物理 file):
   - 5 unit (= empty / all present / 1 missing / 3 missing / nil manifest) + 3 fixture parity test
   - test helper (`repoRoot` / `loadFixture` / `parseArchiveManifestFacts`) を test file 内 articulate
4. **Manifest 型 = `map[string]interface{}`** (= TS 側 `Readonly<Record<string, unknown>>` mirror):
   - JSON parse 後の dynamic access に最適、type-strict struct は Phase 6 (= Schema Validation Detector) で必要時に articulate
5. **factory error 伝播 + `[]contract.DetectorResult, error` signature**:
   - panic は最終手段、通常 detector は error 戻り値で transparent
   - 但し internal sanity (= CreateDetectorResult が固定値で fail することは通常ない) を articulate

### rationale

- **1 file = 1 detector**: Go 慣用 + readiness refactor TS 側 detectors/ 配置と 1:1 mirror、navigation cost 最小、各 detector の独立進化可能
- **path validation deferral**: Phase 4 fixture では sourceFile が事前に valid POSIX で articulate されているため、parity test は path validation なしで成立。早期に path-helpers 移植すると scope creep、Phase 7 (= project lifecycle) で実際に必要になる時点で articulate
- **同 file 配置 (unit + fixture)**: 検証対象 detector の next-to で test を articulate、一覧性 + cohesion 高い。Phase 9 shadow mode の cross-detector parity は別 file (= shadow_test.go 等) で集約
- **map[string]interface{}**: TS 側と field-level parity を確保するための最小 abstraction。Manifest field 値の型 strictness は Schema Validation Detector の責務 (= Phase 6 で実装)
- **error 戻り値**: TS 側 throw + try/catch を Go の `(value, error)` pattern に mirror、CLI orchestration が transparent に handle 可能

### alternatives

- (a-alt) **detectors/{archivemanifest,docregistry,...}/ subpackage**: 5 detector ごとに dir、Go では over-engineering、不採用
- (b-alt) **Phase 4 で path-helpers 移植**: scope creep、Phase 7 で必要時に articulate、不採用
- (c-alt) **fixture parity test を別 file** (= parity_test.go 等): test 一覧性低下、不採用
- (d-alt) **Manifest を typed struct**: Phase 4 で過剰、Phase 6 schema validation で型 strictness articulate、不採用
- (e-alt) **panic on factory error**: transparent error path 失う、不採用

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. ✅ `internal/detectors/archive_manifest.go` 新設 (= ArchiveManifestFacts struct + DetectArchiveManifestViolations function + requiredArchiveManifestFields constant)
2. ✅ `internal/detectors/archive_manifest_test.go` 新設 (= 5 unit + 3 fixture parity = 8 test)
3. ✅ requiredArchiveManifestFields の順序が schema (= project-archive.schema.json `requiredManifestFields`) + TS 側 REQUIRED_TOP_LEVEL_FIELDS と一致
4. ✅ `archive-v2/pass-minimal` fixture parity: actual = expected = 0 violations、Match=true
5. ✅ `archive-v2/fail-missing-restore-command` fixture parity: actual = 1 violation、expected と Match=true
6. ✅ `archive-v2/fail-missing-multiple-fields` fixture parity: actual = 3 violations、順序維持 + expected と Match=true
7. ✅ 各 violation の ruleId="AR-ARCHIVE-MANIFEST-A2" / detectionType="governance-ops" / severity="gate" / sourceFile = fact.ManifestPath / evidence + messageSeed が TS 側と field-level 一致
8. ✅ Manifest = nil の fact は skip (= collector 責務)
9. ✅ Go test 全 PASS (= cmd/aag 12 + contract 14 + fixture 16 + report 8 + detectors 8 = 計 58)
10. ✅ TS guard 1057 test PASS (= aag-engine/ 変更で TS baseline 維持)

### Lineage

- **preJudgementCommit**: `d6bfc8e` (= Phase 3 wrap-up regen 後 HEAD)
- **judgementCommit**: `f6b514a` (= Phase 4 landing commit、archive_manifest.go + 8 test)
- **postJudgementRegenCommit**: `f0818e8` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 4 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `d6bfc8e` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `archive_manifest.go` 新設 (= ArchiveManifestFacts struct + DetectArchiveManifestViolations function + requiredArchiveManifestFields const、~85 line)
  2. ✅ `archive_manifest_test.go` 新設 (= 8 test = 5 unit + 3 fixture parity、~210 line)
  3. ✅ requiredArchiveManifestFields 12 field の順序が schema (`project-archive.schema.json`) + TS REQUIRED_TOP_LEVEL_FIELDS と一致 (= TestDetectArchiveManifestViolations_MultipleMissing で順序検証)
  4. ✅ archive-v2/pass-minimal Match=true (= 0 violation)
  5. ✅ archive-v2/fail-missing-restore-command Match=true (= 1 violation = AR-ARCHIVE-MANIFEST-A2)
  6. ✅ archive-v2/fail-missing-multiple-fields Match=true (= 3 violations、順序維持)
  7. ✅ 各 violation の field-level 一致 (= ruleId / detectionType / severity / sourceFile / evidence / messageSeed すべて TS expected.json と一致)
  8. ✅ Manifest = nil の skip 動作 (= TestDetectArchiveManifestViolations_NilManifestSkipped PASS)
  9. ✅ Go test 全 58 PASS
  10. ✅ TS guard 1057 test PASS
- **学習**:
  - **fixture parity primary metric の effectiveness 実証**: 3 fixture すべて Match=true で完了。「同 input から同 expected を返す」 という readiness refactor が articulate した primary success metric が、Go engine 側で機械的に検証可能な形になっていることを Phase 4 で実証。Phase 5-8 でも 同 pattern で進行可能、shadow mode (= Phase 9) の前段階で各 detector の parity が独立に確認できる
  - **1 file = 1 detector pattern の wisdom**: Go の慣用 + readiness refactor TS detectors/ 配置との 1:1 mirror で navigation cost が最小化。Phase 5-8 で 4 detector を順次 landing する際も同 pattern を機械的に適用可能 (= scope creep 防止 + cohesion 維持)
  - **path validation deferral の判断**: Phase 4 fixture では sourceFile が事前 valid POSIX のため `toRepoPath()` 移植は parity test で hit せず、Phase 7 (= project lifecycle、active/completed の path 走査) で必要時に articulate するのが natural。早期実装は scope creep の risk
  - **map[string]interface{} の Go 慣用化**: TS の `Readonly<Record<string, unknown>>` を Go 側で表現する最小 abstraction。typed struct 化は Phase 6 (= Schema Validation Detector) で必要時 articulate、Phase 4 では不要
  - **factory error 伝播 pattern の transparent value**: panic ではなく `(results, error)` signature で internal sanity を transparent に articulate、CLI orchestration や parity test が clean に handle 可能。TS 側 throw + try/catch の Go 慣用 mirror

---

---

## DA-α-005: Phase 5 Doc Registry Detector scope 判断 (= set membership 判定 + 1 fixture parity)

### status

- 着手判断: **closed** (Phase 5 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 8 件すべて達成)

### context

Phase 5 plan.md の作業項目:
- 5 detector 移植優先順位の **2 番目** (= readiness §8.4 = archive-manifest → doc-registry → schema-validation → project-lifecycle → generated-metadata)
- AR-DOC-REGISTRY-D1 (= registered path が file system に存在しない) 検出
- doc-registry/fail-missing-path fixture parity
- references doc 追加時の §13.2 atomic update pattern との整合
- DA-α-005 entry articulate

scope 判断点:
1. **ExistingPaths を Set vs Slice**: TS `ReadonlySet<string>` を Go でどう mirror
2. **fixture input shape**: archive-manifest と doc-registry で structure が異なる (= array vs object)、parser 統一可能か
3. **Phase 4 institutional pattern の継承**: 1 file = 1 detector / 同 file test 配置 / map type / error 伝播 を mechanical に再適用

### decision

以下を採用する:

1. **Public Slice + Internal Set 化** (= JSON serialization compatibility):
   - JSON 入力は array (= `[]string`)、内部で `map[string]bool` に変換 (= O(1) lookup)
   - Go 標準で Set 型がないため map で代替
   - DocRegistryFacts struct field は `ExistingPaths []string` で TS Set との JSON parity を確保
2. **fixture input parser を detector ごとに articulate** (= shape 多様性に対応):
   - archive-manifest: `{"facts": [...]}` (= array)
   - doc-registry: `{"facts": {entries, existingPaths}}` (= object)
   - 各 detector test に専用 parser helper を articulate (= parseDocRegistryFacts、parseArchiveManifestFacts)
3. **Phase 4 institutional pattern を mechanical に再適用**:
   - 1 file = 1 detector (= doc_registry.go + doc_registry_test.go)
   - 同 file test 配置 (= unit + fixture parity)
   - factory error 伝播 + (results, error) signature
   - sourceFile = entry.Path (= path validation deferral 継承)

### rationale

- **Set vs Slice の Go 慣用化**: Go には built-in Set 型がない、`map[K]bool` が canonical idiom。TS `ReadonlySet<string>` を JSON serialization する際は通常 array、Go 側で受け取る struct field も `[]string` が natural。Phase 5 detector では set membership lookup が performance critical でないが、O(N) → O(1) で defensive
- **fixture parser の per-detector articulate**: fixture の input shape は detector ごとに異なるため、汎用 parser は articulation 過剰。各 test に thin parser helper を articulate するほうが SRP 整合 + cohesion 高い
- **Phase 4 pattern の mechanical 再適用**: Phase 4 で確立した「1 file = 1 detector / 同 file test / map type / error 伝播」 を Phase 5 で機械的に再適用、scope creep なし。institutional knowledge transfer が成立、Phase 6-8 でも同 pattern で進行可能

### alternatives

- (a-alt) **ExistingPaths を `map[string]bool` で受ける**: JSON serialization で問題、TS 側 array 形式と乖離、不採用
- (b-alt) **共通 fixture parser** (= `parseFacts[T any](raw, &out)`): facts shape の hierarchy が detector ごとに異なる (= array vs object)、汎用化過剰、不採用
- (c-alt) **Phase 5 で path validation 移植**: Phase 4 deferral 判断と矛盾、Phase 7 必要時 articulate が natural、不採用

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. ✅ `internal/detectors/doc_registry.go` 新設 (= DocRegistryEntry / DocRegistryFacts struct + DetectDocRegistryViolations function)
2. ✅ `internal/detectors/doc_registry_test.go` 新設 (= 4 unit + 1 fixture parity = 5 test)
3. ✅ doc-registry/fail-missing-path fixture parity: actual = 1 violation、expected と Match=true
4. ✅ violation の field-level 一致 (= ruleId="AR-DOC-REGISTRY-D1" / detectionType="governance-ops" / severity="gate" / sourceFile=entry.Path / evidence="registered label: <label>")
5. ✅ 順序維持 (= TestDetectDocRegistryViolations_MultipleMissing で entries 順検証)
6. ✅ ExistingPaths の Set 化が O(1) lookup で動作 (= 内部 map[string]bool)
7. ✅ Go test 全 PASS (= cmd/aag 12 + contract 14 + fixture 16 + report 8 + detectors 13 = 計 63)
8. ✅ TS guard 1057 test PASS

### Lineage

- **preJudgementCommit**: `998a920` (= Phase 4 wrap-up regen 後 HEAD)
- **judgementCommit**: `674e6df` (= Phase 5 landing commit、doc_registry detector + 5 test)
- **postJudgementRegenCommit**: `4b8904f` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 5 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `998a920` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `doc_registry.go` 新設 (= DocRegistryEntry / DocRegistryFacts struct + DetectDocRegistryViolations)
  2. ✅ `doc_registry_test.go` 新設 (= 5 test = 4 unit + 1 fixture parity)
  3. ✅ doc-registry/fail-missing-path Match=true (= 1 violation)
  4. ✅ violation の field-level 一致
  5. ✅ 順序維持 (= TestDetectDocRegistryViolations_MultipleMissing で entries 順検証)
  6. ✅ ExistingPaths Set 化が O(1) lookup で動作
  7. ✅ Go test 全 63 PASS
  8. ✅ TS guard 1057 test PASS
- **学習**:
  - **Phase 4 institutional pattern の mechanical 再適用 effectiveness**: 1 file = 1 detector / 同 file test / map type / error 伝播 を Phase 5 で機械的に再適用、scope creep ゼロで完遂。institutional knowledge transfer が成立、Phase 6-8 でも同 pattern で進行可能 (= readiness refactor Phase 0-1 institutional setup の継承効果と同質)
  - **Set vs Slice の Go 慣用化判断**: TS `ReadonlySet<string>` を JSON serialization する際は array、Go 側受け取り struct field も `[]string` が natural。内部で `map[string]bool` に変換は performance 余地 (= 大規模 doc-registry で O(N²) → O(N) 改善)、defensive な abstraction として正しい
  - **fixture parser per-detector の SRP value**: archive-manifest (= array facts) と doc-registry (= object facts) で shape 異なる。汎用 parser は articulation 過剰、各 detector test に thin parser helper を articulate するほうが SRP + cohesion 高い。Phase 6-8 でも同 pattern 継続可能

---

---

## DA-α-006: Phase 6 Schema Validation Detector scope 判断 (= projectization.level 範囲検証 + 1 fixture parity)

### status

- 着手判断: **closed** (Phase 6 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 10 件すべて達成)

### context

Phase 6 plan.md の作業項目:
- 5 detector 移植優先順位の **3 番目** (= range check のみ、Phase 4-5 と同 institutional pattern)
- AR-SCHEMA-VALIDATION-PZ2 (= projectization.level が 0〜4 範囲外) 検出
- schema-validation/fail-level-out-of-range fixture parity
- DA-α-006 entry articulate

scope 判断点:
1. **Level 型 (= TS `number | null`) の Go mirror**: pointer `*float64` で nil/non-nil articulate
2. **Number.isInteger の Go 等価実装**: `math.Trunc(x) == x` で float64 が integer か判定
3. **`%v` formatting parity**: TS `${5}` → "5" / `${2.5}` → "2.5" を Go `%v` で再現可能か
4. **Phase 4-5 institutional pattern の継承**: 1 file = 1 detector / 同 file test / map-or-pointer per facts shape / fixture parser per-detector / error 伝播

### decision

以下を採用する:

1. **Level = `*float64`** (= JSON null = nil で articulate):
   - JSON null は Go `*float64` に nil として unmarshal 可能
   - JSON 数値 (= integer / float) は float64 として受け取り、内部で integer check
2. **isInteger 判定 = `math.Trunc(x) == x`** (= JS Number.isInteger 等価):
   - `5.0 == math.Trunc(5.0)` → true (= integer)
   - `2.5 == math.Trunc(2.5)` (= 2.5 == 2.0) → false (= 非 integer)
   - `-1.0 == math.Trunc(-1.0)` → true (= integer、range check で reject)
3. **`fmt.Sprintf("%v", float64)` で formatting parity**:
   - Go `%v` for float64 は `%g` format を使用、5.0 → "5" / 2.5 → "2.5" / -1.0 → "-1"
   - TS template literal `${number}` と一致 (= JSON output で整数値が "5" として serialize される pattern と整合)
4. **Phase 4-5 institutional pattern 継承**:
   - 1 file = 1 detector (= schema_validation.go + schema_validation_test.go)
   - 同 file test 配置 (= 7 unit + 1 fixture parity)
   - facts shape は object (= doc-registry と同、archive-manifest の array とは異なる)
   - fixture parser per-detector (= parseSchemaValidationFacts)
   - factory error 伝播

### rationale

- **Level pointer 型**: TS `number | null` を Go で表現する canonical pattern。値型 + sentinel (= -1 = null 等) は意味不明、pointer + nil が最も clean
- **math.Trunc**: `Number.isInteger` の Go 等価実装、float64 で fractional part が 0 か判定。`%` 演算子は float64 で使えないため `math.Trunc` 経由が必要 (= alternative `math.Mod(x, 1) == 0` も等価)
- **`%v` formatting**: Go の default float formatting は `%g` (= significant digit 必要分のみ)、5.0 → "5" / 2.5 → "2.5" で TS template literal と一致。fixture expected.json の `evidence: "level=5 is not in [0, 1, 2, 3, 4]"` (= "5" not "5.0") と field-level 一致
- **institutional pattern 継承**: Phase 4-5 で確立した pattern を Phase 6 で機械的再適用、scope creep ゼロで完遂可能

### alternatives

- (a-alt) **Level = `float64` + sentinel (= -1 = null)**: 意味不明 + sentinel との range overlap、不採用
- (b-alt) **`math.Mod(x, 1) == 0` で integer check**: `math.Trunc(x) == x` と等価だが意図が読みにくい、不採用
- (c-alt) **`fmt.Sprintf("%g", float64)`**: `%v` の default も `%g` で結果同じ、明示する必要なし、不採用
- (d-alt) **Level は `int` で受ける**: JSON 数値が non-integer (= 2.5) の場合 unmarshal error で 検出ロジックが detector 外に漏れる、不採用

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. ✅ `internal/detectors/schema_validation.go` 新設 (= SchemaValidationProject + SchemaValidationFacts struct + DetectSchemaValidationViolations function)
2. ✅ `internal/detectors/schema_validation_test.go` 新設 (= 7 unit + 1 fixture parity = 8 test)
3. ✅ AAG-COA Level 0〜4 すべて valid (= TestDetectSchemaValidationViolations_AllValidLevels PASS)
4. ✅ level=5 → 1 violation (= upper out)、actual=5 / evidence="level=5 is not in [0, 1, 2, 3, 4]" / messageSeed="(5)"
5. ✅ level=-1 → 1 violation (= lower out)
6. ✅ level=2.5 → 1 violation (= 非 integer)
7. ✅ level=nil → skip (= 別 rule、本 detector scope 外)
8. ✅ schema-validation/fail-level-out-of-range fixture parity Match=true (= field-level 一致)
9. ✅ Go test 全 PASS (= cmd/aag 12 + contract 14 + fixture 16 + report 8 + detectors 21 = 計 71)
10. ✅ TS guard 1057 test PASS

### Lineage

- **preJudgementCommit**: `ff17b2b` (= coderabbit-review fix regen 後 HEAD)
- **judgementCommit**: `f2d5fae` (= Phase 6 landing commit、schema_validation detector + 8 test)
- **postJudgementRegenCommit**: `6bc10fa` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 6 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `ff17b2b` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `schema_validation.go` 新設 (= struct + factory + math.Trunc isInteger 判定)
  2. ✅ `schema_validation_test.go` 新設 (= 8 test = 7 unit + 1 fixture parity)
  3. ✅ AAG-COA Level 0〜4 すべて valid 動作
  4. ✅ level=5 violation: actual=5 / evidence + messageSeed の field-level 一致
  5. ✅ level=-1 violation
  6. ✅ level=2.5 violation
  7. ✅ level=nil skip (= 別 rule、本 detector scope 外)
  8. ✅ schema-validation/fail-level-out-of-range fixture parity Match=true
  9. ✅ Go test 全 71 PASS
  10. ✅ TS guard 1057 test PASS
- **学習**:
  - **`%v` formatting parity の wisdom**: Go default %v for float64 が %g format (= significant digit のみ) を使用、TS template literal `${number}` と一致。`5.0 → "5"` / `2.5 → "2.5"` / `-1.0 → "-1"` で fixture expected.json と field-level 一致を達成、明示 `%g` 不要
  - **math.Trunc isInteger pattern**: `Number.isInteger(x)` の Go 等価実装、`x == math.Trunc(x)` で float64 が integer か判定。`%` 演算子は float64 で使えないため必須 pattern
  - **Phase 4-5 institutional pattern の 3 連続 mechanical 再適用**: Phase 6 でも scope creep ゼロで完遂。pattern が安定、Phase 7-8 でも同 pattern で進行可能 (= institutional knowledge transfer の効率向上、Phase 0 institutional setup が長期 ROI を articulate)

---

---

## DA-α-007: Phase 7 Project Lifecycle Detector scope 判断 (= 3 状態 routing は collector 責務 + 2 fixture parity)

### status

- 着手判断: **closed** (Phase 7 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 9 件すべて達成)

### context

Phase 7 plan.md の作業項目:
- 5 detector 移植優先順位の **4 番目** (= ProjectChecklistResult 構造体再現必要、scope 中)
- AR-PROJECT-LIFECYCLE-C1 (= completed but not archived) 検出
- 2 project-lifecycle fixture (= pass-active / fail-completed-not-archived) で parity 検証
- 3 状態 (= active / completed v1 / completed v2 圧縮) routing を articulate

scope 判断点:
1. **3 状態 routing の Go 側責務**: detector で routing するか、collector の責務に閉じるか
2. **ProjectMeta full mirror vs 必要 field のみ**: TS の 10 field を全 mirror するか detector 使用 4 field のみ
3. **kind / derivedStatus enum 型化**: typed const vs raw string

### decision

以下を採用する:

1. **3 状態 routing は collector 責務、detector は state-agnostic** (= readiness refactor SRP 継承):
   - detector は `ProjectChecklistResult` を受け取って判定のみ
   - active / completed v1 / completed v2 圧縮済 のいずれの project でも collector が標準化された ProjectChecklistResult を articulate
   - Phase 9 shadow mode で実 repo 状態 routing を verify する場合は collector 拡張で対応 (= detector 不変)
2. **ProjectMeta full mirror** (= 10 field):
   - TS interface との structural identity を維持、collector 経由の JSON unmarshal が 完全 cover
   - Parent (= optional) は `*string` で nil articulate
   - 他 detector / collector 拡張時に同 struct を共有可能
3. **kind / derivedStatus を typed const enum** (= type safety):
   - `ProjectKind` (= "project" / "collection")
   - `DerivedStatus` (= "completed" / "in_progress" / "empty" / "archived" / "collection")
   - 比較が type-safe + IDE 補完 + typo 検出

### rationale

- **3 状態 routing collector 責務**: readiness refactor SRP (= collector が repo 状態を読み込み、detector が判定する) を Go 側でも維持。Phase 9 shadow mode で実 repo 状態を読む collector を実装する別 program で routing 担う、本 detector は state-agnostic に保つ。これは fixture parity test と整合 (= fixture は collector output を mock して直接 detector に流す pattern)
- **ProjectMeta full mirror**: TS interface との 1:1 mirror で structural drift を防ぐ。本 detector が使わない field (= title / status / aiContextPath 等) も struct 上に articulate、Phase 9 shadow report や後続 detector で参照候補
- **typed const enum**: Severity / Severity 同様の Go 慣用 pattern。文字列比較の typo を type system で検出可能

### alternatives

- (a-alt) **3 状態 routing を detector で**: SRP 違反、fixture parity test では routing logic が hit しない、不採用
- (b-alt) **ProjectMeta は 4 field のみ**: TS との structural drift risk、後続 detector 拡張時に re-articulate 必要、不採用
- (c-alt) **kind / derivedStatus を raw string**: type safety なし、文字列比較 typo で silent fail、不採用

### 観測点

1. ✅ `internal/detectors/project_lifecycle.go` 新設 (= ProjectKind + DerivedStatus typed enum + ProjectMeta + ProjectChecklistResult + ProjectLifecycleFacts struct + DetectProjectLifecycleViolations function)
2. ✅ `internal/detectors/project_lifecycle_test.go` 新設 (= 5 unit + 2 fixture parity = 7 test)
3. ✅ in_progress / archived / collection / empty すべて 0 violation (= TestDetectProjectLifecycleViolations_NonCompletedSkipped PASS)
4. ✅ completed + project kind → 1 violation、actual=checked / baseline=total
5. ✅ completed + collection kind → skip (= continuous collection 整合)
6. ✅ project-lifecycle/pass-active fixture parity (= active / archived / collection mix で 0 violation) Match=true
7. ✅ project-lifecycle/fail-completed-not-archived fixture parity (= 1 violation) Match=true
8. ✅ Go test 全 PASS (= cmd/aag 12 + contract 14 + fixture 16 + report 8 + detectors 28 = 計 78)
9. ✅ TS guard 1057 test PASS

### Lineage

- **preJudgementCommit**: `b1cff57` (= Phase 6 wrap-up regen 後 HEAD)
- **judgementCommit**: `aef3291` (= Phase 7 landing commit、project_lifecycle detector + 7 test)
- **postJudgementRegenCommit**: `003af40` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 7 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `b1cff57` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `project_lifecycle.go` 新設 (= ProjectKind / DerivedStatus typed enum + 3 struct + DetectProjectLifecycleViolations)
  2. ✅ `project_lifecycle_test.go` 新設 (= 7 test = 5 unit + 2 fixture parity)
  3. ✅ in_progress / archived / collection / empty すべて 0 violation
  4. ✅ completed + project kind violation: actual=7 / baseline=7 / messageSeed field-level 一致
  5. ✅ collection kind の completed は skip
  6. ✅ project-lifecycle/pass-active fixture parity Match=true (= active/archived/collection mix で 0 violation、3 状態 articulate)
  7. ✅ project-lifecycle/fail-completed-not-archived fixture parity Match=true
  8. ✅ Go test 全 78 PASS
  9. ✅ TS guard 1057 test PASS
- **学習**:
  - **3 状態 routing は collector 責務 SRP の wisdom**: detector は state-agnostic な判定のみ articulate、3 状態 routing (= active / completed v1 / completed v2 圧縮) を collector に閉じることで detector が test 可能 + 再利用可能。fixture parity test は collector mock の役割を果たす
  - **typed const enum の type safety value**: ProjectKind / DerivedStatus を const articulate することで文字列比較 typo を type system で検出。Severity と同 pattern、Phase 8 generated-metadata でも同候補
  - **ProjectMeta full mirror の forward-looking value**: detector が使わない field (= title / status / aiContextPath 等) も struct 上に articulate、Phase 9 shadow report や後続 detector 拡張時に re-articulate 不要
  - **Phase 4-6 institutional pattern の 4 連続 mechanical 再適用**: Phase 7 でも scope creep ゼロで完遂、4 連続成功 (= Phase 4/5/6/7)。残 Phase 8 (= generated-metadata advisory) も同 pattern で進行可能

---

---

## DA-α-008: Phase 8 Generated Metadata Detector scope 判断 (= severity articulate vs CI 扱いの distinction + 5 detector 移植完了)

### status

- 着手判断: **closed** (Phase 8 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 10 件すべて達成)

### context

Phase 8 plan.md の作業項目:
- 5 detector 移植優先順位の **最後** (= regex pattern 同期義務、最 careful、advisory only)
- AR-GENERATED-METADATA-G2 (= GENERATED marker / ISO timestamp 両方欠落) 検出
- generated/fail-stale-metadata fixture parity
- 5 detector 移植完了、Phase 9 shadow mode への入口

scope 進入時の重要発見:
1. **plan §8 の severity 矛盾**: plan §8 が「severity: advisory」 と articulate しているが、TS source + fixture expected.json + readiness report §7 はすべて `severity: "gate"` を articulate
2. **distinction 必要**: DetectorResult.severity (= detector 出力分類) と CI hard gate 化 (= layer 別判断) を articulate 区別する必要

### decision

以下を採用する:

1. **DetectorResult.severity = "gate"** (= TS / fixture / readiness report 一致):
   - fixture parity primary metric の strict adherence
   - readiness refactor readiness-report.md §7 hard gate 判定 table の "advisory (= MVP)" は **CI 扱い** であって detector severity ではない
2. **CI hard gate 化は Phase 10/11 で articulate** (= 別 layer 判断):
   - Phase 10 CI Advisory: 全 detector を non-blocking で導入、false positive 観測
   - Phase 11 Partial Hard Gate Promotion: 安全 detector から段階昇格、generated-metadata は最後 or advisory 継続候補
3. **regex pattern を Go literal で同期** (= 不可侵原則 4 「rule semantics を別言語に複製しない」 への最小 deviation):
   - 2 regex (= GENERATED_MARKER + ISO_TIMESTAMP) は detector 内部 const、TS と完全一致
   - 不可侵原則 4 は本来 rule **semantics** の複製禁止 (= business logic / 判断条件)、regex literal は **検出 surface** であり mechanical 同期義務として articulate
4. **DA-α-008 で distinction を transparent articulate**:
   - detector severity と CI 扱いの分離を明示
   - 後続 Phase で同じ confusion が発生しないよう institutional knowledge として残す

### rationale

- **fixture parity 優先**: 不可侵原則 10 (= fixture parity 必須) が plan §8 の「advisory」 表記より優先順位上。fixture expected.json と Match=true を達成する severity = "gate" を採用、plan §8 の「advisory」 表記は CI layer 解釈と判定
- **distinction articulate**: detector が emit する severity と CI が hard fail として扱うかは別 layer。readiness refactor readiness-report.md §7 でも "MVP 4 hard gate + 1 advisory" と articulate しているのは CI 判定で、detector severity 自体は 5 件すべて "gate"
- **regex literal の mechanical 同期**: 不可侵原則 4 は business logic (= 「level >= 0 && level <= 4」 等の判断条件) の複製禁止。regex pattern は **検出 surface 定義** であり、TS / Go で同 literal を articulate するのは scope 内 (= readiness refactor の「rule source は TS 維持、engine は merged JSON 経由」 の例外として regex は detector 内部に閉じる)

### alternatives

- (a-alt) **severity = "warn" を Go で emit** (= plan §8 表記通り): fixture parity 100% 違反、不可侵原則 10 strict adherence 整合性低下、不採用
- (b-alt) **plan §8 を update** (= "advisory" → "gate, CI 扱いは advisory"): plan は archive 候補、本 DA-α-008 で transparent articulate するほうが institutional knowledge transfer 効率高、不採用
- (c-alt) **regex を merged JSON 経由で読む**: scope 過剰、readiness refactor merged JSON は rule definitions、detector internal regex は別 articulation、不採用

### 観測点

1. ✅ `internal/detectors/generated_metadata.go` 新設 (= GeneratedMetadataFacts + GeneratedMetadataFile struct + DetectGeneratedMetadataViolations function + 2 regex const)
2. ✅ `internal/detectors/generated_metadata_test.go` 新設 (= 7 unit + 1 fixture parity = 8 test)
3. ✅ regex pattern が TS source と literal 一致 (= GENERATED_MARKER 3 形式 + ISO_TIMESTAMP)
4. ✅ marker のみ / timestamp のみ / 両方 で 0 violation
5. ✅ 両方欠落で 1 violation、severity="gate" / evidence="no GENERATED marker AND no ISO timestamp"
6. ✅ generated/fail-stale-metadata fixture parity Match=true
7. ✅ 5 detector 移植完了 (= archive-manifest + doc-registry + schema-validation + project-lifecycle + generated-metadata)
8. ✅ 8 fixture parity 100% 達成 (= readiness refactor Phase 5 deliverable と完全一致)
9. ✅ Go test 全 PASS (= cmd/aag 12 + contract 14 + fixture 16 + report 8 + detectors 35 = 計 85)
10. ✅ TS guard 1057 test PASS

### Lineage

- **preJudgementCommit**: `38729fe` (= Phase 7 wrap-up regen 後 HEAD)
- **judgementCommit**: `7ae46cf` (= Phase 8 landing commit、generated_metadata detector + 8 test、5 detector 移植完了)
- **postJudgementRegenCommit**: `936c467` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 8 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `38729fe` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `generated_metadata.go` 新設 (= struct + factory + 2 regex const、~95 line)
  2. ✅ `generated_metadata_test.go` 新設 (= 8 test = 7 unit + 1 fixture parity)
  3. ✅ regex pattern が TS source と literal 一致 (= GENERATED_MARKER 3 形式 + ISO_TIMESTAMP)
  4. ✅ marker のみ / timestamp のみ / 両方 で 0 violation (= 4 marker variant test PASS)
  5. ✅ 両方欠落で 1 violation、severity="gate" 一致 (= TS / fixture / readiness report 整合)
  6. ✅ generated/fail-stale-metadata fixture parity Match=true
  7. ✅ **5 detector 移植完了** (= archive-manifest + doc-registry + schema-validation + project-lifecycle + generated-metadata)
  8. ✅ **8 fixture parity 100% 達成** (= 全 fixture coverage、readiness refactor Phase 5 deliverable と完全一致)
  9. ✅ Go test 全 85 PASS
  10. ✅ TS guard 1057 test PASS
- **学習**:
  - **detector severity と CI 扱いの distinction が institutional knowledge として articulate される必要**: plan §8 が「severity: advisory」 と articulate していたが TS / fixture / readiness report は "gate"。この confusion は plan の不正確な articulate (= 2 layer を conflate) が原因、本 DA-α-008 で transparent articulate することで Phase 10/11 で同 confusion を防止
  - **fixture parity 優先 (= 不可侵原則 10) が plan §8 の「advisory」 表記より優先順位上**: plan は draft、canonical は schema + fixture + readiness report。canonical 整合を取るのが正しい
  - **regex literal の検出 surface 定義 vs business logic 複製の distinction**: 不可侵原則 4 「rule semantics を別言語に複製しない」 は business logic (= 「level >= 0」 等の判断条件) を念頭に置く articulate。regex pattern は検出 surface (= 何を文字列として look するか) であり、TS / Go で同 literal を articulate するのは scope 内、本 distinction も institutional knowledge として transparent 化
  - **Phase 4-7 institutional pattern の 5 連続 mechanical 再適用**: Phase 8 でも scope creep ゼロで完遂、5 detector 全移植完了。残 Phase 9-12 は detector 追加ではなく shadow mode / CI / hard gate / closure 系、Phase 4-8 とは異なる scope

---

---

## DA-α-009: Phase 9 Shadow Mode scope 判断 (= 5 detector × 8 fixture 集約 + RunResult schema 拡張 + CLI shadow subcommand)

### status

- 着手判断: **closed** (Phase 9 完遂、Lineage 実 sha articulate 済)
- 振り返り判定: **正しい** (= 観測点 11 件すべて達成)

### context

Phase 9 plan.md の作業項目:
- Go engine と既存 TS AAG を並走、parity / drift report
- 5 detector × 8 fixture = 40 parity 検証点で TS と Go が同 DetectorResult[] を返すことを集約検証
- TS detector との差分 report
- false positive / false negative 記録
- DA-α-009 entry articulate

scope 判断点:
1. **shadow runner の package 配置**: `internal/shadow/` 別 package vs `internal/fixture/` 拡張
2. **TS との差分 report の手段**: TS を Go から実行 vs fixture expected (= TS 出力 captured) との比較
3. **CLI integration 形式**: 新 subcommand `aag shadow` vs `aag fixtures` 拡張
4. **RunResult schema 拡張**: ShadowSummary をどう embed するか
5. **dispatch logic**: 各 fixture を appropriate detector に route する mechanism

### decision

以下を採用する:

1. **`internal/shadow/` 別 package** (= Phase 4 institutional pattern 継承):
   - shadow runner は detector + fixture を combine する layer、別 package で SRP 整合
   - 4 層 layered model の延長 (= shadow = 集約 evaluator + report 統合)
2. **fixture parity を主軸、TS 直接実行は scope 外**:
   - TS detector を Go から exec する scope 過剰 (= node binary 実行 + JSON 出力 capture が必要)
   - fixture expected.json を「TS detector の captured output」 と articulate (= readiness refactor Phase 5 で articulate 済 design)
   - 不可侵原則 10 (= fixture parity 必須) 整合、primary success metric は fixture parity 100%
3. **CLI 新 subcommand `aag shadow`**:
   - validate / fixtures は responsibility が明確、shadow を embed すると意味的 conflate
   - shadow は parity 集約専用 subcommand として articulate
4. **RunResult.ShadowSummaryRaw = `json.RawMessage`** (= 循環依存回避):
   - `report` package が `shadow` package を import すると循環依存 risk (= shadow が contract / fixture を import、report も同)
   - raw JSON で持つことで CLI 側で `json.Marshal(summary)` → embed の clean 経路
5. **dispatch logic = fixture name prefix routing**:
   - `archive-v2/` → archive-manifest detector
   - `doc-registry/` → doc-registry detector
   - `generated/` → generated-metadata detector
   - `project-lifecycle/` → project-lifecycle detector
   - `schema-validation/` → schema-validation detector
   - 想定外 prefix → Skipped articulate (= forward-compatible)

### rationale

- **別 package**: Phase 4-8 で確立した「1 layer = 1 package」 pattern。shadow は detector layer の上の集約 layer、別 package が natural
- **fixture parity 主軸**: readiness refactor Phase 5 で fixture corpus を articulate した目的そのもの (= TS と Go の parity 主軸 metric)。実 TS 実行は別 program (= aag-engine-shadow-mode-runner-impl 等) で articulate 候補
- **`aag shadow` 新 subcommand**: validate / fixtures / shadow が意味的に明確分離、CLI usage が transparent
- **`json.RawMessage` で循環依存回避**: shadow → report 依存 + report → shadow 依存の dual import を避ける Go 慣用 pattern
- **prefix routing**: fixture directory 構造 (= fixtures/aag/<system>/<scenario>/) と 1:1 対応、追加 fixture も自動 dispatch

### alternatives

- (a-alt) **shadow logic を fixture package に embed**: SRP 違反、Phase 5 fixture package は loader / Compare primitive 専用、不採用
- (b-alt) **TS detector を Go から exec**: scope 過剰 (= node + npm + 各種環境依存)、fixture parity で代替可能、不採用
- (c-alt) **`aag fixtures --shadow` flag**: subcommand 内 flag で behavior 切替は ambiguity 増加、不採用
- (d-alt) **RunResult に shadow.Summary 直接 embed**: 循環依存、不採用 (= json.RawMessage で代替)
- (e-alt) **dispatch を detector 側で articulate** (= 各 detector が「自身が処理可能な fixture」 を判定): logic 分散、shadow runner で集約 dispatch のほうが SRP 整合、不採用

### 観測点

1. ✅ `internal/shadow/shadow.go` 新設 (= FixtureResult + Summary struct + Run + dispatch + 5 run* function)
2. ✅ `internal/shadow/shadow_test.go` 新設 (= 9 test、real repo 8 fixture を全 dispatch 検証含む)
3. ✅ Run が real repo の 8 fixture を全 dispatch、Match=8 / Mismatched=0 / Skipped=0
4. ✅ 5 detector すべてが少なくとも 1 fixture を route (= coverage 検証)
5. ✅ AllMatched が edge case (= empty / partial / skipped) を articulate
6. ✅ `aag shadow --repo .` が ShadowSummary を JSON 出力、status="pass" / total=8 / matched=8
7. ✅ `aag shadow --repo /nonexistent` が ExitError + load error message
8. ✅ `aag shadow /tmp/oops` (= positional arg) が ExitError + hint
9. ✅ RunResult.ShadowSummaryRaw が `json.RawMessage` で 循環依存 回避
10. ✅ Go test 全 PASS (= cmd/aag 15 + contract 14 + fixture 16 + report 8 + detectors 35 + shadow 9 = 計 97)
11. ✅ TS guard 1057 test PASS

### Lineage

- **preJudgementCommit**: `00029a6` (= Phase 8 wrap-up regen 後 HEAD)
- **judgementCommit**: `56d8b66` (= Phase 9 landing commit、shadow.go + shadow_test.go + report ShadowSummaryRaw + main.go runShadow + 3 main_test test、shadow runner で 5 detector × 8 fixture 集約)
- **postJudgementRegenCommit**: `c1064a5` (= §13.3 Pattern A application)
- **retrospectiveCommit**: 本 Phase 9 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `00029a6` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい**
- **観測点達成状況**:
  1. ✅ `internal/shadow/shadow.go` 新設 (= FixtureResult + Summary struct + Run + dispatch + 5 run* per-detector function、~180 line)
  2. ✅ `internal/shadow/shadow_test.go` 新設 (= 9 test = 1 fixture parity + 1 coverage + 4 AllMatched edge + 1 nonexistent + 1 dispatch mapping + 1 counts)
  3. ✅ Run が real repo の 8 fixture を全 dispatch、Match=8 / Mismatched=0 / Skipped=0 (= AllMatched()=true)
  4. ✅ 5 detector すべてが少なくとも 1 fixture を route (= TestRun_AllDetectorsCovered で coverage 検証 PASS)
  5. ✅ AllMatched が edge case を articulate (= empty=false / partial=false / skipped=false / all-matched=true の 4 test PASS)
  6. ✅ `aag shadow --repo .` が ShadowSummary を JSON 出力、status="pass" / total=8 / matched=8
  7. ✅ `aag shadow --repo /nonexistent` が ExitError + load error message (= TestRun_Shadow_NonexistentRepo PASS)
  8. ✅ `aag shadow /tmp/oops` (= positional arg) が ExitError + hint (= TestRun_Shadow_UnexpectedPositionalArg PASS、Phase 1 deliverable bug fix pattern を shadow に拡張)
  9. ✅ RunResult.ShadowSummaryRaw が `json.RawMessage` で 循環依存 回避 (= shadow → contract / fixture import、report → shadow 直接 import 不要、JSON marshal 経由で embed)
  10. ✅ Go test 全 PASS (= cmd/aag 15 + contract 14 + fixture 16 + report 8 + detectors 35 + shadow 9 = 計 97)
  11. ✅ TS guard 1057 test PASS
- **学習**:
  - **fixture parity 100% 集約 達成 = primary success metric の clearance**: 不可侵原則 10 (= fixture parity 必須) が Phase 4〜8 で per-detector 達成、Phase 9 で集約 runner が一回の `aag shadow` invocation で 40 parity 検証点 (= 5 detector × 8 fixture) を articulate。これは AAG Engine MVP の primary success metric であり、Phase 11 hard gate 昇格条件の前提
  - **`json.RawMessage` 循環依存回避 pattern の institutional knowledge 化**: report package が shadow 結果を embed する際、direct shadow import は循環依存 risk (= shadow が contract / fixture を import、report も同)。`json.RawMessage` 経由で CLI 側 (= main.go) で marshal → embed する pattern は、Go の package layering で集約 layer を embed する典型的解、後続 program で同 pattern が articulate される候補
  - **fixture name prefix routing の forward-compatibility**: dispatch logic を fixture name prefix で articulate (= `archive-v2/` → archive-manifest 等) することで、新 fixture 追加時に shadow runner 修正不要。想定外 prefix は Skipped articulate で graceful degradation。これは readiness refactor で articulate された fixtures/aag/<system>/<scenario>/ 構造の design intent そのもの
  - **TS 直接実行を scope 外に articulate した judgement 妥当性**: shadow mode 主軸を fixture parity (= TS captured output) に置く judgement は、scope 過剰回避 + deterministic parity 検証 + node binary 環境依存回避の 3 観点で正解。実 TS detector を Go から exec する program は別 articulate 候補 (= aag-engine-shadow-mode-runner-impl 等) であり、本 MVP scope 外
  - **Phase 4-8 institutional pattern の Phase 9 適応 (= 集約 layer)**: Phase 4-8 は detector layer (= 1 file=1 detector + factory error propagation + typed enums)、Phase 9 は集約 layer (= 1 package = shadow runner + per-detector run* function)。pattern は scope (= layer) に応じて adapt するが、SRP / 1 file=1 責務 / typed const enum / table-driven test の 4 軸は共通維持

---

## DA-α-010: Phase 10 CI Advisory scope 判断 (= 別 workflow file 配置 + advisory non-blocking + 既存 ci.yml 完全独立)

### status

- 着手判断: **closed** (Phase 10 landing 段階の AI session reach 範囲完遂、Lineage 実 sha articulate 済、operational deferred 2 件は user / Phase 11 closure 判断)
- 振り返り判定: **正しい** (= AI session reach 観測点 9 件すべて達成、operational deferred 2 件 = 不可侵原則 8 整合維持)

### context

Phase 10 plan.md の作業項目:
- `.github/workflows/` に Go engine job を non-blocking で追加
- CI 上で安定実行 (= flake 0 件、最低 5 連続 success)
- 実行時間が許容範囲 (= 既存 fast-gate に圧迫を与えない、+30 秒以下推奨)
- 2〜4週間 false positive を観測 (= 観測 log を `discovery-log.md` に articulate)
- DA-α-010 entry articulate

scope 判断点:
1. **新 workflow file vs 既存 ci.yml 拡張**: 別 file articulate vs ci.yml に job 追加
2. **advisory non-blocking の articulate 手段**: continue-on-error / branch protection 非登録 / 別 workflow file の中から選択
3. **fast-gate 圧迫回避**: 既存 fast-gate (= wasm-build / fast-gate / docs-health / e2e) との並列性
4. **project-metadata.json の ciJobs 更新有無**: ciJobs は ci.yml 限定 enumeration、別 workflow への影響
5. **5 連続 success / 2〜4 週間観測の実装 AI scope**: 不可侵原則 8 (= 実装 AI が最終レビューを [x] にしない) との整合

### decision

以下を採用する:

1. **新 workflow file `.github/workflows/aag-engine.yml`** (= 既存 ci.yml と完全独立):
   - Go engine は app と異なる runtime (= Go 1.24 vs Node)、別 workflow が semantic に明確
   - ci.yml の dependency graph (= wasm-build → fast-gate → others) に組み込まない (= advisory layer 維持)
   - branch protection の required checks に登録しない限り **non-blocking by isolation**
2. **advisory non-blocking = workflow file 分離 + branch protection 非登録**:
   - `continue-on-error: true` は subsequent job 影響制御のみ、workflow status 自体は失敗扱い
   - 完全 isolation のほうが「advisory」 の articulate が transparent (= ci.yml status と分離表示)
   - branch protection 登録判断は Phase 11 (Partial Hard Gate Promotion) で per-detector layer 別判断
3. **既存 fast-gate には影響なし** (= 別 workflow + 並列実行):
   - aag-engine.yml は ci.yml と並列に走る (= concurrency group 別、`aag-engine-${{ github.ref }}`)
   - ci.yml の fast-gate / docs-health / test-coverage / e2e に dependencies 追加せず
4. **ciJobs list 変更不要** (= documentConsistency.test.ts ciJobs 検証は ci.yml 限定):
   - test 実装 (`it('ci.yml のジョブ名が project-metadata.json と一致する')`) は ci.yml のみ scan
   - aag-engine.yml は別 workflow file のため ciJobs に含めない (= scope 整合)
   - project-metadata.json $comment にのみ articulate (= obligation map: .github/workflows/ → project-metadata.json 確認 履行)
5. **5 連続 success / 2〜4 週間観測 = operational deferred**:
   - 不可侵原則 8 整合、AI session 内で「5 連続 success 観測」 「2〜4 週間 false positive 観測」 を [x] flip しない
   - landing commit では checkbox 1 (job 追加) + 5 (DA-α-010 articulate) のみ flip
   - 実行時間 articulate (checkbox 3) は CI 1 回目実行後の wrap-up で flip 候補
   - checkbox 2 (5 連続) + 4 (2〜4 週間) は user 判断 / Phase 11 closure で flip

### rationale

- **別 workflow file**: app CI (= Node + WASM build + Pages deploy) と Go engine governance は **責務が異なる**。1 ファイル統合は SRP 違反、Go 関連の workflow 修正で app CI を破壊する risk あり
- **isolation による advisory**: GitHub Actions の `continue-on-error` は次 job への影響制御のみ、workflow status は失敗扱い。advisory 化の最も transparent な articulate は workflow file を分離 + branch protection に登録しない (= operational layer)。Phase 11 で hard gate 化する場合は branch protection 登録という明確な flip point を articulate
- **並列実行による fast-gate 影響回避**: ci.yml と aag-engine.yml は GitHub Actions の workflow 単位で並列 dispatch。fast-gate の wall time に圧迫を与えない (= +0 秒、別 runner で並列消費)。実行時間 budget 「+30 秒以下推奨」 は **advisory 単独 workflow の wall time** を articulate、locally 測定で 30 秒以下確認済 (= go test 0.18s + build 0.08s + 3 subcommand each <0.01s、setup-go cold は ~10-20s 想定)
- **ciJobs 更新不要**: ciJobs validation は ci.yml 限定の機械検証。aag-engine.yml は別 workflow のため ciJobs に追加すると false positive (= test 失敗) を招く。`$comment` に articulate するのは documentation steward 義務、ciJobs list の semantic は維持
- **operational deferred の articulate**: 5 連続 success + 2〜4 週間観測は **AI session の reach 外**。不可侵原則 8 「AI が最終レビューを [x] にしない」 整合、operational verification は user / Phase 11 closure 判断で flip。Phase 9 では fixture parity が同 session で機械検証可能だったが、Phase 10 は operational 観測で時間軸が異なる

### alternatives

- (a-alt) **ci.yml に job 追加 + continue-on-error**: workflow status は失敗扱い、advisory 表示が ambiguous、ciJobs 更新も必要、不採用
- (b-alt) **GitHub Actions reusable workflow (`workflow_call`)**: scope 過剰、単一 advisory job に reusable は overengineering、不採用
- (c-alt) **continue-on-error: true on each step**: step 失敗を mask、parity drift 検出が不可視化、不採用
- (d-alt) **ciJobs に aag-engine-advisory 追加**: documentConsistency test (= ci.yml only scan) が false positive、不採用
- (e-alt) **landing commit で checkbox 2 + 4 も [x] flip**: 不可侵原則 8 違反 (= 観測未達で AI 自己 approval)、不採用

### 観測点

1. ✅ `.github/workflows/aag-engine.yml` 新設 (= advisory non-blocking workflow、go test + 3 subcommand)
2. ✅ workflow file が ci.yml dependency graph と独立 (= ci.yml `needs:` に登録なし、別 concurrency group "aag-engine-${{ github.ref }}")
3. ✅ project-metadata.json `$comment` に Phase 10 workflow 追加を articulate (= obligation map 履行、follow-up commit で fetch-depth fix も articulate)
4. ✅ ciJobs list 変更なし (= ci.yml 限定 enumeration semantic 維持、documentConsistency test 34 PASS)
5. ✅ documentConsistency test PASS (= ciJobs check が false positive 起こさない)
6. ✅ locally Go engine 4 step (= go test + build + fixtures + validate + shadow) すべて pass、shadow AllMatched()=true
7. ✅ Go test + 3 subcommand の wall time articulate (= locally engine 部分 < 1 秒、CI 1 回目 wall time 約 32 秒 = setup-go cold 含む institutional cost、ci.yml fast-gate への並列実行 wall time impact = +0 秒)
8. ✅ Go test 全 PASS (= 97 test、Phase 9 deliverable と同) + TS guard 1057 PASS
9. ✅ CI 1 回目 success 観測 (= GitHub Actions run 25382855354、aag-engine-advisory job 14:35:03Z 開始 / 14:35:35Z 完了 / conclusion=success)
10. 🔁 5 連続 success 観測 (= operational deferred、user / Phase 11 closure で flip)
11. 🔁 2〜4 週間 false positive 観測 (= operational deferred、user / Phase 11 closure で flip、`discovery-log.md` に articulate)

凡例: ✅ AI session 内達成、🔁 operational deferred (= 不可侵原則 8 整合、AI session 内 [x] flip しない、user / Phase 11 closure 判断)。

### Lineage

- **preJudgementCommit**: `593271b` (= Phase 9 wrap-up + polish 後 HEAD)
- **judgementCommit**: `224bb5a` (= Phase 10 landing commit、aag-engine.yml 新設 + project-metadata.json $comment + DA-α-010 articulate + checklist 2 件 flip)
- **postJudgementRegenCommit**: `e510e47` (= §13.3 Pattern A application)
- **postJudgementFollowUpCommits**: `ff9de3b` (= ciFetchDepthGuard fix) + `3c0087b` (= project-metadata.json $comment follow-up、obligation 履行)
- **retrospectiveCommit**: 本 Phase 10 wrap-up commit
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `593271b` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい** (= AI session reach 観測点 9 件すべて達成、operational deferred 2 件 = 不可侵原則 8 整合維持)
- **観測点達成状況**:
  1. ✅ aag-engine.yml 新設 (= 50 行、advisory non-blocking、5 step = checkout + setup-go + go test + go build + 3 subcommand)
  2. ✅ workflow 完全独立 (= ci.yml `needs:` に登録なし、別 concurrency group、別 runner で並列実行)
  3. ✅ project-metadata.json $comment 2 段 articulate (= 224bb5a で workflow 新設、3c0087b で fetch-depth fix follow-up)
  4. ✅ ciJobs list 変更なし (= aag-engine.yml 別 workflow scope 整合)
  5. ✅ documentConsistency test 34 PASS
  6. ✅ locally Go engine 4 step すべて pass (= go test 0.18s + build 0.08s + 3 subcommand each <0.01s)
  7. ✅ CI wall time 約 32 秒 (= setup-go cold 含む、+30 秒推奨 target に対し許容範囲、ci.yml fast-gate impact = 0)
  8. ✅ Go test 97 PASS + TS guard 1057 PASS
  9. ✅ **CI 1 回目 success 達成** (= GitHub Actions run 25382855354、aag-engine-advisory job conclusion=success)
  10. 🔁 5 連続 success 観測 = operational deferred (= user / Phase 11 closure 判断)
  11. 🔁 2〜4 週間 false positive 観測 = operational deferred (= user / Phase 11 closure 判断)
- **学習**:
  - **isolation による advisory が Phase 11 hard gate flip point を transparent 化**: branch protection の required checks に登録するか否かが advisory ↔ hard gate の明確な flip point。`continue-on-error` よりも institutional に分かりやすい (= operational change が単一 setting で完了)
  - **ciFetchDepthGuard institutional default の重要性**: 新 workflow 追加時 fetch-depth: 0 を default にする institutional rule が、Phase 11 の last-modified 解析拡張余地を未然に確保。Phase 10 で local では不要だったが、Phase 11 hard gate 昇格時の project-lifecycle 検出等で必要になる候補
  - **obligation map (= .github/workflows/ → project-metadata.json 確認) の per-commit 履行義務**: HEAD~1 diff scope で obligation 検出するため、後続 fix commit も project-metadata.json $comment update を伴う必要。AAG-REQ-NO-AMEND と組み合わせると「workflow modify → 必ず metadata $comment update を含む follow-up commit」 という pattern を articulate
  - **operational deferred の articulate 必要性**: 5 連続 success / 2〜4 週間 観測 は AI session の reach 外。不可侵原則 8 整合のため、landing commit で `[ ]` 維持 + DA で 🔁 articulate + Phase 11/12 closure で flip 候補。Phase 9 (= 即時機械検証可能) と Phase 10 (= operational long-term observation) の質的違いを institutional knowledge として transparent 化
  - **§13.1 二段 commit pattern の Phase 10 拡張**: landing + regen + 2 follow-up commit (= guard fix + metadata follow-up) + wrap-up = 5 commit/Phase。Phase 0-9 の 4 commit/Phase より +1、obligation 履行と guard 整合の per-commit 義務が追加 articulate。Phase 11 hard gate 昇格時にも同様の commit chain が articulate される候補

---

## DA-α-011: Phase 11 Partial Hard Gate Promotion 提案 (= archive-manifest hard gate scaffold + 残 4 detector per-detector judgement + user approval 待ち)

### status

- 着手判断: **open / pending user approval** (= AI session reach 範囲で structural prep + 提案 articulate 完遂、checkbox 1 = hard gate 化 (operational change) + checkbox 4 = user approval entry は user 判断必須)
- 振り返り判定: **未** (= user approval + branch protection 登録後の wrap-up commit で articulate 予定)

### context

Phase 11 plan.md / checklist の作業項目:
- 最低 1 detector (= archive manifest 推奨) が hard gate 化
- 昇格 detector の fixture parity 100% / shadow mode 期間 false positive 0 / TS 差分 0 を articulate
- rollback path 確保 (= TS guard が hard gate を引き続き保持、Go は補完)
- user approval を `decision-audit.md` で articulate
- 残り detector の hard gate 化判定 (= 昇格 / 見送り) が per-detector articulate
- DA-α-011 entry articulate

scope 判断点:
1. **どの detector を最初に hard gate 化するか**: 5 detector (= archive-manifest / doc-registry / schema-validation / project-lifecycle / generated-metadata) のうち最 deterministic な候補
2. **hard gate 化の structural mechanism**: 既存 aag-engine.yml advisory に組み込む vs 別 workflow file 分離
3. **AI session reach の boundary**: structural prep (= AI doable) vs operational change (= branch protection 登録、user 判断)
4. **rollback path の articulate**: TS guard 並存維持の institutional knowledge 化
5. **残り 4 detector の judgement**: 昇格 vs 見送りの per-detector articulate
6. **不可侵原則 8 (= AI が最終レビューを [x] にしない) との整合**: user approval 待ち項目を transparent 化

### decision (= 提案、user approval 待ち)

以下を提案する (= user 承認後に Phase 11 wrap-up で確定):

1. **archive-manifest detector を最初の hard gate 候補として articulate**:
   - rationale: 5 detector の中で最 deterministic (= 12 required field 単純判定、regex / 動的状態 / timestamp / file system race 依存なし)
   - fixture parity 100% 達成 (= Phase 4 で archive-v2 3 fixture すべて Match=true、Phase 9 shadow runner 集約で drift 0 観測)
   - TS 側にも同 rule に対応する archive v2 schema guard が hard gate 維持 (= rollback path 自動確保)
2. **structural mechanism = 別 workflow file `.github/workflows/aag-engine-archive-manifest-hardgate.yml`**:
   - aag-engine.yml (= advisory all-detector) と完全分離
   - 1 job (= aag-engine-archive-manifest-hardgate) で archive-manifest unit + fixture parity + shadow runner integration を verify
   - branch protection 未登録 = 現在は advisory、user 承認 + branch protection 登録で hard gate 効果 articulate
3. **AI session reach boundary = structural prep のみ articulate**:
   - 不可侵原則 8 整合、AI session で operational change (= branch protection 登録) は実行しない
   - user approval entry (= DA-α-011 §user-approval section) + branch protection 登録は user 判断
   - landing commit でフリップする checkbox は 2 (parity articulate) + 3 (rollback articulate) + 5 (per-detector judgement articulate) + 6 (DA-α-011 articulate) のみ
4. **rollback path = TS guard 並存維持 strict adherence**:
   - readiness refactor 不可侵原則 5 + 本 MVP 不可侵原則 2 整合
   - Go hard gate 化後も TS 側 archive v2 schema guard を削除しない (= dual gate 状態を maintain)
   - drift 発生時の rollback = branch protection から `aag-engine-archive-manifest-hardgate` を外すだけ (= TS guard が単独で hard gate 維持)
5. **残り 4 detector の per-detector judgement (= 提案)**:

| detector | 提案 | 根拠 |
|---|---|---|
| archive-manifest | **昇格 (= Phase 11 first)** | 最 deterministic、TS schema guard 並存、fixture parity 100% / shadow drift 0 観測済 |
| doc-registry | **見送り (= Phase 12 closure で再評価)** | path normalization 規約依存 + repo 内 path 動的変化、Go と TS の path resolution 微妙な drift risk あり |
| schema-validation | **見送り (= Phase 12 closure で再評価)** | level integer 判定は単純だが、projectization.json schema 拡張時に Go / TS 両側で同期義務発生、advisory 期間延長で drift 観測価値高 |
| project-lifecycle | **見送り (= Phase 12 closure で再評価)** | 3 状態 routing は collector 責務、本 detector state-agnostic だが collector 側の Archive v2 圧縮済 project read 経路が institutional に not yet articulate |
| generated-metadata | **永続 advisory** | sourceCommit / generatedAt / shallow clone / regen timing による false positive 余地あり、Phase 8 で institutional articulate 済、CI hard gate 化は plan §8 articulate と整合せず |

6. **user approval 待ち = checkbox 1 + 4 を `[ ]` 維持**:
   - checkbox 1 (hard gate 化) = branch protection 登録 = user operational action
   - checkbox 4 (user approval entry) = user による DA-α-011 §user-approval 追記 = user 判断
   - 本 landing commit で AI が articulate する DA-α-011 は **提案** であり user approval ではない

### rationale

- **archive-manifest 最初昇格の妥当性**: 5 detector 中 archive-v2 schema guard と 1:1 対応する最 deterministic rule。fixture parity 100% は Phase 4 で達成、shadow drift 0 は Phase 9 で観測、CI 1 回目 success は Phase 10 で確認。Hard gate 化に必要な 3 件 evidence すべて articulate 済
- **別 workflow file 分離の institutional 整合**: Phase 10 で articulate した「isolation による advisory」 institutional knowledge と整合。hard gate 候補 workflow も「isolation による hard gate readiness」 として branch protection 登録 = 単一 operational flip point articulate
- **AI session reach boundary の strict adherence**: 不可侵原則 8 が「実装 AI が最終レビューを [x] にしない」 を要求。Phase 11 は最終レビュー手前の hard gate promotion であり、user approval 必須項目を [x] flip すると不可侵原則 8 違反 + readiness refactor で institute された AI 自己 approval 禁止 institutional knowledge 違反
- **per-detector judgement table の transparent 化**: 5 detector 個別判定により、後続 Phase / program で rollback / 追加 hard gate 化判定が per-detector 履行可能 (= 一括判断ではなく detector-by-detector の institutional knowledge transfer)
- **rollback path = TS guard 並存維持**: readiness refactor 不可侵原則 5「TS guard を全廃しない」 が本 MVP 不可侵原則 2 として継承。drift 発生時 = `aag-engine-archive-manifest-hardgate` を branch protection から外すだけで TS guard が単独 hard gate 維持、Go 削除や revert 不要 = operational rollback path 確保

### alternatives

- (a-alt) **doc-registry を最初昇格**: path normalization 規約依存 + repo 内 path 動的変化、archive-manifest より drift risk 高、不採用
- (b-alt) **schema-validation を最初昇格**: level integer 判定は単純だが MVP scope 内で fixture も 1 件のみ、archive-manifest の 3 fixture coverage より articulate 不足、不採用
- (c-alt) **5 detector 一括 hard gate 化**: 不可侵原則 5 違反 (= MVP では即置換しない)、false positive risk 集中、rollback 単位が粗い、不採用
- (d-alt) **既存 aag-engine.yml に hard gate job 追加**: advisory と hard gate semantics の混在、branch protection UI で job 単位選択は可能だが workflow file 単位 isolation のほうが institutional knowledge transfer 効率高、不採用
- (e-alt) **AI session で branch protection 登録**: operational change を AI が代行、不可侵原則 8 違反 + 後続 user 判断機会の喪失、不採用
- (f-alt) **landing commit で checkbox 1 + 4 も AI 単独 flip**: 不可侵原則 8 strict adherence 違反、operational verification を AI 自己 approve、不採用

### 観測点

1. ⏳ `.github/workflows/aag-engine-archive-manifest-hardgate.yml` 新設 (= hard gate 候補 workflow、archive-manifest unit + fixture parity + shadow integration)
2. ⏳ workflow が aag-engine.yml と完全独立 (= 別 concurrency group "aag-engine-archive-manifest-${{ github.ref }}")
3. ⏳ project-metadata.json `$comment` に Phase 11 workflow 追加を articulate (= obligation map 履行)
4. ⏳ archive-manifest unit + fixture parity test (= 5 + 3 = 8 test) すべて PASS
5. ⏳ shadow runner integration test (= 9 test) すべて PASS
6. ⏳ rollback path 確保 articulate (= TS 側 archive v2 schema guard 並存維持 + branch protection 外しで rollback、本 DA §rationale)
7. ⏳ per-detector judgement table articulate (= 5 detector × 昇格/見送り/永続 advisory、本 DA §decision-5)
8. ⏳ fixture parity 100% / shadow drift 0 / TS 差分 0 articulate (= Phase 4/9/10 の cumulative observation を本 DA で集約)
9. ⏳ Go test 全 PASS (= 97 test、Phase 9 deliverable と同) + TS guard 1057 PASS
10. 🔁 user approval entry 追記 (= DA-α-011 §user-approval section、user 判断、checkbox 4 flip 候補)
11. 🔁 branch protection に `aag-engine-archive-manifest-hardgate` 登録 (= operational change、user 判断、checkbox 1 flip 候補)
12. 🔁 hard gate 化後の CI 1 回目 success 観測 (= user 操作後、wrap-up commit で flip 候補)

凡例: ⏳ AI session 内達成、🔁 user / operational change 待ち。

### user-approval (= 本 section は user が直接編集して articulate)

> **本 section は user が approval 後に直接編集する**。AI 自動 flip 禁止 (= 不可侵原則 8 strict adherence)。
>
> approval entry template:
> ```
> - approver: <username>
> - approvedAt: <YYYY-MM-DD>
> - approvedScope: archive-manifest detector を partial hard gate に昇格、TS guard 並存維持、その他 4 detector は §decision-5 提案通り
> - branch-protection-action: GitHub Settings → Branches → main → required checks に `aag-engine-archive-manifest-hardgate` を追加
> - rollback-procedure: drift 観測時は branch protection から `aag-engine-archive-manifest-hardgate` を外す (= TS guard が単独で hard gate 維持)
> ```

(本 entry は user approval 待ち、未記入)

### Lineage

- **preJudgementCommit**: `8bc952d` (= Phase 10 wrap-up regen 後 HEAD)
- **judgementCommit**: 本 Phase 11 landing commit
- **postJudgementRegenCommit**: 該当時 §13.3 適用
- **retrospectiveCommit**: 本 Phase 11 wrap-up commit (= user approval 後、operational change 後)
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `8bc952d` を SHA 直接参照)

### 振り返り判定

(= Phase 11 wrap-up commit で user approval + operational change 後に articulate 予定。観測点 1〜9 (= AI session reach 達成) + 10/11/12 (= user / operational 待ち) の articulate を後続 commit で update。)

---

## DA-α-012: Phase 12 Closure / Next Architecture Decision 提案 (= A〜E option 整理 + 推奨判断 articulate + 後続 program 候補 articulate + user 判断待ち)

### status

- 着手判断: **open / pending user judgement** (= AI session reach 範囲で 5 option 整理 + 推奨判断 articulate 完遂、A〜E のいずれかの最終 user 判断は user に articulate を委ねる、不可侵原則 8 strict adherence)
- 振り返り判定: **未** (= user 判断後の Phase 12 wrap-up commit + 最終レビュー で articulate 予定)

### context

Phase 12 plan.md の作業項目:
- A〜E のいずれかで user 判断:
  - A. Go engine を CI hard gate の一部に昇格 (= 既存 hard gate と並列で Go engine も hard gate 担う)
  - B. Go engine を advisory validator として継続 (= hard gate 化見送り、shadow mode 維持)
  - C. 追加 detector を実装する (= 5 系統超え、新領域 detector を別 program で起票)
  - D. generated artifact validation を強化 (= advisory → hard gate 化検討)
  - E. Rust engine の必要性を再評価 (= Go 一本化 / Rust 並行 / Rust に移行 のいずれか)
- DA-α-012 entry articulate
- AI 自己レビュー section 全 [x]
- 最終レビュー (user 承認) 待ち state (= 不可侵原則 8 strict adherence)

scope 判断点:
1. **本 MVP scope 内の judgement vs 後続 program articulation**: 5 option それぞれが本 project closure scope 内 vs 別 program 起票候補 vs 後続 user 判断
2. **operational deferred 整合性**: Phase 10/11 の operational deferred 4 件 (= 5 連続 success + 2〜4 週間 false positive 観測 + branch protection 登録 + user approval entry) を Phase 12 closure で flip するか否か
3. **AI 推奨 vs user 自由判断**: AI が推奨を articulate する範囲 (= 5 option の根拠 + trade-off) vs user 自由判断の boundary
4. **後続 program 起票候補の articulate**: relatedPrograms.child 候補として articulate すべき項目

### decision (= 提案、user 判断待ち)

以下を提案する (= user 承認後に Phase 12 wrap-up で確定):

1. **5 option の整理 + per-option per-evidence articulation**:

| option | 内容 | 本 MVP 内 articulation 状態 | scope | 推奨度 |
|---|---|---|---|---|
| A | Go engine を CI hard gate の一部に昇格 (= 残 4 detector も) | Phase 11 で archive-manifest 1 件 hard gate scaffold landing、残 4 detector は §DA-α-011 §decision-5 で 見送り or 永続 advisory | 本 MVP scope 外 (= 残 4 detector 昇格は別判断、operational change 集中) | 中 (= operational deferred 観測完了後の段階昇格として articulate 候補、別 PR 推奨) |
| B | Go engine を advisory validator として継続 | Phase 9 shadow mode + Phase 10 CI advisory で実装済、Phase 11 で archive-manifest だけ hard gate scaffold | 本 MVP scope 内、現状維持 | **高 (= 推奨)** |
| C | 追加 detector を実装する | 不可侵原則 4 (= app-specific guard 移植対象外) との整合確認必要、新 governance scope は別 program で articulate | 本 MVP scope 外 (= 別 program 起票必須) | 中 (= 後続 program 候補) |
| D | generated artifact validation を強化 | DA-α-008 §decision-1 で severity="gate" + CI 扱い advisory を distinction articulate 済、強化 = CI hard gate 化候補 | 本 MVP scope 外 (= operational deferred 観測完了 + plan §8 articulate 整合確認後) | 低 (= 当面据え置き、Phase 8 institutional knowledge 維持) |
| E | Rust engine の必要性を再評価 | readiness refactor 親 program で deferred articulate、本 MVP の Go 実装で fixture parity 100% 達成、Rust の必要性は **証明されていない** | 本 MVP scope 外 (= 別 program 起票候補、現状不要と articulate) | 低 (= 当面据え置き、本 MVP の Go 実装で十分性 articulate 済) |

2. **AI 推奨 = B (advisory 継続) + 後続 program 起票候補として A/C を articulate**:
   - **B 推奨理由**:
     - Phase 10/11 で operational deferred 4 件 (= 5 連続 success + 2〜4 週間 false positive 観測 + branch protection 登録 + user approval) が未完了
     - 不可侵原則 5 「CI hard gate を即時置換しない」 + 不可侵原則 8 「実装 AI が最終レビューを [x] にしない」 整合
     - 本 MVP の本質 = 「外部 engine が同 input を読み同 DetectorResult を返せる」 ことの **証明**、これは Phase 4-9 で達成 (= fixture parity 100% + shadow drift 0)
     - hard gate 段階昇格 (= option A) は別 PR で operational change 含めて articulate するほうが drawer Pattern 1 (Commit-bound Rollback) 整合
   - **後続 program 候補 (= relatedPrograms.child)**:
     - `aag-engine-hard-gate-promotion` (= option A、operational deferred 観測完了後の段階昇格 program)
     - `aag-engine-domain-coverage-extension` (= option C、新 governance scope 追加 program)
3. **operational deferred 4 件は本 closure で flip しない**:
   - Phase 10 checkbox 2 (5 連続 success): 現在 2 連続、user 判断必須
   - Phase 10 checkbox 4 (2〜4 週間 false positive 観測): 観測継続中、user 判断必須
   - Phase 11 checkbox 1 (branch protection 登録): operational change、user 判断必須
   - Phase 11 checkbox 4 (user approval entry): user 直接編集、user 判断必須
   - これらは本 Phase 12 closure scope 外、option B 推奨の場合は archive 後の operational follow-up として articulate
4. **AI session reach boundary = 提案 articulate のみ**:
   - DA-α-012 articulate (= 5 軸 + 観測点 + Lineage 仮 sha) → AI 可
   - 後続 program 起票候補 articulate → AI 可
   - 5 option 整理 + AI 推奨 → AI 可
   - **A〜E のいずれかの最終 user 判断 → user 判断**
   - **本 closure 完了の最終レビュー → user 承認** (= 不可侵原則 8 strict adherence)

### rationale

- **5 option per-evidence articulation の institutional 整合**: 各 option が本 MVP 内で articulate された evidence (= Phase 1〜11 の cumulative observation) に基づいて推奨度を articulate。一括判断ではなく per-option transparent 化 = 後続 program で同 articulation pattern を継承可能
- **B 推奨 (= advisory 継続) の理由**:
  - Phase 10 advisory CI が 2 連続 success (= run 25382855354 + 25403656557 = aag-engine-advisory)、5 連続まで観測継続中
  - Phase 11 archive-manifest hard gate scaffold が landing 済、user approval + branch protection 登録で hard gate 効果 articulate 可能 (= 別 PR で operational change 集中)
  - 本 MVP の本質的 success metric = fixture parity 100% は Phase 9 で達成、hard gate 化は本質ではなく後続 operational change
- **後続 program 候補 articulate の institutional 整合**: relatedPrograms.child として articulate することで、本 MVP closure 後も「AAG Engine governance evolution」 の連続性を articulate。readiness refactor → 本 MVP の 2 段 chain を 3 段以降に拡張する pattern
- **AI session reach boundary strict adherence**: 不可侵原則 8 + 5 + 1 (= validator only) の 3 重整合。AI が A〜E 判断を articulate すると user 判断機会の喪失 + scope creep risk

### alternatives

- (a-alt) **AI が推奨 option を [x] flip**: 不可侵原則 8 違反 (= AI 自己 approval)、不採用
- (b-alt) **5 option すべて scope 内で articulate (= 本 closure で 5 option 全実行)**: scope creep 違反、本 MVP は MVP scope の closure であり 5 option すべての実装 program ではない、不採用
- (c-alt) **operational deferred 4 件を本 closure で AI 単独 flip**: 不可侵原則 8 違反、不採用
- (d-alt) **後続 program 起票候補を articulate しない**: relatedPrograms.child articulation は readiness refactor archive で institutional pattern として articulate 済、本 MVP も同 pattern 継承する必要、不採用
- (e-alt) **A 推奨 (= 即 hard gate 化)**: operational deferred 観測未完了で hard gate 化は不可侵原則 5「CI hard gate を即時置換しない」 違反、不採用

### 観測点

1. ⏳ DA-α-012 entry を articulate (= 5 軸 + 観測点 + Lineage 仮 sha + 推奨判断 articulate)
2. ⏳ 5 option per-evidence integrate articulation (= A〜E × evidence × scope × 推奨度の table 形式)
3. ⏳ B 推奨 (= advisory 継続) の rationale articulate
4. ⏳ 後続 program 起票候補 articulate (= aag-engine-hard-gate-promotion + aag-engine-domain-coverage-extension)
5. ⏳ operational deferred 4 件を本 closure scope 外として明示 (= Phase 10/11 cumulative)
6. ⏳ AI session reach boundary articulate (= 提案のみ、user 判断待ち)
7. 🔁 user による A〜E 判断 (= user 判断必須、checkbox 1 flip 候補)
8. 🔁 user による判断結果 articulate (= DA-α-012 §user-judgement section に追記、checkbox 2 flip 候補)
9. 🔁 後続 program 起票 (= 別 project で起票、本 MVP 完了後)
10. 🔁 最終レビュー (= user 承認、Phase 12 完了 + 全 Phase 完了 + AI 自己レビュー 全 [x] 後)

凡例: ⏳ AI session 内達成、🔁 user 判断 / operational change 待ち。

### user-judgement (= 本 section は user が直接編集して articulate)

> **本 section は user が判断後に直接編集する**。AI 自動 flip 禁止 (= 不可侵原則 8 strict adherence)。
>
> judgement entry template:
> ```
> - judger: <username>
> - judgedAt: <YYYY-MM-DD>
> - selectedOption: <A | B | C | D | E>
> - rationale: <なぜこの option か、本 DA §decision に基づく articulate>
> - relatedPrograms (= 後続起票候補): <list of project ids>
> - rollbackPath: <選択 option を撤回する場合の path articulate>
> ```

(本 entry は user 判断待ち、未記入)

### Lineage

- **preJudgementCommit**: `9037b77` (= Phase 11 metadata follow-up 後 HEAD)
- **judgementCommit**: 本 Phase 12 landing commit
- **postJudgementRegenCommit**: 該当時 §13.3 適用
- **retrospectiveCommit**: 本 Phase 12 wrap-up commit (= user 判断後)
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `9037b77` を SHA 直接参照)

### 振り返り判定

(= Phase 12 wrap-up commit で user 判断後に articulate 予定。観測点 1〜6 (= AI session reach 達成) + 7/8/9/10 (= user 判断 / operational 待ち) の articulate を後続 commit で update。)

---

## DA-α-013: AAG version の app version からの分離 institute (= AAG 6.0 articulate + aag/CHANGELOG.md 新設 + aag-metadata.json 新設、user feedback driven)

### status

- 着手判断: **closed** (2026-05-06、user feedback 経由で institute 完遂、AAG 6.0 articulate 済)
- 振り返り判定: **正しい** (= user 直接 directive「AAGは6.0に」 + 「app versionは粗利管理本体のバージョンなのでそこからは切り離す」 + 「一連のアップデートで分離ができた為そのような形に変更が自然」 を完全反映、3-tree boundary 整合)

### context

本 MVP Phase 12 closure 提案 (= DA-α-012) + AI 自己レビュー (= 2026-05-05 commit d8eb210) で「CHANGELOG 更新 不要」 と articulate したが、user query「蓄積された課題はありますか」 → 「A」 (= discovery-log 集約) → 「AAGの CHANGELOG でバージョン管理は行ってますか？」 → 「プロジェクト単位でそちらの更新も強制すべきです」 の 4 連 query で、本 articulation の **誤り** が transparent 化:

1. **既存 pattern matrix**:
   - `CHANGELOG.md` (= repo root) は app + AAG 両方を inline articulate していた (= v1.9.0 → AAG 5.1 / v1.10.0 → AAG 5.2)
   - `versionSyncRegistry.ts` の 4 file triplet (= app/package.json + project-metadata.json + CHANGELOG.md + recent-changes.generated.md) はすべて **app version 同期** を articulate
   - AAG version は CHANGELOG section title 内 inline articulate のみ、独立 source なし
2. **user feedback 経由の articulation 修正**:
   - 「AAGの CHANGELOG でバージョン管理は行ってますか？」 → AI 回答「v1.10.0 = AAG 5.2、unified version triplet」
   - 「プロジェクト単位でそちらの更新も強制すべきです」 → 私「AAG 6.0 として CHANGELOG entry 追加 + 4 file triplet 同期」 と提案
   - 「App version は粗利管理本体のバージョンなのでそこからは切り離すのが自然」 → 私「AAG version を独立 mechanism で導入」 と提案 (= aag-metadata.json 新設 + AAG-CHANGELOG.md 新設)
   - 「一連のアップデートで分離ができた為そのような形に変更が自然」 → 私「3-tree boundary 整合で `aag/CHANGELOG.md` を aag/ tree 内に配置 + `docs/contracts/aag/aag-metadata.json` を docs/contracts/aag/ namespace 整合」 と提案
   - 「よろしくお願いします」 → 本 institute 実行
3. **scope 判断**:
   - 本 MVP 内吸収 vs 別 program 起票
   - 3-tree boundary 整合配置 (= aag/CHANGELOG.md vs AAG-CHANGELOG.md at repo root)
   - 既存 CHANGELOG.md retroactive split の有無
   - per-project enforcement guard の即時導入 vs 別 program 起票

### decision

以下を採用 (= user 完全承認済、本 commit で execute):

1. **`aag/CHANGELOG.md` 新設** at aag/ tree root:
   - 役割分担 table + バージョニングポリシー + bridge note (= AAG 5.x までの inline articulation 歴史) を articulate
   - 初回 entry `## [AAG 6.0] - 2026-05-06 — Read-Only Governance Engine (Go MVP)`
   - relatedPrograms (= parent: aag-engine-readiness-refactor、child candidate 6 件) を articulate
2. **`docs/contracts/aag/aag-metadata.json` 新設** in docs/contracts/aag/ existing namespace:
   - `aagVersion: "6.0"` + $comment articulate (= institute 経緯 + 同期検証 reference)
3. **`app/src/test/versionSyncRegistry.ts` 拡張**:
   - 5 entry 目として `aag/CHANGELOG.md` 最新 `## [AAG x.y]` ↔ `aag-metadata.json` `aagVersion` の sync pair 追加
   - `versionSyncGuard.test.ts` 16 test PASS 確認 (= 既存 12 test + 新 sync pair × 4 test = 16 test)
4. **`aag/README.md` + `CLAUDE.md` 「## AAG を背景にした思考」** に AAG CHANGELOG への navigation 追加
5. **app version は不変**:
   - `app/package.json` `version: "1.10.0"` 維持
   - 既存 4 file triplet (= app version) は不変
   - 粗利管理 user-facing 変更なし、semver 整合
6. **既存 CHANGELOG.md は不変** (= retroactive split は scope 外、bridge note で代替):
   - v1.9.0 / v1.10.0 の AAG 5.1 / 5.2 inline articulation は歴史として残す
   - retroactive split は別 program `aag-changelog-historical-split` 起票候補 (= discovery-log P2)
7. **per-project enforcement guard は本 MVP scope 外**:
   - AAG-tagged project が `aag/CHANGELOG.md` 更新を mechanical 強制する guard は別 program 起票候補
   - 別 program `aag-changelog-vertical-obligation-guard` (= discovery-log P2)
   - 本 MVP 内では HANDOFF §4.5 + checklist §AI 自己レビュー entry 5 を articulation 修正することで institutional knowledge transfer を確保

### rationale

- **3-tree boundary 整合 (= user 直接 directive)**: AAG framework の reader scope (= aag/ tree) 内に配置するのが、aag-self-hosting-completion (2026-05-04 完遂) で institute された 3-tree 分離原則と整合。AAG-CHANGELOG.md を repo root に置くと app reader が誤認 risk あり、`aag/CHANGELOG.md` のほうが reader 別 routing を尊重
- **app version 完全分離 (= user 直接 directive)**: 「app version は粗利管理本体のバージョン」 観点で、AAG framework 変更を app semver にカウントするのは semver 純粋性違反。AAG framework 自身の release version は独立 timeline で進化すべき
- **AAG 6.0 = MAJOR bump**: AAG 5.x (= TS-only governance) → AAG 6.0 (= TS + 外部 Go validator) は paradigm shift (= validator boundary が repo 内 → repo 外側 + 言語非依存)、MAJOR bump 整合
- **既存 4 file triplet (= app version) 維持 + 新 1 sync pair (= AAG version) 追加**: 既存 app version mechanism を破壊せず、AAG version を additive に articulate。後方互換 strict adherence
- **per-project enforcement guard 別 program 起票**: 本 MVP scope creep 回避。institutional knowledge は HANDOFF §4.5 で transparent 化、後続 program で mechanical 強制を articulate
- **bridge note の institutional value**: AAG 5.x までの inline articulation 歴史を消さず、AAG 6.0 以降の canonical 配置を articulate することで、retroactive split の必要性 vs 不要性を後続 user 判断に open しておく

### alternatives

- (a-alt) **AAG-CHANGELOG.md を repo root に配置**: 3-tree boundary 違反 (= app reader scope に AAG framework artifact を露出)、不採用 (= user 直接 directive で却下)
- (b-alt) **app version も 1.10.0 → 1.11.0 に bump**: app user-facing 変更なしで semver MINOR bump は意味的に不純、不採用 (= user 直接 directive「app は粗利管理本体」)
- (c-alt) **app version を 2.0.0 に bump (= AAG MAJOR と整合)**: app と AAG の version timeline 結合は分離原則違反、不採用 (= user 直接 directive 「切り離すのが自然」)
- (d-alt) **AAG 6.0 として既存 CHANGELOG.md に追加 articulate (= 分離なし)**: 分離原則違反、user 直接 directive で却下
- (e-alt) **既存 CHANGELOG.md retroactive split を本 MVP 内吸収**: scope creep、別 program で articulate するほうが institutional 整合
- (f-alt) **per-project enforcement guard を本 MVP 内吸収**: scope creep + 不可侵原則 6 違反、別 program 起票候補
- (g-alt) **`aag/_internal/CHANGELOG.md` に配置 (= 内部 articulation cluster)**: AAG framework consumer が見つけにくい、`aag/` root のほうが visibility 高い + `aag/README.md` と並列が natural
- (h-alt) **DA-α-013 を articulate せず DA-α-012 retrospective に統合**: 別 decision lineage を 1 entry に conflate、後続 user navigation 不便、不採用

### 観測点

1. ✅ `aag/CHANGELOG.md` 新設 (= AAG 6.0 entry + bridge note + バージョニングポリシー + 役割分担 table)
2. ✅ `docs/contracts/aag/aag-metadata.json` 新設 (= aagVersion: "6.0" + $comment articulate)
3. ✅ `app/src/test/versionSyncRegistry.ts` 拡張 (= 4 entry → 5 entry、AAG version sync pair 追加)
4. ✅ `versionSyncGuard.test.ts` 16 test PASS (= 既存 12 test + 新 4 test)
5. ✅ `aag/README.md` に AAG CHANGELOG navigation 追加
6. ✅ `CLAUDE.md` 「## AAG を背景にした思考」 に AAG CHANGELOG navigation 追加
7. ✅ HANDOFF §4.5 + checklist §AI 自己レビュー entry 5 articulation 修正
8. ✅ discovery-log P2 entry 2 件追加 (= aag-changelog-vertical-obligation-guard + aag-changelog-historical-split)
9. ✅ app version (= 1.10.0) 不変 (= 既存 4 file triplet 維持、粗利管理 user-facing 変更なし)
10. ✅ user 直接 directive 4 件 (= 「6.0 に」 + 「切り離すのが自然」 + 「分離が自然」 + 「よろしくお願いします」) 完全反映

### Lineage

- **preJudgementCommit**: `2f8647e` (= discovery-log articulate regen 後 HEAD)
- **judgementCommit**: 本 commit (= AAG 6.0 institute、aag/CHANGELOG.md + aag-metadata.json + versionSyncRegistry 拡張)
- **postJudgementRegenCommit**: 該当時 §13.3 適用
- **retrospectiveCommit**: 本 commit (= institute と retrospective を同 commit articulate、user feedback driven の institute は landing と振り返りが時間軸的に分離不能のため §13.1 二段 commit pattern の例外として articulate、DA-α-013 §rationale)
- **judgementTag**: 未設定
- **rollbackTag**: 未設定 (= rollback target = preJudgementCommit `2f8647e` を SHA 直接参照)

### 振り返り判定

- **判定**: **正しい** (= user 直接 directive 4 件完全反映、3-tree boundary 整合 strict adherence)
- **観測点達成状況**: 1〜10 すべて ✅ (= AI session 内 institute 完遂)
- **学習**:
  - **AI 自己 review の盲点**: HANDOFF §4.5 で「CHANGELOG 慣習対象外」 と articulate した際、既存 CHANGELOG.md の AAG version inline articulation pattern を見落とした。AI 自己 review でも「既存 pattern との整合確認」 を strict adherence する必要、user feedback で初めて articulation 修正が可能になった
  - **user feedback driven institute の institutional value**: Phase 12 closure 提案後の user query「蓄積された課題はありますか」 → 「AAGの CHANGELOG でバージョン管理は行ってますか？」 の 2 段 query で、AI 単独では発見できなかった institutional gap (= AAG version の app version からの分離) が transparent 化。AI 自己 review は完璧ではない、user collaboration が institutional knowledge transfer に不可欠
  - **3-tree boundary 整合の institutional power**: aag-self-hosting-completion で institute された分離原則が、本 institute (= aag/CHANGELOG.md vs AAG-CHANGELOG.md at repo root の選択) で application された。institutional 原則は後続 institute で再利用される asset として transparent 化
  - **paradigm shift の MAJOR bump 妥当性**: AAG 5.x (= TS-only) → AAG 6.0 (= TS + 外部 Go validator) は validator boundary の根本変更 (= repo 内 → repo 外側 + 言語非依存)、MAJOR bump として institutional に articulate する妥当性高い
  - **user 4 連 directive の navigation pattern**: 「6.0 に」 (= 数値 directive) + 「切り離すのが自然」 (= 構造 directive) + 「分離が自然」 (= 配置 directive) + 「よろしくお願いします」 (= 実行 approval) の 4 段構成。user は段階的に AI の articulation を refine、AI は per-step に proposal を articulate して user 承認を待つ pattern が institutional に効率的

---

> 全 DA entry (DA-α-000 〜 013) articulate 完遂。後続 closure (= 最終レビュー) は本 file のレビュー後 user 承認で archive 移行 articulate 候補。
