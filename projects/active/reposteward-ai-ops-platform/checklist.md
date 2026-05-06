# checklist — reposteward-ai-ops-platform

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の 2 section は **必ずこの順** で配置:
> 1. `## AI 自己レビュー (= user 承認の手前)` — AI が実装後の総 review を実施する mandatory checkpoint (= DA-β-002)
> 2. `## 最終レビュー (user 承認)` — user 承認 gate
>
> **本 checklist の追記方針**: Wave 1〜5 各 step は「verified LIVE な未着手項目」として **着手 PR の commit で追記** する (= §3 ルール、想像上の項目を bootstrap 段階で先取り articulate しない)。本 PR では Phase 0 (Bootstrap) のみ articulate。Wave 1 #1 (Task Capsule schema v1) 着手 PR で Wave 1 section を初期化する。

## Phase 0: Bootstrap

- [x] `projects/active/reposteward-ai-ops-platform/` 配下 8 ファイル一式 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json) を landing
- [x] `references/04-tracking/open-issues.md` の `## active projects` 索引に `reposteward-ai-ops-platform` 行を追加
- [x] `cd app && npm run docs:generate` を実行し、`references/04-tracking/generated/project-health.generated.md` に新 project が `derivedStatus = in_progress` で現れることを確認
- [x] `cd app && npm run test:guards` PASS 確認 (= projectizationPolicyGuard PZ-1〜12 / checklistFormatGuard / projectCompletionConsistencyGuard 等が新 project を accept)
- [x] DA-α-000 (進行モデル決定) を `decision-audit.md` に articulate
- [x] DA-α-001 (project naming = `reposteward-detection-ops-platform` → `reposteward-ai-ops-platform`) を `decision-audit.md` に articulate
- [x] DA-α-002 (Wave 1 reordering / Task Capsule prepend) を `decision-audit.md` に articulate
- [x] bootstrap commit を `claude/reposteward-detection-ops-bootstrap-mqG14` に push (= retry 4 回 / exponential backoff per branch policy)

## Wave 1 #1: Task Capsule schema v1

