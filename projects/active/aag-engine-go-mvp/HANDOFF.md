# HANDOFF — aag-engine-go-mvp

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 12 landing 完了 + AI 自己レビュー 5 件 [x] 完遂 (= 本 commit landing 後、AI session reach 範囲)**。次は user 判断 (= Phase 11 user approval + branch protection 登録 + Phase 12 A〜E judgement) + 最終レビュー (user 承認)。

Phase 12 lineage (= landing 段階):
- landing commit (本 commit): DA-α-012 articulate (= 5 option per-evidence 整理 table + AI 推奨 B (advisory 継続) + 後続 program 候補 2 件 = aag-engine-hard-gate-promotion + aag-engine-domain-coverage-extension + user-judgement template) + checklist Phase 12 2 件 [x] flip (= 3 後続 program articulate + 4 DA-α-012 articulate) + 2 件 [ ] 維持 (= 1 user 判断 + 2 user 直接編集) + AI 自己レビュー 5 件 [x] flip + HANDOFF §4 self-review section 新設

Phase 12 deliverable (= cumulative + closure 提案):
- DA-α-012 が 5 option × evidence × scope × 推奨度 を table 形式 articulate
- AI 推奨 = **B (= advisory 継続)** with 後続 program 起票候補 2 件 articulate
- operational deferred 4 件を本 closure scope 外として明示 (= Phase 10/11 cumulative)
- AI 自己レビュー 5 軸 (= 総チェック / 歪み検出 / 潜在バグ / docs 抜け漏れ / CHANGELOG 判断) すべて HANDOFF §4 で articulate

Phase 12 重要 distinction (= DA-α-012 articulate、archive 後の institutional knowledge):
- **後続 program 候補 = aag-engine-hard-gate-promotion + aag-engine-domain-coverage-extension** (= relatedPrograms.child として archive manifest articulate 候補)
- **AI 推奨 B (advisory 継続) の根拠 = operational deferred 4 件 + 不可侵原則 5/8 整合**
- **CHANGELOG 慣習対象外 articulate** (= app/src/ 変更 0、user-facing app 機能変更なし、readiness refactor 親 program 同 pattern 継承)
- **AI 自己レビュー 5 件 [x] flip = 最終レビュー直前 state** (= 最終レビュー (user 承認) は依然 [ ] 維持、不可侵原則 8 strict adherence)

Phase 11 lineage (= landing 段階、user 待ち):
- landing `b0c3299` + regen `7dd911a` + polish `1f04b69` + metadata follow-up `9037b77`
- DA-α-011 status: open / pending user approval (= operational change = branch protection 登録、user approval entry = §user-approval section user 直接編集)
- archive-manifest hard gate scaffold landing 完遂 (= GitHub Actions run 25403656637、aag-engine-archive-manifest-hardgate job conclusion=success、wall time 22 秒)

Phase 11 lineage (= landing 段階):
- landing commit (本 commit): `.github/workflows/aag-engine-archive-manifest-hardgate.yml` 新設 (= archive-manifest detector hard gate 候補 workflow) + `docs/contracts/project-metadata.json` $comment articulate (= obligation map 履行) + DA-α-011 articulate (= 提案 + 5 detector per-detector judgement table、user approval 待ち) + checklist Phase 11 4 件 [x] flip (= 2/3/5/6、AI articulate 範囲) + 2 件 [ ] 維持 (= 1/4、user 判断必須)

Phase 11 deliverable (= cumulative):
- aag-engine/ Go module (= 6 internal package、unchanged)
- 97 Go test PASS (= unchanged from Phase 9) + TS guard 1057 PASS
- 2 CI workflow: `aag-engine.yml` (advisory all-detector) + `aag-engine-archive-manifest-hardgate.yml` (hard gate 候補、user approval 待ち)
- archive-manifest detector の fixture parity 100% + shadow drift 0 + TS 差分 0 を DA-α-011 で集約 articulate
- 5 detector per-detector judgement table articulate (= archive-manifest 昇格 / doc-registry & schema-validation & project-lifecycle 見送り / generated-metadata 永続 advisory)

