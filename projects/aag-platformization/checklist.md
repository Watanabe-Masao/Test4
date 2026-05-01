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

## Phase 1: Authority Charter (1 doc 統合 + 3 判断)

- [ ] `aag/core/AAG_CORE_CONTRACTS.md` を新設した (4 章統合: Authority Table / Merge Policy / Schema Registry / RuleBinding Boundary Policy)
- [ ] §1 Authority Table に 10 concept × 4 列 (concept / authority 分類 / physical source / change policy) を埋めた
- [ ] §2 Merge Policy 章に解決順序 + reviewPolicy 契約の articulate を埋めた (採用案は Phase 2 で確定するため stub)
- [ ] §3 Schema Registry 章に schema version policy を埋めた (採用 format は Phase 3 で確定するため stub)
- [ ] §4 RuleBinding Boundary Policy 章に許可 5 field / 禁止 7+ field の articulate を埋めた (Phase 7 guard の上位)
- [ ] **DA-α-001a** (architectural style 5 案比較) entry を `decision-audit.md` に追加し、AI が採用案を確定した
- [ ] **DA-α-001b** (Domain serialization format 9 案比較) entry を追加し、AI が format を確定した
- [ ] **DA-α-001c** (Reference runtime 選定、style 採用後に必要なら) entry を追加 — 候補 Go / Python / Go+Python combo、Rust 除外、AI が Rust を強く推奨する場合は人間確認 escalation
- [ ] DA-α-001a/b/c の Commit Lineage (judgementCommit / preJudgementCommit) を記録し、annotated tag を push した
- [ ] `aag/core/AAG_CORE_INDEX.md` から AAG_CORE_CONTRACTS.md へのリンクを追加した
- [ ] `references/01-principles/aag/source-of-truth.md` に "Core Contracts" セクションを追加した
- [ ] `cd app && npm run docs:check` が PASS
- [ ] DA-α-001a/b/c entry に Phase 1 landing 成果物の Q1〜Q5 self-check 表を埋めた + 原則 7 (a)/(b)/(c) 判定を articulate した

## Phase 2: Merge Policy Fix

- [ ] AAG_CORE_CONTRACTS.md §2 (Merge Policy) を採用案の articulate で書き直した (stub → 確定)
- [ ] 3 案 (defaults stub / merged null / bootstrap seed) + 第 4 案 ADR-D-001 PR3 踏襲 を blast radius / migration cost / 後方互換 で比較した
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

## Phase 3: Schema Materialization (5 schema + isomorphism guard)

- [ ] AAG_CORE_CONTRACTS.md §3 (Schema Registry) を採用 format と version policy で書き直した
- [ ] 採用 format で 5 schema を `docs/contracts/aag/` 配下に新設した (rule-semantics = Core / rule-governance = App Domain / rule-operational-state = Project Overlay / rule-detection-spec = Core / rule-binding = App Domain)
- [ ] 各 schema に identifier / version / description 相当を設定した (format 依存)
- [ ] schema isomorphism の方向性 (TS-from-schema vs schema-from-TS) を AI が判断し、`decision-audit.md` DA-α-002 entry (Merge Policy) と並行で DA-α-003 entry (isomorphism direction) を追加した
- [ ] `app/src/test/guards/aagSchemaIsomorphismGuard.test.ts` を新設し、TS 型と schema (採用 format) の同型性を検証する (= I10、doc-impl integrity)
- [ ] TS 型を試験的に変更すると aagSchemaIsomorphismGuard が hard fail する
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-α-003 entry に Phase 3 landing 成果物の Q1〜Q5 self-check + 原則 7 (a)/(b)/(c) 判定を埋めた
- [ ] `decision-audit.md` に Phase 1〜3 の判断 (DA-α-001a/b/c + DA-α-002 + DA-α-003) の振り返りを記入し、判定が "正しい" or "部分的+軌道修正記録あり" であることを確認した
- [ ] **[AI Checkpoint α: Authority]** 通過判定 — 上記振り返りを根拠に Phase 4 以降への進行を AI が決定した (人間承認不要)

## Phase 4: Merged Artifact Generator (1 artifact のみ)

- [ ] `tools/architecture-health/src/aag/merge-artifact-generator.ts` を新設した
- [ ] `docs/generated/aag/merged-architecture-rules.<format>` が生成可能 (resolvedBy 付き) — **1 artifact のみ**。merge-report / overlay-coverage は cut
- [ ] artifact の merge 結果が runtime merge と byte-identical であることを golden test で検証 (= I11、doc-impl integrity)
- [ ] `npm run docs:generate` から再生成可能
- [ ] `npm run docs:check` が artifact の鮮度差分を検出する
- [ ] `cd app && npm run docs:generate && npm run docs:check` が PASS
- [ ] DA-β-001 entry に Phase 4 landing 成果物の Q1〜Q5 self-check + 原則 7 (a)/(b)/(c) 判定を埋めた

## Phase 5: AagResponse Contract (schema 化のみ、renderer 分割は cut)

