# checklist — aag-platformization

> 役割: completion 判定の入力 (required checkbox の集合)。
> やってはいけないこと / 常時チェック / 恒久ルールは `plan.md` に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: Bootstrap

- [x] `_template/` をコピーして `projects/aag-platformization/` を作成した
- [x] `config/project.json` を `aag-platformization` の実値で埋めた
- [x] `projectization.md` に AAG-COA 判定 (Level 3 / architecture-refactor) を記録した
- [x] `AI_CONTEXT.md` に why / scope / read order を記述した
- [x] `HANDOFF.md` に現在地・次にやること・ハマりポイント 7 件を記述した
- [x] `plan.md` に 5 不可侵原則 / 4 Workstream / 3 AI Checkpoint / 10 Phase / 関連実装表 / Decision Audit Mechanism を記述した
- [x] `aag/execution-overlay.ts` を空のままにした (本 program は本体 merge に参加しない)
- [x] `decision-audit.md` を scaffold として新設した (entry 雛形 + 必須要件 + 判断 entry 一覧)
- [x] `breaking-changes.md` を派生セットから足した (BC-AAG-1〜6 と rollback plan)
- [x] `decision-audit.md` の DA-α-000 entry に Phase 0 全 landing 成果物の Q1〜Q5 self-check 表を埋めた (gap 0 件)
- [ ] `references/02-status/open-issues.md` の active projects に `aag-platformization` 行を追加した
- [ ] `CURRENT_PROJECT.md` を `aag-platformization` に切り替えた
- [ ] `cd app && npm run verify:project` が PASS
- [ ] `cd app && npm run test:guards` が PASS
- [ ] `cd app && npm run docs:generate` を実行した
- [ ] `cd app && npm run docs:check` が PASS
- [ ] `cd app && npm run lint` が PASS
- [ ] `cd app && npm run build` が PASS

## Phase 1: Authority Charter

- [ ] `aag/core/AAG_AUTHORITY_TABLE.md` を新設した
- [ ] AAG_AUTHORITY_TABLE.md に 10 concept (RuleSemantics / RuleGovernance / RuleOperationalState / RuleDetectionSpec / RuleBinding / DEFAULT_EXECUTION_OVERLAY / EXECUTION_OVERLAY / ARCHITECTURE_RULES / AagResponse / DetectorResult) × 4 列 (concept / authority / physical source / change policy) の表を埋めた
- [ ] `decision-audit.md` に DA-α-001 (Authority Table の 10 concept × 4 列構造の判断 + 振り返り観測点 3 つ以上) を追加した
- [ ] DA-α-001 の Commit Lineage に judgementCommit / preJudgementCommit を記録し、annotated tag を 2 本 (judgement + rollback-target) push した
- [ ] `aag/core/AAG_CORE_INDEX.md` から AAG_AUTHORITY_TABLE.md へのリンクを追加した
- [ ] `references/01-principles/aag/source-of-truth.md` に "Authority Table" セクションを追加した
- [ ] `cd app && npm run docs:check` が PASS
- [ ] DA-α-001 entry に Phase 1 landing 成果物の Q1〜Q5 self-check 表を埋めた (gap があれば articulate)

## Phase 2: Merge Policy Fix

- [ ] `aag/core/MERGE_POLICY.md` を新設し、3 案 (defaults stub / merged null / bootstrap seed) を articulate した
- [ ] 3 案 (defaults stub / merged null / bootstrap seed) を blast radius / migration cost / 後方互換 で比較する一覧を `MERGE_POLICY.md` に作成した
- [ ] AI が採用案を 1 つ事実根拠で確定し、`decision-audit.md` DA-α-002 entry (判断時 = 候補・採用案・判断根拠・想定リスク・振り返り観測点 3 つ以上) を追加した
- [ ] DA-α-002 の Commit Lineage に judgementCommit / preJudgementCommit を記録した
- [ ] judgement / rollback-target tag を annotated tag として打って push した (`aag-platformization/DA-α-002-judgement` + `aag-platformization/DA-α-002-rollback-target`)
- [ ] `app/src/test/aag-core-types.ts` に `RuleExecutionOverlayEntry` を集約した
- [ ] `_template/aag/execution-overlay.ts` の type import を集約版に切り替えた
- [ ] `pure-calculation-reorg/aag/execution-overlay.ts` の type import を集約版に切り替えた
- [ ] `app/src/test/architectureRules/merged.ts` を採用案に従って修正した
- [ ] `app/src/test/architectureRules/merged.ts` の merge result に `resolvedBy` field を追加した
- [ ] `_template/aag/execution-overlay.ts` の冒頭 comment を採用案に揃えた
- [ ] `pure-calculation-reorg/aag/execution-overlay.ts` の冒頭 comment を採用案に揃えた
- [ ] `references/03-guides/new-project-bootstrap-guide.md` Step 4 を採用案に揃えた
- [ ] 空 `EXECUTION_OVERLAY = {}` で test-bootstrap した結果 `merged.ts` が throw しない
- [ ] `pure-calculation-reorg` の既存 merge 結果が変わらない (golden test)
- [ ] `cd app && npm run test:guards` が PASS
- [ ] `cd app && npm run lint && npm run build` が PASS
- [ ] DA-α-002 entry に Phase 2 landing 成果物の Q1〜Q5 self-check 表を埋めた (gap があれば articulate)