Phase 11 重要 distinction (= DA-α-011 articulate、後続 Phase / program で institutional knowledge):
- **archive-manifest が最 deterministic な hard gate 候補** (= 12 required field 単純判定、regex / 動的状態 / file system race 依存なし)
- **rollback path = TS guard 並存維持** (= 不可侵原則 5 + 2 strict adherence、drift 観測時は branch protection 外しで rollback)
- **per-detector judgement table** (= 一括判断ではなく detector-by-detector、後続 program で rollback / 追加 hard gate 化判定が per-detector 履行可能)
- **AI session reach boundary = structural prep のみ** (= 不可侵原則 8 整合、operational change = branch protection 登録は user 判断)

Phase 10 lineage (= 完遂済):
- landing `224bb5a` + regen `e510e47` + guard fix `ff9de3b` + metadata follow-up `3c0087b` + wrap-up `8714435` + regen `8bc952d`
- DA-α-010 振り返り判定: **正しい** (= AI session reach 観測点 9 件すべて達成、operational deferred 2 件は不可侵原則 8 整合維持)
- CI 1 回目 success 観測達成 (= GitHub Actions run 25382855354、aag-engine-advisory job conclusion=success、wall time 約 32 秒)

Phase 10 deliverable (= cumulative):
- aag-engine/ Go module (= 6 internal package、unchanged)
- 97 Go test PASS (= unchanged from Phase 9) + TS guard 1057 PASS
- 3 subcommand: `aag validate` / `aag fixtures` / `aag shadow`
- **CI advisory workflow** (= `.github/workflows/aag-engine.yml`、ci.yml 完全独立 + branch protection 非登録 = isolation による advisory non-blocking)
- **CI 1 回目実行 success** (= 32 秒 wall time、ci.yml fast-gate との並列実行で wall time impact = +0 秒)

Phase 10 重要 distinction (= DA-α-010 articulate、後続 Phase で institutional knowledge):
- **isolation による advisory** (= continue-on-error より transparent、Phase 11 で branch protection 登録という明確な flip point articulate)
- **ciJobs list は ci.yml 限定 enumeration** (= aag-engine.yml は別 workflow のため ciJobs に追加せず、documentConsistency test scope 整合)
- **ciFetchDepthGuard institutional default の重要性** (= Phase 11 hard gate 昇格時の last-modified 解析拡張余地確保)
- **obligation map per-commit 履行義務** (= workflow modify → 必ず metadata $comment update を含む follow-up commit、HEAD~1 diff scope 整合)
- **5 連続 success / 2〜4 週間観測 = operational deferred** (= 不可侵原則 8 整合、AI session 内 [x] flip しない、user / Phase 11 closure 判断)

Phase 9 lineage (= 完遂済):
- landing `56d8b66` + regen `c1064a5` + wrap-up `485923b` + regen `4270b14`
- DA-α-009 振り返り判定: **正しい** (= 観測点 11 件すべて達成)

Phase 9 deliverable (= cumulative):
- aag-engine/ Go module (= 6 internal package = contract / detectors / fixture / report / shadow + cmd)
- 97 Go test PASS (= cmd/aag 15 + contract 14 + fixture 16 + report 8 + detectors 35 + shadow 9)
- 3 subcommand: `aag validate` / `aag fixtures` / `aag shadow` (= 全 detector × 全 fixture parity 集約)
- shadow runner で 5 detector × 8 fixture = 40 parity 検証点を 1 回で集約、AllMatched()=true 達成
- RunResult.ShadowSummaryRaw `json.RawMessage` field articulate (= 循環依存回避 institutional pattern)

