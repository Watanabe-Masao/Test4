# checklist — phased-content-specs-rollout

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 0: 計画 doc landing

- [x] `projects/phased-content-specs-rollout/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 3 / governance-hardening / status active) を記録した
- [x] `plan.md` に Phase A〜J + Operational Control System §1〜§11 + 不可侵原則を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（spawn → SHELL → ACTIVE の経緯）と次にやることを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 3) と nonGoals を記録した
- [x] umbrella + 4 sub-project archive 完遂を反映（main merge）

## Phase A: Anchor Slice — 保証経路完成

- [x] `tools/widget-specs/generate.mjs` の frontmatter generator を実装した
- [x] Anchor Slice 5 widget (WID-002 / 006 / 018 / 033 / 040) の source に `@widget-id` JSDoc を注入した
- [x] `AR-CONTENT-SPEC-EXISTS` rule を `architectureRules.ts` に登録 + active 化した
- [x] `AR-CONTENT-SPEC-FRONTMATTER-SYNC` rule を登録 + active 化した
- [x] `AR-CONTENT-SPEC-CO-CHANGE` rule を登録 + active 化した
- [x] `AR-CONTENT-SPEC-FRESHNESS` rule を登録 + active 化した
- [x] `AR-CONTENT-SPEC-OWNER` rule を登録 + active 化した
- [x] `obligation-collector.ts` の `OBLIGATION_MAP` に registry 変更 → spec 更新義務を追加した
- [x] behavior section guard を実装した（J7 path existence: `contentSpecPathExistenceGuard.test.ts` + `AR-CONTENT-SPEC-PATH-EXISTENCE` rule + `parseBehaviorClaimsTable` primitive を `@app-domain/integrity` に extract、evidence guard と共有）
- [x] content graph の初版 collector を実装した — `tools/architecture-health/src/collectors/content-graph-collector.ts` 新設、3 KPI (nodes=89 / edges=47 / orphans=47) を architecture-health に feed、`content-graph.json` 生成 (2026-04-29)
- [x] `npm run content-specs:check` script を package.json に追加した
- [x] CI workflow に content-specs:check を組み込んだ（`test:guards` 経由で fast-gate に組み込み — `contentSpecFrontmatterSyncGuard` が generator --check を spawn する）
- [x] Anchor Slice 5 件で `missingSpec / frontmatterDrift / coChangeViolation = 0` を達成した
- [x] Anchor Slice 5 件で Promotion Gate L4 到達を確認した — Phase A guard 群 (AR-CONTENT-SPEC-CO-CHANGE / LIFECYCLE-FIELDS / OWNER) が widget kind 全件で active、L4 条件「Guarded (co-change / lifecycle / owner guard がある)」(plan §5.5) を満たす
- [x] source 変更 → spec 未更新で `npm run docs:check` が hard fail することを CI で確認した（synthetic drift 注入で contentSpecCoChangeGuard / FrontmatterSync が hard fail することを確認）

## Phase B: WID 全体への拡張

- [x] 全 45 WID の source に `@widget-id` JSDoc を注入した
- [x] frontmatter generator を全 45 件に適用し drift = 0 を達成した
- [x] co-change guard を 45 件全体で active 化した
- [x] freshness / owner guard が 45 件全体で動作することを確認した
- [x] 全 45 WID の content graph が生成された — `content-graph-collector` (2026-04-29) で 89 spec 全件 (45 widget 含む) が graph node に登録、`content-graph.json` 出力
- [x] 全 45 WID で Promotion Gate L4 到達を確認した — co-change / lifecycle / owner guard が 45 WID 全件で active (Phase B 完遂時点)、L4 条件 (plan §5.5) を満たす

## Phase C: ReadModels / Pipelines の網羅

- [x] `RM-NNN` の ID 体系を確定した（PIPE / QH / PROJ は Phase C-2 batch で確定予定）
- [x] `references/05-contents/read-models/` 新サブカテゴリを追加した（pipelines / query-handlers / projections は次 batch）
- [x] 主要 readModel の spec body authoring + source tag を実施した（RM-001 〜 RM-010、10 件 = canonicalizationSystemGuard 監視 readModel 全件）
- [x] frontmatter generator を新サブカテゴリに拡張した（kind=read-model dispatch、`@rm-id` JSDoc 自動注入）
- [x] 主要 readModel `missingSpec = 0` を達成した（10 件、AR-CONTENT-SPEC-EXISTS guard で検証）
- [ ] 主要 pipeline `missingSpec = 0` を達成した
- [ ] queryHandler / projection の `sourceRef drift = 0` を達成した
- [ ] pipeline lineage が graph で追跡可能になった — **deferred**: PIPE/QH/PROJ サブカテゴリの新設が prerequisite (現状 read-models/ のみ存在)。content graph 機構自体は landed (2026-04-29)
- [ ] Promotion Gate L5 到達を確認した — **deferred**: prerequisite 上記 (pipeline lineage graph) + Phase J evidence-backed の per-spec verification

## Phase D: Domain Calculations の網羅

- [x] selection rule に従い対象 CALC を確定した（Step1+2 tier1 6 件、Step3 tier2 5 件 cover、Step4+ で残 24 件）
- [x] `CALC-NNN` ID を割当した（CALC-001〜011、Step3 完遂段階）
- [x] 対象 CALC に source tag を導入した（@calc-id JSDoc 自動注入）
- [x] Lifecycle State Machine の `sunsetCondition` を deprecated calc に必須化した（AR-CONTENT-SPEC-LIFECYCLE-FIELDS guard で deprecated/sunsetting/retired に replacedBy 必須、sunsetting に sunsetCondition+deadline 必須、過去 deadline hard fail）
- [x] 対象 CALC の invariant section を `invariant-catalog.md` 参照で記録した（CALC-001〜011 §4 で INV-CGAP / INV-PI / INV-INV / INV-PIN / INV-OBS / INV-RBR / INV-SHAPLEY / INV-FCS / INV-EST / INV-BUD を記録）
- [x] 対象 CALC `missingSpec = 0` を達成した（business + analytic authoritative tier1+tier2 = 11 件、tier3 残 24 件は Step4+ で baseline ratchet-down）
- [ ] tests / guards との evidence 紐付けを完了した（Phase J evidenceLevel との連動）
- [ ] 対象 CALC tests 参照 = 100% を達成した
- [ ] invariant 付き CALC の test 参照 = 100% を達成した
- [x] deprecated CALC の `sunsetCondition` = 100% を達成した — **vacuously achieved**: 現状 deprecated calc が 0 件、AR-CONTENT-SPEC-LIFECYCLE-FIELDS guard が active で deprecated 化時に hard fail で再評価 trigger

## Phase E: Charts へ拡張

- [x] `CHART-NNN` ID を対象 chart に割当した（CHART-001〜005、Phase E 着手段階で 5 件）
- [x] input builder / render model / option builder を spec に記録した（frontmatter inputBuilder / logic / viewModel / optionBuilder / styles 5 field）
- [ ] visual test / story / fixture と紐付けした（Phase G で landing 予定）
- [x] empty / loading / ready / error state を frontmatter に記録した（5 spec の states field）
- ~~主要 chart `missingSpec = 0` を達成した（全 chart cover）~~ — **cut (2026-04-29、anti-bloat self-test)**: Chart 58 件中 5 件 spec で selection rule 意図的限定、HANDOFF 不可侵原則 3 (anchor 5 件から拡大しない)。anchor 機構保証は確立済、全件展開は不可侵原則違反 risk
- ~~chart input builder 参照 = 100% を達成した~~ — **cut**: 上記と同 (全 chart cover が前提)
- [ ] visual / e2e evidence required の chart で evidence 設定済み（Phase G）

## Phase F: Selected UI Components

- [x] selection rule に基づく対象 UIC 一覧を確定した（複数 widget/page 参照 / props 重い / responsibility hotspot の 5 件で初期 batch、後続で漸次拡大）
- [x] `UIC-NNN` ID を割当した（UIC-001〜005、Phase F 着手段階）
- [x] props contract / children / hooks / side effects を記録した（5 spec の §2-§5 に prose、frontmatter の hooks / children / sideEffects field）
- ~~対象 UIC `missingSpec = 0` を達成した（全 UIC cover）~~ — **cut (anti-bloat self-test)**: UIC 26 件中 5 件 spec で selection rule 意図的限定、HANDOFF 不可侵原則 3 と同型
- [x] props `sourceRef drift = 0` を達成した（generator が機械検証）
- [ ] story or visual evidence required 対象の設定完了（KpiCard.stories のみ、Phase G で拡大）

## Phase G: Storybook / Visual Evidence 連携

- [x] spec frontmatter に `stories` / `visualTests` / `states` フィールドを追加した（Phase E/F で既に schema に乗せ済、Phase G 着手で UIC-002 KpiCard に path 記入）
- [x] UI spec の story / visual evidence guard を active 化した（AR-CONTENT-SPEC-VISUAL-EVIDENCE、kind=ui-component を含む）
- [x] Chart spec の visual evidence guard を active 化した（同 rule で kind=chart も対象）
- [ ] 対象 UI / Chart の evidence coverage が基準値以上に到達した（baseline=9 / 対象 10 件、現状 cover 1 件、Phase G 後続 batch で減算）
- ~~empty / error state の story coverage が基準値以上に到達した~~ — **cut (anti-bloat)**: state 別 story 管理は frontmatter schema 拡張要 (cost > value)、現状 spec.states 列挙で代替可能

## Phase H: Architecture Health 詳細 KPI 連携

- [x] `references/02-status/generated/content-spec-health.json` collector を実装した（tools/architecture-health/src/collectors/content-spec-collector.ts、Phase H 着手）
- [x] `contentSpec.{total, byKind, missingOwner, stale, lifecycleViolation, lifecycle, evidence (chart/uiComponent breakdown), driftBudget}` を出力した（plan §schema 準拠、Phase H 着手段階で 5 KPI を architecture-health に feed）
- [x] `architecture-health.json` summary に Content Spec カテゴリを反映した（48 → 53 KPIs）
- [x] Drift Budget の threshold を設定した（missingOwner=0 / stale=5 / lifecycleViolation=0 / evidenceUncovered=baseline 9）
- ~~Promotion Gate L6 到達を確認した~~ — **cut (anti-bloat)**: per-tag promotion level tracking には frontmatter schema 拡張要、L4/L5 で運用十分。1 人 dev project で L6 過剰 (整合性 framework reduction と同思想)

## Phase I: PR Impact Report / Bot 連携

- [x] `npm run content-specs:impact -- --base main --head HEAD` CLI を実装した（tools/widget-specs/impact.mjs）
- [x] CLI 出力に Changed sources / Affected specs / Required spec updates / Risk level を含めた（markdown / --json 両出力対応、risk: high/medium/low + reasons 列挙）
- [x] CI artifact として保存される設定を完了した（`.github/workflows/ci.yml` の `content-specs-impact` job、PR でのみ trigger、markdown / JSON 両 artifact を 14 日 retention で upload + job log に summary echo）
- ~~必要に応じ PR comment bot 化した~~ — **cut (anti-bloat)**: 1 人 dev project で過剰 ceremony、CLI (`content-specs:impact`) が実用可能で PR コメントは手動運用で十分

## Phase J: Claim Evidence Enforcement

- [x] J1: `evidenceLevel` を任意項目として導入した（spec body の Behavior Claims markdown table、CALC-001 / CALC-002 / CALC-007 で reference 実装）
- [x] J2: `generated / tested / guarded / reviewed / asserted / unknown` の 6 分類を定義した（contentSpecHelpers の EvidenceLevel + RiskLevel type）
- [x] J3: high-risk claim の `evidenceLevel = asserted` が 0 になった（contentSpecEvidenceLevelGuard で hard fail、初期実装 11 claim が all tested/guarded）
- [x] J4: `tested` claim の test 参照欠落 = 0 になった（同 guard、tests cell 空で hard fail）
- [x] J5: `guarded` claim の guard 参照欠落 = 0 になった（同 guard、guards cell 空で hard fail）

## Phase K: Freshness Mechanism Redesign (proposal、anti-ritual)

> 背景: 90 日 review cadence (`reviewCadenceDays + lastReviewedAt`) は概念的に儀式的
> （`review` の意味が「date 更新」のみで構造的検証を伴わない）。既存の co-change /
> frontmatter-sync / path-existence / lifecycle / evidence-level 5 guard が構造的
> drift を網羅し、`lastVerifiedCommit` が既に concrete signal を提供しているため、
> cadence は重複かつ低 value。本 phase はその儀式を機械的 mechanism に置換する設計。
> 着手前に plan.md §Phase K として canonical 化する。

### Option 1 (推奨): cadence 廃止 + lastVerifiedCommit 強化

- [ ] `reviewCadenceDays` / `lastReviewedAt` field を deprecate（frontmatter generator で警告、最終的に削除）
- [ ] `contentSpecLastVerifiedCommitGuard` を新設: spec の `lastVerifiedCommit` が source file の `git log -1 -- sourceRef` の commit hash と一致することを検証（co-change が active なため通常時は自動 sync、stale spec の検出に特化）
- [ ] `contentSpecFreshnessGuard` を deprecate（cadence-based check 撤退、commit-based に移行）

### Option 2 (併用推奨): reviewed claim に `verificationNote` 必須化

- [ ] Behavior Claims table に `verificationNote` 列を追加（evidenceLevel=reviewed のみ必須、なぜ test 化しないかの 1-2 文 rationale）
- [ ] `contentSpecEvidenceLevelGuard` 拡張: `reviewed` claim で `verificationNote` 空欄を hard fail
- [ ] 既存 5 件の reviewed claim (CALC-013/014/016/018/020 CLM-004) に rationale 記入

### Option 3 (保留): sunset trigger

- [ ] source file が caller 0 件 + N commit 未更新で `lifecycleStatus: deprecated` flag を提案（sunset-or-confirm 二択強制）

### 復活 / cut 判断

- 90 日 cadence の儀式を維持する明確 value が後から見つかった場合は本 Phase を cut し cadence を残す
- 現時点では既存防御との重複が cut 判定の理由（anti-bloat self-test 適用、Phase Q reduction と同思想）

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (A〜J) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