- [ ] `docs/contracts/aag/aag-response.<format>` を新設した
- [ ] `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema からの型生成に切り替えた
- [ ] `app/src/test/architectureRules/helpers.ts` は schema-backed AagResponse を re-export するだけになった (既存 aagResponseFeedbackUnificationGuard が破綻しないことを確認、= I2 維持)
- [ ] AagResponse を `references/01-principles/aag/` で短く参照 (重い doc 化は不要)
- [ ] 既存 text renderer の出力 byte が schema 化前と同一 (golden test、振る舞い不変原則 1)
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-β-002 entry に Phase 5 landing 成果物の Q1〜Q5 self-check + 原則 7 (a)/(b)/(c) 判定を埋めた

## Phase 6: Detector Protocol

- [ ] `docs/contracts/aag/detector-result.schema.json` を新設した (ruleId / detectionType / sourceFile / evidence / actual / baseline / severity / messageSeed)
- [ ] 既存 guard test の violation message 構築箇所を schema 準拠に揃えた
- [ ] obligation-collector / dependency-collector / 他 collector の output を schema 準拠に揃えた
- [ ] pre-commit hook の output を schema 準拠に揃えた
- [ ] 全 detector output が schema validation を通る (CI で機械検証)
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-β-003 entry に Phase 6 landing 成果物の Q1〜Q5 self-check 表を埋めた

## Phase 7: RuleBinding Boundary Guard (guard 1 本のみ)

- [ ] `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` を新設した (= I12、doc-impl integrity)
- [ ] guard が許可 5 field (doc / correctPattern / outdatedPattern / canonicalDocRef / metaRequirementRefs) のみを通す
- [ ] guard が禁止 7 field (what / why / decisionCriteria / migrationRecipe / fixNow / executionPlan / lifecyclePolicy) と任意の `detection*` / `governance*` / `operationalState*` プレフィックスを hard fail する
- [ ] policy 内容は AAG_CORE_CONTRACTS.md §4 (Phase 1 で landing 済) を本 guard が enforce することを comment で参照 (新 doc 不要)
- [ ] 違反コードを試験的に書くと ruleBindingBoundaryGuard が hard fail する
- [ ] `cd app && npm run test:guards` が PASS
- [ ] DA-β-005 entry に Phase 7 landing 成果物の Q1〜Q5 self-check + 原則 7 (a)/(b)/(c) 判定を埋めた
- [ ] `decision-audit.md` に Phase 4〜7 の判断 (DA-β-001 artifact 生成タイミング / DA-β-002 AagResponse schema 駆動化方針 / DA-β-003 detector protocol 適用範囲 / DA-β-005 RuleBinding 境界 guard 所属) の振り返りを記入し、判定が "正しい" or "部分的+軌道修正記録あり" であることを確認した
- [ ] **[AI Checkpoint β: Artifact]** 通過判定 — 上記振り返りを根拠に Phase 8 以降への進行を AI が決定した (人間承認不要)

## Phase 8: Overlay Artifactization

- [ ] `docs/generated/aag/default-execution-overlay.<format>` を `defaults.ts` から生成
- [ ] active 各 project の `aag/execution-overlay.ts` を派生 artifact として並列出力 (TS は authoring 正本として残す)
- [ ] 上記出力先が `docs/generated/aag/overlays/<project-id>.<format>` 形式に揃う (生成 path は Phase 4 の merge-artifact-generator と同じ命名規約)
- [ ] TS と派生 artifact の同期 guard を新設した (= I13、doc-impl integrity。TS 編集後 artifact 未生成だと guard が落ちる)
- [ ] `cd app && npm run docs:generate && npm run test:guards` が PASS
- [ ] DA-β-004 entry に Phase 8 landing 成果物の Q1〜Q5 self-check + 原則 7 (a)/(b)/(c) 判定を埋めた

## Phase 9: Reference Runtime PoC (Phase 1 結果に応じて conditional)

- [ ] DA-α-001a の採用 architectural style を確認 — style C (TS export) なら本 Phase は **skip 完了** (checkbox 全 [x])。それ以外は以下を実施
- [ ] DA-α-001c の採用 reference runtime 言語 (Go / Python / Go+Python combo) を確認 — Rust が選ばれている場合は人間確認を経ているか確認
- [ ] `tools/aag-{lang}/` を新設 (採用言語に応じて)
- [ ] validate 機能が動作 (採用 format の merged artifact を schema validation)
- [ ] merge 機能が動作 (defaults + project overlay merge、TS と byte-identical)
- [ ] **CI に組み込まない** (cutover は本 program の scope 外)
- [ ] **当初案からの cut**: render-response 4 renderer 全実装は不要。最小 PoC のみ
- [ ] DA-γ-001 entry に Phase 9 landing 成果物の Q1〜Q5 self-check + 原則 7 (a)/(b)/(c) 判定を埋めた

## Phase 10: Charter (1 doc 統合)

- [ ] `aag/core/AAG_CORE_CHARTER.md` を新設 (3 章統合):
- [ ] §1 Change Policy 章に 6 ルール (schema versioning / golden test / compatibility test / merge policy 変更承認 / RuleBinding 境界 / Core への app 固有具体名禁止) を articulate した
- [ ] §2 Cutover Charter 章に後続 `aag-runtime-cutover` (採用 architectural style 次第で命名) project の前提・nonGoals・着手条件を articulate した
- [ ] §3 完了済 4 AAG project (`aag-core-doc-refactor` / `aag-rule-schema-meta-guard` / `aag-display-rule-registry` / `aag-legacy-retirement`) との継承関係を articulate した
- [ ] `references/02-status/recent-changes.md` に本 program のサマリを追加した
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
> **本 program の特例**: 本 checkbox は judgement の正しさを担保しない。判断履歴 (`decision-audit.md`) を読んだ上での **責任の引受** に過ぎない (`plan.md` 原則 7)。

- [ ] 人間が `decision-audit.md` の全 entry (DA-α-* / DA-β-* / DA-γ-*) を読み、本 program の判断履歴と振り返り内容を確認した上で archive プロセスへの移行を承認する