Phase 9 重要 distinction (= DA-α-009 articulate、後続 Phase で institutional knowledge):
- **fixture parity 集約 達成 = primary success metric clearance** (= 不可侵原則 10 strict adherence、Phase 11 hard gate 昇格条件の前提)
- **TS 直接実行は scope 外** (= fixture expected.json を「TS captured output」 と articulate、別 program 候補 = aag-engine-shadow-mode-runner-impl)
- **fixture name prefix routing = forward-compatible dispatch** (= 新 fixture 追加時 shadow runner 修正不要、想定外 prefix は Skipped articulate)
- **`json.RawMessage` 循環依存回避 pattern** (= 集約 layer を report に embed する Go 慣用、後続 program 候補)

Phase 8 lineage (= 完遂済):
- landing `7ae46cf` + regen `936c467` + wrap-up `0725941` + regen `00029a6`
- DA-α-008 振り返り判定: **正しい** (= 観測点 10 件すべて達成)
- 重要 distinction: DetectorResult.severity = "gate" + CI hard gate 化は別 layer (= Phase 10/11 で articulate)

Phase 7 lineage (= 完遂済):
- landing `aef3291` + regen `003af40` + wrap-up `d23a2aa` + regen `38729fe`
- DA-α-007 振り返り判定: **正しい** (= 観測点 9 件すべて達成)

Phase 6 lineage (= 完遂済):
- landing `f2d5fae` + regen `6bc10fa` + wrap-up + regen
- DA-α-006 振り返り判定: **正しい** (= 観測点 10 件すべて達成)

Phase 5 lineage (= 完遂済):
- landing `674e6df` + regen `4b8904f` + wrap-up + regen
- DA-α-005 振り返り判定: **正しい** (= 観測点 8 件すべて達成)

Phase 0〜4 lineage (= 完遂済):
- Phase 0: `cc6e824` + `ed348eb` + `be51eaf` + `2ba85dd` (DA-α-000 = 正しい)
- Phase 1: `2172c25` + `3e3f143` + `e526af2` + `62844c3` (DA-α-001 = 正しい)
- Phase 2: `87643f4` + `2a618d8` + `a001112` + `5e7ce9f` + `21dc655` (DA-α-002 = 正しい)
- Phase 3: `8fbed60` + `b40ea77` + `3497733` + `d6bfc8e` (DA-α-003 = 正しい)
- Phase 4: `f6b514a` + `f0818e8` + `8c288f8` + `998a920` (DA-α-004 = 正しい)

Phase 8 deliverable (= 5 detector 移植完了):
- 5 detector wired up (= archive-manifest + doc-registry + schema-validation + project-lifecycle + generated-metadata)
- 8 fixture parity 100% 達成 (= readiness refactor Phase 5 deliverable と完全一致):
  - archive-v2/{pass-minimal, fail-missing-restore-command, fail-missing-multiple-fields}
  - doc-registry/fail-missing-path
  - generated/fail-stale-metadata
  - project-lifecycle/{pass-active, fail-completed-not-archived}
  - schema-validation/fail-level-out-of-range

本 project は `aag-engine-readiness-refactor` (= 2026-05-05 archive、self-dogfood
4 件目) の implementation 段階に入る別 program。**Go 実装は Phase 1 以降**、Phase
0 で bootstrap / scope lock / required reads / DA-α-000 を完遂、Phase 1〜9 で
5 detector 移植 + fixture parity 100% 集約 達成。

§13 commit pattern application 累積 (= Phase 0〜10 完遂 + Phase 11/12 landing 時点):
- §13.1 二段 commit: 11 instance 完遂 + 2 instance landing 段階 (= Phase 0+1+2+3+4+5+6+7+8+9+10 完遂 + Phase 11/12 landing)
- §13.2 atomic dependent update: 2 instance (= Phase 10 + Phase 11 で workflow 新設に伴う project-metadata.json $comment 同 commit 統合、obligation map 履行)
- §13.3 post-flip regen: 22+ instance (= 各 Phase landing/wrap-up 後 sync)

