# checklist — aag-engine-readiness-refactor

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: Bootstrap / Scope Lock

* [x] `projects/active/aag-engine-readiness-refactor/` ディレクトリ + 必須 8 file (= AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit + config/project.json) を landing する
* [x] `references/04-tracking/open-issues.md` の active project 索引に本 project 行を追加する
* [x] DA-α-000 entry を decision-audit.md に articulate する (= 5 軸 + 観測点 + Lineage 仮 sha)
* [x] §13.1 / §13.2 / §13.3 適用方針を plan.md §不可侵原則 6 に明記する
* [x] DA-α-000 Lineage 実 sha update + 振り返り判定 (= wrap-up commit で flip)
* [x] checklistFormatGuard / projectCompletionConsistencyGuard / projectizationPolicyGuard が本 project に対して PASS する
* [x] docs:check が PASS する (= project-health.json に本 project が `derivedStatus = in_progress` で出現)

## Phase 1: AAG Input Inventory

* [ ] `references/03-implementation/aag-engine-readiness-inventory.md` を新設し、5 分類 (contracts / generated / project lifecycle / rule source / guard source) で input を articulate する
* [ ] §13.2 適用: 同 commit に `docs/contracts/doc-registry.json` + `references/README.md` 索引 + 必要な inbound link を統合する
* [ ] active / completed / Archive v2 圧縮済 project の 3 状態すべてで engine が input を読めることを inventory 上で articulate する
* [ ] DA-α-001 entry を articulate する (= 5 軸 + 観測点 + Lineage 仮 sha → 実 sha + 振り返り判定)

## Phase 2: DetectorResult / AagResponse Normalization

* [ ] `tools/architecture-health/src/` 配下に DetectorResult schema + helper を新設する
* [ ] project lifecycle / archive manifest / doc registry / generated artifact metadata / schema validation の 5 系統で DetectorResult output を使用開始する
* [ ] human-readable renderer と DetectorResult[] machine output を分離する (= 同じ failure を 2 形式で出せる)
* [ ] DA-α-002 entry を articulate する

## Phase 3: Collector / Detector / Renderer 分離

* [ ] `tools/architecture-health/` 配下のフローを collector → detector → evaluator → renderer に分離する
* [ ] detector が fs / glob に直接依存しない箇所を増やす (= 具体数は Phase 1 inventory で確定)
* [ ] renderer 変更で detector logic が変わらないことを test で保証する
* [ ] DA-α-003 entry を articulate する

## Phase 4: Path Normalization / RepoFileIndex

* [ ] repo-relative POSIX path を標準化し、絶対 path を artifact に入れない
* [ ] `RepoFileEntry` 型を導入し、project / archive / doc registry validator が共通 path helper を使う状態にする
* [ ] path 正規化処理が各 detector に散らばっていないことを review で確認する
* [ ] DA-α-004 entry を articulate する

## Phase 5: Archive v2 / Project Lifecycle Fixture Corpus

* [ ] `fixtures/aag/` 配下に pass / fail fixture を最低 6 件 landing する (= archive-v2 / project-lifecycle / doc-registry / generated 系)
* [ ] 各 fixture に expected DetectorResult を定義する
* [ ] TypeScript detector が fixture で検証できる test を追加する
* [ ] 既存 guard と pure detector が同じ DetectorResult を返す parity test が PASS する
* [ ] DA-α-005 entry を articulate する

## Phase 6: Pure Detector Extraction

* [ ] archive manifest / project lifecycle / doc registry / generated artifact metadata / schema validation のうち最低 3 系統で pure detector 抽出を完遂する
* [ ] Vitest wrapper が thin wrapper 化される (= pure detector + expected DetectorResult[] の equality 検証のみ)
* [ ] Go/Rust engine が再実装すべき logic boundary を Phase 7 readiness report に articulate 可能な状態にする
* [ ] DA-α-006 entry を articulate する

## Phase 7: Engine Readiness Report / No-Go Boundary

* [ ] 本 project root 配下に engine readiness report を作成する (= ファイル名は Phase 7 着手時に articulate、Phase 0 時点では path として書かないことで pathExistence guard hard fail を回避)
* [ ] 移行可能になった detector / TS 側に残す detector / Go engine MVP input + output / shadow mode 対象 / hard gate 化判断 / Go 実装開始条件 を articulate する
* [ ] DA-α-007 entry を articulate する

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

* [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
* [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認 (= engine 実装に踏み込んでいない / 既存 guard 意味を変えていない)
* [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
* [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
* [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
