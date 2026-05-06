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

- [ ] `aag-engine/internal/taskcapsule/task_capsule.go` を landing (= TaskCapsule struct + HardGate enum + RequiredFields + AllJSONFields + Validate())
- [ ] `aag-engine/internal/taskcapsule/prepare.go` を landing (= Prepare() function + project config / architecture-health / project-health 読込 + slugify + MarshalJSON with SetEscapeHTML(false))
- [ ] `aag-engine/internal/taskcapsule/task_capsule_test.go` で Go ↔ schema parity を機械検証 (= TestSchemaSync_SchemaID / RequiredFields / AllJSONFields / SchemaVersionConst / StructTagsMatchAllJSONFields)
- [ ] Validate / slugify / Prepare の unit test 全 PASS (= empty input / nonexistent project / explicit TaskID / self-dogfood)
- [ ] `aag-engine/cmd/aag/main.go` に `task` subcommand + `prepare` action 追加 (= --project / --intent / --task / --repo flag、ExitPass = capsule 出力成功 / ExitError = 引数不正)
- [ ] `aag-engine/cmd/aag/main_test.go` に CLI level test 追加 (= no action / unknown action / missing --project / self-dogfood / unexpected positional / nonexistent project)
- [ ] `cd /home/user/Test4/aag-engine && go test ./...` 全 PASS
- [ ] `aag task prepare --repo <root> --project reposteward-ai-ops-platform --intent "..."` 実行で valid TaskCapsule v1 JSON が stdout に出力される (= self-dogfood の AC)
- [ ] DA-α-004 (Wave 1 #2 着手判断 + Go binding 設計の 5 軸 + Go-side parity vs TS-side sync の判断) を `decision-audit.md` に articulate
- [ ] `cd app && npm run docs:generate` 反映 + `cd app && npm run test:guards` PASS 確認 (= 1060 TS guard 維持、Go 追加で TS guard は影響なし)
- [ ] Wave 1 #2 commit を `claude/reposteward-ai-ops-platform-task-prepare-mvp` branch に push (= Wave 1 #1 branch から派生、stacked PR pattern)

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