derivedStatus: in_progress / Phase 0〜10 完遂 + Phase 11/12 landing 段階 + AI 自己レビュー 5 件 [x] 完遂 (= AI session reach 範囲)、user 判断必須項目 残:
- Phase 10 checkbox 2: CI 5 連続 success 観測 (= 現在 2 連続)
- Phase 10 checkbox 4: 2〜4 週間 false positive 観測
- Phase 11 checkbox 1: branch protection 登録 (= operational change)
- Phase 11 checkbox 4: user approval entry (= DA-α-011 §user-approval)
- Phase 12 checkbox 1: A〜E のいずれかで user 判断
- Phase 12 checkbox 2: 判断結果 articulate (= DA-α-012 §user-judgement)
- 最終レビュー (= user 承認、checklist 最末尾)
完了基準は checklist Phase 0〜12 (= 60 checkbox) + AI 自己レビュー 5 件 + 最終レビュー
(user 承認) 1 件 = 全 [x]。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を要約する。

### 高優先（次 = user 判断 + operational change）

本 MVP の AI session reach 範囲は完遂、残るは user 判断 + operational change のみ。順番:

1. **Phase 11 user approval + operational change**:
   - DA-α-011 §user-approval section に user 直接編集 (= approver / approvedAt / approvedScope / branch-protection-action / rollback-procedure)
   - GitHub Settings → Branches → main → required checks に `aag-engine-archive-manifest-hardgate` 追加
2. **Phase 12 A〜E judgement**:
   - DA-α-012 §user-judgement section に user 直接編集 (= judger / judgedAt / selectedOption / rationale / relatedPrograms / rollbackPath)
   - AI 推奨 = **B (= advisory 継続)** + 後続 program 候補 (= aag-engine-hard-gate-promotion + aag-engine-domain-coverage-extension)
3. **Phase 11/12 wrap-up commit** (= user 判断後):
   - DA-α-011 + DA-α-012 status open → closed、振り返り判定 articulate
   - checklist Phase 11/12 残 checkbox flip (= user 判断履行された項目)
4. **最終レビュー (= checklist 最末尾の [ ])**:
   - 全 Phase 成果物を user がレビュー、archive プロセス移行を承認
   - **AI 単独 [x] flip 禁止** (= 不可侵原則 8 strict adherence、PZ-10 / PZ-13 違反)

### Operational deferred (= 不可侵原則 8 整合、AI session 内 [x] flip しない)

- Phase 10 checkbox 2: CI 5 連続 success 観測 (= 現在 2 連続、user / Phase 11 closure 判断)
- Phase 10 checkbox 4: 2〜4 週間 false positive 観測 (= discovery-log.md に articulate、user / Phase 11 closure 判断)
- Phase 11 checkbox 1: archive-manifest hard gate 化 (= branch protection 登録、user 判断)
- Phase 11 checkbox 4: user approval entry (= DA-α-011 §user-approval、user 判断)
- Phase 12 checkbox 1: A〜E judgement (= user 判断、AI 推奨 = B)
- Phase 12 checkbox 2: 判断結果 articulate (= DA-α-012 §user-judgement、user 直接編集)
- 最終レビュー: user 承認 (= archive 移行 trigger)

## 3. ハマりポイント

### 3.1. 不可侵原則 1 (= MVP は validator のみ) を見失わない

本 MVP は **read-only validator**、generator ではない。途中で「ついでに health
report 生成も Go に移そう」「docs:generate を Go で書き直そう」 等の誘惑が来ても
踏み込まない。generator 機能は当面 TS 維持、scope 拡大は別 program 起票必須。

trigger: Phase 9-10 (shadow mode / CI advisory) で「parity が取れたら CI 上で
直接 Go engine が generate すれば良いのでは」 と思った瞬間が最も危険。
`projectization.md` §5 Escalation 判定で user に escalate して別 project 起票を判断。