## Phase 3: Authority Table + Schema Registry

- [ ] `aag/core/AAG_SCHEMA_REGISTRY.md` を新設し、schema 一覧と version policy を articulate した
- [ ] AAG Domain serialization format 候補 (JSON / YAML / TOML / CUE / protobuf / Dhall / KDL / JSON5 / JSONC 等) を「構造性 / Go 親和性 / TS 親和性 / schema-first / diffable / comments / tooling / federated $id」で比較する一覧を `AAG_SCHEMA_REGISTRY.md` に作成した
- [ ] AI が format 1 つを事実根拠で確定し、`decision-audit.md` DA-α-003 entry (判断時 + commit lineage + 振り返り観測点 3 つ以上) を追加した
- [ ] DA-α-003 の judgement / rollback-target tag を annotated tag として打って push した
- [ ] 採用 format で 5 schema を `docs/contracts/aag/` 配下に新設した (rule-semantics / rule-governance / rule-operational-state / rule-detection-spec / rule-binding)
- [ ] 各 schema に `$id` / `version` / `description` 相当を設定した (format 依存)
- [ ] schema isomorphism の方向性 (TS-from-schema vs schema-from-TS) を AI が判断し、`decision-audit.md` DA-α-004 entry を追加した
- [ ] `app/src/test/guards/aagSchemaIsomorphismGuard.test.ts` を新設し、TS 型と schema の同型性を検証する
- [ ] TS 型を試験的に変更すると aagSchemaIsomorphismGuard が hard fail する
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-α-003 / DA-α-004 entry に Phase 3 landing 成果物の Q1〜Q5 self-check 表を埋めた (gap があれば articulate)
- [ ] `decision-audit.md` に Phase 1〜3 の判断 (DA-α-001 Authority Table 構造 / DA-α-002 merge policy 採用案 / DA-α-003 format 選定 / DA-α-004 schema isomorphism 方向性) の振り返りを記入し、判定が "正しい" or "部分的+軌道修正記録あり" であることを確認した
- [ ] **[AI Checkpoint α: Authority]** 通過判定 — 上記振り返りを根拠に Phase 4 以降への進行を AI が決定した (人間承認不要)

## Phase 4: Merged Artifact Generator

- [ ] `tools/architecture-health/src/aag/merge-artifact-generator.ts` を新設した
- [ ] `docs/generated/aag/merged-architecture-rules.json` が生成可能 (resolvedBy 付き)
- [ ] `docs/generated/aag/merge-report.json` が生成可能 (project override 率 / defaults 補完率 / stub 適用率)
- [ ] `docs/generated/aag/overlay-coverage.json` が生成可能 (各 project overlay の rule 網羅率)
- [ ] `npm run docs:generate` から 3 artifact が再生成される
- [ ] `npm run docs:check` が 3 artifact の鮮度差分を検出する
- [ ] `cd app && npm run docs:generate && npm run docs:check` が PASS
- [ ] DA-β-001 entry に Phase 4 landing 成果物の Q1〜Q5 self-check 表を埋めた

## Phase 5: AagResponse Contract Separation

