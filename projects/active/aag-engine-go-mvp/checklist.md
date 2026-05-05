# checklist — aag-engine-go-mvp

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: Project Bootstrap

* [x] `projects/active/aag-engine-go-mvp/` ディレクトリ + 必須 8 file (= AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit + config/project.json) を landing する
* [x] `references/04-tracking/open-issues.md` の active project 索引に本 project 行を追加する
* [x] DA-α-000 entry を decision-audit.md に articulate する (= 5 軸 + 観測点 + Lineage 仮 sha)
* [x] §13.1 / §13.2 / §13.3 適用方針を plan.md §不可侵原則 6 に明記する
* [x] readiness refactor deliverable を required reads として AI_CONTEXT.md に明示列挙する (= 17 file、§Required reads section)
* [x] DA-α-000 Lineage 実 sha update + 振り返り判定 (= wrap-up commit で flip)
* [x] checklistFormatGuard / projectCompletionConsistencyGuard / projectizationPolicyGuard / archiveV2SchemaGuard が本 project に対して PASS する
* [x] docs:check が PASS する (= project-health.json に本 project が `derivedStatus = in_progress` で出現)
* [x] **Go 実装にはまだ入っていない** (= aag-engine/ directory 不在を確認、Phase 1 着手まで scope lock 維持)

## Phase 1: Go CLI Skeleton

* [x] `aag-engine/go.mod` + `cmd/aag/main.go` + `internal/contract/` + `internal/report/` を新設する
* [x] `validate` (= 2 invocation patterns: `aag validate --repo .` / `aag validate --format json`) と `fixtures` (= `aag fixtures --repo .`) の 2 サブコマンドが起動する
* [x] repo を書き換えない (= read-only verify、go test で write 操作 0 件確認)
* [x] JSON output (= 空 DetectorResult[]) を返せる
* [x] exit code contract (= 0 = pass / 1 = fail / 2 = error) が articulate
* [x] DA-α-001 entry を articulate する

## Phase 2: DetectorResult Contract Binding

* [x] `internal/contract/detector_result.go` の Go struct が canonical schema (= `docs/contracts/aag/detector-result.schema.json`) と structurally identical
* [x] JSON serialization が `expected.json` と field-level 比較可能 (= field name / order / type 一致)
* [x] canonical schema 8 field (= 4 required + 4 optional = ruleId / detectionType / sourceFile / severity + evidence / actual / baseline / messageSeed) を保持 (= plan.md の field 列挙誤りを canonical 準拠に修正、DA-α-002 §context-1)
* [x] (Phase 1 deliverable bug fix) `aag validate /tmp/repo` の positional argument silent ignore を hard fail で検出 + hint 付き ExitError を返す (= user feedback 由来、DA-α-002 §context-2)
* [x] DA-α-002 entry を articulate する

## Phase 3: Fixture Runner

* [x] `fixtures/aag/` 配下 8 fixture の `input.json` を Go 側で読める (= LoadAll で discover、TestLoadAll_DiscoverAll / ExpectedCounts PASS)
* [x] `expected.json` と actual DetectorResult[] を deep equality で比較できる (= Compare で reflect.DeepEqual + set-based Missing / Extra)
* [x] pass / fail fixture の差分を machine-readable に出力できる (= Diff / ParitySummary JSON serializable + `aag fixtures` で fixtureSummary catalog 出力)
* [x] DA-α-003 entry を articulate する

## Phase 4: Archive Manifest Detector

* [x] `archive-v2/pass-minimal` fixture が pass (= 0 violation emit)
* [x] `archive-v2/fail-missing-restore-command` fixture で AR-ARCHIVE-MANIFEST-A2 を 1 件 emit
* [x] `archive-v2/fail-missing-multiple-fields` fixture で AR-ARCHIVE-MANIFEST-A2 を 3 件 emit (= 順序維持)
* [x] DetectorResult が TS 側 expected.json と field-level 一致 (= fixture.Compare で Match=true、3 archive-v2 fixture すべて)
* [x] DA-α-004 entry を articulate する

## Phase 5: Doc Registry Detector

* [x] `docs/contracts/doc-registry.json` を Go 側で読める (= DocRegistryFacts struct + DetectDocRegistryViolations、collector layer 経由で existingPaths と組み合わせて consume)
* [x] missing path を AR-DOC-REGISTRY-D1 として DetectorResult 化 (= 4 unit test PASS + fixture parity Match=true)
* [x] repo-relative POSIX path は fixture 入力時点で valid (= 4 規約検証は Phase 7 必要時 articulate、DA-α-004 §rationale 継承)
* [x] `doc-registry/fail-missing-path` fixture で TS と同 1 件 emit (= field-level 一致、Match=true)
* [x] DA-α-005 entry を articulate する