### 3.2. 不可侵原則 2 (= TS guard を全廃しない) を strict adherence

AAG Engine は「全 guard の置換」 ではなく **外部 governance validator**。
app-specific guard (= calculation / presentation / WASM / TS AST) は永続維持、
本 MVP の対象は **5 系統 (= archive manifest / doc registry / generated metadata /
project lifecycle / schema validation)** のみ。

trigger: Phase 11 (hard gate promotion) で「TS detector も Go に移植して TS guard を
削除すれば管理が一元化される」 と考えた瞬間。これは readiness refactor 不可侵原則 5
+ 本 MVP 不可侵原則 2 + 4 違反、別 program 起票必須。

### 3.3. §13.1 二段 commit pattern を 1 commit に統合しない

Phase landing と wrap-up を 1 commit に纏めると drawer Pattern 1 (Commit-bound
Rollback) 違反 + Lineage 実 sha が landing commit に書けない (= chicken-and-egg)。
必ず:
- landing commit で deliverable + DA articulate (Lineage 仮 sha)
- wrap-up commit で DA Lineage 実 sha + 振り返り判定 + 最終 checkbox flip

readiness refactor で 8 instance 実適用済、本 MVP でも 13 Phase × 2 = 26 instance
適用予定。

### 3.4. §13.2 atomic dependent update を忘れると push fail

Phase 1 で `aag-engine/` directory 新設、Phase 9-10 で shadow report 等を新設する場合、
新 .md / .json file が references/ や docs/contracts/ に追加されると pre-push hook の
docRegistryGuard が hard fail 候補。同 commit に doc-registry / README index update を
統合する pattern を strict adherence。

readiness refactor で 1 instance 実適用済 (= Phase 1 inventory landing)、本 MVP では
Phase 1 (= aag-engine/ skeleton)、Phase 9 (= shadow report)、Phase 12 (= closure
audit) で発生候補。

### 3.5. §13.3 post-flip regen を amend で混ぜない

checkbox `[x]` flip を含む commit の後で `npm run docs:generate` を実行すると
generated section + KPI が drift し、pre-push hook の `docs:check` が hard fail。
解消は `git commit -m "chore(docs): docs:generate 反映 (= [x] flip 後 KPI sync)"`
で **別 commit** として landing。flip commit に amend で書き戻すと AAG-REQ-NO-AMEND
違反 + drawer Pattern 1 違反。

readiness refactor で 21 instance 実適用済、本 MVP でも各 Phase landing/wrap-up
後に regen が発火。

### 3.6. fixture parity を primary success metric に位置付ける

shadow mode (= Phase 9) の主軸は **fixture parity (= 5 detector × 8 fixture =
40 検証点)** であって実 repo 状態 parity ではない。実 repo 状態は時系列で変化する
ため deterministic でなく、parity drift 発生時の原因特定が困難。fixture parity
100% を Phase 11 hard gate 昇格条件の必須として articulate。

### 3.7. Go engine が source of truth にならないように articulate

不可侵原則 9 の本義 = Go engine は **正本を持たず、JSON / repo artifact を読むだけ**。
TS 側 (= readiness refactor で永続維持された deliverable + AAG framework) が
canonical source of truth。Go side で「便利だから」 と独自 cache / 独自 schema /
独自 rule を articulate すると、後の rule semantics 複製違反 (= 不可侵原則 3) に
発展する risk あり。

### 3.8. 実装 AI が最終レビューを [x] にしない (= 不可侵原則 8)

機能的 Phase 0〜12 と AI 自己レビュー全項目が [x] になっても、最終レビュー
(user 承認) は user 判断。AI が単独で [x] flip すると PZ-10 / PZ-13 違反。
Phase 12 closure 後に user に articulate して承認待ち。