- [ ] `docs/contracts/aag/aag-response.schema.json` を新設した
- [ ] `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema からの型生成に切り替えた
- [ ] `renderAagResponse` を text / markdown / shell / pr-comment の 4 renderer に分割した
- [ ] `app/src/test/architectureRules/helpers.ts` は schema-backed AagResponse を re-export するだけになった
- [ ] AagResponse を `references/01-principles/aag/` 配下で doc 化した
- [ ] 4 renderer がそれぞれ手動実行で valid な出力を返す
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-β-002 entry に Phase 5 landing 成果物の Q1〜Q5 self-check 表を埋めた

## Phase 6: Detector Protocol

- [ ] `docs/contracts/aag/detector-result.schema.json` を新設した (ruleId / detectionType / sourceFile / evidence / actual / baseline / severity / messageSeed)
- [ ] 既存 guard test の violation message 構築箇所を schema 準拠に揃えた
- [ ] obligation-collector / dependency-collector / 他 collector の output を schema 準拠に揃えた
- [ ] pre-commit hook の output を schema 準拠に揃えた
- [ ] 全 detector output が schema validation を通る (CI で機械検証)
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-β-003 entry に Phase 6 landing 成果物の Q1〜Q5 self-check 表を埋めた

## Phase 7: RuleBinding Boundary Guard

- [ ] `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` を新設した
- [ ] guard が許可 5 field (doc / correctPattern / outdatedPattern / canonicalDocRef / metaRequirementRefs) のみを通す
- [ ] guard が禁止 7 field (what / why / decisionCriteria / migrationRecipe / fixNow / executionPlan / lifecyclePolicy) と任意の `detection*` / `governance*` / `operationalState*` プレフィックスを hard fail する
- [ ] `aag/core/principles/rule-binding-policy.md` を新設し、許可 / 禁止 list の根拠を articulate した
- [ ] 違反コードを試験的に書くと ruleBindingBoundaryGuard が hard fail する
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-β-005 entry に Phase 7 landing 成果物の Q1〜Q5 self-check 表を埋めた
- [ ] `decision-audit.md` に Phase 4〜7 の判断 (DA-β-001 artifact 生成タイミング / DA-β-002 AagResponse schema 駆動化方針 / DA-β-003 detector protocol 適用範囲 / DA-β-005 RuleBinding 境界 guard 所属) の振り返りを記入し、判定が "正しい" or "部分的+軌道修正記録あり" であることを確認した
- [ ] **[AI Checkpoint β: Artifact]** 通過判定 — 上記振り返りを根拠に Phase 8 以降への進行を AI が決定した (人間承認不要)

## Phase 8: Overlay Artifactization

- [ ] `docs/generated/aag/default-execution-overlay.json` を `defaults.ts` から生成
- [ ] active 各 project の `aag/execution-overlay.ts` を JSON 派生 artifact として並列出力 (TS は authoring 正本として残す)
- [ ] 上記 JSON 出力先が `docs/generated/aag/overlays/<project-id>.json` 形式に揃う (生成 path は Phase 4 の merge-artifact-generator と同じ命名規約)
- [ ] TS と派生 artifact (Phase 3 で確定した format) の同期 guard を新設した (TS 編集後 artifact 未生成だと guard が落ちる)
- [ ] `cd app && npm run docs:generate && npm run test:guards` が PASS
- [ ] DA-β-004 entry に Phase 8 landing 成果物の Q1〜Q5 self-check 表を埋めた

## Phase 9: Go Core PoC

- [ ] `tools/aag-go/` を新設 (Go module, `go.mod` 配置)
- [ ] `tools/aag-go/cmd/aag-go-validate/main.go` が動作 (schema validation)
- [ ] `tools/aag-go/cmd/aag-go-merge/main.go` が動作 (defaults + project overlay merge)
- [ ] `tools/aag-go/cmd/aag-go-render-response/main.go` が動作 (4 renderer)
- [ ] `tools/aag-go/scripts/parity-check.sh` で TS と Go の merge 結果が byte-identical
- [ ] **CI に組み込まない** (cutover は本 program の scope 外、checkbox として明示)
- [ ] DA-γ-001 entry に Phase 9 landing 成果物の Q1〜Q5 self-check 表を埋めた

## Phase 10: Cutover Charter + Change Policy

- [ ] `aag/core/AAG_CORE_CHANGE_POLICY.md` を新設し、6 ルール (schema versioning / golden test / compatibility test / merge policy 変更承認 / RuleBinding 境界 / Core への app 固有具体名禁止) を articulate した
- [ ] `aag/core/AAG_CUTOVER_CHARTER.md` を新設し、後続 `aag-go-cutover` project の前提・nonGoals・着手条件を articulate した
- [ ] `references/02-status/recent-changes.md` に本 program のサマリを追加した
- [ ] 完了済 4 AAG project (`aag-core-doc-refactor` / `aag-rule-schema-meta-guard` / `aag-display-rule-registry` / `aag-legacy-retirement`) との継承関係を AAG_CUTOVER_CHARTER.md に明記した
- [ ] `cd app && npm run docs:check` が PASS
- [ ] DA-γ-002 entry に Phase 10 landing 成果物の Q1〜Q5 self-check 表を埋めた
- [ ] `decision-audit.md` に Phase 8〜10 の判断 (DA-γ-001 Go PoC scope 決定 / DA-γ-002 cutover charter 後続 project 分離方針) の振り返りを記入し、判定が "正しい" or "部分的+軌道修正記録あり" であることを確認した
- [ ] **[AI Checkpoint γ: Runtime Replacement]** 通過判定 — 上記振り返りを根拠に最終 archive レビューへの進行を AI が決定した (人間承認不要)

## 最終 archive レビュー (人間承認、構造的要請)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2
>
> **本 program の特例**: 本 checkbox は judgement の正しさを担保しない。判断履歴 (`decision-audit.md`) を読んだ上での **責任の引受** に過ぎない (`plan.md` 原則 6)。

- [ ] 人間が `decision-audit.md` の全 entry (DA-α-* / DA-β-* / DA-γ-*) を読み、本 program の判断履歴と振り返り内容を確認した上で archive プロセスへの移行を承認する
