# HANDOFF — aag-engine-go-mvp

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 10 landing 完了 (= 本 commit landing 後)**。次は Phase 10 wrap-up commit (= CI 1 回目 success 観測 + 振り返り判定)。

Phase 10 lineage (= landing 段階):
- landing commit (本 commit): `.github/workflows/aag-engine.yml` 新設 (= advisory non-blocking、go test + build + 3 subcommand) + `docs/contracts/project-metadata.json` $comment articulate (= obligation map 履行) + DA-α-010 articulate (Lineage 仮 sha) + checklist Phase 10 2 件 flip (= 1 + 5)

Phase 10 deliverable (= cumulative):
- aag-engine/ Go module (= 6 internal package、unchanged)
- 97 Go test PASS (= unchanged from Phase 9)
- 3 subcommand: `aag validate` / `aag fixtures` / `aag shadow`
- **CI advisory workflow** (= `.github/workflows/aag-engine.yml`、ci.yml 完全独立 + branch protection 非登録 = isolation による advisory non-blocking)

Phase 10 重要 distinction (= DA-α-010 articulate、後続 Phase で institutional knowledge):
- **isolation による advisory** (= continue-on-error より transparent、Phase 11 で branch protection 登録という明確な flip point articulate)
- **ciJobs list は ci.yml 限定 enumeration** (= aag-engine.yml は別 workflow のため ciJobs に追加せず、documentConsistency test scope 整合)
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

§13 commit pattern application 累積 (= Phase 0〜9 完遂 + Phase 10 landing 時点):
- §13.1 二段 commit: 10 instance 完遂 + 1 instance landing 段階 (= Phase 0+1+2+3+4+5+6+7+8+9 完遂 + Phase 10 landing)
- §13.2 atomic dependent update: 1 instance landing (= Phase 10 で `aag-engine.yml` 新設に伴う `project-metadata.json` $comment update を同 commit に統合、obligation map 履行)
- §13.3 post-flip regen: 20 instance

derivedStatus: in_progress / Phase 0〜9 完遂、Phase 10 landing 段階、Phase 10 wrap-up + Phase 11/12 残。
完了基準は checklist Phase 0〜12 (= 60 checkbox) + AI 自己レビュー 5 件 + 最終レビュー
(user 承認) 1 件 = 全 [x]。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を要約する。

### 高優先（次 PR = Phase 10 wrap-up + Phase 11 着手）

- **Phase 10 wrap-up commit** (= CI 1 回目実行 観測後):
  - CI 1 回目 success articulate (= 観測点 9 flip)
  - 実行時間 articulate (= 観測点 7 flip + checklist 3 flip 候補)
  - 観測点 10/11 (= operational deferred) は維持 (= 不可侵原則 8 整合、user / Phase 11 closure で flip)
  - DA-α-010 Lineage 実 sha + 振り返り判定 articulate

### 中優先（Phase 11 = Partial Hard Gate Promotion）

- **archive-manifest detector 推奨** (= 最 deterministic、false positive risk 最低):
  - branch protection の required checks に `aag-engine-advisory` を追加 (= 別 layer 判断、operational change)
  - hard gate 化 detector の fixture parity 100% / shadow mode 期間 false positive 0 確認
  - rollback path 確保 (= TS guard が hard gate を引き続き保持、Go は補完)
  - user approval を decision-audit.md で articulate
  - DA-α-011 entry articulate

### 低優先（Phase 12 以降）

- Phase 12: Closure / Next Architecture Decision (= A-E judgement、後続 program 起票候補)
- AI 自己レビュー 5 件
- 最終レビュー (user 承認)

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

## 4. 関連文書

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