readiness refactor では user 代行 delegation で最終承認 + archive 移行を実行した
前例があるが、これは user の明示的 delegation 表明 (= 「代行でよろしくお願いします」)
を trigger にしており、AI 自己判断による approval ではない (= 本義は維持)。

## 4. AI 自己レビュー結果 (= user 承認の手前、checklist §AI 自己レビュー の content articulate)

> 本 section は AI が project 完了前に自分自身で品質 review を実施した結果の articulate (= DA-β-002 で institute された mechanism)。
> 機械検証は projectizationPolicyGuard PZ-13 (= section 存在 + ordering)、内容妥当性は AI session 責任。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2。

### 4.1. 総チェック (= 全 Phase 成果物 review)

- **scope 内**: ✅ 全 50 commit (= Phase 0〜11 完遂 + Phase 12 articulate) が MVP scope (= 5 detector × 8 fixture parity 100% + advisory CI + archive-manifest hard gate scaffold) 内
- **内容妥当**: ✅ 各 Phase の DA-α-N で 5 軸 + 観測点 + Lineage 実 sha + 振り返り判定 を articulate (= DA-α-000〜012 = 13 entry)、不可侵原則違反 0
- **Lineage 整合**: ✅ 各 Phase で landing → regen → wrap-up → regen の 4 commit chain (= Phase 10/11 は +follow-up commit で 5-6 commit chain)、AAG-REQ-NO-AMEND strict adherence
- **fixture parity primary success metric**: ✅ 5 detector × 8 fixture = 40 parity 検証点が Phase 9 shadow runner で集約 verify、AllMatched()=true 達成

### 4.2. 歪み検出 (= scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更)

- **Go engine が source of truth でない**: ✅ TS captured fixture output (= `expected.json`) を canonical source of truth とし、Go は parity 検証側。`aag validate` は real-repo dispatch を Phase 1 skeleton 維持で Phase 12 closure scope 外として articulate
- **TS guard 削除なし**: ✅ TS guard 1057 PASS 維持、Phase 11 でも archive-manifest hard gate scaffold は TS 側 archive v2 schema guard 並存維持として articulate (= rollback path 確保)
- **rule semantics 複製なし**: ✅ regex literal (= generated-metadata) は DA-α-008 §rationale で「検出 surface」 vs 「business logic 複製」 の distinction articulate、business logic 判断条件 (= level >= 0 等) は規格化的に同期維持
- **drawer Pattern 違反 0**: ✅ §13.1 (二段 commit) / §13.2 (atomic dependent update) / §13.3 (post-flip regen) の 3 pattern を 12 Phase × 全 instance で strict adherence、AAG-REQ-NO-AMEND 違反 0
- **隠れた前提変更 0**: ✅ DA-α-008 で plan §8 severity warn→gate の doc drift を transparent articulate + Phase 9 wrap-up で plan 修正、DA-α-011 §user-approval / DA-α-012 §user-judgement で user judgement boundary を明示

### 4.3. 潜在バグ確認 (= edge case / null 取扱 / 型 assertion / race condition / fail-safe paths)

- **`go vet ./...` clean**: ✅ 6 internal package + cmd で warning 0 件
- **null safety**: ✅ Optional field は pointer type (`*string` / `*float64`) + `omitempty` JSON tag、`== nil` check で articulate
- **panic safety**: ✅ production code (= 非 _test.go) で `panic(` 0 件、read-only validator のため deferred recover 不要
- **edge case test coverage**:
  - empty fixtures → TestSummary_AllMatched_Empty PASS
  - nonexistent repo → TestRun_NonexistentRepo PASS
  - invalid positional args → TestRun_*_UnexpectedPositionalArg PASS (= validate / fixtures / shadow 全 subcommand)
  - nil manifest → TestDetectArchiveManifestViolations_NilManifestSkipped PASS
