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
- [x] Wave 1 #5 commit を `claude/reposteward-ai-ops-platform-effective-loc-stats` branch に push (= Wave 1 #4 branch から派生、stacked PR pattern)

## Wave 1 #6: `reposteward stats files` query

> **着手判断**: DA-α-008 (= Wave 全完遂 final step、Wave 1 #4 SourceFacts + Wave 1 #5 Statistics + Wave 1 #3 Parameters を実 query に articulate する CLI 接続)。
> **本 PR scope**: `aag-engine/internal/stats/` Go package (= Query function + filter logic) + `aag stats files` subcommand + 14 unit test + 8 CLI level test + checklist + DA articulate。

- [x] `aag-engine/internal/stats/stats.go` を landing (= QueryInput / QueryOutput / FileEntry types + Query() function + parseRange / resolveBucket / resolvePercentileThreshold + MarshalJSON with SetEscapeHTML(false))
- [x] `aag-engine/internal/stats/stats_test.go` で 14 件の contract test を articulate (= parseRange valid/empty/malformed + empty input rejection + unsupported metric + real repo no filter / range / bucket / unbounded bucket / unknown bucket / layer / above percentile / unknown percentile / limit cap / sort order + MarshalJSON HTML escape)
- [x] `aag-engine/cmd/aag/main.go` に `stats` subcommand + `files` action 追加 (= --repo / --metric / --range / --bucket / --layer / --above / --limit flag、ExitPass / ExitError)
- [x] `aag-engine/cmd/aag/main_test.go` に CLI level test 追加 (= 8 test = no action / unknown action / no filter / range / bucket / malformed range / unexpected positional / 等)
- [x] `cd /home/user/Test4/aag-engine && go test ./...` 全 PASS (= 既存 + 新 14 stats unit + 8 CLI = 22 件追加)
- [x] `aag stats files --bucket loc.301_plus --limit 5` 実行で 186 件 totalMatched + top 5 file (= execution-overlay.ts 1606 行 / ExplanationService test 1410 行 / doc-registry.json 1239 行 / etc.) を articulate
- [x] DA-α-008 (Wave 1 #6 着手判断 + Go schema mirror + filter compose 設計の 5 軸) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` + `cd app && npm run test:guards` PASS 確認 (= 149 file / 1082 test 維持)
- [x] Wave 1 #6 commit を `claude/reposteward-ai-ops-platform-stats-files-query` branch に push (= Wave 1 #5 branch から派生、Wave 1 全完遂)

## Wave 2 #7: sizeGuard.test.ts effective LOC 化

> **着手判断**: DA-α-009 (= user directive「続けましょう」継続、Wave 1 完遂後 Wave 2 入)。
> **本 PR scope**: `effectiveCodeLineCount` helper 追加 + sizeGuard.test.ts の 6 site で metric を raw → effective に swap。threshold 維持 (= effective ≤ physical で新規 violation 0 保証)。baseline tightening は別 step (= Wave 2.1 candidate) に分離。

- [x] `app/src/test/guardTestHelpers.ts` に `effectiveCodeLineCount(content)` helper を export 追加 (= line-based filter、blank + isCommentLine() 除外、既存 `stripComments` と同 idiom)
- [x] `app/src/test/guards/sizeGuard.test.ts` の 6 site (= AR-G5-HOOK-LINES / AR-G6-COMPONENT / Tier 2 / AR-G5-INFRA-LINES / AR-G5-DOMAIN-LINES / AR-G5-USECASE-LINES) で metric を raw line count → `effectiveCodeLineCount(content)` に swap
- [x] threshold (300 / 400 / 600 / 660) は不変 (= effective ≤ physical の identity により新規 violation 0)
- [x] sizeGuard.test.ts 11 test 全 PASS、test:guards 1082 PASS
- [x] DA-α-009 (Wave 2 #7 着手判断 + metric swap 戦略 + baseline tightening 分離判断) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` + `cd app && npm run test:guards` PASS 確認 (= Health 60/60 OK / Hard Gate PASS、前回比 Improved)
- [x] Wave 2 #7 commit を `claude/reposteward-ai-ops-platform-size-guard-effective-loc` branch に push (= Wave 1 #6 branch から派生)

## Wave 2 #8: architectureStateAudit.test.ts effective LOC 化

> **着手判断**: DA-α-010 (= Wave 2 継続、Wave 2 #7 と同 idiom で audit 側も effective LOC に articulate)。
> **本 PR scope**: `architectureStateAudit.test.ts` の 2 site (= bridge inventory `lines` + complexity hotspot `lineCount`) で raw line count を `effectiveCodeLineCount(content)` に swap。Wave 2 #7 で landing 済 helper を import で再利用。

- [x] `app/src/test/audits/architectureStateAudit.test.ts` で `effectiveCodeLineCount` を import (= Wave 2 #7 で landing 済 helper)
- [x] bridge inventory (= `inventoryBridgeFiles()`、line 115) で `fs.readFileSync(f, 'utf-8').split('\n').length` → `effectiveCodeLineCount(fs.readFileSync(f, 'utf-8'))` に swap
- [x] complexity hotspot (= `detectComplexityHotspots()`、line 141) で `content.split('\n').length` → `effectiveCodeLineCount(content)` に swap
- [x] audit 11 test 全 PASS
- [x] DA-α-010 (Wave 2 #8 着手判断 + helper 再利用 + audit metric 整合) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` + `cd app && npm run test:guards` PASS 確認 (= 1082 test 維持、Health 60/60 OK / Hard Gate PASS)
- [x] Wave 2 #8 commit を `claude/reposteward-ai-ops-platform-state-audit-effective-loc` branch に push (= Wave 2 #7 branch から派生)

## Wave 2 #9: Health report に bucket distribution 追加 (= Wave 2 完遂)

> **着手判断**: DA-α-011 (= Wave 2 final step、Health report に bucket distribution table を articulate)。
> **本 PR scope**: 既存 architecture-health.generated.md を touch せず、独立 generated artifact `aag-size-statistics.generated.md` を新設 (= blast radius 最小、Wave 1 #5 の JSON を消費する MD view layer)。

- [x] `tools/architecture-health/src/facts/source-facts-statistics-md.ts` を landing (= renderStatisticsMarkdown 関数、Summary + Bucket Distribution + By Layer の 3 section articulate)
- [x] `tools/architecture-health/src/facts/source-facts-statistics-cli.ts` を update (= MD 出力経路追加、JSON と並行で MD 書き出し)
- [x] `references/04-tracking/generated/aag-size-statistics.generated.md` を生成 + commit (= 2714 file 集計、Summary table + 14 bucket distribution table + 26 layer table、生成 timestamp + 関連 query 言及)
- [x] DA-α-011 (Wave 2 #9 着手判断 + Approach B 採用 + 既存 health report touch なし) を `decision-audit.md` に articulate
- [x] `cd app && npm run docs:generate` + `cd app && npm run test:guards` PASS 確認 (= 1082 test 維持、Health 60/60 OK / Hard Gate PASS)
- [x] Wave 2 #9 commit を `claude/reposteward-ai-ops-platform-size-statistics-md` branch に push (= Wave 2 #8 branch から派生、**Wave 2 全完遂**)

## Wave 3 #10: `aag where-am-i`

> **着手判断**: DA-α-012 (= user directive「3を完遂させてください」、Wave 3 AI navigation MVP 入口)。
> **本 PR scope**: `aag-engine/internal/navigation/whereami.go` 新設 + `aag where-am-i` subcommand + 7 unit test + 2 CLI test。

- [x] `aag-engine/internal/navigation/whereami.go` を landing (= WhereAmI() function + DeriveActiveProjectFromActiveDirs + recommendNextCommand + MarshalJSON shared helper)
- [x] `aag-engine/internal/navigation/whereami_test.go` で contract test 7 件 (= empty input / non-git / real repo / active dir lookup 6 case / recommendNextCommand 3 path / MarshalJSON HTML escape)
- [x] `cmd/aag/main.go` に `where-am-i` subcommand 追加 (= --repo flag のみ)
- [x] `cmd/aag/main_test.go` に CLI test 2 件追加
- [x] `aag where-am-i --repo /home/user/Test4` 実行で valid where-am-i-v1 JSON 出力 + recommendedNextCommand が Wave 3 #11 を articulate
- [x] DA-α-012 を `decision-audit.md` に articulate
- [x] go vet clean / go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 3 #10 commit を branch に push

## Wave 3 #11: `aag context --project <id>`

> **着手判断**: DA-α-013 (= Wave 3 継続、light-weight project context bootstrap)。

- [x] `aag-engine/internal/navigation/context.go` を landing (= Context() function、project config 読込 + checklist.md unchecked 項目 articulate、AI 自己レビュー / 最終レビュー section skip)
- [x] `context_test.go` で contract test 6 件 (= empty input / nonexistent project / real repo / maxN cap / checklist parser 3 cases)
- [x] `cmd/aag/main.go` に `context` subcommand 追加 (= --project required / --max-next-actions optional)
- [x] `main_test.go` に CLI test 3 件追加
- [x] dogfood: aag context --project reposteward-ai-ops-platform → title / 5 requiredReads / 11 constraints / 1+ nextActions articulate
- [x] DA-α-013 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 3 #11 commit を branch に push

## Wave 3 #12: `aag changed --explain`

> **着手判断**: DA-α-014 (= Wave 3 継続、changed-explain via git diff + obligation map subset)。

- [x] `aag-engine/internal/navigation/changed.go` を landing (= Changed() + classifyByArea + matchObligations + collectRequiredReads + summarizeChange、areaRules 30 件 + obligationRules 11 件 + requiredReadsByPrefix 10 prefix)
- [x] `changed_test.go` で contract test 6 件 (= empty input / area classification / guard obligation / required reads dedupe / summary format / real repo)
- [x] `cmd/aag/main.go` に `changed` subcommand 追加 (= --base / --head / --explain default true / --repo)
- [x] `main_test.go` に CLI test 2 件追加 (= real repo / unexpected positional)
- [x] dogfood: aag changed --base HEAD~1 → changed file list + by area + obligations + required reads + summary articulate
- [x] DA-α-014 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 3 #12 commit を branch に push

## Wave 3 #13: `aag rule locate <ruleId>`

> **着手判断**: DA-α-015 (= Wave 3 継続、merged-architecture-rules.json から rule を locate)。

- [x] `aag-engine/internal/navigation/rule.go` を landing (= RuleLocate() + loadMergedRules + findGuardsReferencingRule + suggestSimilarRuleIds)
- [x] `rule_test.go` で contract test 5 件 (= empty input / known rule / unknown rule with hint / suggestSimilarRuleIds prefix matching / findGuardsReferencingRule)
- [x] `cmd/aag/main.go` に `rule locate` subcommand 追加 (= --repo + ruleId positional)
- [x] `main_test.go` に CLI test 5 件追加
- [x] dogfood: aag rule locate AR-G5-HOOK-LINES → slice / what / why / doc / principleRefs / thresholds / definition / guards articulate
- [x] DA-α-015 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 3 #13 commit を branch に push

## Wave 3 #14: `aag detector refs <detectorId>` (= Wave 3 完遂)

> **着手判断**: DA-α-016 (= Wave 3 final step、5 detector の go/ts/schema/fixtures を articulate)。

- [x] `aag-engine/internal/navigation/detector.go` を landing (= DetectorRefs() + detectorIdMappings 5 件 + KnownDetectorIds + listFixtures + existsAt)
- [x] `detector_test.go` で contract test 5 件 (= empty input / unknown detector hint / archive-manifest dogfood / 全 5 detector × impl + fixture / known list count)
- [x] `cmd/aag/main.go` に `detector refs` subcommand 追加 (= --repo + detectorId positional)
- [x] `main_test.go` に CLI test 4 件追加
- [x] dogfood: aag detector refs archive-manifest → goImpl / goTest / tsImpl / schema / 3 fixtures articulate
- [x] DA-α-016 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 3 #14 commit を branch に push (= **Wave 3 全完遂**)

## Wave 4 #15: `aag clean check`

> **着手判断**: DA-α-017 (= Wave 4 入口、cleanliness rules detection)。

- [x] `aag-engine/internal/cleanliness/clean.go` を landing (= Check() + 3 rule (= generated-handauthored / archive-missing-manifest / projectid-duplicate) + summarize)
- [x] `clean_test.go` で contract test 7 件 (= 3 rule synthetic / hasGeneratedMarker / quick-fixes 例外 / summarize)
- [x] `cmd/aag/main.go` に `clean check` subcommand 追加
- [x] `main_test.go` に CLI test 2 件追加
- [x] dogfood: aag clean check → 0 violations articulate (= real repo clean)
- [x] DA-α-017 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 4 #15 commit を branch に push

## Wave 4 #16: `aag comments list --kind`

> **着手判断**: DA-α-018 (= Wave 4 継続、comment governance scan)。

- [x] `aag-engine/internal/commentscan/comments.go` を landing (= List() + 3 kind (= todo / suppression / expired) + scanFile + 5 regex pattern)
- [x] `comments_test.go` で contract test 8 件 (= empty / invalid kind / 3 kind real scenario / skip dirs / regex precision)
- [x] `cmd/aag/main.go` に `comments list` subcommand 追加 (= --kind required + --repo)
- [x] `main_test.go` に CLI test 4 件追加
- [x] dogfood: aag comments list --kind todo → 6 items (= 主に test fixture、real TODO は厳密 anchor で false positive 抑止)
- [x] DA-α-018 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 4 #16 commit を branch に push

## Wave 4 #17: `aag docs placement-check`

> **着手判断**: DA-α-019 (= Wave 4 継続、doc placement convention articulate)。

- [x] `aag-engine/internal/cleanliness/docs_placement.go` を landing (= PlacementCheck() + 2 rule = schema-misplaced / generated-misplaced + 6 conventions articulation + scanRoots)
- [x] `docs_placement_test.go` で contract test 6 件 (= empty / synthetic schema misplaced / synthetic generated misplaced / e2e / isUnder / real repo)
- [x] `cmd/aag/main.go` に `docs placement-check` subcommand 追加
- [x] `main_test.go` に CLI test 2 件追加
- [x] dogfood: aag docs placement-check → 0 violations (= references/04-tracking/ 全体を canonical generated dir として articulate + projects/<id>/derived/ 例外 articulate 後 clean)
- [x] DA-α-019 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 4 #17 commit を branch に push

## Wave 4 #18: Detection Inventory v2 (= preparatory doc work、Wave 4 完遂)

> **着手判断**: DA-α-020 (= Wave 4 final、preparatory doc work、Wave 5 入力として完成)。

- [x] `docs/contracts/aag/detection-inventory.schema.json` を landing (= JSON Schema draft-07、Detection definition with id / kind enum (= guard / audit / detector / collector) / location / what)
- [x] `references/03-implementation/detection-inventory-v2.md` narrative を landing (= 動機 + 4 kind articulate + 更新方針 + 関連 Wave map)
- [x] `references/04-tracking/generated/detection-inventory.json` 初期 inventory を生成 (= 167 detection: guard 137 / collector 14 / detector 10 / audit 6)
- [x] Ajv で inventory が schema 準拠を確認 = INVENTORY_VALID
- [x] `docs/contracts/doc-registry.json` に 2 entry 追加 (= schema + narrative)
- [x] `references/README.md` に narrative entry 追加 (= docRegistryGuard 整合)
- [x] DA-α-020 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 4 #18 commit を branch に push (= **Wave 4 全完遂**)

## Wave 5 #19: Premise Contracts v1

> **着手判断**: DA-α-021 (= Wave 5 入口、structural premise articulation)。

- [x] `docs/contracts/aag/premise-contract.schema.json` を landing (= JSON Schema draft-07、PremiseContract definition with id pattern + trigger.paths + requires array、PremiseRequirement with mode enum (= must-pass / review / co-update))
- [x] `aag/parameters/premise-contracts.json` を landing (= 5 initial contract = PC-DETECTOR-RESULT-CONTRACT / PC-AAG-RESPONSE-CONTRACT / PC-TASK-CAPSULE-CONTRACT / PC-SOURCE-FACTS-CONTRACT / PC-AAG-PARAMETERS-CONTRACT)
- [x] Ajv で contracts が schema 準拠を確認 = PREMISE_VALID
- [x] doc-registry に entry 追加
- [x] DA-α-021 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 5 #19 commit を branch に push

## Wave 5 #20: `aag obligation check`

> **着手判断**: DA-α-022 (= Wave 5 継続、premise contract triggers を git diff で検出)。

- [x] `aag-engine/internal/obligation/obligation.go` を landing (= Check() + premise contract loader + pathMatchesTrigger + matchContracts)
- [x] `obligation_test.go` で contract test 7 件 (= empty input / pathMatchesTrigger 6 case / matchContracts synthetic / no-trigger / loadContracts / real repo / summarize)
- [x] `cmd/aag/main.go` に `obligation check` subcommand 追加 (= --base / --head / --changed-only / --repo)
- [x] `main_test.go` に CLI test 2 件追加
- [x] dogfood: aag obligation check --base HEAD~3 → 24 changed file、0 matched contracts (= 現在の変更は core schema 外)
- [x] DA-α-022 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 5 #20 commit を branch に push

## Wave 5 #21: `aag repair-context --from <file>`

> **着手判断**: DA-α-023 (= Wave 5 継続、検出 output → repair context generator)。

- [x] `aag-engine/internal/repaircontext/repaircontext.go` を landing (= Repair() + 4 input kind classifier = detector-results / obligation-check-v1 / clean-check-v1 / docs-placement-check-v1 + rule registry lookup)
- [x] `repaircontext_test.go` で contract test 8 件 (= empty / nonexistent / 4 kind synthetic + unknown fallback + supported kinds + dedup)
- [x] `cmd/aag/main.go` に `repair-context` subcommand 追加 (= --from required + --repo)
- [x] `main_test.go` に CLI test 2 件追加
- [x] dogfood: synthetic detector-results JSON → repairReads 3 件 + suggestedActions 2 件 + requiredChecks 1 件 articulate
- [x] DA-α-023 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [x] Wave 5 #21 commit を branch に push

## Wave 5 #22: `aag task validate` / `aag task close`

> **着手判断**: DA-α-024 (= Wave 5 継続、Task Capsule の validate / close 補助 command)。

- [x] `aag-engine/internal/taskcapsule/validate.go` を landing (= ValidateCapsule + CloseCapsule + defaultFinalChecks)
- [x] `validate_test.go` で contract test 9 件 (= empty / nonexistent / valid / invalid articulate / malformed JSON / hardGate fail blocks / final checks essentials)
- [x] `cmd/aag/main.go` に `task validate` + `task close` action 追加 (= --capsule required)
- [x] `main_test.go` に CLI test 4 件追加 (= validate missing / valid / close missing / close valid)
- [x] dogfood: prepared capsule → validate=true / close ready=true + 5 final checks articulate
- [x] DA-α-024 articulate
- [x] go test all PASS / TS 1082 PASS / Health 60/60 OK / Hard Gate PASS
- [ ] Wave 5 #22 commit を branch に push

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