## Phase 6: Schema Validation Detector

* [x] `schema-validation/fail-level-out-of-range` fixture で AR-SCHEMA-VALIDATION-PZ2 を 1 件 emit (= field-level Match=true)
* [x] schemaVersion mismatch を検出する (= MVP scope は projectization.level 範囲、schemaVersion check は別 rule で後続 articulate 候補、DA-α-006 §scope)
* [x] level out-of-range を DetectorResult 化 (= 0〜4 整数のみ valid、非 integer / negative / > 4 を violation 化、7 unit test PASS)
* [x] DA-α-006 entry を articulate する

## Phase 7: Project Lifecycle Detector

* [x] `project-lifecycle/pass-active` fixture で 0 violation (= active / archived / collection mix、Match=true)
* [x] `project-lifecycle/fail-completed-not-archived` fixture で AR-PROJECT-LIFECYCLE-C1 を 1 件 emit (= field-level Match=true)
* [x] active / completed v1 / completed v2 圧縮済 の 3 状態すべてで read 経路が動作 (= 3 状態 routing は collector 責務、本 detector は state-agnostic な判定のみ articulate、DA-α-007 §decision-1)
* [x] Archive v2 圧縮済 project に対して `plan.md` / `checklist.md` 等の物理存在を前提にした read を行わない (= 本 detector は ProjectChecklistResult を input として受け取るのみ、physical read を行わないため前提 0 件)
* [x] DA-α-007 entry を articulate する

## Phase 8: Generated Metadata Detector (advisory)

* [x] `generated/fail-stale-metadata` fixture で AR-GENERATED-METADATA-G2 を 1 件 emit (= severity="gate" を TS 一致で emit、CI 扱いは advisory non-blocking、Phase 10 で articulate、DA-α-008 §decision-1/2)
* [x] severity = "gate" (= TS source / fixture / readiness report と一致)、CI hard gate 化は Phase 10/11 別判断 (= distinction を DA-α-008 で transparent articulate、不可侵原則 10 fixture parity 優先)
* [x] CI hard fail を引き起こさない (= Phase 10 で advisory non-blocking として articulate 予定、本 detector 出力 severity とは別 layer)
* [ ] DA-α-008 entry を articulate する

## Phase 9: Shadow Mode

* [ ] 5 detector × 8 fixture = 40 parity 検証点で TS と Go が同 DetectorResult[] を返すことを検証
* [ ] TS detector と Go detector の差分 report を生成 (= project-local report、新 generated artifact 追加なし)
* [ ] false positive / false negative を `discovery-log.md` に observation log として articulate
* [ ] DA-α-009 entry を articulate する

## Phase 10: CI Advisory

* [ ] `.github/workflows/` に Go engine job を non-blocking で追加
* [ ] CI 上で安定実行 (= flake 0 件、最低 5 連続 success)
* [ ] 実行時間が許容範囲 (= 既存 fast-gate に圧迫を与えない、+30 秒以下推奨)
* [ ] 2〜4週間 false positive を観測 (= 観測 log を `discovery-log.md` に articulate)
* [ ] DA-α-010 entry を articulate する

## Phase 11: Partial Hard Gate Promotion

* [ ] 最低 1 detector (= archive manifest 推奨) が hard gate 化
* [ ] 昇格 detector の fixture parity 100% / shadow mode 期間 false positive 0 / TS 差分 0 を articulate
* [ ] rollback path 確保 (= TS guard が hard gate を引き続き保持、Go は補完)
* [ ] user approval を `decision-audit.md` で articulate
* [ ] 残り detector の hard gate 化判定 (= 昇格 / 見送り) が per-detector articulate
* [ ] DA-α-011 entry を articulate する

## Phase 12: Closure / Next Architecture Decision

* [ ] A〜E のいずれかで user 判断 (= A. CI hard gate 昇格 / B. advisory 継続 / C. 追加 detector / D. metadata 強化 / E. Rust 必要性再評価)
* [ ] 判断結果を `decision-audit.md` DA-α-012 で articulate
* [ ] 後続 program 起票候補が articulate (= relatedPrograms.child 候補)
* [ ] DA-α-012 entry を articulate する

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

* [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
* [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認 (= Go engine を source of truth にしていない / TS guard を削除していない / rule semantics を複製していない)
* [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検 (= Go side null safety / panic safety / signal handling)
* [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
* [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合 (= 本 project は internal AAG framework / engine 化、user-facing app 機能変更なし → CHANGELOG 慣習対象外を articulate するか判断)

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
