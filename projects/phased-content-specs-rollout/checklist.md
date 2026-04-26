# checklist — phased-content-specs-rollout

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: 計画 doc landing

* [x] `projects/phased-content-specs-rollout/` を `_template` から bootstrap した
* [x] `config/project.json` に projectization (Level 2 / docs-only) を記録した
* [x] `plan.md` に Phase A〜J の対象・実施内容・完了条件・依存を記録した
* [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
* [x] `HANDOFF.md` に現在地と次にやることを記録した
* [x] `projectization.md` に AAG-COA 判定と nonGoals を記録した

## Phase A: SP-B Anchor Slice 完成

* [ ] umbrella inquiry/01a Phase 6 の frontmatter generator が landed した
* [ ] 5 件の `AR-CONTENT-SPEC-*` rule が active 化された (`architectureRules.ts`)
* [ ] WID-033 / WID-040 / WID-018 / WID-006 / WID-002 の source に `@widget-id` JSDoc が注入された
* [ ] WID-033 / WID-040 / WID-018 / WID-006 / WID-002 の `WID-NNN.md` 本文が landed した
* [ ] 対象 5 slice で `missingSpec = 0` を達成した
* [ ] 対象 5 slice で `frontmatterDrift = 0` を達成した
* [ ] 対象 5 slice で `coChangeViolation = 0` を達成した
* [ ] `npm run docs:check` が drift を hard fail させることを CI で確認した

## Phase B: SP-B 対象全体へ拡張

* [ ] SP-B (widget-registry-simplification) ADR-B-001〜004 の対象 WID 一覧を確定した
* [ ] 対象 WID の spec を全件同期した
* [ ] 必要な RM / PIPE / CALC / PROJ / CHART を追加した
* [ ] content graph が SP-B 範囲で生成された
* [ ] SP-B 対象 WID の `missingSpec = 0`
* [ ] SP-B 対象 WID の `frontmatterDrift = 0`
* [ ] SP-B 対象 WID の `coChangeViolation = 0`

## Phase C: ReadModels / Pipelines の網羅

* [ ] `RM-NNN` / `PIPE-NNN` / `QH-NNN` / `PROJ-NNN` ID 体系が確定した
* [ ] 主要 readModel に source tag が導入された
* [ ] 主要 readModel `missingSpec = 0`
* [ ] 主要 pipeline `missingSpec = 0`
* [ ] queryHandler / projection の `sourceRef drift = 0`
* [ ] pipeline lineage が graph で追跡可能になった

## Phase D: Domain Calculations の網羅

* [ ] `CALC-NNN` ID が対象関数に割当された
* [ ] 対象 CALC に source tag が導入された
* [ ] 対象 CALC の invariant section が記録された
* [ ] 対象 CALC `missingSpec = 0`
* [ ] 対象 CALC tests 参照 = 100%
* [ ] invariant 付き CALC の test 参照 = 100%
* [ ] deprecated CALC の `sunsetCondition = 100%`

## Phase E: Charts へ拡張

* [ ] `CHART-NNN` ID が対象 chart に割当された
* [ ] input builder / render model / option builder が記録された
* [ ] visual test / story / fixture と紐付けされた
* [ ] empty / loading / ready / error state が記録された
* [ ] 主要 chart `missingSpec = 0`
* [ ] chart input builder 参照 = 100%
* [ ] visual / e2e evidence required の chart で evidence 設定済み

## Phase F: UI Components へ拡張

* [ ] selection rule に基づく対象 UIC 一覧が確定した
* [ ] `UIC-NNN` ID が割当された
* [ ] props contract / children / hooks / side effects が記録された
* [ ] 対象 UIC `missingSpec = 0`
* [ ] props `sourceRef drift = 0`
* [ ] story or visual evidence required 対象の設定完了

## Phase G: Storybook / Visual Evidence 連携

* [ ] spec frontmatter に `stories` / `visualTests` / `states` フィールドが追加された
* [ ] UI spec の story / visual evidence guard が active 化された
* [ ] Chart spec の visual evidence guard が active 化された
* [ ] 対象 UI / Chart の evidence coverage が基準値以上
* [ ] empty / error state の story coverage が基準値以上

## Phase H: Architecture Health 詳細 KPI 連携

* [ ] `references/02-status/generated/content-spec-health.json` collector が実装された
* [ ] `contentSpec.total` / `byKind` / `missingSpec` / `frontmatterDrift` / `coChangeViolation` / `stale` / `missingOwner` / `lifecycleViolation` / `evidenceCoverage` の 9 KPI が出力された
* [ ] `architecture-health.json` summary に content spec KPI が反映された
* [ ] threshold / budget が設定された

## Phase I: PR Impact Report / Bot 連携

* [ ] `npm run content-specs:impact -- --base main --head HEAD` CLI が実装された
* [ ] CLI 出力に Changed sources / Affected specs / Required spec updates / Risk level が含まれる
* [ ] CI artifact として保存される
* [ ] 必要に応じ PR comment bot 化された

## Phase J: Claim Evidence Enforcement

* [ ] J1: `evidenceLevel` が任意項目として導入された
* [ ] J2: `tested / guarded / reviewed / asserted` の 4 分類が定義された
* [ ] J3: high-risk claim の `evidenceLevel = asserted` が 0
* [ ] J4: `tested` claim の test 参照欠落 = 0
* [ ] J5: `guarded` claim の guard 参照欠落 = 0

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase (A〜J) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
