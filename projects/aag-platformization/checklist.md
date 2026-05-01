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
- [x] `plan.md` に 4 不可侵原則 / 4 Workstream / 3 Gate / 10 Phase / 関連実装表を記述した
- [x] `aag/execution-overlay.ts` を空のままにした (本 program は本体 merge に参加しない)
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
- [ ] `aag/core/AAG_CORE_INDEX.md` から AAG_AUTHORITY_TABLE.md へのリンクを追加した
- [ ] `references/01-principles/aag/source-of-truth.md` に "Authority Table" セクションを追加した
- [ ] `cd app && npm run docs:check` が PASS

## Phase 2: Merge Policy Fix

- [ ] `aag/core/MERGE_POLICY.md` を新設し、3 案 (defaults stub / merged null / bootstrap seed) を articulate した
- [ ] 3 案から採用案を 1 つ人間承認で確定した
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

## Phase 3: Authority Table + Schema Registry

- [ ] `aag/core/AAG_SCHEMA_REGISTRY.md` を新設し、schema 一覧と version policy を articulate した
- [ ] `docs/contracts/aag/rule-semantics.schema.json` を新設した
- [ ] `docs/contracts/aag/rule-governance.schema.json` を新設した
- [ ] `docs/contracts/aag/rule-operational-state.schema.json` を新設した
- [ ] `docs/contracts/aag/rule-detection-spec.schema.json` を新設した
- [ ] `docs/contracts/aag/rule-binding.schema.json` を新設した
- [ ] 各 schema に `$id` / `version` / `description` を設定した
- [ ] `app/src/test/guards/aagSchemaIsomorphismGuard.test.ts` を新設し、TS 型と JSON Schema の同型性を検証する
- [ ] TS 型を試験的に変更すると aagSchemaIsomorphismGuard が hard fail する
- [ ] `cd app && npm run test:guards` が PASS
- [ ] **[Gate 1: Authority Gate]** Phase 1〜3 の成果物を人間がレビューし、Phase 4 以降への進行を承認した

## Phase 4: Merged Artifact Generator

- [ ] `tools/architecture-health/src/aag/merge-artifact-generator.ts` を新設した
- [ ] `docs/generated/aag/merged-architecture-rules.json` が生成可能 (resolvedBy 付き)
- [ ] `docs/generated/aag/merge-report.json` が生成可能 (project override 率 / defaults 補完率 / stub 適用率)
- [ ] `docs/generated/aag/overlay-coverage.json` が生成可能 (各 project overlay の rule 網羅率)
- [ ] `npm run docs:generate` から 3 artifact が再生成される
- [ ] `npm run docs:check` が 3 artifact の鮮度差分を検出する
- [ ] `cd app && npm run docs:generate && npm run docs:check` が PASS

## Phase 5: AagResponse Contract Separation

- [ ] `docs/contracts/aag/aag-response.schema.json` を新設した
- [ ] `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema からの型生成に切り替えた
- [ ] `renderAagResponse` を text / markdown / shell / pr-comment の 4 renderer に分割した
- [ ] `app/src/test/architectureRules/helpers.ts` は schema-backed AagResponse を re-export するだけになった
- [ ] AagResponse を `references/01-principles/aag/` 配下で doc 化した
- [ ] 4 renderer がそれぞれ手動実行で valid な出力を返す
- [ ] `cd app && npm run test:guards` が PASS

## Phase 6: Detector Protocol

- [ ] `docs/contracts/aag/detector-result.schema.json` を新設した (ruleId / detectionType / sourceFile / evidence / actual / baseline / severity / messageSeed)
- [ ] 既存 guard test の violation message 構築箇所を schema 準拠に揃えた
- [ ] obligation-collector / dependency-collector / 他 collector の output を schema 準拠に揃えた
- [ ] pre-commit hook の output を schema 準拠に揃えた
- [ ] 全 detector output が schema validation を通る (CI で機械検証)
- [ ] `cd app && npm run test:guards` が PASS

## Phase 7: RuleBinding Boundary Guard

- [ ] `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` を新設した
- [ ] guard が許可 5 field (doc / correctPattern / outdatedPattern / canonicalDocRef / metaRequirementRefs) のみを通す
- [ ] guard が禁止 7 field (what / why / decisionCriteria / migrationRecipe / fixNow / executionPlan / lifecyclePolicy) と任意の `detection*` / `governance*` / `operationalState*` プレフィックスを hard fail する
- [ ] `aag/core/principles/rule-binding-policy.md` を新設し、許可 / 禁止 list の根拠を articulate した
- [ ] 違反コードを試験的に書くと ruleBindingBoundaryGuard が hard fail する
- [ ] `cd app && npm run test:guards` が PASS
- [ ] **[Gate 2: Artifact Gate]** Phase 4〜7 の成果物を人間がレビューし、Phase 8 以降への進行を承認した

## Phase 8: Overlay Artifactization

- [ ] `docs/generated/aag/default-execution-overlay.json` を `defaults.ts` から生成
- [ ] active 各 project の `aag/execution-overlay.ts` を JSON 派生 artifact として並列出力 (TS は authoring 正本として残す)
- [ ] 上記 JSON 出力先が `docs/generated/aag/overlays/<project-id>.json` 形式に揃う (生成 path は Phase 4 の merge-artifact-generator と同じ命名規約)
- [ ] TS と JSON の同期 guard を新設した (TS 編集後 JSON 未生成だと guard が落ちる)
- [ ] `cd app && npm run docs:generate && npm run test:guards` が PASS

## Phase 9: Go Core PoC

- [ ] `tools/aag-go/` を新設 (Go module, `go.mod` 配置)
- [ ] `tools/aag-go/cmd/aag-go-validate/main.go` が動作 (schema validation)
- [ ] `tools/aag-go/cmd/aag-go-merge/main.go` が動作 (defaults + project overlay merge)
- [ ] `tools/aag-go/cmd/aag-go-render-response/main.go` が動作 (4 renderer)
- [ ] `tools/aag-go/scripts/parity-check.sh` で TS と Go の merge 結果が byte-identical
- [ ] **CI に組み込まない** (cutover は本 program の scope 外、checkbox として明示)

## Phase 10: Cutover Charter + Change Policy

- [ ] `aag/core/AAG_CORE_CHANGE_POLICY.md` を新設し、6 ルール (schema versioning / golden test / compatibility test / merge policy 変更承認 / RuleBinding 境界 / Core への app 固有具体名禁止) を articulate した
- [ ] `aag/core/AAG_CUTOVER_CHARTER.md` を新設し、後続 `aag-go-cutover` project の前提・nonGoals・着手条件を articulate した
- [ ] `references/02-status/recent-changes.md` に本 program のサマリを追加した
- [ ] 完了済 4 AAG project (`aag-core-doc-refactor` / `aag-rule-schema-meta-guard` / `aag-display-rule-registry` / `aag-legacy-retirement`) との継承関係を AAG_CUTOVER_CHARTER.md に明記した
- [ ] `cd app && npm run docs:check` が PASS
- [ ] **[Gate 3: Runtime Replacement Gate]** Phase 8〜10 の成果物を人間がレビューし、最終レビューへの進行を承認した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 10 Phase の成果物 (commit / PR / 関連正本 / generated artifact / 新設 6 doc / 新設 2 guard / Go PoC) を人間がレビューし、archive プロセスへの移行を承認する