> **着手判断**: DA-α-003 (= bootstrap 後、user 提案で Wave 1 #1 着手承認、本 PR で landing)。
> **本 PR scope**: schema 単体 (= `docs/contracts/aag/task-capsule.schema.json`) + checklist Wave 1 section 初期化 + DA-α-003 articulate のみ。Go 実装 / sync guard 登録 / consumer 接続は Wave 1 #2 以降に分離 (= 不可侵原則 7 = Wave-by-wave delivery + step 独立 PR)。

- [x] `docs/contracts/aag/task-capsule.schema.json` を JSON Schema draft-07 形式で landing (= 13 field articulate、`additionalProperties: false`、`required = 12 field` (= intent 以外))
- [x] schema が valid JSON であり、`node -e 'JSON.parse(...)'` で parse 可能
- [x] 既存 AAG schema 規約と整合 (= `$schema = http://json-schema.org/draft-07/schema#` / `$id = https://aag.local/schemas/task-capsule-v1.json` / `$comment` で format 選定根拠 articulate / `aag-response.schema.json` + `detector-result.schema.json` と同 family)
- [x] DA-α-003 (Wave 1 #1 着手判断 + schema 設計の 5 軸) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` 反映 (= project-health の checklist 件数 update)
- [x] `cd app && npm run test:guards` PASS 確認 (= 新 schema 追加で既存 guard が落ちないこと、`aagContractSchemaSyncGuard.test.ts` は対象 schema を hard-code しているため新 schema は関与しない)
- [x] Wave 1 #1 commit を `claude/reposteward-ai-ops-platform-task-capsule-schema-v1` branch に push

## Wave 1 #2: `reposteward task prepare` MVP

> **着手判断**: DA-α-004 (= bootstrap PR + Wave 1 #1 PR landing 後、user directive「1を作業をつづけて完遂させましょう」で Wave 全完遂モードに移行)。
> **本 PR scope**: `aag-engine/internal/taskcapsule/` 新規 Go package + `aag task prepare` subcommand 追加 + Go 側 schema parity test + self-dogfood test + checklist + DA articulate。
> **やらない**: TS interface 追加 / `aagContractSchemaSyncGuard.test.ts` 拡張 (= TS consumer 不在のため Go 側 sync test で代替)、Wave 1 #3 以降の機能。

- [x] `aag-engine/internal/taskcapsule/task_capsule.go` を landing (= TaskCapsule struct + HardGate enum + RequiredFields + AllJSONFields + Validate())
- [x] `aag-engine/internal/taskcapsule/prepare.go` を landing (= Prepare() function + project config / architecture-health / project-health 読込 + slugify + MarshalJSON with SetEscapeHTML(false))
- [x] `aag-engine/internal/taskcapsule/task_capsule_test.go` で Go ↔ schema parity を機械検証 (= TestSchemaSync_SchemaID / RequiredFields / AllJSONFields / SchemaVersionConst / StructTagsMatchAllJSONFields)
- [x] Validate / slugify / Prepare の unit test 全 PASS (= empty input / nonexistent project / explicit TaskID / self-dogfood)
- [x] `aag-engine/cmd/aag/main.go` に `task` subcommand + `prepare` action 追加 (= --project / --intent / --task / --repo flag、ExitPass = capsule 出力成功 / ExitError = 引数不正)
- [x] `aag-engine/cmd/aag/main_test.go` に CLI level test 追加 (= no action / unknown action / missing --project / self-dogfood / unexpected positional / nonexistent project)
- [x] `cd /home/user/Test4/aag-engine && go test ./...` 全 PASS
- [x] `aag task prepare --repo <root> --project reposteward-ai-ops-platform --intent "..."` 実行で valid TaskCapsule v1 JSON が stdout に出力される (= self-dogfood の AC)
- [x] DA-α-004 (Wave 1 #2 着手判断 + Go binding 設計の 5 軸 + Go-side parity vs TS-side sync の判断) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` 反映 + `cd app && npm run test:guards` PASS 確認 (= 1060 TS guard 維持、Go 追加で TS guard は影響なし)
- [x] Wave 1 #2 commit を `claude/reposteward-ai-ops-platform-task-prepare-mvp` branch に push (= Wave 1 #1 branch から派生、stacked PR pattern)

## Wave 1 #3: AAG Parameters v1

> **着手判断**: DA-α-005 (= Wave 全完遂モード継続、Wave 1 #2 task prepare の constraints source として接続)。
> **本 PR scope**: `docs/contracts/aag/aag-parameters.schema.json` (= JSON Schema draft-07) + `aag/parameters/aag-parameters.json` (= 14 bucket / effectiveCodeLines / 3 excludedKinds 初期 articulate) のみ。collector / consumer / sync guard 拡張は Wave 1 #4 / #5 に分離。

- [x] `docs/contracts/aag/aag-parameters.schema.json` を JSON Schema draft-07 で landing (= top-level `additionalProperties: false`、`required = [schemaVersion, codeSize]`、`schemaVersion: const "aag-parameters-v1"`、`codeSize` 内に metric / buckets / excludedKinds を articulate)
- [x] `aag/parameters/aag-parameters.json` を schema 準拠で landing (= `metric: effectiveCodeLines`、14 bucket = 1-10 / 11-20 / ... / 301+、`excludedKinds: [generated, fixture, archive]`)
- [x] schema が valid JSON、parameters が valid JSON、parameters が schema を Ajv で pass
- [x] bucket 連続性 (= 隣接 bucket の min/max が gap / overlap なし) を articulate (= node check で確認)
- [x] DA-α-005 (Wave 1 #3 着手判断 + parameters 設計の 5 軸 + Wave 内位置付け) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` + `cd app && npm run test:guards` PASS 確認 (= 1060 TS guard 維持、新 schema / parameters は collector 未配線で TS guard に影響なし)
- [x] Wave 1 #3 commit を `claude/reposteward-ai-ops-platform-aag-parameters-v1` branch に push (= Wave 1 #2 branch から派生、stacked PR pattern)

## Wave 1 #4: SourceFacts v1

> **着手判断**: DA-α-006 (= Wave 全完遂モード継続、AAG Parameters v1 を消費する collector layer)。
> **本 PR scope**: schema (`docs/contracts/aag/source-facts.schema.json`) + collector (`tools/architecture-health/src/facts/source-facts.ts`) + CLI script (`source-facts-cli.ts`) + 12 unit test (`app/src/test/tools/sourceFactsCollector.test.ts`) + 初期 generated artifact (`references/04-tracking/generated/source-facts.json`)。Wave 1 #5 statistics の入力として接続される。
> **やらない**: docs:generate pipeline への統合 (= Wave 1 #5 で実施、本 PR では手動 / npm script 経由で実行)、Wave 1 #5 以降の機能。

- [x] `docs/contracts/aag/source-facts.schema.json` を landing (= `schemaVersion: const "source-facts-v1"`、`summary` + `facts[]` 構造、`SourceFact` definition で path / kind / layer / 4 size field + optional imports / exports / hooks)
- [x] `tools/architecture-health/src/facts/source-facts.ts` を landing (= `collectSourceFacts(opts)` / `walkDir` / `factForFile` / `inferKind` / `inferLayer` / `countCommentLines` / `enrichTs` / `enrichGo`、`DEFAULT_INCLUDE_DIRS` 6 件 / `ALWAYS_SKIP_DIRS` 9 件)
- [x] `tools/architecture-health/src/facts/source-facts-cli.ts` を landing (= aag-parameters.json から excludedKinds を読込み、collector を実行、`references/04-tracking/generated/source-facts.json` に書き出す)
- [x] `app/src/test/tools/sourceFactsCollector.test.ts` で 12 件の contract test を articulate (= shape / kind / layer / TS imports/exports / TSX hooks / Go imports/exports / MD / excludedKinds 3 種 / comment counting / sort / skip dirs)
- [x] 初期 `references/04-tracking/generated/source-facts.json` を生成 + commit (= 2710 file scan、Ajv で schema 準拠を確認)
- [x] DA-α-006 (Wave 1 #4 着手判断 + collector 設計の 5 軸 + 統合タイミング判断) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` + `cd app && npm run test:guards` PASS 確認 (= 148 file / 1072 test、新 collector test 12 件含む)
- [x] Wave 1 #4 commit を `claude/reposteward-ai-ops-platform-source-facts-v1` branch に push (= Wave 1 #3 branch から派生、stacked PR pattern)

## Wave 1 #5: Effective LOC Statistics

> **着手判断**: DA-α-007 (= Wave 全完遂モード継続、Wave 1 #4 SourceFacts を入力に集計層を articulate)。
> **本 PR scope**: schema (`aag-size-statistics.schema.json`) + 集計 logic (`source-facts-statistics.ts`) + CLI (`source-facts-statistics-cli.ts`) + 10 unit test + 初期 generated artifact。Health KPI 統合は別 PR (= main.ts collector 配線が必要、scope 分離)。

- [x] `docs/contracts/aag/aag-size-statistics.schema.json` を landing (= JSON Schema draft-07、`schemaVersion: const "aag-size-statistics-v1"`、summary 7 percentile/mean field + byBucket array + byLayer open object)
- [x] `tools/architecture-health/src/facts/source-facts-statistics.ts` を landing (= `computeSizeStatistics` / `computeSummary` / `computeBucketDistribution` / `computeLayerStatistics` / `percentile` linear interpolation + floor)
- [x] `tools/architecture-health/src/facts/source-facts-statistics-cli.ts` を landing (= source-facts.json + aag-parameters.json 読込 + 集計 + JSON 書き出し)
- [x] `app/src/test/tools/sourceFactsStatistics.test.ts` で 10 件の contract test を articulate (= 空入力 / 単一値 / percentile floor / bucket boundary inclusive / layer null 除外 / parameters 順序保持 / mean float / etc.)
- [x] features/ 直下 file (= README.md 等) を `features/<name>` にしない edge case 修正 + test 追加
- [x] 初期 `references/04-tracking/generated/aag-size-statistics.json` を生成 + commit (= 2714 file 集計、p50=80 / p90=249 / p95=330 / p99=626 / max=1606、14 bucket distribution、26 layer)
- [x] Ajv で statistics が schema 準拠を確認 = STATISTICS_VALID
- [x] DA-α-007 (Wave 1 #5 着手判断 + statistics 設計の 5 軸 + Health KPI 統合 deferral 判断) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` + `cd app && npm run test:guards` PASS 確認 (= 149 file / 1082 test、新 statistics test 10 件含む)
- [ ] Wave 1 #5 commit を `claude/reposteward-ai-ops-platform-effective-loc-stats` branch に push (= Wave 1 #4 branch から派生、stacked PR pattern)

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Phase / Wave 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則 1〜8 違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 (= Go MVP 不可侵原則 4/5 違反 / YAML 混入 / Human UI 追加 / hard gate 追加) が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / Task Capsule schema validation / SourceFacts collector エラー伝播 / Go CLI exit code を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit / `aag/CHANGELOG.md` (= [AAG 6.1] entry) の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: app version は不変 (= versionImpact app=+0.0.0 declared)、`docs/contracts/aag/aag-metadata.json` `aagVersion` は 6.0 → 6.1 に bump、`aag/CHANGELOG.md` に [AAG 6.1] entry 追加 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase / Wave + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase / Wave の成果物 (commit / PR / 関連正本 / generated artifact / Task Capsule self-dogfood / Wave 1〜5 全 PR landed / Health Hard Gate PASS 維持) を user がレビューし、archive プロセスへの移行を承認する