- **race condition**: ✅ Go engine は read-only + serial 実行 (= concurrent goroutine 不使用)、race condition 構造的に発生せず
- **fail-safe paths**: ✅ exit code contract (0=pass / 1=fail / 2=error) を全 subcommand で articulate、JSON marshal failure 時は ExitError + error message + stderr 出力

### 4.4. ドキュメント抜け漏れ確認 (= README / CLAUDE.md / references/ / 関連 plan / decision-audit)

- **HANDOFF.md**: ✅ 各 Phase wrap-up で更新、Phase 11 landing で最新化済 (= 本 section も含む)
- **plan.md**: ✅ Phase 8 §8 severity warn→gate doc drift を Phase 9 wrap-up で修正済、Phase 0〜12 構造 + 不可侵原則 10 件 articulate
- **checklist.md**: ✅ Phase 0〜11 + AI 自己レビュー 5 件 + 最終レビュー 1 件 = 全 60+ checkbox articulate、user 判断必須項目は [ ] 維持で不可侵原則 8 整合
- **decision-audit.md**: ✅ DA-α-000〜012 = 13 entry、各 entry に 5 軸 + 観測点 + Lineage + 振り返り判定 articulate (DA-α-011/012 は user 待ちで status=open)
- **project-metadata.json $comment**: ✅ Phase 10 / 11 の workflow 追加 + zero-match guard follow-up を articulate (= obligation map 履行)
- **CLAUDE.md / references/04-tracking/generated/**: ✅ docs:generate により自動更新、各 Phase の §13.3 regen で sync
- **discovery-log.md**: ✅ Phase 12 closure 後 (2026-05-06) に scope 外発見 6 件を集約 articulate 済 (= P2 3 件 + P3 3 件 + 後続 program 4 候補)、archive manifest の `relatedPrograms.child` 統合候補
- **CLAUDE.md 直接更新**: ✅ 不要 (= 本 MVP は app-domain 変更なし、AAG framework 自体の改変も既存範囲、CLAUDE.md L1 鉄則・索引に新規追加 0)
- **references/04-tracking/open-issues.md**: ✅ Phase 0 deliverable で active project 索引に追加済

### 4.5. CHANGELOG.md 更新 + バージョン管理 (= AAG version 完全分離 + versionImpact 計画段階 declaration mechanism、user feedback で 2 段 institute)

- **初期判断 (= 誤り articulate、2026-05-05 commit d8eb210)**: 「CHANGELOG.md 更新 不要 (= internal AAG framework / engine 化、user-facing app 機能変更なし)」 と articulate
- **修正判断 (= 2026-05-06 user feedback 経由で articulate)**:
  - 既存 `CHANGELOG.md` (= repo root) は AAG version 変更も inline articulate していた (= v1.9.0 → AAG 5.1 / v1.10.0 → AAG 5.2)、本 MVP も同 pattern なら CHANGELOG bump 対象だった
  - user feedback「app version は粗利管理本体のバージョンなのでそこからは切り離すのが自然」 + 「3-tree 分離が一連のアップデートで achieved されているなら自然な形に変更」 を受けて、AAG version の app version からの **完全分離** mechanism を institute (= DA-α-013)
- **deliverable (= 本 MVP 内吸収、3-tree boundary 整合)**:
  - **`aag/CHANGELOG.md` 新設** (= AAG framework changelog の canonical source、`## [AAG 6.0] - 2026-05-06` 初回 entry)
  - **`docs/contracts/aag/aag-metadata.json` 新設** (= AAG version 構造化 source、`aagVersion: "6.0"`)
  - **`versionSyncRegistry.ts` 拡張** (= `aag/CHANGELOG.md` 最新 [AAG x.y] ↔ `aag-metadata.json` `aagVersion` の sync pair 追加、versionSyncGuard 16 test PASS)
  - **`aag/README.md` + `CLAUDE.md`** に AAG CHANGELOG への navigation 追加
  - app version (= `1.10.0`) は **不変** (= 粗利管理 user-facing 変更なし、semver 整合)
- **詳細**: DA-α-013 (= AAG version separation institute) + DA-α-014 (= versionImpact 計画段階 declaration mechanism institute)
- **第 2 段 institute deliverable (= DA-α-014、user 4 連 directive 経由で proactive 化)**:
  - `aag/CHANGELOG.md` §バージョンアップ判定基準 expand (= app/AAG 別の bump 基準 table + delta 表記 + delta+baselineAtCreation snapshot 方式 + 並列/out-of-order 耐性 articulation + 機械検証 logic articulation)
  - `config/project.json` に `versionImpact` field 追加 (= self-dogfood、app `+0.0.0` / aag `+1.0` from baseline 5.2)
  - `projects/_template/config/project.json` に `versionImpact` field 追加 (= bootstrap template、後続 project bootstrap 時の必須項目化)
- **scope 外 (= post-archive 別 program 起票候補、discovery-log P2 articulate)**:
  - `aag-version-impact-declaration-guard` (= versionImpact 整合検証 guard 実装、DA-α-013 旧「aag-changelog-vertical-obligation-guard」 を proactive 化で renaming + scope expansion)
  - `aag-changelog-historical-split` (= AAG 5.x までの inline articulation を `aag/CHANGELOG.md` に retroactive 移植)

## 5. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/active/aag-engine-go-mvp/AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order / Required reads) |
| `projects/active/aag-engine-go-mvp/plan.md` | 不可侵原則 10 件 + Phase 0〜12 構造 + commit pattern + Long-term Target |
| `projects/active/aag-engine-go-mvp/checklist.md` | completion 判定の入力 (= Phase 0〜12 = 60 checkbox + AI 自己レビュー 5 + 最終レビュー 1) |
| `projects/active/aag-engine-go-mvp/projectization.md` | AAG-COA 判定結果 (= L3 / architecture-refactor) |
| `projects/active/aag-engine-go-mvp/decision-audit.md` | DA-α 系 lineage articulation (= DA-α-000 〜 012、5 軸 + 観測点 + Lineage 実 sha + 振り返り判定) |
| `projects/active/aag-engine-go-mvp/discovery-log.md` | scope 外発見蓄積 |
| `projects/completed/aag-engine-readiness-refactor/ARCHIVE.md` | 親 readiness program archive (= 本 MVP の前提条件) |
| `projects/completed/aag-engine-readiness-refactor/archive.manifest.json` | 親 program 13 field schema + DA lineage + relatedPrograms (= 本 MVP は relatedPrograms.child 候補として articulate 済) |
| `references/03-implementation/aag-engine-readiness-inventory.md` | engine input 5 分類 + 3 状態問題 (= 本 MVP の入力 boundary 正本) |
| `tools/architecture-health/src/detectors/README.md` | 4 層 layered model + Logic Boundary Reference (= per-detector engine 移植 boundary) |
| `tools/architecture-health/src/detector-result.ts` | DetectorResult TS implementation (= Go との parity reference) |
| `tools/architecture-health/src/path-helpers.ts` | RepoPath / RepoFileEntry / 4 規約 (= Go 側で同 規約再現) |
| `fixtures/aag/` | 8 fixture / 5 系統 coverage (= primary success metric) |
| `docs/contracts/aag/detector-result.schema.json` | canonical DetectorResult schema (= Go output 準拠対象) |
| `docs/contracts/aag/project-archive.schema.json` | Archive v2 schema (= archive-manifest detector の input 正本) |
| `references/05-aag-interface/operations/project-checklist-governance.md` §13 | Phase 進行 commit pattern (§13.1 二段 / §13.2 atomic / §13.3 post-flip) |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定基準、L3 required artifacts |
| `references/05-aag-interface/protocols/complexity-policy.md` §3.4 | L3 重変更 routing (= DA institute + judgement commit + 振り返り判定) |
